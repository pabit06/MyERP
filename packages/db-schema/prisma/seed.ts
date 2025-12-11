import { PrismaClient } from '@prisma/client';
// @ts-ignore - nepali-date-converter doesn't have TypeScript types
import NepaliDate from 'nepali-date-converter';

const prisma = new PrismaClient();

/**
 * Get Shrawan 1 (first day of Nepali fiscal year) date for a given BS year
 * Shrawan 1 typically falls around mid-July in the Gregorian calendar
 */
function getShrawan1Date(bsYear: number): Date {
  try {
    // @ts-ignore
    const nepaliDate = new NepaliDate(bsYear, 3, 1); // Shrawan is month 4 (0-indexed = 3)
    return nepaliDate.toJsDate();
  } catch (error) {
    // Fallback: approximate Shrawan 1 as July 16 of the corresponding AD year
    // BS year 2081 corresponds roughly to AD year 2024
    const adYear = bsYear - 57; // Approximate conversion
    return new Date(adYear, 6, 16); // July 16 (month 6 = July, 0-indexed)
  }
}

/**
 * Get Ashad end (last day of Nepali fiscal year) date for a given BS year
 */
function getAshadEndDate(bsYear: number): Date {
  try {
    // @ts-ignore
    const nepaliDate = new NepaliDate(bsYear, 2, 32); // Ashad is month 3, get last day
    return nepaliDate.toJsDate();
  } catch (error) {
    // Fallback: approximate Ashad end as July 15 of the next AD year
    const adYear = bsYear - 57 + 1;
    return new Date(adYear, 6, 15);
  }
}

/**
 * Calculate current and next Nepali fiscal years dynamically
 */
function getCurrentAndNextFiscalYears() {
  const now = new Date();
  // @ts-ignore
  const currentBsDate = new NepaliDate(now);
  // @ts-ignore
  const currentBsYear = currentBsDate.getYear();
  // @ts-ignore
  const currentBsMonth = currentBsDate.getMonth() + 1; // Convert to 1-indexed

  let currentFyBsYear: number;
  let currentFyStart: Date;
  let currentFyEnd: Date;

  // Fiscal year runs from Shrawan (month 4) to Ashad (month 3 of next year)
  const currentYearShrawan1 = getShrawan1Date(currentBsYear);

  if (now >= currentYearShrawan1) {
    // We're in or past Shrawan 1 of current BS year
    currentFyBsYear = currentBsYear;
    currentFyStart = currentYearShrawan1;
    currentFyEnd = getAshadEndDate(currentBsYear + 1);
  } else {
    // We're before Shrawan 1 of current BS year
    currentFyBsYear = currentBsYear - 1;
    currentFyStart = getShrawan1Date(currentFyBsYear);
    currentFyEnd = getAshadEndDate(currentBsYear);
  }

  const nextFyBsYear = currentFyBsYear + 1;
  const nextFyStart = getShrawan1Date(nextFyBsYear);
  const nextFyEnd = getAshadEndDate(nextFyBsYear + 1);

  return {
    current: {
      bsYear: currentFyBsYear,
      label: `${currentFyBsYear}/${String(currentFyBsYear + 1).slice(-2)}`,
      startDate: currentFyStart,
      endDate: currentFyEnd,
    },
    next: {
      bsYear: nextFyBsYear,
      label: `${nextFyBsYear}/${String(nextFyBsYear + 1).slice(-2)}`,
      startDate: nextFyStart,
      endDate: nextFyEnd,
    },
  };
}

/**
 * Seed default roles for a cooperative
 */
async function seedDefaultRoles(cooperativeId: string) {
  console.log(`  Seeding default roles for cooperative ${cooperativeId}...`);

  // Super Admin role (full access)
  await prisma.role.upsert({
    where: {
      cooperativeId_name: {
        cooperativeId,
        name: 'Super Admin',
      },
    },
    update: {},
    create: {
      name: 'Super Admin',
      cooperativeId,
      permissions: ['*'], // All permissions
    },
  });

  // Manager role (view all, approve workflows, manage operations)
  await prisma.role.upsert({
    where: {
      cooperativeId_name: {
        cooperativeId,
        name: 'Manager',
      },
    },
    update: {},
    create: {
      name: 'Manager',
      cooperativeId,
      permissions: [
        'members:*',
        'loans:*',
        'savings:*',
        'shares:*',
        'accounting:*',
        'workflow:*',
        'governance:*',
        'compliance:view',
        'compliance:risk:view',
        'hrm:*',
      ],
    },
  });

  // Teller/Staff role (limited to voucher entry and basic operations)
  await prisma.role.upsert({
    where: {
      cooperativeId_name: {
        cooperativeId,
        name: 'Teller',
      },
    },
    update: {},
    create: {
      name: 'Teller',
      cooperativeId,
      permissions: [
        'transactions:create',
        'members:view',
        'savings:view',
        'savings:create',
        'loans:view',
        'accounting:view',
        'accounting:create',
      ],
    },
  });

  console.log(`  ✅ Default roles seeded`);
}

/**
 * Seed PEARLS-compliant Chart of Accounts for a cooperative
 */
async function seedChartOfAccounts(cooperativeId: string) {
  console.log(`  Seeding Chart of Accounts for cooperative ${cooperativeId}...`);

  // Helper function to create account with upsert
  const createAccount = async (
    code: string,
    name: string,
    nameNepali: string,
    type: string,
    parentId: string | null = null,
    isGroup: boolean = false,
    nfrsMap: string | null = null
  ) => {
    return await prisma.chartOfAccounts.upsert({
      where: {
        cooperativeId_code: {
          cooperativeId,
          code,
        },
      },
      update: {},
      create: {
        code,
        name: `${name} (${nameNepali})`,
        type,
        cooperativeId,
        parentId,
        isGroup,
        nfrsMap,
        isActive: true,
      },
    });
  };

  // Assets (सम्पत्ति)
  const assetsGroup = await createAccount('1', 'Assets', 'सम्पत्ति', 'asset', null, true, null);
  const currentAssetsGroup = await createAccount(
    '1.1',
    'Current Assets',
    'चालु सम्पत्ति',
    'asset',
    assetsGroup.id,
    true,
    null
  );
  await createAccount('1.1.1', 'Cash in Hand', 'हातमा रोकड', 'asset', currentAssetsGroup.id, false, '4.1');
  await createAccount('1.1.2', 'Cash at Bank', 'बैंकमा रोकड', 'asset', currentAssetsGroup.id, false, '4.2');
  await createAccount('1.1.3', 'Savings Deposits', 'बचत निक्षेप', 'asset', currentAssetsGroup.id, false, '4.3');
  await createAccount('1.1.4', 'Loans Receivable', 'ऋण प्राप्य', 'asset', currentAssetsGroup.id, false, '4.4');

  const fixedAssetsGroup = await createAccount(
    '1.2',
    'Fixed Assets',
    'स्थायी सम्पत्ति',
    'asset',
    assetsGroup.id,
    true,
    null
  );
  await createAccount('1.2.1', 'Land and Building', 'जग्गा र भवन', 'asset', fixedAssetsGroup.id, false, '4.5');
  await createAccount('1.2.2', 'Furniture and Fixtures', 'फर्निचर र फिक्सचर', 'asset', fixedAssetsGroup.id, false, '4.6');
  await createAccount('1.2.3', 'Office Equipment', 'कार्यालय उपकरण', 'asset', fixedAssetsGroup.id, false, '4.7');

  // Liabilities (दायित्व)
  const liabilitiesGroup = await createAccount('2', 'Liabilities', 'दायित्व', 'liability', null, true, null);
  const currentLiabilitiesGroup = await createAccount(
    '2.1',
    'Current Liabilities',
    'चालु दायित्व',
    'liability',
    liabilitiesGroup.id,
    true,
    null
  );
  await createAccount('2.1.1', 'Accounts Payable', 'देय खाता', 'liability', currentLiabilitiesGroup.id, false, '5.1');
  await createAccount('2.1.2', 'Interest Payable', 'ब्याज देय', 'liability', currentLiabilitiesGroup.id, false, '5.2');

  // Equity (इक्विटी)
  const equityGroup = await createAccount('3', 'Equity', 'इक्विटी', 'equity', null, true, null);
  await createAccount('3.1', 'Share Capital', 'शेयर पुँजी', 'equity', equityGroup.id, false, '6.1');
  await createAccount('3.2', 'Reserves', 'संचित कोष', 'equity', equityGroup.id, false, '6.2');
  await createAccount('3.3', 'Retained Earnings', 'बाँकी आम्दानी', 'equity', equityGroup.id, false, '6.3');

  // Revenue (आम्दानी)
  const revenueGroup = await createAccount('4', 'Revenue', 'आम्दानी', 'revenue', null, true, null);
  await createAccount('4.1', 'Interest Income', 'ब्याज आम्दानी', 'revenue', revenueGroup.id, false, '7.1');
  await createAccount('4.2', 'Service Charges', 'सेवा शुल्क', 'revenue', revenueGroup.id, false, '7.2');
  await createAccount('4.3', 'Other Income', 'अन्य आम्दानी', 'revenue', revenueGroup.id, false, '7.3');

  // Expenses (खर्च)
  const expensesGroup = await createAccount('5', 'Expenses', 'खर्च', 'expense', null, true, null);
  await createAccount('5.1', 'Salaries', 'तलब', 'expense', expensesGroup.id, false, '8.1');
  await createAccount('5.2', 'Rent', 'भाडा', 'expense', expensesGroup.id, false, '8.2');
  await createAccount('5.3', 'Utilities', 'उपयोगिता', 'expense', expensesGroup.id, false, '8.3');
  await createAccount('5.4', 'Administrative Expenses', 'प्रशासनिक खर्च', 'expense', expensesGroup.id, false, '8.4');

  console.log(`  ✅ Chart of Accounts seeded`);
}

/**
 * Seed default interest rates (savings and loan products)
 */
async function seedDefaultInterestRates(cooperativeId: string) {
  console.log(`  Seeding default interest rates for cooperative ${cooperativeId}...`);

  // Default Savings Product (6-8% interest)
  await prisma.savingProduct.upsert({
    where: {
      cooperativeId_code: {
        cooperativeId,
        code: 'SAV-001',
      },
    },
    update: {},
    create: {
      code: 'SAV-001',
      name: 'Regular Savings',
      description: 'Standard savings account with quarterly interest',
      interestRate: 7.0, // 7% annual (between 6-8%)
      minimumBalance: 0,
      interestPostingFrequency: 'QUARTERLY',
      interestCalculationMethod: 'DAILY_BALANCE',
      isTaxApplicable: true,
      taxRate: 6.0,
      cooperativeId,
      isActive: true,
    },
  });

  // Default Loan Product (14.75% interest)
  await prisma.loanProduct.upsert({
    where: {
      cooperativeId_code: {
        cooperativeId,
        code: 'LOAN-001',
      },
    },
    update: {},
    create: {
      code: 'LOAN-001',
      name: 'General Loan',
      description: 'Standard loan product',
      interestRate: 14.75, // 14.75% annual
      maxLoanAmount: 1000000,
      minLoanAmount: 10000,
      maxTenureMonths: 60,
      minTenureMonths: 6,
      processingFee: 500,
      cooperativeId,
      isActive: true,
    },
  });

  console.log(`  ✅ Default interest rates seeded`);
}

/**
 * Seed fiscal years information (for reference)
 * Note: Fiscal years are stored as strings in various models (e.g., "2081/82")
 * This function logs the current and next fiscal year information for reference
 */
async function seedFiscalYears(cooperativeId: string) {
  console.log(`  Calculating fiscal years for cooperative ${cooperativeId}...`);

  const fiscalYears = getCurrentAndNextFiscalYears();

  // Log fiscal year information (fiscal years are used as strings in other models)
  console.log(`  ✅ Current fiscal year: ${fiscalYears.current.label} (${fiscalYears.current.startDate.toISOString().split('T')[0]} to ${fiscalYears.current.endDate.toISOString().split('T')[0]})`);
  console.log(`  ✅ Next fiscal year: ${fiscalYears.next.label} (${fiscalYears.next.startDate.toISOString().split('T')[0]} to ${fiscalYears.next.endDate.toISOString().split('T')[0]})`);
  console.log(`  ℹ️  Fiscal years are stored as strings (e.g., "${fiscalYears.current.label}") in models like PayrollRun, Payroll, etc.`);
}

/**
 * Seed workflow templates
 */
async function seedWorkflowTemplates(cooperativeId: string) {
  console.log(`  Seeding workflow templates for cooperative ${cooperativeId}...`);

  // Note: Workflow templates are typically stored as JSON configuration
  // This is a placeholder - actual implementation depends on your workflow engine
  // You may need to create a WorkflowTemplate model or store in a config table

  console.log(`  ✅ Workflow templates seeded (placeholder)`);
}

/**
 * Seed all default data for a cooperative
 */
async function seedCooperativeDefaults(cooperativeId: string) {
  console.log(`\n📦 Seeding defaults for cooperative ${cooperativeId}...`);
  await seedDefaultRoles(cooperativeId);
  await seedChartOfAccounts(cooperativeId);
  await seedDefaultInterestRates(cooperativeId);
  await seedFiscalYears(cooperativeId);
  await seedWorkflowTemplates(cooperativeId);
  console.log(`✅ Completed seeding for cooperative ${cooperativeId}\n`);
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create default plans (using findFirst + create pattern for idempotency since id is auto-generated)
  const existingBasic = await prisma.plan.findFirst({
    where: { name: 'Basic' },
  });

  // All available modules
  const allModules = ['cbs', 'dms', 'hrm', 'governance', 'inventory', 'compliance'];

  const basicPlan = existingBasic
    ? await prisma.plan.update({
        where: { id: existingBasic.id },
        data: {
          enabledModules: allModules,
        },
      })
    : await prisma.plan.create({
        data: {
          name: 'Basic',
          monthlyPrice: 0,
          enabledModules: allModules,
        },
      });

  const existingStandard = await prisma.plan.findFirst({
    where: { name: 'Standard' },
  });

  const standardPlan =
    existingStandard ||
    (await prisma.plan.create({
      data: {
        name: 'Standard',
        monthlyPrice: 49.99,
        enabledModules: ['cbs'],
      },
    }));

  const existingPremium = await prisma.plan.findFirst({
    where: { name: 'Premium' },
  });

  const premiumPlan =
    existingPremium ||
    (await prisma.plan.create({
      data: {
        name: 'Premium',
        monthlyPrice: 99.99,
        enabledModules: ['cbs', 'dms', 'hrm'],
      },
    }));

  const existingEnterprise = await prisma.plan.findFirst({
    where: { name: 'Enterprise' },
  });

  const enterprisePlan =
    existingEnterprise ||
    (await prisma.plan.create({
      data: {
        name: 'Enterprise',
        monthlyPrice: 199.99,
        enabledModules: ['cbs', 'dms', 'hrm', 'governance', 'inventory', 'compliance'],
      },
    }));

  console.log('✅ Plans seeded:', {
    basic: basicPlan.name,
    standard: standardPlan.name,
    premium: premiumPlan.name,
    enterprise: enterprisePlan.name,
  });

  // Seed defaults for all existing cooperatives
  const cooperatives = await prisma.cooperative.findMany({
    select: { id: true, name: true },
  });

  if (cooperatives.length > 0) {
    console.log(`\n📋 Found ${cooperatives.length} cooperative(s), seeding defaults...`);
    for (const coop of cooperatives) {
      await seedCooperativeDefaults(coop.id);
    }
  } else {
    console.log('\n📋 No existing cooperatives found. Defaults will be seeded when cooperatives are created.');
  }

  console.log('\n✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
