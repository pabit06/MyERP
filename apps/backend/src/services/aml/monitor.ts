import { prisma } from '../../lib/prisma.js';
import { amlEvents, AML_EVENTS, TransactionEvent } from '../../lib/events.js';
import { Decimal } from '@prisma/client/runtime/library';

const TTR_THRESHOLD = 1000000; // Rs. 10 Lakhs
const SOF_THRESHOLD = 1000000; // Rs. 10 Lakhs
const TTR_DEADLINE_DAYS = 15;

/**
 * Initialize AML monitoring listeners
 */
export function initializeAmlMonitoring() {
  // Listen for deposit events
  amlEvents.on(AML_EVENTS.ON_DEPOSIT, async (event: TransactionEvent) => {
    await processTransactionEvent(event);
  });

  // Listen for withdrawal events
  amlEvents.on(AML_EVENTS.ON_WITHDRAWAL, async (event: TransactionEvent) => {
    await processTransactionEvent(event);
  });

  // Listen for share purchase events
  amlEvents.on(AML_EVENTS.ON_SHARE_PURCHASE, async (event: TransactionEvent) => {
    await processTransactionEvent(event);
  });

  // Listen for loan repayment events
  amlEvents.on(AML_EVENTS.ON_LOAN_REPAYMENT, async (event: TransactionEvent) => {
    await processTransactionEvent(event);
  });
}

/**
 * Process a transaction event and apply AML rules
 */
async function processTransactionEvent(event: TransactionEvent) {
  try {
    // Check if already processed (idempotency)
    const processed = await prisma.processedAmlEvents.findUnique({
      where: { transactionId: event.transactionId },
    });

    if (processed) {
      return; // Already processed
    }

    // Get member to check risk category
    const member = await prisma.member.findUnique({
      where: { id: event.memberId },
      select: {
        id: true,
        cooperativeId: true,
        riskCategory: true,
      },
    });

    if (!member) {
      return;
    }

    // Mark as processed
    await prisma.processedAmlEvents.create({
      data: {
        transactionId: event.transactionId,
        memberId: event.memberId,
        cooperativeId: member.cooperativeId,
        amount: new Decimal(event.amount),
        processedAt: new Date(),
      },
    });

    // Apply exemption logic - skip if counterparty is exempt
    if (
      event.counterpartyType === 'GOVERNMENT_ENTITY' ||
      event.counterpartyType === 'EMPLOYEE' ||
      event.counterpartyType === 'BANK'
    ) {
      return; // Exempt from TTR
    }

    // Rule 1: TTR Rule - Check daily cash transactions
    if (
      event.isCash &&
      (event.transactionType === 'deposit' || event.transactionType === 'withdrawal')
    ) {
      await checkTtrRule(event, member.cooperativeId);
    }

    // Rule 2: Source of Funds Rule
    if (event.amount >= SOF_THRESHOLD) {
      await checkSourceOfFundsRule(event, member.cooperativeId);
    }

    // Rule 3: High-Risk Member Rule
    if (member.riskCategory === 'HIGH') {
      await flagHighRiskTransaction(event, member.cooperativeId);
    }
  } catch (error) {
    console.error('Error processing AML event:', error);
  }
}

/**
 * Check TTR rule - aggregate daily cash transactions
 */
async function checkTtrRule(event: TransactionEvent, cooperativeId: string) {
  const eventDate = new Date(event.occurredOn);
  eventDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(eventDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Check if TTR already exists for this date
  const existingTtr = await prisma.amlTtrReport.findFirst({
    where: {
      memberId: event.memberId,
      cooperativeId,
      forDate: eventDate,
      status: {
        in: ['pending', 'approved'],
      },
    },
  });

  // Aggregate all cash transactions for this member on this date
  const dailyTransactions = await prisma.processedAmlEvents.findMany({
    where: {
      memberId: event.memberId,
      cooperativeId,
      processedAt: {
        gte: eventDate,
        lt: nextDay,
      },
    },
  });

  // Calculate total amount for the day
  let totalAmount = new Decimal(0);
  for (const tx of dailyTransactions) {
    totalAmount = totalAmount.plus(tx.amount);
  }

  if (existingTtr) {
    // Update existing TTR with recalculated total
    await prisma.amlTtrReport.update({
      where: { id: existingTtr.id },
      data: {
        totalAmount,
      },
    });
  } else if (totalAmount.gte(TTR_THRESHOLD)) {
    // Create new TTR if this single transaction exceeds threshold
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() + TTR_DEADLINE_DAYS);

    await prisma.amlTtrReport.create({
      data: {
        memberId: event.memberId,
        cooperativeId,
        forDate: eventDate,
        totalAmount,
        counterparty: event.counterpartyType || 'MEMBER',
        status: 'pending',
        deadline,
      },
    });

    // Create AML flag
    await prisma.amlFlag.create({
      data: {
        memberId: event.memberId,
        cooperativeId,
        type: 'TTR',
        details: {
          amount: totalAmount.toString(),
          date: eventDate.toISOString(),
          transactionId: event.transactionId,
          transactionCount: dailyTransactions.length,
        },
        status: 'pending',
      },
    });
  }
  // If totalAmount < TTR_THRESHOLD and no existing TTR, no action needed
}

/**
 * Check Source of Funds rule
 */
async function checkSourceOfFundsRule(event: TransactionEvent, cooperativeId: string) {
  // Check if SOF declaration already exists
  const existingSof = await prisma.sourceOfFundsDeclaration.findFirst({
    where: {
      transactionId: event.transactionId,
      memberId: event.memberId,
    },
  });

  if (!existingSof) {
    // Create flag for SOF requirement
    await prisma.amlFlag.create({
      data: {
        memberId: event.memberId,
        cooperativeId,
        type: 'TTR', // SOF is part of TTR requirement
        details: {
          amount: event.amount,
          transactionId: event.transactionId,
          requiresSourceOfFunds: true,
        },
        status: 'pending',
      },
    });
  }
}

/**
 * Flag high-risk member transaction for continuous monitoring
 */
async function flagHighRiskTransaction(event: TransactionEvent, cooperativeId: string) {
  await prisma.amlFlag.create({
    data: {
      memberId: event.memberId,
      cooperativeId,
      type: 'CONTINUOUS_MONITORING',
      details: {
        amount: event.amount,
        transactionType: event.transactionType,
        transactionId: event.transactionId,
        occurredOn: event.occurredOn.toISOString(),
      },
      status: 'pending',
    },
  });
}
