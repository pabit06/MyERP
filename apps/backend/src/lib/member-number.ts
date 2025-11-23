import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';

/**
 * Generate the next member number for a cooperative
 * Format: 000001, 000002, 000003, etc. (6 digits, zero-padded, starting from 1)
 * 
 * Uses a transaction with retry logic to prevent race conditions when multiple members are approved simultaneously
 */
export async function generateMemberNumber(cooperativeId: string): Promise<string> {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Use a transaction to ensure atomicity and prevent race conditions
      return await prisma.$transaction(async (tx) => {
        // Find the highest member number for this cooperative
        // Using a transaction ensures this read is consistent
        const lastMember = await tx.member.findFirst({
          where: {
            cooperativeId,
            memberNumber: {
              not: null,
            },
          },
          orderBy: {
            memberNumber: 'desc',
          },
        });

        let nextNumber = 1; // Start from 1 instead of 0

        if (lastMember && lastMember.memberNumber) {
          // Extract the number part and increment
          const lastNumber = parseInt(lastMember.memberNumber, 10);
          if (!isNaN(lastNumber) && lastNumber >= 1) {
            nextNumber = lastNumber + 1;
          }
        }

        // Format as 6-digit zero-padded string
        const newMemberNumber = nextNumber.toString().padStart(6, '0');

        // Verify the number doesn't already exist (double-check for safety)
        const existingMember = await tx.member.findFirst({
          where: {
            cooperativeId,
            memberNumber: newMemberNumber,
          },
        });

        if (existingMember) {
          // If it exists, find the next available number
          // This handles edge cases where numbers might have been manually assigned
          const allMembers = await tx.member.findMany({
            where: {
              cooperativeId,
              memberNumber: {
                not: null,
              },
            },
            select: {
              memberNumber: true,
            },
            orderBy: {
              memberNumber: 'desc',
            },
          });

          const usedNumbers = new Set(
            allMembers
              .map((m) => m.memberNumber)
              .filter((n): n is string => n !== null)
              .map((n) => parseInt(n, 10))
              .filter((n) => !isNaN(n))
          );

          let candidate = nextNumber;
          while (usedNumbers.has(candidate)) {
            candidate++;
          }
          return candidate.toString().padStart(6, '0');
        }

        return newMemberNumber;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      // If it's a unique constraint violation, retry with a new number
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.target?.includes('memberNumber')
      ) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(
            `Failed to generate unique member number after ${maxRetries} retries. Please try again.`
          );
        }
        // Wait a bit before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 50 * retries));
        continue;
      }
      // For other errors, throw immediately
      throw error;
    }
  }

  throw new Error('Failed to generate member number');
}
