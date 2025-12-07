import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Day End / Day Begin (EOD/BOD) Service
 * Manages daily accounting date control and teller cash settlement
 */

/**
 * Get transaction date by combining DayBook date with current server time
 * This ensures correct ledger sorting while respecting the accounting date
 */
function getTransactionDate(dayBookDate: Date): Date {
  const now = new Date(); // Current Server Time

  // Clone the DayBook date to avoid mutating the original object
  const transactionDate = new Date(dayBookDate);

  // Inject current time into the DayBook date
  transactionDate.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );

  return transactionDate;
}

/**
 * Helper function to create journal entry within a transaction
 */
async function createJournalEntryInTx(
  tx: any, // Using any to support extended Prisma client transaction
  cooperativeId: string,
  description: string,
  entries: Array<{ accountId: string; debit: number; credit: number }>,
  date: Date
): Promise<{ journalEntry: any; ledgers: any[] }> {
  // Validate double-entry
  const totalDebits = entries.reduce((sum, e) => sum + Number(e.debit), 0);
  const totalCredits = entries.reduce((sum, e) => sum + Number(e.credit), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Double-entry validation failed: Debits (${totalDebits}) must equal Credits (${totalCredits})`
    );
  }

  // Generate entry number
  const year = date.getFullYear();
  const entryCount = await tx.journalEntry.count({
    where: {
      cooperativeId,
      date: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const entryNumber = `JE-${year}-${String(entryCount + 1).padStart(6, '0')}`;

  // Create journal entry
  const journalEntry = await tx.journalEntry.create({
    data: {
      cooperativeId,
      entryNumber,
      description,
      date,
    },
  });

  // Batch fetch all accounts and latest balances to avoid N+1 queries
  const accountIds = entries.map((entry) => entry.accountId);
  const [accounts, latestLedgers] = await Promise.all([
    tx.chartOfAccounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, type: true },
    }),
    // Get latest ledger entry for each account
    tx.ledger.findMany({
      where: {
        accountId: { in: accountIds },
        cooperativeId,
      },
      select: {
        accountId: true,
        balance: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Create maps for O(1) lookup
  const accountMap = new Map(accounts.map((acc: any) => [acc.id, acc]));
  const balanceMap = new Map<string, number>();
  const seenAccounts = new Set<string>();
  for (const ledger of latestLedgers) {
    if (!seenAccounts.has(ledger.accountId)) {
      balanceMap.set(ledger.accountId, Number(ledger.balance));
      seenAccounts.add(ledger.accountId);
    }
  }

  // Create ledger entries with calculated balances
  const ledgerEntries = await Promise.all(
    entries.map(async (entry) => {
      const account = accountMap.get(entry.accountId) as { id: string; type: string } | undefined;

      if (!account) {
        throw new Error(`Account not found: ${entry.accountId}`);
      }

      // Calculate new balance based on account type
      const isDebitNormal = account.type === 'asset' || account.type === 'expense';
      const balanceChange = isDebitNormal ? entry.debit - entry.credit : entry.credit - entry.debit;

      // Get current balance from map (O(1) lookup)
      const currentBalance = balanceMap.get(entry.accountId) || 0;
      const newBalance = currentBalance + balanceChange;

      return tx.ledger.create({
        data: {
          cooperativeId,
          accountId: entry.accountId,
          journalEntryId: journalEntry.id,
          debit: new Prisma.Decimal(entry.debit),
          credit: new Prisma.Decimal(entry.credit),
          balance: new Prisma.Decimal(newBalance),
        },
      });
    })
  );

  return { journalEntry, ledgers: ledgerEntries };
}

/**
 * Get the currently active (OPEN) day for a cooperative
 */
export async function getActiveDay(cooperativeId: string) {
  return await prisma.dayBook.findFirst({
    where: {
      cooperativeId,
      status: 'OPEN',
    },
  });
}

/**
 * Start a new day (Day Begin)
 * Validates previous day is CLOSED and creates new DayBook entry
 */
export async function startDay(cooperativeId: string, date: Date, userId: string) {
  // Validate previous day is CLOSED
  const previousDay = await prisma.dayBook.findFirst({
    where: {
      cooperativeId,
      date: {
        lt: date,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (previousDay && previousDay.status !== 'CLOSED') {
    throw new Error(
      `Previous day (${previousDay.date.toISOString()}) is not closed. Please close it before starting a new day.`
    );
  }

  // Check if a day already exists for this date
  const existingDay = await prisma.dayBook.findUnique({
    where: {
      cooperativeId_date: {
        cooperativeId,
        date: new Date(date.setHours(0, 0, 0, 0)), // Normalize to midnight
      },
    },
  });

  if (existingDay) {
    if (existingDay.status === 'OPEN') {
      throw new Error('Day is already open for this date.');
    }
    // If closed, we can reopen it (but only if it's today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(existingDay.date);
    dayDate.setHours(0, 0, 0, 0);

    if (dayDate.getTime() === today.getTime()) {
      // Reopen current day
      return await prisma.dayBook.update({
        where: { id: existingDay.id },
        data: {
          status: 'OPEN',
          dayBeginBy: userId,
          version: existingDay.version + 1,
        },
      });
    } else {
      throw new Error('Cannot start a day for a past date. Use reopen instead.');
    }
  }

  // Get opening cash from previous day's closing cash
  const openingCash = previousDay?.closingCash || new Decimal(0);

  // Create new DayBook entry
  return await prisma.dayBook.create({
    data: {
      cooperativeId,
      date: new Date(date.setHours(0, 0, 0, 0)), // Normalize to midnight
      status: 'OPEN',
      dayBeginBy: userId,
      openingCash,
      version: 1,
    },
  });
}

/**
 * Preview settlement impact before actual settlement
 */
export async function previewSettlement(
  cooperativeId: string,
  tellerId: string,
  physicalCash: number,
  denominationData?: any
) {
  const activeDay = await getActiveDay(cooperativeId);
  if (!activeDay) {
    throw new Error('No active day found. Please start the day first.');
  }

  // Validate denomination data if provided
  if (denominationData) {
    const calculatedTotal = Object.entries(denominationData).reduce(
      (sum, [denomination, count]: [string, any]) => {
        return sum + parseFloat(denomination) * parseInt(count);
      },
      0
    );

    if (Math.abs(calculatedTotal - physicalCash) > 0.01) {
      throw new Error(
        `Denomination total (${calculatedTotal}) does not match physical cash (${physicalCash})`
      );
    }
  }

  // Get teller's cash account mapped to the user
  const tellerAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: { startsWith: '00-10100-02-' }, // Teller Cash accounts
      type: 'asset',
      isActive: true,
      mappedUserId: tellerId,
    },
  });

  if (!tellerAccount) {
    throw new Error(
      `Teller cash account not found for user ${tellerId}. Please ensure the teller is mapped to a cash account.`
    );
  }

  // Get current balance
  const latestLedger = await prisma.ledger.findFirst({
    where: { accountId: tellerAccount.id },
    orderBy: { createdAt: 'desc' },
  });

  const systemCash = latestLedger ? Number(latestLedger.balance) : 0;
  const difference = physicalCash - systemCash;

  // Determine if approval is required (threshold check)
  const thresholdPercentage = 0.01; // 1% variance
  const thresholdAmount = 1000; // NPR 1000
  const requiresApproval =
    Math.abs(difference) > thresholdAmount ||
    (systemCash > 0 && Math.abs(difference / systemCash) > thresholdPercentage);

  const adjustmentEntries: Array<{
    accountId: string;
    debit: number;
    credit: number;
    narration: string;
  }> = [];

  // Shortage adjustment
  if (difference < 0) {
    // Need to find or create Staff Receivable account
    const staffReceivableAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '00-10200-' }, // Staff Receivable (assuming this code)
        type: 'asset',
        isActive: true,
      },
    });

    if (staffReceivableAccount) {
      adjustmentEntries.push({
        accountId: staffReceivableAccount.id,
        debit: Math.abs(difference),
        credit: 0,
        narration: `Cash Shortage Adjustment - ${activeDay.date.toISOString().split('T')[0]} - Teller ${tellerId}`,
      });
      adjustmentEntries.push({
        accountId: tellerAccount.id,
        debit: 0,
        credit: Math.abs(difference),
        narration: `Cash Shortage Adjustment - ${activeDay.date.toISOString().split('T')[0]} - Teller ${tellerId}`,
      });
    }
  }

  // Overage adjustment
  if (difference > 0) {
    // Need to find or create Sundry Income account
    const sundryIncomeAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '00-40400-' }, // Sundry Income (assuming this code)
        type: 'revenue',
        isActive: true,
      },
    });

    if (sundryIncomeAccount) {
      adjustmentEntries.push({
        accountId: tellerAccount.id,
        debit: difference,
        credit: 0,
        narration: `Cash Overage Adjustment - ${activeDay.date.toISOString().split('T')[0]} - Teller ${tellerId}`,
      });
      adjustmentEntries.push({
        accountId: sundryIncomeAccount.id,
        debit: 0,
        credit: difference,
        narration: `Cash Overage Adjustment - ${activeDay.date.toISOString().split('T')[0]} - Teller ${tellerId}`,
      });
    }
  }

  // Vault transfer entry
  const mainVaultAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-10100-01-00001', // Main Vault Cash
      type: 'asset',
      isActive: true,
    },
  });

  if (!mainVaultAccount) {
    throw new Error('Main Vault Cash account not found.');
  }

  const vaultTransferEntries = [
    {
      accountId: mainVaultAccount.id,
      debit: physicalCash,
      credit: 0,
      narration: `Vault Transfer - Teller ${tellerId}`,
    },
    {
      accountId: tellerAccount.id,
      debit: 0,
      credit: physicalCash,
      narration: `Vault Transfer - Teller ${tellerId}`,
    },
  ];

  return {
    systemCash,
    physicalCash,
    difference,
    requiresApproval,
    adjustmentEntries,
    vaultTransferEntries,
    proposedJournalEntries: [...adjustmentEntries, ...vaultTransferEntries],
  };
}

/**
 * Settle teller cash (Teller Settlement)
 * Must use prisma.$transaction for atomicity
 */
export async function settleTeller(
  cooperativeId: string,
  tellerId: string,
  physicalCash: number,
  userId: string,
  denominationData?: any,
  attachmentUrl?: string,
  idempotencyKey?: string
) {
  return await prisma.$transaction(async (tx) => {
    const activeDay = await tx.dayBook.findFirst({
      where: {
        cooperativeId,
        status: 'OPEN',
      },
    });

    if (!activeDay) {
      throw new Error('No active day found. Please start the day first.');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingSettlement = await tx.tellerSettlement.findUnique({
        where: { settlementRef: idempotencyKey },
      });

      if (existingSettlement) {
        return existingSettlement; // Return existing settlement
      }
    }

    // Validate denomination data if provided
    if (denominationData) {
      const calculatedTotal = Object.entries(denominationData).reduce(
        (sum, [denomination, count]: [string, any]) => {
          return sum + parseFloat(denomination) * parseInt(count);
        },
        0
      );

      if (Math.abs(calculatedTotal - physicalCash) > 0.01) {
        throw new Error(
          `Denomination total (${calculatedTotal}) does not match physical cash (${physicalCash})`
        );
      }
    }

    // Get teller's cash account mapped to the user
    const tellerAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '00-10100-02-' },
        type: 'asset',
        isActive: true,
        mappedUserId: tellerId,
      },
    });

    if (!tellerAccount) {
      throw new Error(
        `Teller cash account not found for user ${tellerId}. Please ensure the teller is mapped to a cash account.`
      );
    }

    // Get current balance
    const latestLedger = await tx.ledger.findFirst({
      where: { accountId: tellerAccount.id },
      orderBy: { createdAt: 'desc' },
    });

    const systemCash = latestLedger ? Number(latestLedger.balance) : 0;
    const difference = physicalCash - systemCash;

    // Determine approval status
    const thresholdPercentage = 0.01;
    const thresholdAmount = 1000;
    const requiresApproval =
      Math.abs(difference) > thresholdAmount ||
      (systemCash > 0 && Math.abs(difference / systemCash) > thresholdPercentage);

    const settlementRef = idempotencyKey || `SETTLE-${activeDay.id}-${tellerId}-${Date.now()}`;

    // Create adjustment entries if needed
    const transactionDate = getTransactionDate(activeDay.date);
    const journalEntryIds: string[] = [];

    if (difference < 0) {
      // Shortage
      const staffReceivableAccount = await tx.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: { startsWith: '00-10200-' },
          type: 'asset',
          isActive: true,
        },
      });

      if (staffReceivableAccount) {
        const { journalEntry } = await createJournalEntryInTx(
          tx,
          cooperativeId,
          `Cash Shortage Adjustment - ${activeDay.date.toISOString().split('T')[0]} - Teller ${tellerId}`,
          [
            {
              accountId: staffReceivableAccount.id,
              debit: Math.abs(difference),
              credit: 0,
            },
            {
              accountId: tellerAccount.id,
              debit: 0,
              credit: Math.abs(difference),
            },
          ],
          transactionDate
        );
        journalEntryIds.push(journalEntry.id);
      }
    } else if (difference > 0) {
      // Overage
      const sundryIncomeAccount = await tx.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: { startsWith: '00-40400-' },
          type: 'revenue',
          isActive: true,
        },
      });

      if (sundryIncomeAccount) {
        const { journalEntry } = await createJournalEntryInTx(
          tx,
          cooperativeId,
          `Cash Overage Adjustment - ${activeDay.date.toISOString().split('T')[0]} - Teller ${tellerId}`,
          [
            {
              accountId: tellerAccount.id,
              debit: difference,
              credit: 0,
            },
            {
              accountId: sundryIncomeAccount.id,
              debit: 0,
              credit: difference,
            },
          ],
          transactionDate
        );
        journalEntryIds.push(journalEntry.id);
      }
    }

    // Create vault transfer entry
    const mainVaultAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001',
        type: 'asset',
        isActive: true,
      },
    });

    if (!mainVaultAccount) {
      throw new Error('Main Vault Cash account not found.');
    }

    const { journalEntry: vaultJournalEntry } = await createJournalEntryInTx(
      tx,
      cooperativeId,
      `Vault Transfer - Teller ${tellerId}`,
      [
        {
          accountId: mainVaultAccount.id,
          debit: physicalCash,
          credit: 0,
        },
        {
          accountId: tellerAccount.id,
          debit: 0,
          credit: physicalCash,
        },
      ],
      transactionDate
    );
    journalEntryIds.push(vaultJournalEntry.id);

    // Create settlement record
    const settlement = await tx.tellerSettlement.create({
      data: {
        dayBookId: activeDay.id,
        cooperativeId, // Direct relation for performance
        tellerId,
        physicalCash: new Decimal(physicalCash),
        systemCash: new Decimal(systemCash),
        difference: new Decimal(difference),
        denominationData: denominationData || null,
        status: requiresApproval ? 'REQUIRES_APPROVAL' : 'AUTO_APPROVED',
        settlementRef,
        executedBy: userId,
        attachmentUrl: attachmentUrl || null,
      },
    });

    return settlement;
  });
}

/**
 * Unsettle / Reject Settlement
 * Reverses a pending settlement
 */
export async function unsettleTeller(
  cooperativeId: string,
  settlementId: string,
  userId: string,
  reason?: string
) {
  return await prisma.$transaction(async (tx) => {
    const settlement = await tx.tellerSettlement.findUnique({
      where: { id: settlementId },
      include: { dayBook: true },
    });

    if (!settlement) {
      throw new Error('Settlement not found.');
    }

    if (settlement.dayBook.cooperativeId !== cooperativeId) {
      throw new Error('Settlement does not belong to this cooperative.');
    }

    if (settlement.dayBook.status !== 'OPEN') {
      throw new Error('Day is not open. Cannot unsettle.');
    }

    if (settlement.status === 'APPROVED') {
      throw new Error('Cannot unsettle an approved settlement.');
    }

    if (settlement.status === 'REVERTED') {
      throw new Error('Settlement is already reverted.');
    }

    // Get teller account
    // Priority 1: Find account mapped to the teller
    let tellerAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '00-10100-02-' },
        type: 'asset',
        isActive: true,
        mappedUserId: settlement.tellerId,
      },
    });

    // Priority 2: Fallback to legacy behavior (first available teller account)
    // This handles cases where accounts were not mapped when settlement occurred
    if (!tellerAccount) {
      const legacyAccounts = await tx.chartOfAccounts.findMany({
        where: {
          cooperativeId,
          code: { startsWith: '00-10100-02-' },
          type: 'asset',
          isActive: true,
        },
      });

      if (legacyAccounts.length > 0) {
        tellerAccount = legacyAccounts[0];
      }
    }

    if (!tellerAccount) {
      throw new Error('Teller cash account not found.');
    }

    const mainVaultAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001',
        type: 'asset',
        isActive: true,
      },
    });

    if (!mainVaultAccount) {
      throw new Error('Main Vault Cash account not found.');
    }

    const transactionDate = getTransactionDate(settlement.dayBook.date);

    // Reverse vault transfer (Credit Vault, Debit Teller)
    await createJournalEntryInTx(
      tx,
      cooperativeId,
      `Reversal: Vault Transfer - Teller ${settlement.tellerId}`,
      [
        {
          accountId: mainVaultAccount.id,
          debit: 0,
          credit: Number(settlement.physicalCash),
        },
        {
          accountId: tellerAccount.id,
          debit: Number(settlement.physicalCash),
          credit: 0,
        },
      ],
      transactionDate
    );

    // Reverse adjustment if there was one
    if (Number(settlement.difference) !== 0) {
      if (Number(settlement.difference) < 0) {
        // Reverse shortage (was: Dr Staff Receivable, Cr Teller)
        const staffReceivableAccount = await tx.chartOfAccounts.findFirst({
          where: {
            cooperativeId,
            code: { startsWith: '00-10200-' },
            type: 'asset',
            isActive: true,
          },
        });

        if (staffReceivableAccount) {
          await createJournalEntryInTx(
            tx,
            cooperativeId,
            `Reversal: Cash Shortage Adjustment - Teller ${settlement.tellerId}`,
            [
              {
                accountId: staffReceivableAccount.id,
                debit: 0,
                credit: Math.abs(Number(settlement.difference)),
              },
              {
                accountId: tellerAccount.id,
                debit: Math.abs(Number(settlement.difference)),
                credit: 0,
              },
            ],
            transactionDate
          );
        }
      } else {
        // Reverse overage (was: Dr Teller, Cr Sundry Income)
        const sundryIncomeAccount = await tx.chartOfAccounts.findFirst({
          where: {
            cooperativeId,
            code: { startsWith: '00-40400-' },
            type: 'revenue',
            isActive: true,
          },
        });

        if (sundryIncomeAccount) {
          await createJournalEntryInTx(
            tx,
            cooperativeId,
            `Reversal: Cash Overage Adjustment - Teller ${settlement.tellerId}`,
            [
              {
                accountId: tellerAccount.id,
                debit: 0,
                credit: Number(settlement.difference),
              },
              {
                accountId: sundryIncomeAccount.id,
                debit: Number(settlement.difference),
                credit: 0,
              },
            ],
            transactionDate
          );
        }
      }
    }

    // Update settlement status
    return await tx.tellerSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'REVERTED',
        rejectionReason: reason || null,
      },
    });
  });
}

/**
 * Close Day (Day End)
 * Manager's function - Idempotent & Atomic
 */
export async function closeDay(cooperativeId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Find active day and attempt to set EOD_IN_PROGRESS atomically
    // This prevents concurrent close operations
    const activeDay = await tx.dayBook.findFirst({
      where: {
        cooperativeId,
        status: 'OPEN',
      },
    });

    if (!activeDay) {
      throw new Error('No active day found.');
    }

    // Atomically update to EOD_IN_PROGRESS to prevent new transactions
    // This acts as a lock - if another process already set it, this will fail
    const dayInProgress = await tx.dayBook.updateMany({
      where: {
        id: activeDay.id,
        status: 'OPEN', // Only update if still OPEN (optimistic lock)
        version: activeDay.version, // Version check for optimistic locking
      },
      data: {
        status: 'EOD_IN_PROGRESS',
        version: activeDay.version + 1,
      },
    });

    // If no rows were updated, another process beat us to it
    if (dayInProgress.count === 0) {
      // Re-fetch to see current state
      const currentState = await tx.dayBook.findUnique({
        where: { id: activeDay.id },
      });

      if (currentState?.status === 'EOD_IN_PROGRESS') {
        throw new Error('Day End is already in progress by another process.');
      } else if (currentState?.status === 'CLOSED') {
        throw new Error('Day has already been closed.');
      } else {
        throw new Error('Day has been modified. Please refresh and try again.');
      }
    }

    // Fetch the updated record
    const currentDay = await tx.dayBook.findUnique({
      where: { id: activeDay.id },
    });

    if (!currentDay || currentDay.status !== 'EOD_IN_PROGRESS') {
      throw new Error('Failed to set day to EOD_IN_PROGRESS state.');
    }

    // Get all teller accounts
    const tellerAccounts = await tx.chartOfAccounts.findMany({
      where: {
        cooperativeId,
        code: { startsWith: '00-10100-02-' },
        type: 'asset',
        isActive: true,
      },
    });

    // Check each teller's balance
    const pendingTellers: Array<{ accountId: string; accountName: string; balance: number }> = [];

    for (const account of tellerAccounts) {
      const latestLedger = await tx.ledger.findFirst({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
      });

      const balance = latestLedger ? Number(latestLedger.balance) : 0;

      if (Math.abs(balance) > 0.01) {
        pendingTellers.push({
          accountId: account.id,
          accountName: account.name,
          balance,
        });
      }
    }

    if (pendingTellers.length > 0) {
      const tellerList = pendingTellers
        .map((t) => `${t.accountName} (Balance: ${t.balance})`)
        .join(', ');
      throw new Error(
        `TELLER_PENDING_SETTLEMENT: The following tellers have pending settlement: ${tellerList}. Please settle again.`
      );
    }

    // Calculate closing summaries
    const mainVaultAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001',
        type: 'asset',
        isActive: true,
      },
    });

    let closingCash = new Decimal(0);
    if (mainVaultAccount) {
      const latestVaultLedger = await tx.ledger.findFirst({
        where: { accountId: mainVaultAccount.id },
        orderBy: { createdAt: 'desc' },
      });
      closingCash = latestVaultLedger ? latestVaultLedger.balance : new Decimal(0);
    }

    const transactionsCount = await tx.journalEntry.count({
      where: {
        cooperativeId,
        date: {
          gte: currentDay.date,
          lt: new Date(currentDay.date.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
      },
    });

    // Update DayBook status to CLOSED
    return await tx.dayBook.update({
      where: { id: currentDay.id },
      data: {
        status: 'CLOSED',
        dayEndBy: userId,
        closingCash,
        transactionsCount,
        version: currentDay.version + 1, // Increment from EOD_IN_PROGRESS version
      },
    });
  });
}

/**
 * Force Close Day End
 * Manager override with automatic suspense account entries
 */
export async function forceCloseDay(
  cooperativeId: string,
  userId: string,
  reason: string,
  _approverId: string
) {
  return await prisma.$transaction(async (tx) => {
    const activeDay = await tx.dayBook.findFirst({
      where: {
        cooperativeId,
        status: 'OPEN',
      },
    });

    if (!activeDay) {
      throw new Error('No active day found.');
    }

    // Get all teller accounts with non-zero balances
    const tellerAccounts = await tx.chartOfAccounts.findMany({
      where: {
        cooperativeId,
        code: { startsWith: '00-10100-02-' },
        type: 'asset',
        isActive: true,
      },
    });

    const transactionDate = getTransactionDate(activeDay.date);

    // Find or create Suspense Account
    let suspenseAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '00-10300-' }, // Suspense Account
        type: 'asset',
        isActive: true,
      },
    });

    if (!suspenseAccount) {
      // Create suspense account if it doesn't exist
      suspenseAccount = await tx.chartOfAccounts.create({
        data: {
          cooperativeId,
          code: '00-10300-01-00001',
          name: 'Suspense Account (Manager Liability)',
          type: 'asset',
          isActive: true,
          isGroup: false,
        },
      });
    }

    // Process each teller account with non-zero balance
    for (const tellerAccount of tellerAccounts) {
      const latestLedger = await tx.ledger.findFirst({
        where: { accountId: tellerAccount.id },
        orderBy: { createdAt: 'desc' },
      });

      const balance = latestLedger ? Number(latestLedger.balance) : 0;

      if (Math.abs(balance) > 0.01) {
        // Create suspense entry to zero out the teller balance
        // If balance is positive: Debit Suspense, Credit Teller (to bring teller to 0)
        // If balance is negative: Credit Suspense, Debit Teller (to bring teller to 0)
        const absBalance = Math.abs(balance);

        if (balance > 0) {
          // Positive balance: Debit Suspense, Credit Teller
          await createJournalEntryInTx(
            tx,
            cooperativeId,
            `Force Close Adjustment - ${tellerAccount.name} - ${reason}`,
            [
              {
                accountId: suspenseAccount.id,
                debit: absBalance,
                credit: 0,
              },
              {
                accountId: tellerAccount.id,
                debit: 0,
                credit: absBalance,
              },
            ],
            transactionDate
          );
        } else {
          // Negative balance: Credit Suspense, Debit Teller
          await createJournalEntryInTx(
            tx,
            cooperativeId,
            `Force Close Adjustment - ${tellerAccount.name} - ${reason}`,
            [
              {
                accountId: suspenseAccount.id,
                debit: 0,
                credit: absBalance,
              },
              {
                accountId: tellerAccount.id,
                debit: absBalance,
                credit: 0,
              },
            ],
            transactionDate
          );
        }
      }
    }

    // Mark all pending/unsettled settlements for this day as force-closed
    // Since we don't have a direct mapping between accounts and tellers,
    // we mark all settlements that aren't already approved/reverted
    await tx.tellerSettlement.updateMany({
      where: {
        dayBookId: activeDay.id,
        status: {
          notIn: ['APPROVED', 'REVERTED'],
        },
      },
      data: {
        isForceClosed: true,
      },
    });

    // Calculate closing summaries
    const mainVaultAccount = await tx.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001',
        type: 'asset',
        isActive: true,
      },
    });

    let closingCash = new Decimal(0);
    if (mainVaultAccount) {
      const latestVaultLedger = await tx.ledger.findFirst({
        where: { accountId: mainVaultAccount.id },
        orderBy: { createdAt: 'desc' },
      });
      closingCash = latestVaultLedger ? latestVaultLedger.balance : new Decimal(0);
    }

    const transactionsCount = await tx.journalEntry.count({
      where: {
        cooperativeId,
        date: {
          gte: activeDay.date,
          lt: new Date(activeDay.date.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Update DayBook status to CLOSED
    return await tx.dayBook.update({
      where: { id: activeDay.id },
      data: {
        status: 'CLOSED',
        dayEndBy: userId,
        closingCash,
        transactionsCount,
        version: activeDay.version + 1,
      },
    });
  });
}

/**
 * Reopen Day
 * Can ONLY reopen the Current System Date
 */
export async function reopenDay(
  cooperativeId: string,
  _userId: string,
  _reason: string,
  _approverId: string
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayBook = await prisma.dayBook.findFirst({
    where: {
      cooperativeId,
      date: today,
    },
  });

  if (!dayBook) {
    throw new Error('No day found for today. Please start a new day instead.');
  }

  // Only allow reopening current date
  const dayDate = new Date(dayBook.date);
  dayDate.setHours(0, 0, 0, 0);

  if (dayDate.getTime() !== today.getTime()) {
    throw new Error('Cannot reopen past dates. Only current date can be reopened.');
  }

  if (dayBook.status !== 'CLOSED') {
    throw new Error(`Day is already ${dayBook.status}. Cannot reopen.`);
  }

  return await prisma.dayBook.update({
    where: { id: dayBook.id },
    data: {
      status: 'OPEN',
      version: dayBook.version + 1,
      // Note: We could add a reopenReason field if needed
    },
  });
}
