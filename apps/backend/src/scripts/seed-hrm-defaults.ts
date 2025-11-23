import { prisma } from '../lib/prisma.js';

/**
 * Seed default HRM data for a cooperative
 * This should be called when a cooperative is created or HRM module is enabled
 */
export async function seedHRMDefaults(cooperativeId: string) {
  // Seed default leave types
  const leaveTypes = [
    { name: 'घर बिदा', nameEn: 'Home Leave', defaultAnnualQuota: 12, isPaid: true },
    { name: 'बिरामी बिदा', nameEn: 'Sick Leave', defaultAnnualQuota: 12, isPaid: true },
    { name: 'प्रसूति बिदा', nameEn: 'Maternity Leave', defaultAnnualQuota: 60, isPaid: true },
    { name: 'काज', nameEn: 'Official Visit', defaultAnnualQuota: 0, isPaid: true },
    { name: 'सट्टा बिदा', nameEn: 'Compensatory Leave', defaultAnnualQuota: 0, isPaid: true },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: {
        cooperativeId_name: {
          cooperativeId,
          name: lt.name,
        },
      },
      create: {
        cooperativeId,
        name: lt.name,
        defaultAnnualQuota: lt.defaultAnnualQuota,
        isPaid: lt.isPaid,
      },
      update: {},
    });
  }

  // Seed default shift (10:00 AM - 5:00 PM)
  const defaultCheckIn = new Date();
  defaultCheckIn.setHours(10, 0, 0, 0);
  const defaultCheckOut = new Date();
  defaultCheckOut.setHours(17, 0, 0, 0);

  await prisma.shift.upsert({
    where: {
      cooperativeId_name: {
        cooperativeId,
        name: 'Default Shift',
      },
    },
    create: {
      cooperativeId,
      name: 'Default Shift',
      expectedCheckIn: defaultCheckIn,
      expectedCheckOut: defaultCheckOut,
      graceMinutes: 5,
    },
    update: {},
  });

  // Seed default payroll settings (SSF scheme)
  // Note: GL account IDs need to be set manually or created via Chart of Accounts
  await prisma.payrollSettings.upsert({
    where: {
      cooperativeId,
    },
    create: {
      cooperativeId,
      scheme: 'SSF',
      tdsConfig: {
        slabs: [
          { min: 0, max: 500000, rate: 0 },
          { min: 500000, max: 700000, rate: 0.1 },
          { min: 700000, max: 2000000, rate: 0.2 },
          { min: 2000000, max: Infinity, rate: 0.3 },
        ],
      },
      glSalaryExpense: '', // To be configured
      glSsfExpense: '', // To be configured
      glTdsPayable: '', // To be configured
      glSsfPayable: '', // To be configured
      glStaffLoanReceivable: '', // To be configured
      glCashOrBank: '', // To be configured
      festivalBonusMonthBs: 6, // Ashwin (default)
    },
    update: {},
  });

  console.log(`HRM defaults seeded for cooperative ${cooperativeId}`);
}
