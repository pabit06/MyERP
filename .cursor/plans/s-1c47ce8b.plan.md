<!-- 1c47ce8b-7baf-4b66-a41c-7260596b7305 3b5d986e-eb9c-4cde-b328-b5c1d619424d -->

# HRM Module (BS Fiscal Year, SSF Default) — Batch Runs, Leave Balances, Annualized TDS

## Key Decisions (Updated)

- Payroll calendar: Nepali BS (FY: Shrawan–Ashadh); store `fiscalYear` like "2082/83" and `monthBs` 1–12
- Contribution scheme: Default SSF (31% = 11% employee, 20% employer) with setting for Traditional (EPF)
- Finalization: Use a monthly batch object `PayrollRun`; edits locked once FINALIZED
- Accounting: Create one aggregated Journal Entry per `PayrollRun` (not per employee)

## Data Model (Prisma) — Updates

Add/modify in `packages/db-schema/prisma/schema.prisma`:

```prisma
enum PayrollScheme { SSF TRADITIONAL }

model Department { id String @id @default(uuid()) cooperativeId String name String employees Employee[] }
model Designation { id String @id @default(uuid()) cooperativeId String title String rank Int employees Employee[] }

model Shift {
  id String @id @default(uuid())
  cooperativeId String
  name String
  expectedCheckIn  DateTime
  expectedCheckOut DateTime
  graceMinutes Int @default(5)
}

model Employee {
  id String @id @default(uuid())
  cooperativeId String
  userId String?
  code String
  firstName String
  lastName String
  departmentId String
  department Department @relation(fields: [departmentId], references: [id])
  designationId String
  designation Designation @relation(fields: [designationId], references: [id])
  joinDate DateTime
  basicSalary Float
  defaultShiftId String?
  defaultShift Shift? @relation(fields: [defaultShiftId], references: [id])
  attendances Attendance[]
  leaves LeaveRequest[]
  payrolls Payroll[]
  leaveBalances EmployeeLeaveBalance[]
}

model Attendance {
  id String @id @default(uuid())
  employeeId String
  date DateTime
  checkIn DateTime?
  checkOut DateTime?
  status String   // PRESENT, ABSENT, LATE, LEAVE
  // shift/late computation helpers
  shiftId String?
  shift Shift? @relation(fields: [shiftId], references: [id])
  expectedCheckIn  DateTime?
  expectedCheckOut DateTime?
}

model LeaveType {
  id String @id @default(uuid())
  cooperativeId String
  name String
  isPaid Boolean
  defaultAnnualQuota Int
}

model LeaveRequest {
  id String @id @default(uuid())
  employeeId String
  leaveTypeId String
  startDate DateTime
  endDate DateTime
  days Float
  status String // PENDING, APPROVED, REJECTED
  comment String?
  approvedBy String?
  approvedAt DateTime?
}

model EmployeeLeaveBalance {
  id String @id @default(uuid())
  employeeId String
  leaveTypeId String
  fiscalYear String
  totalQuota Float
  usedDays Float @default(0)
  @@unique([employeeId, leaveTypeId, fiscalYear])
}

model PayrollRun {
  id String @id @default(uuid())
  cooperativeId String
  fiscalYear String
  monthBs Int
  totalBasic Float
  totalNetPay Float
  totalSSF Float
  totalTDS Float
  status String // DRAFT, FINALIZED
  journalEntryId String?
  payrolls Payroll[]
  finalizedAt DateTime?
  finalizedBy String?
  @@unique([cooperativeId, fiscalYear, monthBs])
}

model Payroll {
  id String @id @default(uuid())
  employeeId String
  payrollRunId String?
  payrollRun PayrollRun? @relation(fields: [payrollRunId], references: [id])
  fiscalYear String  // e.g., "2082/83"
  monthBs Int        // 1..12
  basicSalary Float
  allowances Json    // { grade: 1000, fuel: 500 }
  taxTds Float
  ssfEmployee Float  // 11%
  ssfEmployer Float  // 20%
  loanDeduction Float
  festivalBonus Float
  netSalary Float
  isPaid Boolean @default(false)
  finalizedAt DateTime?
}

model PayrollSettings {
  id String @id @default(uuid())
  cooperativeId String @unique
  scheme PayrollScheme @default(SSF)
  tdsConfig Json
  glSalaryExpense String
  glSsfExpense String
  glTdsPayable String
  glSsfPayable String
  glStaffLoanReceivable String
  glCashOrBank String
}
```

Notes:

- `PayrollRun` batches all slips for a month; unique per coop+FY+monthBs
- `Payroll.payrollRunId` links each payslip to its batch
- `EmployeeLeaveBalance` holds pro-rated quotas and is updated on approvals transactionally
- `Shift` + `Attendance.expected*` enable late/OT computations

## Backend API — Updates

Create/update under `apps/backend/src/routes/hrm/` and services in `apps/backend/src/services/hrm/`:

- Departments/Designations/Employees: CRUD (unchanged)
- Attendance:
  - `GET /hrm/attendance?date=YYYY-MM-DD&dept=...`
  - `POST /hrm/attendance/mark`
  - `POST /hrm/attendance/upload`
- Leave:
  - `GET/POST /hrm/leave/types`
  - `GET /hrm/leave/requests`, `POST /hrm/leave/requests`
  - `POST /hrm/leave/requests/:id/approve` → decrement `EmployeeLeaveBalance.usedDays` in a transaction
  - `GET /hrm/leave/balances?employeeId=...&fiscalYear=...`
- Payroll (Run-based):
  - `POST /hrm/payroll/runs/preview` → compute slips (no persist)
  - `POST /hrm/payroll/runs` → create DRAFT run and persist slips
  - `GET /hrm/payroll/runs?fiscalYear=&monthBs=` → list/status/aggregates
  - `POST /hrm/payroll/runs/:runId/finalize` → lock, aggregate, post Journal, set `journalEntryId`
  - `GET /hrm/payroll/:id/payslip`
- Settings:
  - `GET/PUT /hrm/settings/payroll` (scheme, TDS slabs, GL mapping, festival config)

Services:

- `payroll-calculator.ts` (updated): annualized Nepali TDS; SSF/Traditional; pro-rated festival bonus
- `leave-service.ts`: FY pro-rata quotas on join, balances, approval transactions
- `attendance-service.ts`: shift assignment, late minutes vs grace
- `journal-service.ts`: build one aggregated Journal per `PayrollRun` and call Accounting

## Payroll Logic — Annualized Nepali TDS

- Monthly taxable: `gross - ssfEmployee - epf/cit` (as applicable)
- Projected annual: `(monthlyTaxable * remainingMonths) + ytdTaxable`
- Apply slabs (from `PayrollSettings.tdsConfig`) to projected annual → annual tax liability
- This month TDS: `(annualLiability - ytdTaxPaid) / remainingMonths`
- Handle mid-year join: `ytdTaxable` starts at 0, pro-rated months
- Include bonuses/changes seamlessly via YTD recalculation

## Accounting Integration — Aggregated Journal per Run

On finalize `POST /hrm/payroll/runs/:runId/finalize`:

- Dr `glSalaryExpense` = sum(basic + allowances + festivalBonus)
- Dr `glSsfExpense` = sum(ssfEmployer)
- Cr `glTdsPayable` = sum(taxTds)
- Cr `glSsfPayable` = sum(ssfEmployee + ssfEmployer)
- Cr `glStaffLoanReceivable` = sum(loanDeduction)
- Cr `glCashOrBank` = sum(netSalary)
- Save `journalEntryId` on `PayrollRun`, set status FINALIZED, lock edits

## Frontend (Next.js) — Run-based UX

- Sidebar: add HRM section
- `hrm/payroll` shows runs per FY/month, with statuses, totals, preview/run/finalize flow
- Payslip view/print per employee within a run
- Leave balances visible on employee profile and leave page
- Attendance: show late status computed vs shift

## Calendar & Localization

- Continue BS utilities; store ISO dates internally; present BS months and FY

## Auth & Roles

- Ensure only HR managers can approve leave and finalize runs

## Migrations & Seeding

- Migrate new models and relations
- Seed default `LeaveType` and `PayrollSettings` per coop (scheme=SSF)
- Seed a default `Shift` (e.g., 10:00–17:00, 5 min grace)

## Phase 2 (Out-of-scope now)

- Biometric real-time integration
- Overtime pay rules
- Performance module; field visit expenses; asset handover

### To-dos

- [ ] Add Prisma models and migrations for HRM schema
- [ ] Seed LeaveType and default PayrollSettings (scheme SSF)
- [ ] Implement HRM services (attendance, leave, payroll calc, journal)
- [ ] Expose HRM REST APIs for employees, attendance, leave, payroll, settings
- [ ] Add BS calendar utilities (server/client) and month/FY helpers
- [ ] Create HRM pages (dashboard, employees, attendance, leave, payroll, settings)
- [ ] Add HRM section and links to Sidebar
- [ ] Wire payroll finalization to accounting journal with GL mapping
- [ ] Generate downloadable payslip (PDF) and employee view
- [ ] Add HR roles/permissions for approvals and finalization
