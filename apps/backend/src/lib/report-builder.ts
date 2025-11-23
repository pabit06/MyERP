import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

/**
 * Report Column Definition
 */
export interface ReportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  format?: string; // Format string for display
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'; // Aggregation function
  groupBy?: boolean; // Whether to group by this column
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Report Filter Definition
 */
export interface ReportFilter {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

/**
 * Report Configuration
 */
export interface ReportConfig {
  name: string;
  description?: string;
  entityType: string; // Entity type to query (e.g., 'Member', 'LoanApplication')
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: string[]; // Column keys to group by
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  aggregations?: Array<{
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
    label: string;
  }>;
  joins?: Array<{
    entity: string;
    on: { left: string; right: string };
    type?: 'inner' | 'left' | 'right';
  }>;
}

/**
 * Report Result
 */
export interface ReportResult {
  config: ReportConfig;
  data: any[];
  summary?: {
    totalRows: number;
    aggregations?: Record<string, number>;
  };
  generatedAt: Date;
}

/**
 * Report Builder
 * Builds dynamic reports based on configuration
 */
export class ReportBuilder {
  /**
   * Build a report based on configuration
   */
  static async build(
    cooperativeId: string,
    config: ReportConfig,
    customFilters?: ReportFilter[]
  ): Promise<ReportResult> {
    // Combine default and custom filters
    const allFilters = [...(config.filters || []), ...(customFilters || [])];

    // Get base query
    const baseQuery = this.buildBaseQuery(config, cooperativeId, allFilters);

    // Execute query
    const data = await baseQuery;

    // Apply aggregations if needed
    const summary = config.aggregations
      ? this.calculateAggregations(data, config.aggregations)
      : undefined;

    return {
      config,
      data,
      summary: {
        totalRows: data.length,
        aggregations: summary,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Build base query based on configuration
   */
  private static async buildBaseQuery(
    config: ReportConfig,
    cooperativeId: string,
    filters: ReportFilter[]
  ): Promise<any[]> {
    const modelName = this.getModelName(config.entityType);
    const model = (prisma as any)[modelName];

    if (!model) {
      throw new Error(`Entity type '${config.entityType}' not found`);
    }

    // Build where clause
    const where: any = {
      cooperativeId,
    };

    // Apply filters
    for (const filter of filters) {
      where[filter.field] = this.buildFilterCondition(filter);
    }

    // Build include clause for joins
    const include: any = {};
    if (config.joins) {
      for (const join of config.joins) {
        include[join.entity.toLowerCase()] = true;
      }
    }

    // Build select clause
    const select: any = {};
    for (const column of config.columns) {
      select[column.key] = true;
    }

    // Build orderBy
    const orderBy: any = {};
    if (config.orderBy && config.orderBy.length > 0) {
      for (const order of config.orderBy) {
        orderBy[order.field] = order.direction;
      }
    }

    // Execute query
    const query: any = {
      where,
      select: Object.keys(select).length > 0 ? select : undefined,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
      take: config.limit,
    };

    const results = await model.findMany(query);

    // Format results
    return this.formatResults(results, config);
  }

  /**
   * Build filter condition
   */
  private static buildFilterCondition(filter: ReportFilter): any {
    switch (filter.operator) {
      case 'equals':
        return filter.value;
      case 'notEquals':
        return { not: filter.value };
      case 'greaterThan':
        return { gt: filter.value };
      case 'lessThan':
        return { lt: filter.value };
      case 'between':
        return { gte: filter.value[0], lte: filter.value[1] };
      case 'in':
        return { in: Array.isArray(filter.value) ? filter.value : [filter.value] };
      case 'contains':
        return { contains: filter.value, mode: 'insensitive' };
      case 'startsWith':
        return { startsWith: filter.value, mode: 'insensitive' };
      case 'endsWith':
        return { endsWith: filter.value, mode: 'insensitive' };
      default:
        return filter.value;
    }
  }

  /**
   * Format results based on column definitions
   */
  private static formatResults(results: any[], config: ReportConfig): any[] {
    return results.map((row) => {
      const formatted: any = {};
      for (const column of config.columns) {
        let value = this.getNestedValue(row, column.key);

        // Format based on type
        switch (column.type) {
          case 'currency':
            value = typeof value === 'number' ? value.toFixed(2) : value;
            break;
          case 'percentage':
            value = typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : value;
            break;
          case 'date':
            value = value instanceof Date ? value.toISOString().split('T')[0] : value;
            break;
          case 'boolean':
            value = value ? 'Yes' : 'No';
            break;
        }

        formatted[column.key] = value;
      }
      return formatted;
    });
  }

  /**
   * Get nested value from object
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Calculate aggregations
   */
  private static calculateAggregations(
    data: any[],
    aggregations: Array<{ field: string; function: string; label: string }>
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const agg of aggregations) {
      const values = data.map((row) => Number(row[agg.field]) || 0).filter((v) => !isNaN(v));

      switch (agg.function) {
        case 'sum':
          result[agg.label] = values.reduce((sum, v) => sum + v, 0);
          break;
        case 'avg':
          result[agg.label] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        case 'count':
          result[agg.label] = values.length;
          break;
        case 'min':
          result[agg.label] = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'max':
          result[agg.label] = values.length > 0 ? Math.max(...values) : 0;
          break;
      }
    }

    return result;
  }

  /**
   * Get Prisma model name from entity type
   */
  private static getModelName(entityType: string): string {
    const modelMap: Record<string, string> = {
      Member: 'member',
      LoanApplication: 'loanApplication',
      SavingAccount: 'savingAccount',
      LoanProduct: 'loanProduct',
      SavingProduct: 'savingProduct',
      JournalEntry: 'journalEntry',
      ChartOfAccounts: 'chartOfAccounts',
    };
    return modelMap[entityType] || entityType.toLowerCase();
  }
}

/**
 * Predefined Report Configurations
 */
export const ReportConfigs = {
  /**
   * Member List Report
   */
  memberList: {
    name: 'Member List',
    description: 'List of all members',
    entityType: 'Member',
    columns: [
      { key: 'memberNumber', label: 'Member Number', type: 'string', sortable: true },
      { key: 'firstName', label: 'First Name', type: 'string', sortable: true },
      { key: 'lastName', label: 'Last Name', type: 'string', sortable: true },
      { key: 'workflowStatus', label: 'Status', type: 'string', filterable: true },
      { key: 'createdAt', label: 'Joined Date', type: 'date', sortable: true },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  } as ReportConfig,

  /**
   * Loan Applications Report
   */
  loanApplications: {
    name: 'Loan Applications',
    description: 'List of loan applications',
    entityType: 'LoanApplication',
    columns: [
      { key: 'applicationNumber', label: 'Application #', type: 'string', sortable: true },
      { key: 'member.memberNumber', label: 'Member #', type: 'string' },
      { key: 'loanAmount', label: 'Loan Amount', type: 'currency', aggregate: 'sum', sortable: true },
      { key: 'interestRate', label: 'Interest Rate', type: 'percentage', sortable: true },
      { key: 'tenureMonths', label: 'Tenure (Months)', type: 'number', sortable: true },
      { key: 'status', label: 'Status', type: 'string', filterable: true },
      { key: 'createdAt', label: 'Application Date', type: 'date', sortable: true },
    ],
    aggregations: [
      { field: 'loanAmount', function: 'sum', label: 'Total Loan Amount' },
      { field: 'loanAmount', function: 'avg', label: 'Average Loan Amount' },
      { field: 'applicationNumber', function: 'count', label: 'Total Applications' },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  } as ReportConfig,

  /**
   * Savings Accounts Report
   */
  savingsAccounts: {
    name: 'Savings Accounts',
    description: 'List of savings accounts',
    entityType: 'SavingAccount',
    columns: [
      { key: 'accountNumber', label: 'Account #', type: 'string', sortable: true },
      { key: 'member.memberNumber', label: 'Member #', type: 'string' },
      { key: 'balance', label: 'Balance', type: 'currency', aggregate: 'sum', sortable: true },
      { key: 'product.name', label: 'Product', type: 'string' },
      { key: 'status', label: 'Status', type: 'string', filterable: true },
      { key: 'createdAt', label: 'Opened Date', type: 'date', sortable: true },
    ],
    aggregations: [
      { field: 'balance', function: 'sum', label: 'Total Balance' },
      { field: 'balance', function: 'avg', label: 'Average Balance' },
      { field: 'accountNumber', function: 'count', label: 'Total Accounts' },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  } as ReportConfig,
};

