import { BaseController, HookContext } from './BaseController.js';
import { hooks } from '../lib/hooks.js';
import { generateEMISchedule } from '../lib/emi.js';

/**
 * Loans Controller
 * Handles all loan domain operations with lifecycle hooks
 */
export class LoansController extends BaseController {
  /**
   * Get all loan products
   */
  async getProducts(cooperativeId: string) {
    await this.validateTenant(cooperativeId);

    return this.prisma.loanProduct.findMany({
      where: {
        cooperativeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Create a new loan product
   */
  async createProduct(
    data: {
      cooperativeId: string;
      code: string;
      name: string;
      description?: string;
      interestRate: number;
      maxLoanAmount: number;
      minLoanAmount?: number;
      maxTenureMonths: number;
      minTenureMonths?: number;
      processingFee?: number;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Validate required fields
      this.validateRequired(data, ['code', 'name', 'interestRate', 'maxLoanAmount', 'maxTenureMonths']);

      // Check if code already exists
      const existing = await tx.loanProduct.findUnique({
        where: {
          cooperativeId_code: {
            cooperativeId: data.cooperativeId,
            code: data.code,
          },
        },
      });

      if (existing) {
        throw new Error('Product code already exists');
      }

      const productData = {
        code: data.code,
        name: data.name,
        description: data.description || null,
        interestRate: parseFloat(String(data.interestRate)),
        maxLoanAmount: parseFloat(String(data.maxLoanAmount)),
        minLoanAmount: data.minLoanAmount ? parseFloat(String(data.minLoanAmount)) : 0,
        maxTenureMonths: parseInt(String(data.maxTenureMonths)),
        minTenureMonths: data.minTenureMonths ? parseInt(String(data.minTenureMonths)) : 1,
        processingFee: data.processingFee ? parseFloat(String(data.processingFee)) : 0,
        cooperativeId: data.cooperativeId,
      };

      const context = this.createHookContext(tx, data.cooperativeId, userId, undefined, {
        operation: 'createProduct',
      });

      // Execute hooks
      await hooks.execute('LoanProduct', 'onValidate', productData, context);
      await hooks.execute('LoanProduct', 'beforeCreate', productData, context);

      const product = await tx.loanProduct.create({
        data: productData,
      });

      await hooks.execute('LoanProduct', 'afterCreate', product, context);
      await hooks.execute('LoanProduct', 'onCreate', product, context);

      return product;
    });
  }

  /**
   * Get all loan applications
   */
  async getApplications(
    cooperativeId: string,
    filters?: {
      memberId?: string;
      status?: string;
    }
  ) {
    await this.validateTenant(cooperativeId);

    const where: any = {
      cooperativeId,
    };

    if (filters?.memberId) {
      where.memberId = filters.memberId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.loanApplication.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            interestRate: true,
          },
        },
        _count: {
          select: {
            emiSchedule: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Create a new loan application
   */
  async createApplication(
    data: {
      cooperativeId: string;
      memberId: string;
      productId: string;
      loanAmount: number;
      tenureMonths: number;
      purpose?: string;
      applicationNumber?: string;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Validate required fields
      this.validateRequired(data, ['memberId', 'productId', 'loanAmount', 'tenureMonths']);

      // Verify member belongs to cooperative
      const member = await tx.member.findUnique({
        where: { id: data.memberId },
      });

      if (!member || member.cooperativeId !== data.cooperativeId) {
        throw new Error('Member not found');
      }

      // Verify product belongs to cooperative
      const product = await tx.loanProduct.findUnique({
        where: { id: data.productId },
      });

      if (!product || product.cooperativeId !== data.cooperativeId) {
        throw new Error('Product not found');
      }

      const loanAmountNum = parseFloat(String(data.loanAmount));
      const tenureMonthsNum = parseInt(String(data.tenureMonths));

      // Validate loan parameters
      if (loanAmountNum < Number(product.minLoanAmount) || loanAmountNum > Number(product.maxLoanAmount)) {
        throw new Error(
          `Loan amount must be between ${product.minLoanAmount} and ${product.maxLoanAmount}`
        );
      }

      if (
        tenureMonthsNum < product.minTenureMonths ||
        tenureMonthsNum > product.maxTenureMonths
      ) {
        throw new Error(
          `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months`
        );
      }

      // Generate application number if not provided
      const appNumber =
        data.applicationNumber ||
        `LOAN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Check if application number already exists
      const existing = await tx.loanApplication.findUnique({
        where: {
          cooperativeId_applicationNumber: {
            cooperativeId: data.cooperativeId,
            applicationNumber: appNumber,
          },
        },
      });

      if (existing) {
        throw new Error('Application number already exists');
      }

      const applicationData = {
        applicationNumber: appNumber,
        memberId: data.memberId,
        productId: data.productId,
        cooperativeId: data.cooperativeId,
        loanAmount: loanAmountNum,
        tenureMonths: tenureMonthsNum,
        interestRate: product.interestRate,
        purpose: data.purpose || null,
        status: 'pending' as const,
      };

      const context = this.createHookContext(tx, data.cooperativeId, userId, undefined, {
        operation: 'createApplication',
      });

      // Execute hooks
      await hooks.execute('LoanApplication', 'onValidate', applicationData, context);
      await hooks.execute('LoanApplication', 'beforeCreate', applicationData, context);

      const application = await tx.loanApplication.create({
        data: applicationData,
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              interestRate: true,
            },
          },
        },
      });

      await hooks.execute('LoanApplication', 'afterCreate', application, context);
      await hooks.execute('LoanApplication', 'onCreate', application, context);

      return application;
    });
  }

  /**
   * Approve a loan application and generate EMI schedule
   */
  async approveApplication(
    applicationId: string,
    cooperativeId: string,
    data?: {
      disbursedDate?: Date;
    },
    userId?: string
  ) {
    await this.validateTenant(cooperativeId);

    return this.handleTransaction(async (tx) => {
      const application = await tx.loanApplication.findFirst({
        where: {
          id: applicationId,
          cooperativeId,
        },
        include: {
          product: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'pending') {
        throw new Error('Application is not in pending status');
      }

      // Generate EMI schedule
      const disbursementDate = data?.disbursedDate || new Date();
      const schedule = generateEMISchedule(
        Number(application.loanAmount),
        Number(application.interestRate),
        application.tenureMonths,
        disbursementDate
      );

      const context = this.createHookContext(tx, cooperativeId, userId, application, {
        operation: 'approveApplication',
        schedule,
      });

      // Execute before approve hooks
      await hooks.execute('LoanApplication', 'beforeUpdate', { ...application, status: 'approved' }, context);

      // Update application status
      const updatedApplication = await tx.loanApplication.update({
        where: { id: applicationId },
        data: {
          status: 'approved',
          approvedDate: new Date(),
          disbursedDate: disbursementDate,
        },
      });

      // Create EMI schedule entries
      const emiSchedules = await Promise.all(
        schedule.map((item) =>
          tx.emiSchedule.create({
            data: {
              applicationId: applicationId,
              cooperativeId,
              installmentNumber: item.installmentNumber,
              dueDate: item.dueDate,
              principalAmount: item.principalAmount,
              interestAmount: item.interestAmount,
              totalAmount: item.totalAmount,
              status: 'pending',
            },
          })
        )
      );

      const result = { application: updatedApplication, emiSchedules };

      // Execute after approve hooks
      await hooks.execute('LoanApplication', 'afterUpdate', updatedApplication, context);
      await hooks.execute('LoanApplication', 'onApprove', result, context);
      await hooks.execute('LoanApplication', 'onSubmit', result, context);

      return result;
    });
  }

  /**
   * Get EMI schedule for a loan application
   */
  async getEMISchedule(applicationId: string, cooperativeId: string) {
    await this.validateTenant(cooperativeId);

    const application = await this.prisma.loanApplication.findFirst({
      where: {
        id: applicationId,
        cooperativeId,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    return this.prisma.emiSchedule.findMany({
      where: {
        applicationId,
        cooperativeId,
      },
      orderBy: {
        installmentNumber: 'asc',
      },
    });
  }
}

// Export singleton instance
export const loansController = new LoansController();

