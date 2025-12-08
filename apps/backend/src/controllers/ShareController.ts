import { BaseController } from './BaseController.js';
import { ShareService } from '../services/share.service.js';
import { prisma } from '../lib/prisma.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { getCurrentSharePrice } from '../services/accounting.js';

/**
 * Share Controller
 * Handles share capital, accounts, and transactions
 */
export class ShareController extends BaseController {
  /**
   * Get share dashboard statistics
   */
  async getDashboardStats(cooperativeId: string) {
    await this.validateTenant(cooperativeId);

    const [totalAccounts, totalKitta, totalAmount, recentTransactions] = await Promise.all([
      this.prisma.shareAccount.count({
        where: { cooperativeId },
      }),
      this.prisma.shareAccount.aggregate({
        where: { cooperativeId },
        _sum: { totalKitta: true },
      }),
      this.prisma.shareAccount.aggregate({
        where: { cooperativeId },
        _sum: { totalAmount: true },
      }),
      this.prisma.shareTransaction.findMany({
        where: { cooperativeId },
        take: 10,
        orderBy: { date: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      totalShareCapital: totalAmount._sum.totalAmount || 0,
      totalKitta: totalKitta._sum.totalKitta || 0,
      totalMembers: totalAccounts,
      recentTransactions,
    };
  }

  /**
   * Get share accounts with pagination and filtering
   */
  async getAccounts(
    cooperativeId: string,
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      search?: string;
      memberId?: string;
    }
  ) {
    await this.validateTenant(cooperativeId);

    // Filter to get members without share accounts
    await this.ensureShareAccountsExist(cooperativeId);

    const { page, limit, sortBy, sortOrder, search, memberId } = params;

    const where: any = {
      cooperativeId,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (search) {
      where.OR = [
        { certificateNo: { contains: search, mode: 'insensitive' as const } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      this.prisma.shareAccount.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip: page && limit ? (page - 1) * limit : undefined,
        take: limit,
      }),
      this.prisma.shareAccount.count({ where }),
    ]);

    return { accounts, total };
  }

  /**
   * Ensure all active members have share accounts (Migration logic)
   */
  private async ensureShareAccountsExist(cooperativeId: string) {
    // Get all active members with member numbers
    const allActiveMembers = await this.prisma.member.findMany({
      where: {
        cooperativeId,
        workflowStatus: 'active',
        isActive: true,
        memberNumber: { not: null },
      },
      select: { id: true },
    });

    // Get all memberIds that already have share accounts
    const membersWithAccounts = await this.prisma.shareAccount.findMany({
      where: { cooperativeId },
      select: { memberId: true },
    });
    const memberIdsWithAccounts = new Set(membersWithAccounts.map((acc) => acc.memberId));

    // Filter to get members without share accounts
    const approvedMembersWithoutAccounts = allActiveMembers.filter(
      (member) => !memberIdsWithAccounts.has(member.id)
    );

    // Create share accounts for approved members who don't have them
    if (approvedMembersWithoutAccounts.length > 0) {
      const unitPrice = await getCurrentSharePrice(cooperativeId, 100);

      const latestCert = await this.prisma.shareAccount.findFirst({
        where: { cooperativeId },
        orderBy: { createdAt: 'desc' },
        select: { certificateNo: true },
      });

      let nextCertNumber = 1;
      if (latestCert?.certificateNo) {
        const match = latestCert.certificateNo.match(/CERT-(\d+)/);
        if (match) {
          nextCertNumber = parseInt(match[1], 10) + 1;
        }
      }

      for (const member of approvedMembersWithoutAccounts) {
        // Double check inside loop
        const existingAccount = await this.prisma.shareAccount.findUnique({
          where: { memberId: member.id },
        });

        if (!existingAccount) {
          try {
            await this.prisma.$transaction(async (tx) => {
              const stillMissing = await tx.shareAccount.findUnique({
                where: { memberId: member.id },
              });

              if (!stillMissing) {
                const certNo = `CERT-${String(nextCertNumber).padStart(6, '0')}`;
                await tx.shareAccount.create({
                  data: {
                    cooperativeId,
                    memberId: member.id,
                    certificateNo: certNo,
                    unitPrice,
                    totalKitta: 0,
                    totalAmount: 0,
                    issueDate: new Date(),
                  },
                });
                nextCertNumber++;
              }
            });
          } catch (err) {
            console.warn(`Failed to create share account for member ${member.id}:`, err);
          }
        }
      }
    }
  }

  /**
   * Get specific share account by Member ID
   */
  async getAccountByMemberId(memberId: string, cooperativeId: string) {
    await this.validateTenant(cooperativeId);

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.cooperativeId !== cooperativeId) {
      throw new Error('Member not found');
    }

    let account = await this.prisma.shareAccount.findUnique({
      where: { memberId },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    // Create if doesn't exist (Legacy behavior support)
    if (!account) {
      const count = await this.prisma.shareAccount.count({
        where: { cooperativeId },
      });
      const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

      account = await this.prisma.shareAccount.create({
        data: {
          memberId,
          cooperativeId,
          certificateNo: certNo,
          totalKitta: 0,
          unitPrice: 100,
          totalAmount: 0,
        },
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
          transactions: {
            orderBy: { date: 'desc' },
          },
        },
      });
    }

    return account;
  }

  /**
   * Get certificates ready to print
   */
  async getCertificates(
    cooperativeId: string,
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      search?: string;
    }
  ) {
    await this.validateTenant(cooperativeId);
    const { page, limit, sortBy, sortOrder, search } = params;

    const where: any = {
      cooperativeId,
      totalKitta: { gt: 0 },
    };

    if (search) {
      where.OR = [
        { certificateNo: { contains: search, mode: 'insensitive' } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' } } },
        { member: { firstName: { contains: search, mode: 'insensitive' } } },
        { member: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      this.prisma.shareAccount.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip: page && limit ? (page - 1) * limit : undefined,
        take: limit,
      }),
      this.prisma.shareAccount.count({ where }),
    ]);

    return { accounts, total };
  }

  /**
   * Issue shares
   */
  async issueShares(
    data: {
      cooperativeId: string;
      memberId: string;
      kitta: number;
      date: Date | string;
      paymentMode: string;
      bankAccountId?: string;
      savingAccountId?: string;
      remarks?: string;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return ShareService.issueShares({
      ...data,
      date: new Date(data.date),
      userId: userId!,
      paymentMode: data.paymentMode as 'CASH' | 'BANK' | 'SAVING',
    });
  }

  /**
   * Return (Surrender) shares
   */
  async returnShares(
    data: {
      cooperativeId: string;
      memberId: string;
      kitta: number;
      date: Date | string;
      paymentMode: string;
      bankAccountId?: string;
      remarks?: string;
    },
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    const transaction = await ShareService.returnShares({
      ...data,
      date: new Date(data.date),
      userId: userId!,
      paymentMode: data.paymentMode as 'CASH' | 'BANK',
    });

    if (userId) {
      await createAuditLog({
        action: AuditAction.TRANSACTION_CREATED,
        userId,
        tenantId: data.cooperativeId,
        resourceType: 'ShareTransaction',
        resourceId: transaction.id,
        ipAddress,
        userAgent,
        success: true,
        details: {
          action: 'return',
          memberId: data.memberId,
          kitta: data.kitta,
          amount: transaction.amount?.toString(),
        },
      });
    }

    return transaction;
  }

  /**
   * Transfer shares
   */
  async transferShares(
    data: {
      cooperativeId: string;
      fromMemberId: string;
      toMemberId: string;
      kitta: number;
      date: Date | string;
      remarks?: string;
    },
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    const result = await ShareService.transferShares({
      ...data,
      date: new Date(data.date),
      userId: userId!,
    });

    if (userId) {
      await createAuditLog({
        action: AuditAction.TRANSACTION_CREATED,
        userId,
        tenantId: data.cooperativeId,
        resourceType: 'ShareTransaction',
        resourceId: result.fromTransaction?.id || result.toTransaction?.id,
        ipAddress,
        userAgent,
        success: true,
        details: {
          action: 'transfer',
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          kitta: data.kitta,
        },
      });
    }

    return result;
  }

  /**
   * Issue bonus shares
   */
  async issueBonus(
    data: {
      cooperativeId: string;
      memberId: string;
      kitta: number;
      date: Date | string;
      remarks?: string;
    },
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    const transaction = await ShareService.issueBonusShares({
      ...data,
      date: new Date(data.date),
      userId: userId!,
    });

    if (userId) {
      await createAuditLog({
        action: AuditAction.TRANSACTION_CREATED,
        userId,
        tenantId: data.cooperativeId,
        resourceType: 'ShareTransaction',
        resourceId: transaction.id,
        ipAddress,
        userAgent,
        success: true,
        details: {
          action: 'bonus_issue',
          memberId: data.memberId,
          kitta: data.kitta,
        },
      });
    }

    return transaction;
  }

  /**
   * Get all transactions
   */
  async getTransactions(
    cooperativeId: string,
    filters?: {
      memberId?: string;
      type?: string;
    }
  ) {
    await this.validateTenant(cooperativeId);

    const where: any = {
      cooperativeId,
    };

    if (filters?.memberId) where.memberId = filters.memberId;
    if (filters?.type) where.type = filters.type;

    return this.prisma.shareTransaction.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        account: {
          select: {
            id: true,
            certificateNo: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }
}

export const shareController = new ShareController();
