import { hooks } from '../lib/hooks.js';
import { HookContext } from '../controllers/BaseController.js';
import { createAuditLog } from '../lib/audit.js';

/**
 * Register all accounting-related lifecycle hooks
 * This file should be imported and executed during application startup
 */
export function registerAccountingHooks() {
  // ============================================================
  // ChartOfAccounts Hooks
  // ============================================================

  /**
   * Validate ChartOfAccounts before creation
   * - Ensures code uniqueness
   * - Validates parent relationship
   */
  hooks.register(
    'ChartOfAccounts',
    'onValidate',
    async (_data: any, _context: HookContext) => {
      // Additional validation can be added here
      // The controller already handles most validation, but hooks can add domain-specific rules
    },
    50, // Priority 50 - runs early
    'validate-account-creation'
  );

  /**
   * Before creating ChartOfAccounts
   * - Log the operation
   */
  hooks.register(
    'ChartOfAccounts',
    'beforeCreate',
    async (_data: any, _context: HookContext) => {
      // Pre-creation logic can go here
    },
    100,
    'before-create-account'
  );

  /**
   * After creating ChartOfAccounts
   * - Create audit log
   */
  hooks.register(
    'ChartOfAccounts',
    'afterCreate',
    async (account: any, context: HookContext) => {
      // Create audit log for account creation
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'create',
          entityType: 'chart_of_accounts',
          entityId: account.id,
          details: {
            code: account.code,
            name: account.name,
            type: account.type,
          },
        });
      }
    },
    100,
    'audit-account-creation'
  );

  /**
   * Before updating ChartOfAccounts
   * - Prevent changes if account has transactions
   */
  hooks.register(
    'ChartOfAccounts',
    'beforeUpdate',
    async (data: any, context: HookContext) => {
      const originalData = context.originalData;
      if (!originalData) return;

      // Check if account has ledger entries
      const ledgerCount = await context.tx.ledger.count({
        where: { accountId: originalData.id },
      });

      // Prevent changing code or type if account has transactions
      if (ledgerCount > 0) {
        if (data.code && data.code !== originalData.code) {
          throw new Error(
            'Cannot change account code. Account has existing transactions. Consider creating a new account and migrating.'
          );
        }
        if (data.type && data.type !== originalData.type) {
          throw new Error(
            'Cannot change account type. Account has existing transactions. Consider creating a new account and migrating.'
          );
        }
      }
    },
    50, // High priority - runs early
    'validate-account-update'
  );

  /**
   * After updating ChartOfAccounts
   * - Create audit log
   */
  hooks.register(
    'ChartOfAccounts',
    'afterUpdate',
    async (account: any, context: HookContext) => {
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'update',
          entityType: 'chart_of_accounts',
          entityId: account.id,
          details: {
            code: account.code,
            name: account.name,
            type: account.type,
            changes: context.originalData ? 'updated' : undefined,
          },
        });
      }
    },
    100,
    'audit-account-update'
  );

  /**
   * Before deleting ChartOfAccounts
   * - Additional validation (controller already checks for children and transactions)
   */
  hooks.register(
    'ChartOfAccounts',
    'beforeDelete',
    async (_account: any, _context: HookContext) => {
      // Additional validation can be added here
      // Controller already validates no children and no transactions
    },
    50,
    'validate-account-deletion'
  );

  /**
   * After deleting ChartOfAccounts
   * - Create audit log
   */
  hooks.register(
    'ChartOfAccounts',
    'afterDelete',
    async (account: any, context: HookContext) => {
      if (context.userId) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'delete',
          entityType: 'chart_of_accounts',
          entityId: account.id,
          details: {
            code: account.code,
            name: account.name,
            type: account.type,
          },
        });
      }
    },
    100,
    'audit-account-deletion'
  );

  // ============================================================
  // JournalEntry Hooks
  // ============================================================

  /**
   * Validate JournalEntry before creation
   * - Double-entry validation (already done in controller, but hook can add more)
   */
  hooks.register(
    'JournalEntry',
    'onValidate',
    async (_data: any, _context: HookContext) => {
      // Additional validation can be added here
      // Controller already validates double-entry
    },
    50,
    'validate-journal-entry'
  );

  /**
   * Before creating JournalEntry
   * - Validate DayBook is open
   * - Enforce system date with time injection
   * - Check if accounts are active
   */
  hooks.register(
    'JournalEntry',
    'beforeCreate',
    async (data: any, context: HookContext) => {
      // Constraint 1: Check if day is OPEN (not CLOSED or EOD_IN_PROGRESS)
      const activeDay = await context.tx.dayBook.findFirst({
        where: {
          cooperativeId: context.tenantId,
          status: {
            in: ['OPEN', 'EOD_IN_PROGRESS'], // Check both statuses
          },
        },
      });

      if (!activeDay) {
        throw new Error('Day is not open. Please perform Day Begin before creating transactions.');
      }

      // Block transactions if Day End is in progress
      if (activeDay.status === 'EOD_IN_PROGRESS') {
        throw new Error(
          'Day End is in progress. Please wait for completion before creating transactions.'
        );
      }

      // Constraint 2: Time Handling - Combine DayBook date with current server time
      const getTransactionDate = (dayBookDate: Date): Date => {
        const now = new Date(); // Current Server Time
        const transactionDate = new Date(dayBookDate);

        // Inject current time into the DayBook date
        transactionDate.setHours(
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );

        return transactionDate;
      };

      // Override transaction date to match DayBook date with current time
      const transactionDate = getTransactionDate(activeDay.date);
      data.date = transactionDate;

      // Ensure transaction falls within DayBook window (same day)
      const dayStart = new Date(activeDay.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(activeDay.date);
      dayEnd.setHours(23, 59, 59, 999);

      if (transactionDate < dayStart || transactionDate > dayEnd) {
        throw new Error(
          `Transaction date must fall within the active day window (${dayStart.toISOString()} to ${dayEnd.toISOString()})`
        );
      }

      // Validate accounts are active
      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          const account = await context.tx.chartOfAccounts.findUnique({
            where: { id: entry.accountId },
          });

          if (!account) {
            throw new Error(`Account not found: ${entry.accountId}`);
          }

          if (!account.isActive) {
            throw new Error(`Cannot post to inactive account: ${account.code} - ${account.name}`);
          }
        }
      }
    },
    40, // Higher priority - validate DayBook before account validation
    'validate-daybook-and-date'
  );

  /**
   * After creating JournalEntry
   * - Create audit log
   * - Note: Ledger entries are created in the controller, not in hooks
   */
  hooks.register(
    'JournalEntry',
    'afterCreate',
    async (result: any, context: HookContext) => {
      if (context.userId && result.journalEntry) {
        await createAuditLog({
          userId: context.userId,
          cooperativeId: context.tenantId,
          action: 'create',
          entityType: 'journal_entry',
          entityId: result.journalEntry.id,
          details: {
            entryNumber: result.journalEntry.entryNumber,
            description: result.journalEntry.description,
            date: result.journalEntry.date,
            ledgerCount: result.ledgers?.length || 0,
          },
        });
      }
    },
    100,
    'audit-journal-entry-creation'
  );

  /**
   * On JournalEntry submission (after creation)
   * - This hook runs after the journal entry and ledger entries are created
   * - Can be used for additional processing like notifications, reporting, etc.
   */
  hooks.register(
    'JournalEntry',
    'onSubmit',
    async (_result: any, _context: HookContext) => {
      // Post-submission logic
      // For example:
      // - Send notifications
      // - Update reporting caches
      // - Trigger downstream processes
    },
    200, // Lower priority - runs after creation hooks
    'post-submit-journal-entry'
  );

  /**
   * On JournalEntry cancellation (future use)
   * - Reverse ledger entries
   */
  hooks.register(
    'JournalEntry',
    'onCancel',
    async (_journalEntry: any, _context: HookContext) => {
      // Future: Implement cancellation logic
      // This would create reversing entries
      throw new Error('Journal entry cancellation not yet implemented');
    },
    100,
    'cancel-journal-entry'
  );
}
