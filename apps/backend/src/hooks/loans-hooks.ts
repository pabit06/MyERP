import { hooks } from '../lib/hooks.js';
import { HookContext } from '../controllers/BaseController.js';
import { createAuditLog } from '../lib/audit.js';

/**
 * Register all loans-related lifecycle hooks
 */
export function registerLoansHooks() {
  // ============================================================
  // LoanProduct Hooks
  // ============================================================

  hooks.register(
    'LoanProduct',
    'onValidate',
    async (_data: any, _context: HookContext) => {
      // Additional validation can be added here
    },
    50,
    'validate-loan-product'
  );

  hooks.register(
    'LoanProduct',
    'afterCreate',
    async (product: any, context: HookContext) => {
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'create',
          entityType: 'loan_product',
          entityId: product.id,
          details: {
            code: product.code,
            name: product.name,
            interestRate: product.interestRate,
          },
        });
      }
    },
    100,
    'audit-loan-product-creation'
  );

  // ============================================================
  // LoanApplication Hooks
  // ============================================================

  hooks.register(
    'LoanApplication',
    'onValidate',
    async (_data: any, _context: HookContext) => {
      // Additional validation can be added here
    },
    50,
    'validate-loan-application'
  );

  hooks.register(
    'LoanApplication',
    'afterCreate',
    async (application: any, context: HookContext) => {
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'create',
          entityType: 'loan_application',
          entityId: application.id,
          details: {
            applicationNumber: application.applicationNumber,
            loanAmount: application.loanAmount,
            status: application.status,
          },
        });
      }
    },
    100,
    'audit-loan-application-creation'
  );

  /**
   * On loan approval - can be used for:
   * - Creating journal entries
   * - Sending notifications
   * - Updating member records
   */
  hooks.register(
    'LoanApplication',
    'onApprove',
    async (_result: any, _context: HookContext) => {
      // Post-approval logic
      // For example:
      // - Create accounting journal entry for loan disbursement
      // - Send approval notification
      // - Update member loan portfolio
    },
    200,
    'post-approve-loan'
  );
}
