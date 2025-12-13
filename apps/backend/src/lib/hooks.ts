import { HookContext } from '../controllers/BaseController.js';

/**
 * Hook types supported by the system
 */
export type HookType =
  | 'onCreate'
  | 'onUpdate'
  | 'onDelete'
  | 'onSubmit'
  | 'onCancel'
  | 'onValidate'
  | 'onApprove'
  | 'onReject'
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete'
  | 'beforeTransition'
  | 'afterTransition';

/**
 * Hook handler function signature
 */
export type HookHandler<T = any> = (data: T, context: HookContext) => Promise<void | T> | void | T;

/**
 * Registered hook with priority
 */
interface RegisteredHook {
  handler: HookHandler;
  priority: number;
  name?: string;
}

/**
 * Hook registry - stores hooks by model and hook type
 */
class HookRegistry {
  private hooks: Map<string, Map<HookType, RegisteredHook[]>> = new Map();

  /**
   * Register a hook for a specific model and hook type
   * @param model - Model name (e.g., 'JournalEntry', 'ChartOfAccounts')
   * @param hookType - Type of hook (e.g., 'onCreate', 'onSubmit')
   * @param handler - Hook handler function
   * @param priority - Execution priority (lower numbers execute first, default: 100)
   * @param name - Optional name for debugging
   */
  register<T = any>(
    model: string,
    hookType: HookType,
    handler: HookHandler<T>,
    priority: number = 100,
    name?: string
  ): void {
    if (!this.hooks.has(model)) {
      this.hooks.set(model, new Map());
    }

    const modelHooks = this.hooks.get(model)!;
    if (!modelHooks.has(hookType)) {
      modelHooks.set(hookType, []);
    }

    const hooks = modelHooks.get(hookType)!;
    hooks.push({ handler, priority, name });

    // Sort by priority (lower priority = execute first)
    hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Unregister a hook
   */
  unregister(model: string, hookType: HookType, handler: HookHandler): void {
    const modelHooks = this.hooks.get(model);
    if (!modelHooks) return;

    const hooks = modelHooks.get(hookType);
    if (!hooks) return;

    const index = hooks.findIndex((h) => h.handler === handler);
    if (index !== -1) {
      hooks.splice(index, 1);
    }
  }

  /**
   * Get all hooks for a model and hook type
   */
  getHooks(model: string, hookType: HookType): RegisteredHook[] {
    const modelHooks = this.hooks.get(model);
    if (!modelHooks) return [];

    return modelHooks.get(hookType) || [];
  }

  /**
   * Clear all hooks (useful for testing)
   */
  clear(): void {
    this.hooks.clear();
  }
}

/**
 * Global hook registry instance
 */
const registry = new HookRegistry();

/**
 * Execute hooks for a specific model and hook type
 * @param model - Model name
 * @param hookType - Hook type
 * @param data - Data to pass to hooks
 * @param context - Hook context
 * @returns Modified data (if hooks modify it)
 */
export async function executeHooks<T = any>(
  model: string,
  hookType: HookType,
  data: T,
  context: HookContext
): Promise<T> {
  const hooks = registry.getHooks(model, hookType);
  let result = data;

  for (const { handler, name } of hooks) {
    try {
      const hookResult = await handler(result, context);
      // If hook returns a value, use it as the new data
      if (hookResult !== undefined) {
        result = hookResult as T;
      }
    } catch (error) {
      const hookName = name || 'unnamed';
      throw new Error(
        `Hook execution failed: ${model}.${hookType} (${hookName}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
}

/**
 * Hook system API
 */
export const hooks = {
  /**
   * Register a hook
   */
  register: <T = any>(
    model: string,
    hookType: HookType,
    handler: HookHandler<T>,
    priority?: number,
    name?: string
  ) => registry.register(model, hookType, handler, priority, name),

  /**
   * Unregister a hook
   */
  unregister: (model: string, hookType: HookType, handler: HookHandler) =>
    registry.unregister(model, hookType, handler),

  /**
   * Execute hooks
   */
  execute: executeHooks,

  /**
   * Clear all hooks (for testing)
   */
  clear: () => registry.clear(),

  /**
   * Get hooks for debugging
   */
  getHooks: (model: string, hookType: HookType) => registry.getHooks(model, hookType),
};
