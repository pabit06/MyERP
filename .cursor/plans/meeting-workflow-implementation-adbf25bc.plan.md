<!-- adbf25bc-c8f7-471d-bcdf-408b18f6329f ee123fce-618c-4dd6-ab8f-7dd3d05ae6c3 -->

# Manager's Report Implementation Plan

## Overview

Build a comprehensive Manager's Report (व्यवस्थापन प्रतिवेदन) module with 5 tabs covering all 27 sections required by NCBL format. Auto-calculate quantitative data from CBS/Accounting, allow manual adjustments, and support rich text narratives.

## Database Schema

### 1. Prisma Schema Updates

**File:** `packages/db-schema/prisma/schema.prisma`

Add enum and model:

```prisma
enum ReportStatus {
  DRAFT
  FINALIZED
}

model ManagerReport {
  id            String   @id @default(cuid())
  cooperativeId String
  cooperative   Cooperative @relation(fields: [cooperativeId], references: [id])

  title         String   // e.g. "2081 Shrawan - Monthly Progress Report"
  fiscalYear    String   // e.g. "2081"
  month         String   // e.g. "Shrawan", "Ashad"

  // Financial Snapshot (JSON for structured data)
  financialData Json?    // Balance sheet, P&L, PEARLS ratios
  previousMonthData Json? // Previous month's values for comparison

  // Member Data
  memberData    Json?    // New/closed members, KYC status, AML flags

  // Loan Data
  loanData      Json?    // Approved loans by level, overdue, recovery, insider lending

  // Liquidity Data
  liquidityData Json?    // Liabilities, top 20 lists, gap analysis

  // Governance Data
  governanceData Json?   // Committee meetings, complaints, circulars, policies

  // Narrative Sections (Rich Text)
  description   String?  @db.Text // Manager's overall analysis
  challenges    String?  @db.Text // Problems and challenges
  plans         String?  @db.Text // Future plans
  suggestions   String?  @db.Text // Manager's suggestions to board

  status        ReportStatus @default(DRAFT)
  finalizedAt   DateTime?
  finalizedBy   String?  // User ID

  // Link to meeting (optional)
  presentedInMeetingId String?
  meeting              Meeting? @relation(fields: [presentedInMeetingId], references: [id])

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([cooperativeId, fiscalYear, month])
  @@index([cooperativeId, status])
  @@map("manager_reports")
}

// Add relation to Cooperative model
model Cooperative {
  // ... existing fields ...
  managerReports ManagerReport[]
}

// Add relation to Meeting model
model Meeting {
  // ... existing fields ...
  managerReports ManagerReport[]
}
```

## Backend Implementation

### 2. Financial Calculation Service

**File:** `apps/backend/src/services/financial-calculations.ts`

Create service functions:

- `calculateBalanceSheet(cooperativeId, asOfDate)`: Fetch from Chart of Accounts/Ledger
- `calculateIncomeStatement(cooperativeId, monthStart, monthEnd)`: Revenue vs Expenses
- `calculatePEARLSRatios(cooperativeId, asOfDate)`: All PEARLS metrics (P1, P2, E1, E5, E6, E7, A1, A2, R9, R12, L1, L3, S10, S11)
- `calculateSpreadRate(cooperativeId, asOfDate)`: Weighted avg interest rates
- `calculateBudgetVariance(cooperativeId, fiscalYear, month)`: Budget vs Actual

### 3. Member Statistics Service

**File:** `apps/backend/src/services/member-statistics.ts`

- `getMemberStatistics(cooperativeId, monthStart, monthEnd)`: New/closed members, KYC status
- `getAMLStatistics(cooperativeId)`: High-risk members, STR/TTR counts
- `getTop20Depositors(cooperativeId, asOfDate)`: Query SavingAccount sorted by balance
- `getMemberCentralityIndex(cooperativeId)`: Calculate member engagement metrics

### 4. Loan Statistics Service

**File:** `apps/backend/src/services/loan-statistics.ts`

- `getLoanApprovalsByLevel(cooperativeId, monthStart, monthEnd)`: Group by approval level
- `getOverdueLoans(cooperativeId, daysOverdue = 31)`: Loans past due
- `getRecoveryStatistics(cooperativeId, monthStart, monthEnd)`: Recovery efforts and results
- `getChargeOffLoans(cooperativeId)`: Write-off candidates/completed
- `getInsiderLending(cooperativeId)`: Loans to directors, committee members, staff

### 5. Liquidity Analysis Service

**File:** `apps/backend/src/services/liquidity-analysis.ts`

- `getUpcomingLiabilities(cooperativeId, nextMonthStart, nextMonthEnd)`: Taxes, TDS, large withdrawals
- `getTop20Borrowers(cooperativeId, asOfDate)`: Query by outstanding amount
- `calculateGapAnalysis(cooperativeId, horizonMonths = 12)`: Maturity gap between deposits and loans

### 6. Governance Statistics Service

**File:** `apps/backend/src/services/governance-statistics.ts`

- `getCommitteeMeetingStats(cooperativeId, monthStart, monthEnd)`: Meeting counts by committee
- `getMemberComplaints(cooperativeId, monthStart, monthEnd)`: Complaints and resolution status
- `getRegulatoryCirculars(cooperativeId, monthStart, monthEnd)`: Circulars received
- `getPolicyChanges(cooperativeId, monthStart, monthEnd)`: Policy amendments

### 7. Report Auto-Fetch Service

**File:** `apps/backend/src/services/report-data-fetcher.ts`

- `fetchReportData(cooperativeId, fiscalYear, month)`: Main orchestrator
  - Calls all calculation services
  - Fetches previous month's finalized report for comparison
  - Returns structured JSON data ready for ManagerReport model

### 8. Backend Routes

**File:** `apps/backend/src/routes/governance.ts` (add to existing file)

Endpoints:

- `GET /api/governance/reports`: List all reports (with filters: fiscalYear, month, status)
- `POST /api/governance/reports`: Create new report (requires fiscalYear, month)
- `GET /api/governance/reports/:id`: Get report details
- `PUT /api/governance/reports/:id`: Update report (save draft)
- `POST /api/governance/reports/:id/fetch-data`: Auto-fetch/refresh data from CBS
- `POST /api/governance/reports/:id/finalize`: Finalize report (lock data)
- `GET /api/governance/reports/:id/previous-month`: Get previous month's data for comparison
- `DELETE /api/governance/reports/:id`: Delete draft report

### 9. Meeting Integration

**File:** `apps/backend/src/routes/governance.ts`

Update meeting agenda endpoint:

- When creating/editing meeting agenda, add option to "Attach Manager's Report"
- `GET /api/governance/meetings/:id/available-reports`: List FINALIZED reports not yet linked
- `PUT /api/governance/meetings/:id/attach-report`: Link report to meeting

## Frontend Implementation

### 10. Sidebar Navigation

**File:** `apps/frontend-web/src/components/Sidebar.tsx`

Add menu item:

```typescript
{ label: "Manager's Reports", href: '/governance/reports', module: 'governance', icon: '📊', group: 'governance' }
```

### 11. Reports List Page

**File:** `apps/frontend-web/src/app/governance/reports/page.tsx`

Features:

- List all reports with status badges (DRAFT/FINALIZED)
- Filters: Fiscal Year, Month, Status
- Search by title
- "+ New Monthly Report" button
- Actions: View, Edit (if DRAFT), Delete (if DRAFT), View PDF (if FINALIZED)
- Pagination

### 12. Report Create/Edit Page

**File:** `apps/frontend-web/src/app/governance/reports/[id]/page.tsx`

Structure:

- Header: Title, Fiscal Year, Month, Status badge, Action buttons
- 5 Tabs:
  1. **Financial Report** (वित्तीय प्रतिवेदन)
     - Balance Sheet (with Previous Month comparison)
     - Income Statement
     - PEARLS Analysis (read-only calculated, with adjustment fields)
     - Market Rate Analysis (read-only)
     - Spread Rate Analysis (read-only)
     - Budget Review (read-only with variance)

  1. **Member Administration** (सदस्य व्यवस्थापन)
     - New Members List (auto-generated)
     - Member Withdrawals (auto-generated)
     - KYC & AML Status (auto-generated)
     - Member Centrality Index (read-only calculated)

  1. **Loans & Recovery** (कर्जा तथा असुली)
     - Loans Approved by Level (auto-generated)
     - Overdue Loans (auto-generated)
     - Recovery Statistics (auto-generated)
     - Charge-off Loans (auto-generated)
     - Insider Lending (auto-generated)

  1. **Liquidity & Liabilities** (तरलता तथा दायित्व)
     - Upcoming Liabilities (auto-generated)
     - Top 20 Depositors (auto-generated)
     - Top 20 Borrowers (auto-generated)
     - Gap Analysis (read-only calculated)

  1. **Governance & Operations** (सुशासन तथा विविध)
     - Committee Meeting Details (manual entry with rich text)
     - Member Complaints (manual entry)
     - Regulatory Circulars (manual entry)
     - Policy Amendments (manual entry)
     - Supervision Reports (manual entry)
     - Legal Cases (manual entry)
     - Future Plans (rich text)
     - Manager's Suggestions (rich text)

UI Components:

- "Auto-Fetch Data" button (triggers backend fetch)
- Read-only fields for calculated values
- Adjustment fields next to calculated values (if needed)
- Rich text editor (react-quill or tiptap) for narrative sections
- "Save Draft" button (saves current tab progress)
- "Finalize Report" button (validates required fields, locks report)

### 13. Rich Text Editor Component

**File:** `apps/frontend-web/src/components/RichTextEditor.tsx`

Create reusable component using react-quill or tiptap:

- Toolbar: Bold, Italic, Bullet Lists, Numbered Lists, Paragraph
- Save as HTML string to database
- Display formatted text in read-only mode

### 14. Meeting Integration UI

**File:** `apps/frontend-web/src/app/governance/meetings/[id]/page.tsx`

Update "Setup & Agenda" tab:

- When adding agenda item, show "Attach Manager's Report" option
- Dropdown shows FINALIZED reports not yet linked
- Display attached report in meeting detail (read-only view or link)

## Implementation Steps

1. **Database Schema**: Add ManagerReport model and relations
2. **Backend Services**: Implement all calculation services
3. **Backend Routes**: Create CRUD endpoints and auto-fetch logic
4. **Frontend List Page**: Reports listing with filters
5. **Frontend Create Page**: Initial form (fiscal year, month selection)
6. **Frontend Edit Page - Tab 1**: Financial Report tab
7. **Frontend Edit Page - Tab 2**: Member Administration tab
8. **Frontend Edit Page - Tab 3**: Loans & Recovery tab
9. **Frontend Edit Page - Tab 4**: Liquidity & Liabilities tab
10. **Frontend Edit Page - Tab 5**: Governance & Operations tab
11. **Rich Text Editor**: Install and integrate editor component
12. **Meeting Integration**: Link reports to meetings
13. **PDF Generation**: Add PDF export functionality (optional, can use browser print initially)

## Key Technical Decisions

- **Data Storage**: Use JSON fields for structured data (financialData, memberData, etc.) for flexibility
- **Auto-Fetch**: Triggered manually via button, not automatic (gives manager control). Only works for DRAFT reports.
- **Snapshot on Finalize**: When finalizing, system MUST re-fetch all current data and store it as a hard snapshot in JSON fields. This ensures finalized reports are immutable historical records.
- **Historical Comparison**: Fetch from previous finalized report's JSON fields (snapshot), fallback to manual entry
- **Validation**: Only on finalize, not on save draft
- **Rich Text**: Store as HTML in database Text fields
- **PDF**: Use browser print initially with print-optimized CSS (ReportPrint.module.css). Can add server-side PDF generation later if needed.
- **UX Safety**: Confirmation modals for destructive actions (auto-fetch overwrite, delete, finalize) to prevent accidental data loss
- **Data Immutability**: Once FINALIZED, the JSON data fields cannot be changed. If manager needs to update, they must create a new report or create a correction/amendment report.
- **Performance Optimization**:
  - **Database Aggregations**: All financial calculations MUST use Prisma.groupBy, Prisma.aggregate, or raw SQL aggregations
  - **NO Node.js Loops**: Never fetch all Ledger/Transaction rows and loop through them in Node.js
  - **Use Cached Balances**: Leverage latest Ledger.balance values instead of recalculating from all transactions
  - **Parallel Execution**: Run independent calculations in parallel using Promise.all
  - **Target Performance**: Auto-fetch should complete in < 10 seconds, PEARLS calculation in < 2 seconds
  - **Database Transactions**: Use Prisma transactions to ensure snapshot consistency

## Dependencies

- Install rich text editor: `pnpm add react-quill` or `pnpm add @tiptap/react @tiptap/starter-kit`
- No additional backend dependencies needed (use existing Prisma, accounting services)

### To-dos

- [ ] Add ManagerReport model to Prisma schema with enum, JSON fields, and relations to Cooperative and Meeting
- [ ] Create financial-calculations.ts service with balance sheet, P&L, PEARLS ratios, spread rate, and budget variance functions
- [ ] Create member-statistics.ts service with member counts, AML stats, top 20 depositors, and centrality index
- [ ] Create loan-statistics.ts service with approval stats, overdue loans, recovery, charge-off, and insider lending
- [ ] Create liquidity-analysis.ts service with upcoming liabilities, top 20 borrowers, and gap analysis
- [ ] Create governance-statistics.ts service with committee meetings, complaints, circulars, and policy changes
- [ ] Create report-data-fetcher.ts orchestrator service that calls all calculation services and fetches previous month data
- [ ] Add report CRUD endpoints to governance.ts: list, create, get, update, fetch-data, finalize, delete
- [ ] Add endpoints to link finalized reports to meetings in governance.ts
- [ ] Add Manager's Reports menu item to Sidebar component
- [ ] Create reports list page with filters, search, pagination, and action buttons
- [ ] Install and create RichTextEditor component using react-quill or tiptap
- [ ] Create report creation page with fiscal year and month selection
- [ ] Implement Financial Report tab with balance sheet, P&L, PEARLS, spread rate, and budget sections
- [ ] Implement Member Administration tab with new/closed members, KYC/AML stats, and centrality index
- [ ] Implement Loans & Recovery tab with approval stats, overdue, recovery, charge-off, and insider lending
- [ ] Implement Liquidity & Liabilities tab with upcoming liabilities, top 20 lists, and gap analysis
- [ ] Implement Governance & Operations tab with committee meetings, complaints, circulars, policies, and rich text narratives
- [ ] Add report attachment option to meeting agenda creation and display attached reports
