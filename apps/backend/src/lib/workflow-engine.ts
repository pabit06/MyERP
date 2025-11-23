import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { hooks } from './hooks.js';
import { HookContext } from '../controllers/BaseController.js';

/**
 * Workflow State Definition
 */
export interface WorkflowState {
  name: string;
  label: string;
  description?: string;
  isTerminal?: boolean; // Terminal states cannot transition to other states
  metadata?: Record<string, any>;
}

/**
 * Workflow Transition Definition
 */
export interface WorkflowTransition {
  from: string; // Source state name
  to: string; // Target state name
  label: string;
  description?: string;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
    value: any;
  }>;
  requiredRoles?: string[]; // Roles that can perform this transition
  hooks?: {
    before?: string; // Hook name to execute before transition
    after?: string; // Hook name to execute after transition
  };
  metadata?: Record<string, any>;
}

/**
 * Workflow Definition
 */
export interface WorkflowDefinition {
  name: string; // Unique workflow name (e.g., 'member-onboarding', 'loan-approval')
  entityType: string; // Entity type (e.g., 'Member', 'LoanApplication')
  initialState: string; // Initial state name
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  metadata?: Record<string, any>;
}

/**
 * Workflow Registry
 */
class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  /**
   * Register a workflow definition
   */
  register(definition: WorkflowDefinition): void {
    // Validate workflow definition
    this.validateWorkflow(definition);
    this.workflows.set(definition.name, definition);
  }

  /**
   * Get a workflow definition
   */
  get(name: string): WorkflowDefinition | undefined {
    return this.workflows.get(name);
  }

  /**
   * Get all workflows
   */
  getAll(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Validate workflow definition
   */
  private validateWorkflow(definition: WorkflowDefinition): void {
    // Check if initial state exists
    const initialState = definition.states.find((s) => s.name === definition.initialState);
    if (!initialState) {
      throw new Error(`Initial state '${definition.initialState}' not found in workflow '${definition.name}'`);
    }

    // Check if all transition states exist
    for (const transition of definition.transitions) {
      const fromState = definition.states.find((s) => s.name === transition.from);
      const toState = definition.states.find((s) => s.name === transition.to);

      if (!fromState) {
        throw new Error(`Transition from state '${transition.from}' not found in workflow '${definition.name}'`);
      }
      if (!toState) {
        throw new Error(`Transition to state '${transition.to}' not found in workflow '${definition.name}'`);
      }
    }
  }
}

/**
 * Global workflow registry
 */
const registry = new WorkflowRegistry();

/**
 * Workflow Engine
 */
export class WorkflowEngine {
  /**
   * Execute a workflow transition
   */
  static async transition(
    workflowName: string,
    entityId: string,
    entityType: string,
    toState: string,
    context: {
      userId: string;
      tenantId: string;
      metadata?: Record<string, any>;
      tx?: Prisma.TransactionClient;
    }
  ): Promise<{
    success: boolean;
    fromState: string;
    toState: string;
    message?: string;
  }> {
    const workflow = registry.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    // Get current entity state
    const entity = await this.getEntity(entityType, entityId, context.tx || prisma);
    if (!entity) {
      throw new Error(`${entityType} with id '${entityId}' not found`);
    }

    const currentState = (entity as any).workflowStatus || (entity as any).status || workflow.initialState;

    // Find transition
    const transition = workflow.transitions.find(
      (t) => t.from === currentState && t.to === toState
    );

    if (!transition) {
      throw new Error(
        `Invalid transition from '${currentState}' to '${toState}' in workflow '${workflowName}'`
      );
    }

    // Check conditions
    if (transition.conditions) {
      for (const condition of transition.conditions) {
        const fieldValue = (entity as any)[condition.field];
        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
          throw new Error(`Transition condition not met: ${condition.field} ${condition.operator} ${condition.value}`);
        }
      }
    }

    // Check roles (if required)
    if (transition.requiredRoles && transition.requiredRoles.length > 0) {
      const user = await (context.tx || prisma).user.findUnique({
        where: { id: context.userId },
        include: { role: true },
      });

      if (!user || !user.role) {
        throw new Error('User role not found');
      }

      // TODO: Implement role checking logic
      // For now, we'll skip this check
    }

    // Execute transition within transaction
    const tx = context.tx || prisma;
    if (context.tx) {
      // Already in a transaction, use it directly
      return await this.executeTransition(
        workflow,
        entity,
        currentState,
        toState,
        transition,
        entityId,
        entityType,
        {
          userId: context.userId,
          tenantId: context.tenantId,
          metadata: context.metadata,
          tx: context.tx,
        }
      );
    } else {
      // Create new transaction
      return await prisma.$transaction(async (transactionClient: Prisma.TransactionClient) => {
        return await this.executeTransition(
          workflow,
          entity,
          currentState,
          toState,
          transition,
          entityId,
          entityType,
          {
            userId: context.userId,
            tenantId: context.tenantId,
            metadata: context.metadata,
            tx: transactionClient,
          }
        );
      });
    }
  }

  /**
   * Execute transition logic
   */
  private static async executeTransition(
    workflow: WorkflowDefinition,
    entity: any,
    currentState: string,
    toState: string,
    transition: WorkflowTransition,
    entityId: string,
    entityType: string,
    context: {
      userId: string;
      tenantId: string;
      metadata?: Record<string, any>;
      tx: Prisma.TransactionClient;
    }
  ): Promise<{
    success: boolean;
    fromState: string;
    toState: string;
    message?: string;
  }> {
    const transactionClient = context.tx;
    const hookContext: HookContext = {
      tx: transactionClient,
      userId: context.userId,
      tenantId: context.tenantId,
      originalData: entity,
      metadata: {
        ...context.metadata,
        workflowName: workflow.name,
        transition,
      },
    };

    // Execute before transition hook
    if (transition.hooks?.before) {
      await hooks.execute(workflow.entityType, transition.hooks.before, entity, hookContext);
    }

    // Execute generic before transition hook
    await hooks.execute(workflow.entityType, 'beforeTransition', { ...entity, toState }, hookContext);

    // Update entity state
    const stateField = entityType === 'Member' ? 'workflowStatus' : 'status';
    const updatedEntity = await transactionClient[this.getModelName(entityType)].update({
      where: { id: entityId },
      data: { [stateField]: toState },
    });

    // Create workflow history (use appropriate model based on entity type)
    if (entityType === 'Member') {
      await transactionClient.workflowHistory.create({
        data: {
          cooperativeId: context.tenantId,
          memberId: entityId,
          changedById: context.userId,
          fromStatus: currentState,
          toStatus: toState,
          remarks: context.metadata?.remarks,
        },
      });
    } else {
      // For other entity types, use memberWorkflowHistory or create a generic history
      // For now, we'll skip history for non-member entities
      // TODO: Create generic workflow history table
    }

    // Execute after transition hook
    if (transition.hooks?.after) {
      await hooks.execute(workflow.entityType, transition.hooks.after, updatedEntity, hookContext);
    }

    // Execute generic after transition hook
    await hooks.execute(workflow.entityType, 'afterTransition', updatedEntity, hookContext);

    return {
      success: true,
      fromState: currentState,
      toState,
      message: `Successfully transitioned from '${currentState}' to '${toState}'`,
    };
  }

  /**
   * Get available transitions for current state
   */
  static getAvailableTransitions(
    workflowName: string,
    currentState: string
  ): WorkflowTransition[] {
    const workflow = registry.get(workflowName);
    if (!workflow) {
      return [];
    }

    return workflow.transitions.filter((t) => t.from === currentState);
  }

  /**
   * Get workflow definition
   */
  static getWorkflow(name: string): WorkflowDefinition | undefined {
    return registry.get(name);
  }

  /**
   * Register a workflow
   */
  static register(definition: WorkflowDefinition): void {
    registry.register(definition);
  }

  /**
   * Get entity from database
   */
  private static async getEntity(
    entityType: string,
    entityId: string,
    tx: Prisma.TransactionClient | typeof prisma
  ): Promise<any> {
    const modelName = this.getModelName(entityType);
    return (tx as any)[modelName].findUnique({
      where: { id: entityId },
    });
  }

  /**
   * Get Prisma model name from entity type
   */
  private static getModelName(entityType: string): string {
    const modelMap: Record<string, string> = {
      Member: 'member',
      LoanApplication: 'loanApplication',
      SavingAccount: 'savingAccount',
    };
    return modelMap[entityType] || entityType.toLowerCase();
  }

  /**
   * Evaluate condition
   */
  private static evaluateCondition(
    fieldValue: any,
    operator: string,
    expectedValue: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'notEquals':
        return fieldValue !== expectedValue;
      case 'greaterThan':
        return Number(fieldValue) > Number(expectedValue);
      case 'lessThan':
        return Number(fieldValue) < Number(expectedValue);
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
      default:
        return false;
    }
  }
}

/**
 * Predefined workflows
 */
export function registerDefaultWorkflows() {
  // Member Onboarding Workflow
  WorkflowEngine.register({
    name: 'member-onboarding',
    entityType: 'Member',
    initialState: 'application',
    states: [
      { name: 'application', label: 'Application', description: 'Member application submitted, awaiting review' },
      { name: 'under_review', label: 'Under Review', description: 'KYM under review' },
      { name: 'approved', label: 'Approved', description: 'Member approved' },
      { name: 'bod_pending', label: 'BOD Pending', description: 'Pending BOD approval' },
      { name: 'active', label: 'Active', description: 'Member is active', isTerminal: false },
      { name: 'rejected', label: 'Rejected', description: 'Member rejected', isTerminal: true },
    ],
    transitions: [
      {
        from: 'application',
        to: 'under_review',
        label: 'Start Review',
      },
      {
        from: 'under_review',
        to: 'approved',
        label: 'Approve',
        hooks: { after: 'onApproved' },
      },
      {
        from: 'under_review',
        to: 'rejected',
        label: 'Reject',
        hooks: { after: 'onRejected' },
      },
      {
        from: 'approved',
        to: 'bod_pending',
        label: 'Send to BOD',
      },
      {
        from: 'bod_pending',
        to: 'active',
        label: 'BOD Approve',
        hooks: { after: 'onBodApproved' },
      },
    ],
  });

  // Loan Application Workflow
  WorkflowEngine.register({
    name: 'loan-approval',
    entityType: 'LoanApplication',
    initialState: 'pending',
    states: [
      { name: 'pending', label: 'Pending', description: 'Application pending review' },
      { name: 'under_review', label: 'Under Review', description: 'Application under review' },
      { name: 'approved', label: 'Approved', description: 'Application approved' },
      { name: 'disbursed', label: 'Disbursed', description: 'Loan disbursed', isTerminal: false },
      { name: 'rejected', label: 'Rejected', description: 'Application rejected', isTerminal: true },
    ],
    transitions: [
      {
        from: 'pending',
        to: 'under_review',
        label: 'Start Review',
      },
      {
        from: 'under_review',
        to: 'approved',
        label: 'Approve',
        hooks: { after: 'onApprove' },
      },
      {
        from: 'under_review',
        to: 'rejected',
        label: 'Reject',
      },
      {
        from: 'approved',
        to: 'disbursed',
        label: 'Disburse',
        hooks: { after: 'onDisburse' },
      },
    ],
  });
}

// Export registry for direct access if needed
export const workflowRegistry = registry;

