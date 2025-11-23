# Reference Documents

This folder contains important reference documents for the Core Banking System (CBS) project.

## Documents

### 1. Anti-Money Laundering for Cooperative Societies

**File:** `anti-money laundering for cooperative societies.docx`

This document contains guidelines and regulations for anti-money laundering (AML) compliance specific to cooperative societies. It should be referenced when implementing:

- KYC (Know Your Customer) procedures
- Transaction monitoring
- Suspicious activity reporting
- Customer due diligence
- Risk assessment procedures

### 2. NFRS for SMEs - Notes to Account (Cooperative)

**File:** `NFRS for SMEs_Notes to Account_Cooperative_English-Final.docx`

This document contains the Nepal Financial Reporting Standards (NFRS) for Small and Medium Enterprises (SMEs) specific to cooperatives. It provides guidance on:

- Financial statement presentation
- Notes to financial statements
- Accounting policies and disclosures
- Cooperative-specific reporting requirements

**Reference in code:**

- `backend/src/utils/seedChartOfAccounts.ts` - Chart of Accounts structure
- `backend/src/services/financialStatementService.ts` - Financial statement generation
- `backend/src/controllers/financialStatementController.ts` - Financial statement endpoints

### 3. Model NFRS for SMEs Financial Statement (Cooperative)

**File:** `Model NFRS for SMEs Financial Statement _Cooperative_English-Final.xlsx`

This Excel file contains model/template financial statements for cooperatives following NFRS for SMEs standards. It includes:

- Balance Sheet templates
- Income Statement (Profit & Loss) templates
- Statement of Changes in Equity templates
- Cash Flow Statement templates
- Notes to Financial Statements templates

**Reference in code:**

- `frontend/app/staff/financial-statements/` - Financial statement pages
- `backend/src/services/financialStatementService.ts` - Financial statement calculations
- `backend/src/controllers/financialStatementController.ts` - Financial statement API

## Usage

These documents should be consulted when:

1. Implementing new financial reporting features
2. Ensuring compliance with NFRS standards
3. Designing KYC and AML procedures
4. Creating financial statement templates
5. Reviewing accounting policies and procedures

## Notes

- These are reference documents and should not be modified
- Always refer to the latest versions of NFRS standards for official compliance
- AML guidelines should be reviewed regularly for updates
- Financial statement formats should match the model templates provided
