import { EventEmitter } from 'events';

export interface TransactionEvent {
  memberId: string;
  amount: number;
  currency: string;
  isCash: boolean;
  transactionId: string;
  occurredOn: Date;
  transactionType: 'deposit' | 'withdrawal' | 'share_purchase' | 'loan_repayment';
  counterpartyType?: 'MEMBER' | 'GOVERNMENT_ENTITY' | 'EMPLOYEE' | 'BANK' | 'OTHER';
}

class AmlEventEmitter extends EventEmitter {}

export const amlEvents = new AmlEventEmitter();

// Event types
export const AML_EVENTS = {
  ON_DEPOSIT: 'onDeposit',
  ON_WITHDRAWAL: 'onWithdrawal',
  ON_SHARE_PURCHASE: 'onSharePurchase',
  ON_LOAN_REPAYMENT: 'onLoanRepayment',
} as const;
