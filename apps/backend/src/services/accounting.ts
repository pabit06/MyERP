import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// ============================================================
// 1. MASTER SEED DATA (NFRS & 4-ACCOUNT COMPLIANT)
// ============================================================
export const FINAL_COA_SEED_DATA = [
  // 1. ASSETS (सम्पत्ति)
  {
    code: '1',
    name: 'Assets (सम्पत्ति)',
    type: 'asset',
    isGroup: true,
    children: [
      // 10100 - Cash in Hand (नगद)
      {
        code: '10100',
        name: 'Cash in Hand (नगद)',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.1',
        children: [
          {
            code: '00-10100-01-00001',
            name: 'Main Vault Cash (मुख्य ढुकुटी)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10100-02-00001',
            name: 'Teller Cash (काउन्टर १)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10100-02-00002',
            name: 'Teller Cash (काउन्टर २)',
            type: 'asset',
            isGroup: false,
          },
        ],
      },
      // 10200 - Bank Balance (बैंक मौज्दात)
      {
        code: '10200',
        name: 'Bank Balance (बैंक मौज्दात)',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.2',
        children: [
          {
            code: '00-10200-01-00001',
            name: 'Nabil Bank - Current A/c',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10200-01-00002',
            name: 'Prabhu Bank - Current A/c',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10200-02-00001',
            name: 'Nabil Bank - Call A/c',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10200-03-00001',
            name: 'Nabil Bank - FD (1 Year)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10200-03-00002',
            name: 'Global IME - FD (6 Months)',
            type: 'asset',
            isGroup: false,
          },
        ],
      },
      // 10300 - Financial Investments (वित्तीय लगानी)
      {
        code: '10300',
        name: 'Financial Investments (वित्तीय लगानी)',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.5',
        children: [
          {
            code: '00-10300-01-00001',
            name: 'Share Investment - NEFSCUN (नेफ्स्कून शेयर)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10300-01-00002',
            name: 'Share Investment - Dist. Co-op Union (जिल्ला संघ)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10300-01-00003',
            name: 'Share Investment - National Co-op Bank',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10300-02-00001',
            name: 'Government Bonds (सरकारी ऋणपत्र)',
            type: 'asset',
            isGroup: false,
          },
        ],
      },
      // 10400 - Member Loan Portfolio (कर्जा लगानी) - Control Accounts
      {
        code: '10400',
        name: 'Member Loan Portfolio (कर्जा लगानी)',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.3',
        children: [
          {
            code: '00-10400-01-00000',
            name: 'Business Loan (व्यापार कर्जा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-02-00000',
            name: 'Agriculture Loan (कृषि कर्जा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-03-00000',
            name: 'Hire Purchase Loan (सवारी कर्जा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-04-00000',
            name: 'Housing/Real Estate Loan (घर जग्गा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-05-00000',
            name: 'Personal/Overdraft Loan (व्यक्तिगत)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-06-00000',
            name: 'Deprived Sector Loan (विपन्न वर्ग)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-07-00000',
            name: 'Gold/Silver Loan (सुन चाँदी कर्जा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-08-00000',
            name: 'Education Loan (शिक्षा कर्जा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10400-09-00000',
            name: 'Staff Loan (कर्मचारी कर्जा)',
            type: 'asset',
            isGroup: false,
            nfrsMap: '4.4',
          },
        ],
      },
      // 10500 - Land & Building (स्थिर सम्पत्ति)
      {
        code: '10500',
        name: 'Land & Building (स्थिर सम्पत्ति)',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.8',
        children: [
          {
            code: '00-10500-01-00001',
            name: 'Office Land (कार्यालयको जग्गा)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10500-02-00001',
            name: 'Office Building (भवन)',
            type: 'asset',
            isGroup: false,
          },
        ],
      },
      // 10600 - Office Equipment
      {
        code: '10600',
        name: 'Office Equipment',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.8',
        children: [
          {
            code: '00-10600-01-00001',
            name: 'Furniture & Fixtures',
            type: 'asset',
            isGroup: false,
          },
          { code: '00-10600-02-00001', name: 'Computer & Printers', type: 'asset', isGroup: false },
          {
            code: '00-10600-02-00002',
            name: 'Networking Equipment (Router/Switch)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10600-03-00001',
            name: 'Vehicles (Office Bike/Scooter)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10600-04-00001',
            name: 'Generator / Inverter / Battery',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10600-05-00001',
            name: 'Locker / Safe (Vault)',
            type: 'asset',
            isGroup: false,
          },
        ],
      },
      // 10700 - Receivables & Advances (अन्य सम्पत्ति)
      {
        code: '10700',
        name: 'Receivables & Advances (अन्य सम्पत्ति)',
        type: 'asset',
        isGroup: true,
        nfrsMap: '4.11',
        children: [
          {
            code: '00-10700-01-00001',
            name: 'Staff Advance (पेश्की)',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10700-02-00001',
            name: 'Interest Receivable on Investment',
            type: 'asset',
            isGroup: false,
          },
          {
            code: '00-10700-03-00001',
            name: 'Prepaid Rent (House Rent)',
            type: 'asset',
            isGroup: false,
          },
          { code: '00-10700-04-00001', name: 'Prepaid Insurance', type: 'asset', isGroup: false },
          {
            code: '00-10700-05-00001',
            name: 'Suspense Account (Assets)',
            type: 'asset',
            isGroup: false,
          },
        ],
      },
    ],
  },
  // 2. LIABILITIES (दायित्व)
  {
    code: '2',
    name: 'Liabilities (दायित्व)',
    type: 'liability',
    isGroup: true,
    children: [
      // 20100 - Saving & Deposits (सदस्य बचत दायित्व) - Control Accounts
      {
        code: '20100',
        name: 'Saving & Deposits (सदस्य बचत दायित्व)',
        type: 'liability',
        isGroup: true,
        nfrsMap: '4.12',
        children: [
          {
            code: '00-20100-01-00000',
            name: 'General Saving (साधारण बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-02-00000',
            name: 'Optional Saving (ऐच्छिक बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-03-00000',
            name: 'Daily Saving (दैनिक बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-04-00000',
            name: 'Monthly Recurring (क्रमिक/मासिक बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-05-00000',
            name: 'Child/Bal Saving (बाल बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-06-00000',
            name: 'Senior Citizen Saving (जेष्ठ नागरिक)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-07-00000',
            name: 'Fixed Deposit (मुद्दती बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-08-00000',
            name: 'Nari/Women Saving (महिला बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-09-00000',
            name: 'Festival Saving (चाडपर्व बचत)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20100-10-00000',
            name: 'Khutruke Saving (खुत्रुके बचत)',
            type: 'liability',
            isGroup: false,
          },
        ],
      },
      // 20200 - TDS Payable (कर दायित्व)
      {
        code: '20200',
        name: 'TDS Payable (कर दायित्व)',
        type: 'liability',
        isGroup: true,
        nfrsMap: '4.17',
        children: [
          {
            code: '00-20200-01-00001',
            name: 'TDS on Interest - Saving (6%)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20200-02-00001',
            name: 'TDS on Audit Fee (1.5%)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20200-03-00001',
            name: 'TDS on House Rent (10%)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20200-04-00001',
            name: 'TDS on Staff Salary (1%)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20200-05-00001',
            name: 'TDS on Meeting Allowance (15%)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20200-06-00001',
            name: 'TDS on Commission/Incentive (15%)',
            type: 'liability',
            isGroup: false,
          },
        ],
      },
      // 20300 - Sundry Creditors (साहु/भेंडरहरू)
      {
        code: '20300',
        name: 'Sundry Creditors (साहु/भेंडरहरू)',
        type: 'liability',
        isGroup: true,
        children: [
          {
            code: '00-20300-00-00001',
            name: 'Audit Fee Payable',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20300-00-00002',
            name: 'Electricity/Water Bill Payable',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20300-00-00003',
            name: 'Stationery Vendor Payable',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20300-00-00004',
            name: 'Software AMC Payable',
            type: 'liability',
            isGroup: false,
          },
        ],
      },
      // 20400 - Staff Payables (कर्मचारी दायित्व)
      {
        code: '20400',
        name: 'Staff Payables (कर्मचारी दायित्व)',
        type: 'liability',
        isGroup: true,
        children: [
          { code: '00-20400-00-00001', name: 'Salary Payable', type: 'liability', isGroup: false },
          {
            code: '00-20400-00-00002',
            name: 'Staff Bonus Payable',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20400-00-00003',
            name: 'Staff Provident Fund Payable',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20400-00-00004',
            name: 'Citizen Investment Trust (CIT)',
            type: 'liability',
            isGroup: false,
          },
        ],
      },
      // 20500 - Borrowings (बाहिरी ऋण दायित्व)
      {
        code: '20500',
        name: 'Borrowings (बाहिरी ऋण दायित्व)',
        type: 'liability',
        isGroup: true,
        nfrsMap: '4.13',
        children: [
          {
            code: '00-20500-01-00001',
            name: 'Loan from NEFSCUN',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20500-01-00002',
            name: 'Loan from National Co-op Bank',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20500-02-00001',
            name: 'Bank Overdraft (OD) Loan',
            type: 'liability',
            isGroup: false,
          },
        ],
      },
      // 20600 - Suspense & Others (अन्य दायित्व)
      {
        code: '20600',
        name: 'Suspense & Others (अन्य दायित्व)',
        type: 'liability',
        isGroup: true,
        children: [
          {
            code: '00-20600-00-00001',
            name: 'Suspense Account (Liabilities)',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20600-00-00002',
            name: 'Advance Income Received',
            type: 'liability',
            isGroup: false,
          },
          {
            code: '00-20600-00-00003',
            name: 'Unclaimed Dividend',
            type: 'liability',
            isGroup: false,
          },
        ],
      },
    ],
  },
  // 3. EQUITY (पुँजी)
  {
    code: '3',
    name: 'Equity (पुँजी)',
    type: 'equity',
    isGroup: true,
    children: [
      // 30100 - Share Capital (शेयर पुँजी) - Control Account
      {
        code: '30100',
        name: 'Share Capital (शेयर पुँजी)',
        type: 'equity',
        isGroup: true,
        nfrsMap: '4.19',
        children: [
          {
            code: '00-30100-01-00000',
            name: 'Ordinary Share Capital (साधारण शेयर पुँजी)',
            type: 'equity',
            isGroup: false,
          },
        ],
      },
      // 30200 - Reserves (संवैधानिक तथा जगेडा कोष)
      {
        code: '30200',
        name: 'Reserves (संवैधानिक तथा जगेडा कोष)',
        type: 'equity',
        isGroup: true,
        nfrsMap: '4.18',
        children: [
          {
            code: '00-30200-01-00001',
            name: 'General Reserve Fund (साधारण जगेडा कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30200-02-00001',
            name: 'Protected Capital Redemption Fund (संरक्षित पुँजी फिर्ता कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30200-03-00001',
            name: 'Capital Reserve Fund (पुँजीगत जगेडा कोष)',
            type: 'equity',
            isGroup: false,
          },
        ],
      },
      // 30300 - Institutional Funds (अन्य कोषहरू)
      {
        code: '30300',
        name: 'Institutional Funds (अन्य कोषहरू)',
        type: 'equity',
        isGroup: true,
        children: [
          {
            code: '00-30300-01-00001',
            name: 'Cooperative Education Fund (सहकारी शिक्षा कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30300-02-00001',
            name: 'Member Welfare Fund (सदस्य राहत/कल्याण कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30300-03-00001',
            name: 'Staff Bonus Fund (कर्मचारी बोनस कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30300-04-00001',
            name: 'Community Development Fund (सामुदायिक विकास कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30300-05-00001',
            name: 'Share Dividend Fund (शेयर लाभांश कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30300-06-00001',
            name: 'Patronage Refund Fund (संरक्षित पुँजी फिर्ता/व्यापार कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30300-07-00001',
            name: 'Building Construction Fund (भवन निर्माण कोष)',
            type: 'equity',
            isGroup: false,
          },
        ],
      },
      // 30400 - Risk Funds (जोखिम व्यवस्थापन कोष)
      {
        code: '30400',
        name: 'Risk Funds (जोखिम व्यवस्थापन कोष)',
        type: 'equity',
        isGroup: true,
        children: [
          {
            code: '00-30400-01-00001',
            name: 'Interest Suspense Account (ब्याज असुली कोष)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30400-02-00001',
            name: 'Price Fluctuation Fund (मूल्य स्थिरीकरण कोष)',
            type: 'equity',
            isGroup: false,
          },
        ],
      },
      // 30500 - Retained Earnings (नाफा/नोक्सान)
      {
        code: '30500',
        name: 'Retained Earnings (नाफा/नोक्सान)',
        type: 'equity',
        isGroup: true,
        nfrsMap: '4.18',
        children: [
          {
            code: '00-30500-00-00001',
            name: 'Profit & Loss A/c (Current Year)',
            type: 'equity',
            isGroup: false,
          },
          {
            code: '00-30500-00-00002',
            name: 'Retained Earnings (Accumulated Profit)',
            type: 'equity',
            isGroup: false,
          },
        ],
      },
    ],
  },
  // 4. INCOME (आम्दानी)
  {
    code: '4',
    name: 'Income (आम्दानी)',
    type: 'income',
    isGroup: true,
    children: [
      // 40100 - Interest on Loan (ब्याज आम्दानी)
      {
        code: '40100',
        name: 'Interest on Loan (ब्याज आम्दानी)',
        type: 'income',
        isGroup: true,
        nfrsMap: '4.22',
        children: [
          {
            code: '00-40100-01-00001',
            name: 'Int. Income - Business Loan',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40100-02-00001',
            name: 'Int. Income - Agriculture Loan',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40100-03-00001',
            name: 'Int. Income - Hire Purchase',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40100-04-00001',
            name: 'Int. Income - Housing Loan',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40100-05-00001',
            name: 'Int. Income - Personal/OD',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40100-06-00001',
            name: 'Int. Income - Deprived Sector',
            type: 'income',
            isGroup: false,
          },
        ],
      },
      // 40200 - Interest on Investment (लगानीबाट आम्दानी)
      {
        code: '40200',
        name: 'Interest on Investment (लगानीबाट आम्दानी)',
        type: 'income',
        isGroup: true,
        children: [
          {
            code: '00-40200-01-00001',
            name: 'Interest from Bank Deposits',
            type: 'income',
            isGroup: false,
          },
          { code: '00-40200-02-00001', name: 'Dividend Income', type: 'income', isGroup: false },
          {
            code: '00-40200-03-00001',
            name: 'Interest on Govt. Bonds',
            type: 'income',
            isGroup: false,
          },
        ],
      },
      // 40300 - Fees & Charges (सेवा शुल्क तथा कमिसन)
      {
        code: '40300',
        name: 'Fees & Charges (सेवा शुल्क तथा कमिसन)',
        type: 'income',
        isGroup: true,
        nfrsMap: '4.24',
        children: [
          {
            code: '00-40300-00-00001',
            name: 'Loan Service Charge (सेवा शुल्क)',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40300-00-00002',
            name: 'Membership Entrance Fee (प्रवेश शुल्क)',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40300-00-00003',
            name: 'Renewal Fee (नवीकरण शुल्क)',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40300-00-00004',
            name: 'Mobile Banking Charges',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40300-00-00005',
            name: 'Remittance Commission',
            type: 'income',
            isGroup: false,
          },
        ],
      },
      // 40400 - Miscellaneous (अन्य आम्दानी)
      {
        code: '40400',
        name: 'Miscellaneous (अन्य आम्दानी)',
        type: 'income',
        isGroup: true,
        children: [
          {
            code: '00-40400-00-00001',
            name: 'Form & Stationery Sales',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40400-00-00002',
            name: 'Penalty & Fine (हर्जाना)',
            type: 'income',
            isGroup: false,
          },
          {
            code: '00-40400-00-00003',
            name: 'Miscellaneous Income (विविध)',
            type: 'income',
            isGroup: false,
          },
        ],
      },
    ],
  },
  // 5. EXPENSES (खर्च)
  {
    code: '5',
    name: 'Expenses (खर्च)',
    type: 'expense',
    isGroup: true,
    children: [
      // 50100 - Interest on Deposits (ब्याज खर्च)
      {
        code: '50100',
        name: 'Interest on Deposits (ब्याज खर्च)',
        type: 'expense',
        isGroup: true,
        nfrsMap: '4.23',
        children: [
          {
            code: '00-50100-01-00001',
            name: 'Int. Exp - General Saving',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50100-02-00001',
            name: 'Int. Exp - Optional Saving',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50100-03-00001',
            name: 'Int. Exp - Daily Saving',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50100-07-00001',
            name: 'Int. Exp - Fixed Deposit',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50100-99-00001',
            name: 'Int. Exp - External Loan',
            type: 'expense',
            isGroup: false,
          },
        ],
      },
      // 50200 - Staff Cost (कर्मचारी खर्च)
      {
        code: '50200',
        name: 'Staff Cost (कर्मचारी खर्च)',
        type: 'expense',
        isGroup: true,
        nfrsMap: '4.28',
        children: [
          {
            code: '00-50200-00-00001',
            name: 'Staff Salary (तलव)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50200-00-00002',
            name: 'Staff Dashain Allowance (भत्ता)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50200-00-00003',
            name: 'Staff Provident Fund Exp',
            type: 'expense',
            isGroup: false,
          },
          { code: '00-50200-00-00004', name: 'Staff Uniform', type: 'expense', isGroup: false },
          {
            code: '00-50200-00-00005',
            name: 'Staff Training & Development',
            type: 'expense',
            isGroup: false,
          },
        ],
      },
      // 50300 - Admin Expenses (कार्यालय सञ्चालन खर्च)
      {
        code: '50300',
        name: 'Admin Expenses (कार्यालय सञ्चालन खर्च)',
        type: 'expense',
        isGroup: true,
        nfrsMap: '4.29',
        children: [
          {
            code: '00-50300-00-00001',
            name: 'Office Rent (घरभाडा)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00002',
            name: 'Electricity & Water',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00003',
            name: 'Telephone & Internet',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00004',
            name: 'Printing & Stationery',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00005',
            name: 'Tea & Hospitality (चियापान)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00006',
            name: 'Meeting Allowance (बैठक भत्ता)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00007',
            name: 'Fuel & Transportation',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00008',
            name: 'Newspaper & Journals',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00009',
            name: 'Audit Fee (लेखापरीक्षण शुल्क)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00010',
            name: 'AGM Expenses (साधारण सभा)',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50300-00-00011',
            name: 'Software AMC Charges',
            type: 'expense',
            isGroup: false,
          },
        ],
      },
      // 50400 - Provisions & Depreciation (गैर-नगद खर्च)
      {
        code: '50400',
        name: 'Provisions & Depreciation (गैर-नगद खर्च)',
        type: 'expense',
        isGroup: true,
        children: [
          {
            code: '00-50400-00-00001',
            name: 'Depreciation - Furniture',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50400-00-00002',
            name: 'Depreciation - Computer/IT',
            type: 'expense',
            isGroup: false,
          },
          {
            code: '00-50400-00-00003',
            name: 'Loan Loss Provision Exp',
            type: 'expense',
            isGroup: false,
          },
        ],
      },
    ],
  },
];

// ============================================================
// 2. HELPER FUNCTION: RECURSIVE SEEDING
// ============================================================
export async function seedAccountRecursive(
  cooperativeId: string,
  node: any,
  parentId: string | null = null
) {
  // 1. Map Types just in case (though our constant is clean now)
  const typeMap: any = {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    INCOME: 'income',
    REVENUE: 'income', // 'revenue' maps to 'income' for backward compatibility
    EXPENSE: 'expense',
  };
  const safeType = typeMap[node.type.toUpperCase()] || node.type.toLowerCase();

  // 2. Upsert the Account (Create or Update)
  // We use 'code' + 'cooperativeId' to find uniqueness
  let account = await prisma.chartOfAccounts.findFirst({
    where: { cooperativeId, code: node.code },
  });

  if (account) {
    // Update existing to ensure fields are correct
    account = await prisma.chartOfAccounts.update({
      where: { id: account.id },
      data: {
        name: node.name,
        type: safeType,
        isGroup: node.isGroup ?? false,
        nfrsMap: node.nfrsMap ?? null,
        parentId: parentId,
      },
    });
  } else {
    // Create new
    account = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: node.code,
        name: node.name,
        type: safeType,
        isGroup: node.isGroup ?? false,
        nfrsMap: node.nfrsMap ?? null,
        parentId: parentId,
        isActive: true,
      },
    });
  }

  // 3. Process Children Recursively
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await seedAccountRecursive(cooperativeId, child, account.id);
    }
  }
}

// ============================================================
// 3. ACCOUNT CODE STRUCTURE HELPERS
// ============================================================
/**
 * Account Code Structure: BB-GGGGG-SS-SSSSS (14 digits)
 * - Branch (2 digits): 00 (Head Office)
 * - GL Head (5 digits): 1xxxx (Assets), 2xxxx (Liabilities), 3xxxx (Equity), 4xxxx (Income), 5xxxx (Expenses)
 * - Sub-Type (2 digits): 01, 02.. (Product Type/Nature), 00 (General/No Type)
 * - Serial (5 digits): 00001 (Auto Increment per Sub-Type)
 */

/**
 * Get GL Head code from account type
 */
export function getGLHeadFromType(type: string): string {
  const typeMap: Record<string, string> = {
    asset: '10000',
    liability: '20000',
    equity: '30000',
    income: '40000',
    revenue: '40000', // Alias for backward compatibility
    expense: '50000',
  };
  return typeMap[type.toLowerCase()] || '00000';
}

/**
 * Parse account code into components
 */
export function parseAccountCode(code: string): {
  branch: string;
  glHead: string;
  subType: string;
  serial: string;
} | null {
  // Remove dashes if present
  const cleanCode = code.replace(/-/g, '');

  if (cleanCode.length !== 14) {
    return null;
  }

  return {
    branch: cleanCode.substring(0, 2),
    glHead: cleanCode.substring(2, 7),
    subType: cleanCode.substring(7, 9),
    serial: cleanCode.substring(9, 14),
  };
}

/**
 * Format account code with dashes
 */
export function formatAccountCode(
  branch: string,
  glHead: string,
  subType: string,
  serial: string
): string {
  return `${branch}-${glHead}-${subType}-${serial}`;
}

/**
 * Generate next serial number for a given GL Head and Sub-Type
 */
export async function getNextSerialNumber(
  cooperativeId: string,
  glHead: string,
  subType: string,
  branch: string = '00'
): Promise<string> {
  // Find the highest serial number for this GL Head + Sub-Type combination
  const prefix = `${branch}${glHead}${subType}`;

  const accounts = await prisma.chartOfAccounts.findMany({
    where: {
      cooperativeId,
      code: {
        startsWith: prefix,
      },
      isActive: true,
    },
    select: {
      code: true,
    },
    orderBy: {
      code: 'desc',
    },
    take: 1,
  });

  if (accounts.length === 0) {
    return '00001';
  }

  // Extract serial from the last code
  const lastCode = accounts[0].code.replace(/-/g, '');
  const lastSerial = parseInt(lastCode.substring(9, 14), 10);
  const nextSerial = lastSerial + 1;

  return String(nextSerial).padStart(5, '0');
}

/**
 * Generate account code automatically
 */
export async function generateAccountCode(
  cooperativeId: string,
  type: string,
  subType: string = '00',
  branch: string = '00'
): Promise<string> {
  const glHead = getGLHeadFromType(type);
  const serial = await getNextSerialNumber(cooperativeId, glHead, subType, branch);
  return formatAccountCode(branch, glHead, subType, serial);
}

/**
 * Validate account code format
 */
export function validateAccountCodeFormat(code: string): { valid: boolean; error?: string } {
  const parsed = parseAccountCode(code);

  if (!parsed) {
    return { valid: false, error: 'Account code must be 14 digits (format: BB-GGGGG-SS-SSSSS)' };
  }

  // Validate GL Head matches type
  const glHeadFirst = parsed.glHead.charAt(0);
  const validGLHeads = ['1', '2', '3', '4', '5'];

  if (!validGLHeads.includes(glHeadFirst)) {
    return {
      valid: false,
      error: 'GL Head must start with 1-5 (1=Asset, 2=Liability, 3=Equity, 4=Income, 5=Expense)',
    };
  }

  return { valid: true };
}

/**
 * Find or get account by code and type
 */
export async function findAccountByCode(
  cooperativeId: string,
  code: string,
  type?: string
): Promise<string | null> {
  const account = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code,
      ...(type ? { type } : {}),
      isActive: true,
    },
  });

  return account?.id || null;
}

/**
 * Get or create account by code, name, and type
 * Returns the account ID
 */
export async function getOrCreateAccount(
  cooperativeId: string,
  code: string,
  name: string,
  type: string,
  parentId?: string
): Promise<string> {
  let account = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code,
      isActive: true,
    },
  });

  if (!account) {
    account = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code,
        name,
        type,
        parentId: parentId || null,
        isActive: true,
      },
    });
  }

  return account.id;
}

/**
 * Create a journal entry with ledger postings
 * @param cooperativeId - Cooperative ID
 * @param description - Description of the journal entry
 * @param entries - Array of { accountId, debit, credit } entries
 * @param date - Optional date for the entry (defaults to now)
 * @returns The created journal entry
 */
export async function createJournalEntry(
  cooperativeId: string,
  description: string,
  entries: Array<{ accountId: string; debit: number; credit: number }>,
  date?: Date
): Promise<{ journalEntry: any; ledgers: any[] }> {
  // Validate double-entry: total debits must equal total credits
  const totalDebits = entries.reduce((sum, e) => sum + Number(e.debit), 0);
  const totalCredits = entries.reduce((sum, e) => sum + Number(e.credit), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Double-entry validation failed: Debits (${totalDebits}) must equal Credits (${totalCredits})`
    );
  }

  // Generate entry number inside transaction to prevent race conditions
  const year = (date || new Date()).getFullYear();

  return await prisma.$transaction(async (tx) => {
    // Count entries inside transaction to ensure atomicity
    const entryCount = await tx.journalEntry.count({
      where: {
        cooperativeId,
        date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const entryNumber = `JE-${year}-${String(entryCount + 1).padStart(6, '0')}`;

    // Create journal entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        cooperativeId,
        entryNumber,
        description,
        date: date || new Date(),
      },
    });

    // Create ledger entries with calculated balances
    const ledgerEntries = await Promise.all(
      entries.map(async (entry) => {
        const account = await tx.chartOfAccounts.findUnique({
          where: { id: entry.accountId },
        });

        if (!account) {
          throw new Error(`Account not found: ${entry.accountId}`);
        }

        // Calculate new balance based on account type
        // Assets and Expenses: debit increases, credit decreases
        // Liabilities, Equity, Income: credit increases, debit decreases
        const isDebitNormal = account.type === 'asset' || account.type === 'expense';
        const balanceChange = isDebitNormal
          ? entry.debit - entry.credit
          : entry.credit - entry.debit;

        // Get current balance from latest ledger entry for this account
        const latestLedger = await tx.ledger.findFirst({
          where: { accountId: entry.accountId },
          orderBy: { createdAt: 'desc' },
        });

        const currentBalance = latestLedger ? Number(latestLedger.balance) : 0;
        const newBalance = currentBalance + balanceChange;

        return tx.ledger.create({
          data: {
            cooperativeId,
            accountId: entry.accountId,
            journalEntryId: journalEntry.id,
            debit: new Prisma.Decimal(entry.debit),
            credit: new Prisma.Decimal(entry.credit),
            balance: new Prisma.Decimal(newBalance),
          },
        });
      })
    );

    return { journalEntry, ledgers: ledgerEntries };
  });
}

/**
 * Post share capital to ledger
 * Creates journal entry: Debit Cash/Bank/Saving, Credit Share Capital
 * @returns Journal entry ID for linking to share transaction
 */
export async function postShareCapital(
  cooperativeId: string,
  amount: number,
  memberId: string,
  memberNumber: string,
  sharePrice: number,
  shares: number,
  paymentMode: 'CASH' | 'BANK' | 'SAVING' = 'CASH',
  bankAccountId?: string,
  savingAccountId?: string,
  date?: Date,
  fromAdvancePayment?: boolean // If true, debit Advance Payments instead of Cash
): Promise<string> {
  // Get Share Capital account (Equity type) - use NFRS code
  let shareCapitalAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-30100-01-00000', // NFRS code for Ordinary Share Capital
      type: 'equity',
      isActive: true,
    },
  });

  // If not found, try to find any Share Capital account
  if (!shareCapitalAccount) {
    shareCapitalAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '30100' },
        type: 'equity',
        isActive: true,
      },
    });
  }

  // If still not found, create with NFRS code
  if (!shareCapitalAccount) {
    shareCapitalAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-30100-01-00000',
        name: 'Ordinary Share Capital (साधारण शेयर पुँजी)',
        type: 'equity',
        isActive: true,
      },
    });
  }

  const shareCapitalAccountId = shareCapitalAccount.id;

  // Determine debit account based on payment mode or advance payment
  let debitAccountId: string;

  if (fromAdvancePayment) {
    // If payment was already received as advance, debit Advance Payments Liability
    let advanceAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-20100-00-00001',
        type: 'liability',
        isActive: true,
      },
    });

    if (!advanceAccount) {
      advanceAccount = await prisma.chartOfAccounts.create({
        data: {
          cooperativeId,
          code: '00-20100-00-00001',
          name: 'Advance Payments from Applicants (आवेदकबाट अग्रिम भुक्तानी)',
          type: 'liability',
          isActive: true,
        },
      });
    }

    debitAccountId = advanceAccount.id;
  } else if (paymentMode === 'BANK' && bankAccountId) {
    // Use provided bank account
    debitAccountId = bankAccountId;
  } else if (paymentMode === 'SAVING' && savingAccountId) {
    // For saving account, get the saving account and its product's GL mapping
    const savingAccount = await prisma.savingAccount.findUnique({
      where: { id: savingAccountId },
      include: {
        product: true,
      },
    });

    if (!savingAccount) {
      throw new Error('Saving account not found');
    }

    // Get the product's GL mapping to find the deposit GL account
    const productGLMap = await prisma.productGLMap.findUnique({
      where: {
        cooperativeId_productType_productId: {
          cooperativeId,
          productType: 'saving',
          productId: savingAccount.productId,
        },
      },
    });

    if (productGLMap && productGLMap.depositGLCode) {
      // Use the mapped deposit GL account
      const depositAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: productGLMap.depositGLCode,
          type: 'liability',
          isActive: true,
        },
      });

      if (depositAccount) {
        debitAccountId = depositAccount.id;
      } else {
        throw new Error(
          `Deposit GL account ${productGLMap.depositGLCode} not found for saving product ${savingAccount.product.code}`
        );
      }
    } else {
      // Fallback: Use default deposit account or create a generic one
      // This should ideally be configured, but we'll use a standard code
      debitAccountId = await getOrCreateAccount(
        cooperativeId,
        '00-20100-01-00001', // NFRS code for Member Deposits
        'Member Deposits (सदस्य जम्मा)',
        'liability'
      );
    }
  } else {
    // Default to Cash - use NFRS code
    let cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001', // NFRS code for Main Vault Cash
        type: 'asset',
        isActive: true,
      },
    });

    // If not found, try to find any Cash account
    if (!cashAccount) {
      cashAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: { startsWith: '10100' },
          type: 'asset',
          isActive: true,
        },
      });
    }

    // If still not found, create with NFRS code
    if (!cashAccount) {
      cashAccount = await prisma.chartOfAccounts.create({
        data: {
          cooperativeId,
          code: '00-10100-01-00001',
          name: 'Main Vault Cash (मुख्य ढुकुटी)',
          type: 'asset',
          isActive: true,
        },
      });
    }

    debitAccountId = cashAccount.id;
  }

  const description = `Share purchase by member ${memberNumber} - ${shares} shares @ ${sharePrice} per share`;

  const { journalEntry } = await createJournalEntry(
    cooperativeId,
    description,
    [
      {
        accountId: debitAccountId,
        debit: amount,
        credit: 0,
      },
      {
        accountId: shareCapitalAccountId,
        debit: 0,
        credit: amount,
      },
    ],
    date
  );

  return journalEntry.id;
}

/**
 * Post share return to ledger
 * Creates journal entry: Debit Share Capital, Credit Cash/Bank
 * @returns Journal entry ID for linking to share transaction
 */
export async function postShareReturn(
  cooperativeId: string,
  amount: number,
  memberId: string,
  memberNumber: string,
  shares: number,
  paymentMode: 'CASH' | 'BANK' = 'CASH',
  bankAccountId?: string,
  date?: Date
): Promise<string> {
  // Get Share Capital account (Equity type) - use NFRS code
  let shareCapitalAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-30100-01-00000', // NFRS code for Ordinary Share Capital
      type: 'equity',
      isActive: true,
    },
  });

  // If not found, try to find any Share Capital account
  if (!shareCapitalAccount) {
    shareCapitalAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '30100' },
        type: 'equity',
        isActive: true,
      },
    });
  }

  // If still not found, create with NFRS code
  if (!shareCapitalAccount) {
    shareCapitalAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-30100-01-00000',
        name: 'Ordinary Share Capital (साधारण शेयर पुँजी)',
        type: 'equity',
        isActive: true,
      },
    });
  }

  const shareCapitalAccountId = shareCapitalAccount.id;

  // Determine credit account based on payment mode
  let creditAccountId: string;

  if (paymentMode === 'BANK' && bankAccountId) {
    creditAccountId = bankAccountId;
  } else {
    // Default to Cash - use NFRS code
    let cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001', // NFRS code for Main Vault Cash
        type: 'asset',
        isActive: true,
      },
    });

    // If not found, try to find any Cash account
    if (!cashAccount) {
      cashAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: { startsWith: '10100' },
          type: 'asset',
          isActive: true,
        },
      });
    }

    // If still not found, create with NFRS code
    if (!cashAccount) {
      cashAccount = await prisma.chartOfAccounts.create({
        data: {
          cooperativeId,
          code: '00-10100-01-00001',
          name: 'Main Vault Cash (मुख्य ढुकुटी)',
          type: 'asset',
          isActive: true,
        },
      });
    }

    creditAccountId = cashAccount.id;
  }

  const description = `Share return by member ${memberNumber} - ${shares} shares`;

  const { journalEntry } = await createJournalEntry(
    cooperativeId,
    description,
    [
      {
        accountId: shareCapitalAccountId,
        debit: amount,
        credit: 0,
      },
      {
        accountId: creditAccountId,
        debit: 0,
        credit: amount,
      },
    ],
    date
  );

  return journalEntry.id;
}

/**
 * Post entry fee (prabesh shulka) to income account
 * Creates journal entry: Debit Cash/Bank, Credit Entry Fee Income
 */
export async function postEntryFee(
  cooperativeId: string,
  amount: number,
  memberId: string,
  memberNumber: string,
  date?: Date
): Promise<void> {
  if (!amount || amount <= 0) {
    return; // No entry fee, skip posting
  }

  // Get Entry Fee Income account (Income type) - use NFRS code
  let entryFeeAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-40300-00-00002', // NFRS code for Membership Entrance Fee
      type: 'income',
      isActive: true,
    },
  });

  // If not found, try to find any Entry Fee account
  if (!entryFeeAccount) {
    entryFeeAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        OR: [
          { code: { startsWith: '40300' }, name: { contains: 'Entrance' } },
          { code: { startsWith: '40300' }, name: { contains: 'प्रवेश' } },
        ],
        type: 'income',
        isActive: true,
      },
    });
  }

  // If still not found, create with NFRS code
  if (!entryFeeAccount) {
    entryFeeAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-40300-00-00002',
        name: 'Membership Entrance Fee (प्रवेश शुल्क)',
        type: 'income',
        isActive: true,
      },
    });
  }

  const entryFeeAccountId = entryFeeAccount.id;

  // Get Cash account (Asset type) - use NFRS code
  let cashAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-10100-01-00001', // NFRS code for Main Vault Cash
      type: 'asset',
      isActive: true,
    },
  });

  // If not found, try to find any Cash account
  if (!cashAccount) {
    cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '10100' },
        type: 'asset',
        isActive: true,
      },
    });
  }

  // If still not found, create with NFRS code
  if (!cashAccount) {
    cashAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-10100-01-00001',
        name: 'Main Vault Cash (मुख्य ढुकुटी)',
        type: 'asset',
        isActive: true,
      },
    });
  }

  const cashAccountId = cashAccount.id;

  const description = `Entry fee (Prabesh Shulka) from applicant ${memberNumber} - Application submitted (Non-refundable)`;

  await createJournalEntry(
    cooperativeId,
    description,
    [
      {
        accountId: cashAccountId,
        debit: amount,
        credit: 0,
      },
      {
        accountId: entryFeeAccountId,
        debit: 0,
        credit: amount,
      },
    ],
    date
  );
}

/**
 * Post advance payment from applicant (when KYC is submitted)
 * Creates journal entry: Debit Cash, Credit Advance Payments Liability
 * This is used when member submits application with payment
 */
export async function postAdvancePayment(
  cooperativeId: string,
  amount: number,
  memberId: string,
  memberName: string,
  date?: Date
): Promise<string> {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Get or create Advance Payments Liability account
  let advanceAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-20100-00-00001', // Custom code for Advance Payments
      type: 'liability',
      isActive: true,
    },
  });

  if (!advanceAccount) {
    advanceAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-20100-00-00001',
        name: 'Advance Payments from Applicants (आवेदकबाट अग्रिम भुक्तानी)',
        type: 'liability',
        isActive: true,
      },
    });
  }

  const advanceAccountId = advanceAccount.id;

  // Get Cash account
  let cashAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-10100-01-00001',
      type: 'asset',
      isActive: true,
    },
  });

  if (!cashAccount) {
    cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '10100' },
        type: 'asset',
        isActive: true,
      },
    });
  }

  if (!cashAccount) {
    cashAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-10100-01-00001',
        name: 'Main Vault Cash (मुख्य ढुकुटी)',
        type: 'asset',
        isActive: true,
      },
    });
  }

  const cashAccountId = cashAccount.id;

  const description = `Advance payment from applicant: ${memberName} (Member ID: ${memberId}) - Pending approval`;

  const { journalEntry } = await createJournalEntry(
    cooperativeId,
    description,
    [
      {
        accountId: cashAccountId,
        debit: amount,
        credit: 0,
      },
      {
        accountId: advanceAccountId,
        debit: 0,
        credit: amount,
      },
    ],
    date
  );

  return journalEntry.id;
}

/**
 * Transfer advance payment to proper accounts (when member is approved)
 * Creates journal entry: Debit Advance Payments, Credit Entry Fee Income
 * Note: Share Capital is handled separately by ShareService when issuing shares
 */
export async function transferAdvancePayment(
  cooperativeId: string,
  advanceAmount: number,
  shareAmount: number, // Not used here, kept for compatibility
  entryFeeAmount: number,
  memberId: string,
  memberNumber: string,
  date?: Date
): Promise<string> {
  if (entryFeeAmount <= 0) {
    // No entry fee to transfer
    return '';
  }

  // Get Advance Payments account
  const advanceAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-20100-00-00001',
      type: 'liability',
      isActive: true,
    },
  });

  if (!advanceAccount) {
    throw new Error('Advance Payments account not found');
  }

  const advanceAccountId = advanceAccount.id;

  // Get Entry Fee Income account
  let entryFeeAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-40300-00-00002',
      type: 'income',
      isActive: true,
    },
  });

  if (!entryFeeAccount) {
    entryFeeAccount = await prisma.chartOfAccounts.create({
      data: {
        cooperativeId,
        code: '00-40300-00-00002',
        name: 'Membership Entrance Fee (प्रवेश शुल्क)',
        type: 'income',
        isActive: true,
      },
    });
  }

  const entries: Array<{ accountId: string; debit: number; credit: number }> = [
    {
      accountId: advanceAccountId,
      debit: entryFeeAmount,
      credit: 0,
    },
    {
      accountId: entryFeeAccount.id,
      debit: 0,
      credit: entryFeeAmount,
    },
  ];

  const description = `Transfer entry fee from advance payment for member ${memberNumber}`;

  const { journalEntry } = await createJournalEntry(cooperativeId, description, entries, date);

  return journalEntry.id;
}

/**
 * Refund or waive entry fee (for special promotional offers like Teej festival)
 * Creates journal entry: Debit Entry Fee Income, Credit Cash (if refund) or Debit Entry Fee Income, Credit Entry Fee Waiver Expense (if waiver)
 * Use case: Committee can offer entry fee waiver/discount for special promotions
 */
export async function refundOrWaiveEntryFee(
  cooperativeId: string,
  amount: number,
  memberId: string,
  memberNumber: string,
  reason: string, // e.g., "Teej Festival Promotion - Women members within 1 week"
  refundCash: boolean = false, // If true, refund cash. If false, record as waiver expense
  date?: Date
): Promise<string> {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Get Entry Fee Income account
  const entryFeeAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-40300-00-00002',
      type: 'income',
      isActive: true,
    },
  });

  if (!entryFeeAccount) {
    throw new Error('Entry Fee Income account not found');
  }

  const entryFeeAccountId = entryFeeAccount.id;

  const entries: Array<{ accountId: string; debit: number; credit: number }> = [
    {
      accountId: entryFeeAccountId,
      debit: amount, // Debit income (reduces income)
      credit: 0,
    },
  ];

  if (refundCash) {
    // Refund cash to member
    let cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-10100-01-00001',
        type: 'asset',
        isActive: true,
      },
    });

    if (!cashAccount) {
      cashAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: { startsWith: '10100' },
          type: 'asset',
          isActive: true,
        },
      });
    }

    if (!cashAccount) {
      throw new Error('Cash account not found');
    }

    entries.push({
      accountId: cashAccount.id,
      debit: 0,
      credit: amount,
    });
  } else {
    // Record as waiver expense (promotional discount)
    let waiverAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: '00-50100-00-00001', // Promotional Expense
        type: 'expense',
        isActive: true,
      },
    });

    if (!waiverAccount) {
      waiverAccount = await prisma.chartOfAccounts.create({
        data: {
          cooperativeId,
          code: '00-50100-00-00001',
          name: 'Promotional Expenses (प्रचार खर्च) - Entry Fee Waivers',
          type: 'expense',
          isActive: true,
        },
      });
    }

    entries.push({
      accountId: waiverAccount.id,
      debit: 0,
      credit: amount,
    });
  }

  const description = `Entry fee ${refundCash ? 'refund' : 'waiver'} for member ${memberNumber} - ${reason}`;

  const { journalEntry } = await createJournalEntry(cooperativeId, description, entries, date);

  return journalEntry.id;
}

/**
 * Refund advance payment (when member is rejected)
 * Creates journal entry: Debit Advance Payments, Credit Cash
 */
export async function refundAdvancePayment(
  cooperativeId: string,
  amount: number,
  memberId: string,
  memberName: string,
  date?: Date
): Promise<string> {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Get Advance Payments account
  const advanceAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-20100-00-00001',
      type: 'liability',
      isActive: true,
    },
  });

  if (!advanceAccount) {
    throw new Error('Advance Payments account not found');
  }

  const advanceAccountId = advanceAccount.id;

  // Get Cash account
  let cashAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '00-10100-01-00001',
      type: 'asset',
      isActive: true,
    },
  });

  if (!cashAccount) {
    cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: { startsWith: '10100' },
        type: 'asset',
        isActive: true,
      },
    });
  }

  if (!cashAccount) {
    throw new Error('Cash account not found');
  }

  const cashAccountId = cashAccount.id;

  const description = `Refund advance payment to rejected applicant: ${memberName} (Member ID: ${memberId})`;

  const { journalEntry } = await createJournalEntry(
    cooperativeId,
    description,
    [
      {
        accountId: advanceAccountId,
        debit: amount,
        credit: 0,
      },
      {
        accountId: cashAccountId,
        debit: 0,
        credit: amount,
      },
    ],
    date
  );

  return journalEntry.id;
}

/**
 * Post meeting allowance expense to accounting
 * Creates journal entry: Dr. Meeting Allowance Expense, Cr. TDS Payable, Cr. Cash/Bank
 */
export async function postMeetingAllowance(
  meetingId: string,
  cooperativeId: string
): Promise<void> {
  // Get meeting with attendees
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      meetingAttendees: {
        where: {
          isPresent: true, // Only count present attendees
        },
      },
    },
  });

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Calculate totals
  const _totalAllowance = meeting.meetingAttendees.reduce(
    (sum, attendee) => sum + Number(attendee.allowance || 0),
    0
  );
  const totalTDS = meeting.meetingAttendees.reduce(
    (sum, attendee) => sum + Number(attendee.tdsAmount || 0),
    0
  );
  const totalNet = meeting.meetingAttendees.reduce(
    (sum, attendee) => sum + Number(attendee.netAmount || 0),
    0
  );

  if (totalNet === 0) {
    return; // No allowance to post
  }

  // Get or create accounts
  const meetingAllowanceExpenseId = await getOrCreateAccount(
    cooperativeId,
    '6001',
    'Meeting Allowance Expense',
    'expense'
  );

  const tdsPayableId = await getOrCreateAccount(cooperativeId, '2001', 'TDS Payable', 'liability');

  const cashAccountId = await getOrCreateAccount(cooperativeId, '1001', 'Cash', 'asset');

  // Create journal entry
  const description = `Meeting Allowance - Meeting #${meeting.meetingNo || meetingId} - ${meeting.title}`;

  await createJournalEntry(
    cooperativeId,
    description,
    [
      {
        accountId: meetingAllowanceExpenseId,
        debit: totalNet,
        credit: 0,
      },
      {
        accountId: tdsPayableId,
        debit: 0,
        credit: totalTDS,
      },
      {
        accountId: cashAccountId,
        debit: 0,
        credit: totalNet,
      },
    ],
    meeting.date || meeting.scheduledDate || new Date()
  );
}

/**
 * Get current share price for a cooperative
 * Returns the share price from the latest share account, or a default value
 */
export async function getCurrentSharePrice(
  cooperativeId: string,
  defaultPrice: number = 100
): Promise<number> {
  // Check if there's a share account with a unit price
  const shareAccount = await prisma.shareAccount.findFirst({
    where: { cooperativeId },
    select: { unitPrice: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (shareAccount && shareAccount.unitPrice > 0) {
    return shareAccount.unitPrice;
  }

  return defaultPrice;
}

/**
 * Chart of Accounts Management Service
 *
 * @deprecated Most methods have been moved to AccountingController.
 * Use accountingController from '../controllers/AccountingController' instead.
 * This service is kept for backward compatibility and utility functions.
 */
export const AccountingService = {
  /**
   * Seed Default Accounts for a new Tenant/Cooperative
   * @deprecated Use accountingController.seedDefaultAccounts() instead
   */
  async seedDefaultAccounts(cooperativeId: string) {
    console.log(`Starting COA Seed for Cooperative: ${cooperativeId}`);
    let count = 0;

    for (const rootNode of FINAL_COA_SEED_DATA) {
      await seedAccountRecursive(cooperativeId, rootNode, null);
      count++;
    }

    console.log(`Seeding completed. Processed ${count} root nodes.`);
    return { success: true, message: 'Chart of Accounts seeded successfully' };
  },

  /**
   * Get Chart of Accounts with Hierarchy
   * @deprecated Use accountingController.getChartOfAccounts() instead
   */
  async getChartOfAccounts(cooperativeId: string, type?: string) {
    const where: any = { cooperativeId, isActive: true };

    if (type) {
      // Strict type filtering - only return accounts matching the exact type
      where.type = type.toLowerCase();
    }

    const accounts = await prisma.chartOfAccounts.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true, // Include parent type for validation
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isGroup: true,
            nfrsMap: true,
          },
          where: type ? { type: type.toLowerCase(), isActive: true } : { isActive: true }, // Filter children by type too
        },
        _count: {
          select: { ledgerEntries: true },
        },
      },
    });

    // Additional validation: Filter out any accounts that don't match the requested type
    // This handles cases where parent/child relationships might have wrong types
    let filteredAccounts = accounts;
    if (type) {
      const requestedType = type.toLowerCase();
      filteredAccounts = accounts.filter((account) => account.type.toLowerCase() === requestedType);
    }

    // Get latest balance for each account
    const accountIds = filteredAccounts.map((acc) => acc.id);
    const latestBalances = await prisma.ledger.findMany({
      where: {
        accountId: { in: accountIds },
        cooperativeId,
      },
      select: {
        accountId: true,
        balance: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by accountId and get the latest balance for each
    const balanceMap = new Map<string, number>();
    const seenAccounts = new Set<string>();
    for (const ledger of latestBalances) {
      if (!seenAccounts.has(ledger.accountId)) {
        balanceMap.set(ledger.accountId, Number(ledger.balance));
        seenAccounts.add(ledger.accountId);
      }
    }

    // Add balance to each account
    const accountsWithBalances = filteredAccounts.map((account) => ({
      ...account,
      balance: balanceMap.get(account.id) || 0,
    }));

    // In a real implementation, you might want to build a tree structure here
    // For now, we return the flat list which can be filtered/sorted on frontend
    return accountsWithBalances;
  },

  /**
   * Create a New Account Head (With Validations)
   * Supports new account code structure: BB-GGGGG-SS-SSSSS
   * @deprecated Use accountingController.createAccount() instead
   */
  async createAccount(data: {
    cooperativeId: string;
    code?: string; // Optional - will auto-generate if not provided
    name: string;
    type: string;
    parentId?: string;
    isGroup?: boolean;
    nfrsMap?: string;
    subType?: string; // For auto-generation: 00 (General), 01, 02, etc.
    branch?: string; // For auto-generation: default '00' (Head Office)
    autoGenerateCode?: boolean; // If true and code not provided, auto-generate
  }) {
    const type = data.type.toLowerCase();

    // 1. Normalize type (revenue -> income) and validate
    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    // Also accept 'revenue' as alias for 'income' for backward compatibility
    const normalizedType = type === 'revenue' ? 'income' : type;
    if (!validTypes.includes(normalizedType)) {
      throw new Error(`Invalid account type. Must be one of: ${validTypes.join(', ')}`);
    }

    // 2. Generate or validate account code
    let accountCode: string;

    if (data.autoGenerateCode || !data.code) {
      // Auto-generate code
      accountCode = await generateAccountCode(
        data.cooperativeId,
        normalizedType,
        data.subType || '00',
        data.branch || '00'
      );
    } else {
      accountCode = data.code;

      // Validate code format (BB-GGGGG-SS-SSSSS)
      const formatValidation = validateAccountCodeFormat(accountCode);
      if (!formatValidation.valid) {
        throw new Error(formatValidation.error);
      }

      // Validate Account Type vs GL Head (The 5-Account Rule)
      const parsed = parseAccountCode(accountCode);
      if (!parsed) {
        throw new Error('Invalid account code format');
      }

      const glHeadFirst = parsed.glHead.charAt(0);
      const expectedGLHead = getGLHeadFromType(normalizedType).charAt(0);

      if (glHeadFirst !== expectedGLHead) {
        const typeNames: Record<string, string> = {
          '1': 'Asset',
          '2': 'Liability/Equity',
          '3': 'Equity',
          '4': 'Income',
          '5': 'Expense',
        };
        throw new Error(
          `Account type '${normalizedType}' requires GL Head starting with '${expectedGLHead}' (${typeNames[expectedGLHead]}), but code has '${glHeadFirst}'`
        );
      }
    }

    // 4. Validate Uniqueness
    const existing = await prisma.chartOfAccounts.findFirst({
      where: { cooperativeId: data.cooperativeId, code: accountCode },
    });
    if (existing) {
      throw new Error(`Account code ${accountCode} already exists.`);
    }

    // 5. Validate Parent (Must be a Group)
    if (data.parentId) {
      const parent = await prisma.chartOfAccounts.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new Error('Parent account not found');
      }
      if (!parent.isGroup) {
        throw new Error('Cannot add a child to a Ledger account. Parent must be a Group.');
      }
    }

    return prisma.chartOfAccounts.create({
      data: {
        cooperativeId: data.cooperativeId,
        code: accountCode,
        name: data.name,
        type: normalizedType, // use normalized type (income instead of revenue)
        parentId: data.parentId || null,
        isGroup: data.isGroup ?? false,
        nfrsMap: data.nfrsMap ?? null,
        isActive: true,
      },
    });
  },

  /**
   * Update Account
   * @deprecated Use accountingController.updateAccount() instead
   */
  async updateAccount(
    id: string,
    cooperativeId: string,
    data: {
      name?: string;
      isActive?: boolean;
      code?: string;
      type?: string;
      parentId?: string;
      isGroup?: boolean;
      nfrsMap?: string;
    }
  ) {
    // If updating code, check uniqueness
    if (data.code) {
      const existing = await prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: data.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new Error(`Account code ${data.code} already exists.`);
      }
    }

    // If updating type, validate
    if (data.type) {
      const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
      const type = data.type.toLowerCase();
      // Normalize 'revenue' to 'income' for backward compatibility
      const normalizedType = type === 'revenue' ? 'income' : type;
      if (!validTypes.includes(normalizedType)) {
        throw new Error(`Invalid account type. Must be one of: ${validTypes.join(', ')}`);
      }
      // Update the type to normalized lowercase
      data.type = normalizedType;
    }

    return prisma.chartOfAccounts.update({
      where: { id, cooperativeId },
      data,
    });
  },

  /**
   * Delete Account (Only if no ledger entries exist)
   * @deprecated Use accountingController.deleteAccount() instead
   */
  async deleteAccount(id: string, cooperativeId: string) {
    const account = await prisma.chartOfAccounts.findUnique({
      where: { id, cooperativeId },
      include: {
        _count: {
          select: { ledgerEntries: true, children: true },
        },
      },
    });

    if (!account) throw new Error('Account not found');

    if (account._count.ledgerEntries > 0) {
      throw new Error('Cannot delete account with existing transactions.');
    }

    if (account._count.children > 0) {
      throw new Error('Cannot delete account with child accounts.');
    }

    return prisma.chartOfAccounts.delete({
      where: { id },
    });
  },

  /**
   * Get or create account by code, name, and type
   * Returns the account ID
   */
  async getOrCreateAccount(
    cooperativeId: string,
    code: string,
    name: string,
    type: string,
    parentId?: string
  ): Promise<string> {
    return getOrCreateAccount(cooperativeId, code, name, type, parentId);
  },

  /**
   * Post transaction (alias for createJournalEntry for consistency)
   * @deprecated Use accountingController.postTransaction() instead
   */
  async postTransaction(
    cooperativeId: string,
    description: string,
    entries: Array<{ accountId: string; debit: number; credit: number }>,
    date?: Date
  ) {
    return createJournalEntry(cooperativeId, description, entries, date);
  },

  /**
   * Generate account code automatically
   * Returns a new account code in format: BB-GGGGG-SS-SSSSS
   * @deprecated Use accountingController.generateAccountCode() instead
   */
  async generateAccountCode(
    cooperativeId: string,
    type: string,
    subType: string = '00',
    branch: string = '00'
  ): Promise<string> {
    return generateAccountCode(cooperativeId, type, subType, branch);
  },

  /**
   * Parse account code into components
   */
  parseAccountCode(code: string) {
    return parseAccountCode(code);
  },

  /**
   * Create or update Product GL Mapping
   * Maps loan/saving products to their corresponding GL accounts
   * @deprecated Use accountingController.setProductGLMap() instead
   */
  async setProductGLMap(
    cooperativeId: string,
    productType: 'loan' | 'saving',
    productId: string,
    mapping: {
      // For Loan Products:
      principalGLCode?: string;
      interestIncomeGLCode?: string;
      penaltyIncomeGLCode?: string;
      // For Saving Products:
      depositGLCode?: string;
      interestExpenseGLCode?: string;
    }
  ) {
    // Verify product exists
    if (productType === 'loan') {
      const product = await prisma.loanProduct.findUnique({
        where: { id: productId, cooperativeId },
      });
      if (!product) throw new Error('Loan product not found');
    } else {
      const product = await prisma.savingProduct.findUnique({
        where: { id: productId, cooperativeId },
      });
      if (!product) throw new Error('Saving product not found');
    }

    // Verify GL codes exist and match product type
    if (productType === 'loan') {
      if (mapping.principalGLCode) {
        const account = await prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.principalGLCode, type: 'asset' },
        });
        if (!account)
          throw new Error(
            `Principal GL account ${mapping.principalGLCode} not found or not an asset`
          );
      }
      if (mapping.interestIncomeGLCode) {
        const account = await prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.interestIncomeGLCode, type: 'income' },
        });
        if (!account)
          throw new Error(
            `Interest Income GL account ${mapping.interestIncomeGLCode} not found or not income`
          );
      }
      if (mapping.penaltyIncomeGLCode) {
        const account = await prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.penaltyIncomeGLCode, type: 'income' },
        });
        if (!account)
          throw new Error(
            `Penalty Income GL account ${mapping.penaltyIncomeGLCode} not found or not income`
          );
      }
    } else {
      if (mapping.depositGLCode) {
        const account = await prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.depositGLCode, type: 'liability' },
        });
        if (!account)
          throw new Error(
            `Deposit GL account ${mapping.depositGLCode} not found or not a liability`
          );
      }
      if (mapping.interestExpenseGLCode) {
        const account = await prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.interestExpenseGLCode, type: 'expense' },
        });
        if (!account)
          throw new Error(
            `Interest Expense GL account ${mapping.interestExpenseGLCode} not found or not expense`
          );
      }
    }

    return prisma.productGLMap.upsert({
      where: {
        cooperativeId_productType_productId: {
          cooperativeId,
          productType,
          productId,
        },
      },
      create: {
        cooperativeId,
        productType,
        productId,
        principalGLCode: mapping.principalGLCode || null,
        interestIncomeGLCode: mapping.interestIncomeGLCode || null,
        penaltyIncomeGLCode: mapping.penaltyIncomeGLCode || null,
        depositGLCode: mapping.depositGLCode || null,
        interestExpenseGLCode: mapping.interestExpenseGLCode || null,
      },
      update: {
        principalGLCode: mapping.principalGLCode || null,
        interestIncomeGLCode: mapping.interestIncomeGLCode || null,
        penaltyIncomeGLCode: mapping.penaltyIncomeGLCode || null,
        depositGLCode: mapping.depositGLCode || null,
        interestExpenseGLCode: mapping.interestExpenseGLCode || null,
      },
    });
  },

  /**
   * Get Product GL Mapping
   * @deprecated Use accountingController.getProductGLMap() instead
   */
  async getProductGLMap(cooperativeId: string, productType: 'loan' | 'saving', productId: string) {
    return prisma.productGLMap.findUnique({
      where: {
        cooperativeId_productType_productId: {
          cooperativeId,
          productType,
          productId,
        },
      },
    });
  },

  /**
   * Loan Repayment Entry (ऋण असुली भौचर)
   * Creates journal entry when member pays loan installment
   *
   * Dr. Cash (10100)
   * Cr. Member Loan Principal (104xx - Asset घट्यो)
   * Cr. Interest Income (401xx - Income बढ्यो)
   * Cr. Fine/Penalty (404xx - Income बढ्यो) [optional]
   * @deprecated Use accountingController.loanRepaymentEntry() instead
   */
  async loanRepaymentEntry(
    cooperativeId: string,
    loanProductId: string,
    memberLoanAccountCode: string, // Individual member's loan account (e.g., "00-10400-01-00001")
    principalAmount: number,
    interestAmount: number,
    penaltyAmount: number = 0,
    cashAccountCode: string = '00-10100-01-00001', // Default: Main Vault Cash
    description?: string
  ) {
    // Get product GL mapping
    const glMap = await this.getProductGLMap(cooperativeId, 'loan', loanProductId);
    if (!glMap || !glMap.principalGLCode || !glMap.interestIncomeGLCode) {
      throw new Error(
        'Product GL mapping not found. Please configure GL accounts for this loan product.'
      );
    }

    // Verify member loan account exists and is an asset
    const memberLoanAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: memberLoanAccountCode,
        type: 'asset',
      },
    });
    if (!memberLoanAccount) {
      throw new Error(`Member loan account ${memberLoanAccountCode} not found or not an asset`);
    }

    // Verify cash account exists
    const cashAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: cashAccountCode,
        type: 'asset',
      },
    });
    if (!cashAccount) {
      throw new Error(`Cash account ${cashAccountCode} not found`);
    }

    // Get interest income account
    const interestIncomeAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        cooperativeId,
        code: glMap.interestIncomeGLCode,
        type: 'income',
      },
    });
    if (!interestIncomeAccount) {
      throw new Error(`Interest income account ${glMap.interestIncomeGLCode} not found`);
    }

    // Prepare entries
    const entries: Array<{ accountId: string; debit: number; credit: number }> = [
      // Dr. Cash
      {
        accountId: cashAccount.id,
        debit: principalAmount + interestAmount + penaltyAmount,
        credit: 0,
      },
      // Cr. Member Loan Principal (Asset decreases)
      {
        accountId: memberLoanAccount.id,
        debit: 0,
        credit: principalAmount,
      },
      // Cr. Interest Income (Income increases)
      {
        accountId: interestIncomeAccount.id,
        debit: 0,
        credit: interestAmount,
      },
    ];

    // Add penalty entry if applicable
    if (penaltyAmount > 0) {
      if (!glMap.penaltyIncomeGLCode) {
        throw new Error(
          'Penalty amount provided but penalty GL account not configured for this product'
        );
      }
      const penaltyAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: glMap.penaltyIncomeGLCode,
          type: 'income',
        },
      });
      if (!penaltyAccount) {
        throw new Error(`Penalty income account ${glMap.penaltyIncomeGLCode} not found`);
      }
      entries.push({
        accountId: penaltyAccount.id,
        debit: 0,
        credit: penaltyAmount,
      });
    }

    const entryDescription =
      description ||
      `Loan Repayment - Principal: ${principalAmount}, Interest: ${interestAmount}${penaltyAmount > 0 ? `, Penalty: ${penaltyAmount}` : ''}`;

    return createJournalEntry(cooperativeId, entryDescription, entries);
  },

  /**
   * Calculate Net Profit
   * Total Income (Series 4xxxx) - Total Expenses (Series 5xxxx) = Net Profit
   * @deprecated Use accountingController.calculateNetProfit() instead
   */
  async calculateNetProfit(
    cooperativeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    period: { start: Date; end: Date };
  }> {
    const end = endDate || new Date();
    const start = startDate || new Date(new Date().getFullYear(), 0, 1); // Start of current year

    // Get all income accounts (4xxxx series)
    const incomeAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        cooperativeId,
        code: { startsWith: '4' },
        type: 'income',
        isActive: true,
      },
      include: {
        ledgerEntries: {
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    // Get all expense accounts (5xxxx series)
    const expenseAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        cooperativeId,
        code: { startsWith: '5' },
        type: 'expense',
        isActive: true,
      },
      include: {
        ledgerEntries: {
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    // Calculate total income (sum of credits - debits for income accounts)
    let totalIncome = 0;
    for (const account of incomeAccounts) {
      for (const entry of account.ledgerEntries) {
        totalIncome += Number(entry.credit) - Number(entry.debit);
      }
    }

    // Calculate total expenses (sum of debits - credits for expense accounts)
    let totalExpenses = 0;
    for (const account of expenseAccounts) {
      for (const entry of account.ledgerEntries) {
        totalExpenses += Number(entry.debit) - Number(entry.credit);
      }
    }

    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      period: { start, end },
    };
  },

  /**
   * Migrate old account codes to NFRS format
   * Consolidates balances from old accounts to proper NFRS accounts
   */
  async migrateOldAccountsToNFRS(cooperativeId: string) {
    const migrations: Array<{ oldCode: string; newCode: string; type: string; name: string }> = [
      {
        oldCode: '1001',
        newCode: '00-10100-01-00001',
        type: 'asset',
        name: 'Main Vault Cash (मुख्य ढुकुटी)',
      },
      {
        oldCode: '3001',
        newCode: '00-30100-01-00000',
        type: 'equity',
        name: 'Ordinary Share Capital (साधारण शेयर पुँजी)',
      },
      {
        oldCode: '4001',
        newCode: '00-40300-00-00002',
        type: 'income',
        name: 'Membership Entrance Fee (प्रवेश शुल्क)',
      },
    ];

    const results: Array<{ oldCode: string; newCode: string; migrated: boolean; message: string }> =
      [];

    for (const migration of migrations) {
      try {
        // Find old account
        const oldAccount = await prisma.chartOfAccounts.findFirst({
          where: {
            cooperativeId,
            code: migration.oldCode,
            isActive: true,
          },
          include: {
            ledgerEntries: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!oldAccount) {
          results.push({
            oldCode: migration.oldCode,
            newCode: migration.newCode,
            migrated: false,
            message: 'Old account not found',
          });
          continue;
        }

        // Get latest balance from old account
        const oldBalance =
          oldAccount.ledgerEntries.length > 0 ? Number(oldAccount.ledgerEntries[0].balance) : 0;

        if (oldBalance === 0) {
          // No balance, delete old account
          // First check if there are any ledger entries
          const hasLedgerEntries = await prisma.ledger.findFirst({
            where: { accountId: oldAccount.id },
          });

          if (!hasLedgerEntries) {
            // No ledger entries, safe to delete
            await prisma.chartOfAccounts.delete({
              where: { id: oldAccount.id },
            });
            results.push({
              oldCode: migration.oldCode,
              newCode: migration.newCode,
              migrated: true,
              message: 'Old account deleted (no balance, no entries)',
            });
          } else {
            // Has entries but balance is 0, deactivate instead
            await prisma.chartOfAccounts.update({
              where: { id: oldAccount.id },
              data: { isActive: false },
            });
            results.push({
              oldCode: migration.oldCode,
              newCode: migration.newCode,
              migrated: true,
              message: 'Old account deactivated (no balance but has entries)',
            });
          }
          continue;
        }

        // Find or create new NFRS account
        let newAccount = await prisma.chartOfAccounts.findFirst({
          where: {
            cooperativeId,
            code: migration.newCode,
            type: migration.type,
            isActive: true,
          },
          include: {
            ledgerEntries: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!newAccount) {
          // Create new account if it doesn't exist
          newAccount = await prisma.chartOfAccounts.create({
            data: {
              cooperativeId,
              code: migration.newCode,
              name: migration.name,
              type: migration.type,
              isActive: true,
            },
            include: {
              ledgerEntries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
        }

        // Get current balance of new account
        const _newBalance =
          newAccount.ledgerEntries.length > 0 ? Number(newAccount.ledgerEntries[0].balance) : 0;

        // Calculate difference to transfer
        const balanceDifference = oldBalance;

        if (balanceDifference !== 0) {
          // Create a journal entry to transfer balance
          // For assets: debit new, credit old (to move balance)
          // For equity/income: credit new, debit old (to move balance)
          const isDebitNormal = migration.type === 'asset' || migration.type === 'expense';

          await createJournalEntry(
            cooperativeId,
            `Account Migration: Transfer balance from ${migration.oldCode} to ${migration.newCode}`,
            [
              {
                accountId: newAccount.id,
                debit: isDebitNormal ? Math.abs(balanceDifference) : 0,
                credit: isDebitNormal ? 0 : Math.abs(balanceDifference),
              },
              {
                accountId: oldAccount.id,
                debit: isDebitNormal ? 0 : Math.abs(balanceDifference),
                credit: isDebitNormal ? Math.abs(balanceDifference) : 0,
              },
            ],
            new Date()
          );
        }

        // Delete old account after balance transfer
        // First, update all related records to point to new account
        // Update ledger entries
        await prisma.ledger.updateMany({
          where: { accountId: oldAccount.id },
          data: { accountId: newAccount.id },
        });

        // Check if account has children (shouldn't for old accounts, but check anyway)
        const hasChildren = await prisma.chartOfAccounts.findFirst({
          where: { parentId: oldAccount.id },
        });

        if (hasChildren) {
          // If has children, update them to point to new account or remove parent
          await prisma.chartOfAccounts.updateMany({
            where: { parentId: oldAccount.id },
            data: { parentId: null },
          });
        }

        // Delete the old account
        await prisma.chartOfAccounts.delete({
          where: { id: oldAccount.id },
        });

        results.push({
          oldCode: migration.oldCode,
          newCode: migration.newCode,
          migrated: true,
          message: `Balance ${balanceDifference} transferred and old account deleted`,
        });
      } catch (error: any) {
        results.push({
          oldCode: migration.oldCode,
          newCode: migration.newCode,
          migrated: false,
          message: error.message || 'Migration failed',
        });
      }
    }

    return {
      success: true,
      message: 'Account migration completed',
      results,
    };
  },

  /**
   * Generate Main Financial Report
   * Returns summary of assets, liabilities, income, and expenses
   * @deprecated Use accountingController.generateMainReport() instead
   */
  async generateMainReport(cooperativeId: string, fiscalYear?: string, month?: string) {
    // For now, we'll return a summary of all account types
    // In the future, this can be filtered by fiscal year and month

    const [assets, liabilities, income, expenses] = await Promise.all([
      this.getChartOfAccounts(cooperativeId, 'asset'),
      this.getChartOfAccounts(cooperativeId, 'liability'),
      this.getChartOfAccounts(cooperativeId, 'income'),
      this.getChartOfAccounts(cooperativeId, 'expense'),
    ]);

    // Calculate totals for each category
    const calculateTotal = (accounts: any[]): number => {
      return accounts
        .filter((acc) => !acc.isGroup) // Only count ledger accounts
        .reduce((sum, acc) => sum + (acc.balance || 0), 0);
    };

    const totalAssets = calculateTotal(assets);
    const totalLiabilities = calculateTotal(liabilities);
    const totalIncome = calculateTotal(income);
    const totalExpenses = calculateTotal(expenses);

    return {
      fiscalYear: fiscalYear || 'Current',
      month: month || 'All',
      summary: {
        assets: {
          total: totalAssets,
          count: assets.filter((acc) => !acc.isGroup).length,
        },
        liabilities: {
          total: totalLiabilities,
          count: liabilities.filter((acc) => !acc.isGroup).length,
        },
        income: {
          total: totalIncome,
          count: income.filter((acc) => !acc.isGroup).length,
        },
        expenses: {
          total: totalExpenses,
          count: expenses.filter((acc) => !acc.isGroup).length,
        },
      },
      netWorth: totalAssets - totalLiabilities,
      netIncome: totalIncome - totalExpenses,
      details: {
        assets: assets
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
        liabilities: liabilities
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
        income: income
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
        expenses: expenses
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
      },
    };
  },

  /**
   * Get the balance of a single account as of a specific date
   */
  async getAccountBalanceAsOf(accountId: string, asOfDate: Date): Promise<number> {
    const latestLedgerEntry = await prisma.ledger.findFirst({
      where: {
        accountId,
        journalEntry: {
          date: {
            lte: asOfDate,
          },
        },
      },
      orderBy: {
        journalEntry: {
          date: 'desc',
        },
      },
      select: {
        balance: true,
      },
    });

    return latestLedgerEntry ? Number(latestLedgerEntry.balance) : 0;
  },

  /**
   * Generate NFRS-compliant Balance Sheet
   */
  async generateNfrsBalanceSheet(cooperativeId: string, asOfDate: Date) {
    const NFRS_STRUCTURE = {
      assets: [
        { label: 'Cash and Cash Equivalents', note: '4.1', nfrsMapCodes: ['4.1'] },
        {
          label: 'Placement with Bank and Financial Institutions',
          note: '4.2',
          nfrsMapCodes: ['4.2'],
        },
        { label: 'Loans and Advances to Members', note: '4.3', nfrsMapCodes: ['4.3'] },
        { label: 'Loans and Advances to Staff', note: '4.4', nfrsMapCodes: ['4.4'] },
        { label: 'Investment Securities', note: '4.5', nfrsMapCodes: ['4.5'] },
        { label: 'Current Tax Assets', note: '4.6', nfrsMapCodes: ['4.6'] },
        { label: 'Investment Property', note: '4.7', nfrsMapCodes: ['4.7'] },
        { label: 'Property, Plant and Equipment', note: '4.8', nfrsMapCodes: ['4.8'] },
        { label: 'Goodwill and Intangible Assets', note: '4.9', nfrsMapCodes: ['4.9'] },
        { label: 'Other Assets', note: '4.11', nfrsMapCodes: ['4.11'] },
      ],
      liabilities: [
        { label: 'Deposits from Member', note: '4.12', nfrsMapCodes: ['4.12'] },
        { label: 'Borrowings', note: '4.13', nfrsMapCodes: ['4.13'] },
        { label: 'Provision for Employee Benefits', note: '4.14', nfrsMapCodes: ['4.14'] },
        { label: 'Deferred Tax Liabilities', note: '4.10', nfrsMapCodes: ['4.10'] },
        { label: 'Grant Liabilities', note: '4.15', nfrsMapCodes: ['4.15'] },
        { label: 'Other Liabilities', note: '4.16', nfrsMapCodes: ['4.16', '4.17'] }, // Grouping TDS payable (4.17) under other liabilities for now
      ],
      equity: [
        { label: 'Share Capital', note: '4.17', nfrsMapCodes: ['4.19'] }, // Note from image is 4.17, our COA map is 4.19. Using our map.
        { label: 'General Reserve Fund', note: '4.18', nfrsMapCodes: ['4.18'] },
        { label: 'Patronage Refund Reserve', note: null, nfrsMapCodes: [] }, // Will need specific logic for these
        { label: 'Other Statutory Reserves', note: '4.19', nfrsMapCodes: [] },
        { label: 'Revaluation Reserve', note: null, nfrsMapCodes: [] },
        { label: 'Fair Value Reserve', note: null, nfrsMapCodes: [] },
        { label: 'Retained Earnings', note: null, nfrsMapCodes: [] },
      ],
    };

    const getBalanceForNfrsGroup = async (group: {
      label: string;
      note: string | null;
      nfrsMapCodes: string[];
    }) => {
      if (group.nfrsMapCodes.length === 0) {
        return { ...group, balance: 0 };
      }

      const accounts = await prisma.chartOfAccounts.findMany({
        where: {
          cooperativeId,
          nfrsMap: { in: group.nfrsMapCodes },
          isActive: true,
          isGroup: false,
        },
        select: { id: true },
      });

      let totalBalance = 0;
      for (const account of accounts) {
        const balance = await this.getAccountBalanceAsOf(account.id, asOfDate);
        totalBalance += balance;
      }
      return { ...group, balance: totalBalance };
    };

    const assets = await Promise.all(NFRS_STRUCTURE.assets.map(getBalanceForNfrsGroup));
    const liabilities = await Promise.all(NFRS_STRUCTURE.liabilities.map(getBalanceForNfrsGroup));
    const equity = await Promise.all(NFRS_STRUCTURE.equity.map(getBalanceForNfrsGroup));

    const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0);
    const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0);

    return {
      asOfDate,
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  },
};
