import { prisma } from '../../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { getOccupationRisk, OCCUPATION_OPTIONS } from '@myerp/shared-types';

const HIGH_RISK_THRESHOLD = 80;
const MEDIUM_RISK_THRESHOLD = 40;
const HIGH_VALUE_THRESHOLD = 3000000; // Rs. 30 Lakhs annually

// Risk weights
const WEIGHTS = {
  PEP: 40,
  OCCUPATION: 25,
  VOLUME: 25,
  GEOGRAPHY: 10,
};

// High-risk occupations (using values from OCCUPATION_OPTIONS)
const HIGH_RISK_OCCUPATIONS = OCCUPATION_OPTIONS.filter((opt) => opt.risk === 'HIGH').map(
  (opt) => opt.value
);

/**
 * Calculate risk score for a member
 */
export async function calculateRiskScore(memberId: string): Promise<{
  score: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
}> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      kyc: true,
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  const factors: string[] = [];
  let score = 0;

  // Factor 1: PEP Status (including family members)
  const pepScore = await checkPepStatus(member);
  if (pepScore > 0) {
    score += (pepScore / 100) * WEIGHTS.PEP;
    if (member.pepStatus) {
      factors.push('PEP');
    }
    if (pepScore === 100 && !member.pepStatus) {
      factors.push('PEP_FAMILY');
    }
  }

  // Factor 2: Occupation Risk
  const occupationScore = checkOccupationRisk(member.kyc?.occupation);
  if (occupationScore > 0) {
    score += (occupationScore / 100) * WEIGHTS.OCCUPATION;
    factors.push('OCCUPATION');
  }

  // Factor 3: Transaction Volume
  const volumeScore = await checkTransactionVolume(memberId, member.cooperativeId);
  if (volumeScore > 0) {
    score += (volumeScore / 100) * WEIGHTS.VOLUME;
    factors.push('VOLUME');
  }

  // Factor 4: Geography Risk (placeholder - implement based on your requirements)
  const geoScore = checkGeographyRisk(member.kyc?.country, member.kyc?.state);
  if (geoScore > 0) {
    score += (geoScore / 100) * WEIGHTS.GEOGRAPHY;
    factors.push('GEOGRAPHY');
  }

  // Determine category
  let category: 'LOW' | 'MEDIUM' | 'HIGH';
  if (score > HIGH_RISK_THRESHOLD) {
    category = 'HIGH';
  } else if (score > MEDIUM_RISK_THRESHOLD) {
    category = 'MEDIUM';
  } else {
    category = 'LOW';
  }

  return { score, category, factors };
}

/**
 * Check PEP status including family members (recursive PEP screening)
 */
async function checkPepStatus(member: any): Promise<number> {
  // Direct PEP status
  if (member.pepStatus) {
    return 100;
  }

  // Check family members
  if (member.familyDetails) {
    const familyDetails = member.familyDetails as any;
    if (Array.isArray(familyDetails)) {
      for (const familyMember of familyDetails) {
        // Check if family member is a PEP
        // In a real implementation, you'd check against PEP lists
        // For now, we'll check if they're marked as PEP in the system
        const familyMemberRecord = await prisma.member.findFirst({
          where: {
            cooperativeId: member.cooperativeId,
            OR: [
              { firstName: familyMember.firstName, lastName: familyMember.lastName },
              { fullName: `${familyMember.firstName} ${familyMember.lastName}` },
            ],
            pepStatus: true,
          },
        });

        if (familyMemberRecord) {
          return 100; // Family member is PEP
        }
      }
    }
  }

  return 0;
}

/**
 * Check occupation risk
 */
function checkOccupationRisk(occupation?: string | null): number {
  if (!occupation) {
    return 0;
  }

  // Use the shared function to get risk level
  const riskLevel = getOccupationRisk(occupation);

  if (riskLevel === 'HIGH') {
    return 100;
  } else if (riskLevel === 'MEDIUM') {
    return 50;
  }

  return 0;
}

/**
 * Check transaction volume (last 12 months)
 */
async function checkTransactionVolume(memberId: string, cooperativeId: string): Promise<number> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Get all transactions for this member in the last year
  // This is a simplified version - in reality, you'd aggregate from actual transaction tables
  const savingsAccounts = await prisma.savingAccount.findMany({
    where: {
      memberId,
      cooperativeId,
    },
  });

  // Calculate total transaction volume
  // Note: This is a placeholder - you'd need to query actual transaction history
  // For now, we'll use a simplified approach
  let totalVolume = new Decimal(0);

  // You would aggregate from actual transaction records here
  // For demonstration, we'll check if balance exceeds threshold
  for (const account of savingsAccounts) {
    totalVolume = totalVolume.add(account.balance);
  }

  if (totalVolume.gte(HIGH_VALUE_THRESHOLD)) {
    return 100;
  }

  return 0;
}

/**
 * Check geography risk
 */
function checkGeographyRisk(country?: string | null, state?: string | null): number {
  // Placeholder implementation
  // In a real system, you'd have a list of high-risk countries/regions
  const HIGH_RISK_COUNTRIES = ['XX']; // Placeholder
  const HIGH_RISK_STATES = ['XX']; // Placeholder

  if (country && HIGH_RISK_COUNTRIES.includes(country)) {
    return 100;
  }

  if (state && HIGH_RISK_STATES.includes(state)) {
    return 50;
  }

  return 0;
}

/**
 * Update member risk category and calculate next KYM review date
 */
export async function updateMemberRisk(memberId: string): Promise<void> {
  const { score, category, factors } = await calculateRiskScore(memberId);

  // Calculate next KYM review date based on risk category
  const lastKymUpdate = await prisma.member.findUnique({
    where: { id: memberId },
    select: { lastKymUpdate: true },
  });

  let nextKymReviewDate: Date | null = null;
  if (lastKymUpdate?.lastKymUpdate) {
    const baseDate = new Date(lastKymUpdate.lastKymUpdate);
    const yearsToAdd = category === 'HIGH' ? 1 : category === 'MEDIUM' ? 2 : 3;
    nextKymReviewDate = new Date(baseDate);
    nextKymReviewDate.setFullYear(nextKymReviewDate.getFullYear() + yearsToAdd);
  }

  // Update member
  await prisma.member.update({
    where: { id: memberId },
    data: {
      riskCategory: category,
      riskFactors: factors,
      nextKymReviewDate,
    },
  });
}
