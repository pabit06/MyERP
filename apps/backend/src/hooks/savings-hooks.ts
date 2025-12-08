import { hooks } from '../lib/hooks.js';
import { HookContext } from '../controllers/BaseController.js';
import { createAuditLog } from '../lib/audit.js';

/**
 * Register all savings-related lifecycle hooks
 */
export function registerSavingsHooks() {
  // ============================================================
  // SavingProduct Hooks
  // ============================================================

  hooks.register(
    'SavingProduct',
    'onValidate',
    async (data: any, context: HookContext) => {
      // Additional validation can be added here
    },
    50,
    'validate-saving-product'
  );

  hooks.register(
    'SavingProduct',
    'afterCreate',
    async (product: any, context: HookContext) => {
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'create',
          entityType: 'saving_product',
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
    'audit-saving-product-creation'
  );

  // ============================================================
  // SavingAccount Hooks
  // ============================================================

  hooks.register(
    'SavingAccount',
    'onValidate',
    async (data: any, context: HookContext) => {
      // Additional validation can be added here
    },
    50,
    'validate-saving-account'
  );

  hooks.register(
    'SavingAccount',
    'afterCreate',
    async (account: any, context: HookContext) => {
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'create',
          entityType: 'saving_account',
          entityId: account.id,
          details: {
            accountNumber: account.accountNumber,
            memberId: account.memberId,
            initialBalance: account.balance,
          },
        });
      }
    },
    100,
    'audit-saving-account-creation'
  );
}
