-- CreateIndex
-- Add performance indexes for frequently queried fields

-- Member indexes
CREATE INDEX "members_cooperativeId_workflowStatus_idx" ON "members"("cooperativeId", "workflowStatus");
CREATE INDEX "members_cooperativeId_isActive_idx" ON "members"("cooperativeId", "isActive");
CREATE INDEX "members_cooperativeId_createdAt_idx" ON "members"("cooperativeId", "createdAt");
CREATE INDEX "members_cooperativeId_riskCategory_idx" ON "members"("cooperativeId", "riskCategory");
CREATE INDEX "members_cooperativeId_nextKymReviewDate_idx" ON "members"("cooperativeId", "nextKymReviewDate");
CREATE INDEX "members_memberNumber_idx" ON "members"("memberNumber");

-- Transaction indexes
CREATE INDEX "transactions_cooperativeId_date_idx" ON "transactions"("cooperativeId", "date");
CREATE INDEX "transactions_cooperativeId_type_idx" ON "transactions"("cooperativeId", "type");
CREATE INDEX "transactions_cooperativeId_createdAt_idx" ON "transactions"("cooperativeId", "createdAt");
CREATE INDEX "transactions_transactionNumber_idx" ON "transactions"("transactionNumber");

-- JournalEntry indexes
CREATE INDEX "journal_entries_cooperativeId_date_idx" ON "journal_entries"("cooperativeId", "date");
CREATE INDEX "journal_entries_cooperativeId_createdAt_idx" ON "journal_entries"("cooperativeId", "createdAt");
CREATE INDEX "journal_entries_entryNumber_idx" ON "journal_entries"("entryNumber");

-- Ledger indexes
CREATE INDEX "ledgers_cooperativeId_accountId_idx" ON "ledgers"("cooperativeId", "accountId");
CREATE INDEX "ledgers_cooperativeId_createdAt_idx" ON "ledgers"("cooperativeId", "createdAt");
CREATE INDEX "ledgers_accountId_idx" ON "ledgers"("accountId");
CREATE INDEX "ledgers_journalEntryId_idx" ON "ledgers"("journalEntryId");
CREATE INDEX "ledgers_transactionId_idx" ON "ledgers"("transactionId");

-- SavingAccount indexes
CREATE INDEX "saving_accounts_cooperativeId_memberId_idx" ON "saving_accounts"("cooperativeId", "memberId");
CREATE INDEX "saving_accounts_cooperativeId_status_idx" ON "saving_accounts"("cooperativeId", "status");
CREATE INDEX "saving_accounts_cooperativeId_productId_idx" ON "saving_accounts"("cooperativeId", "productId");
CREATE INDEX "saving_accounts_memberId_idx" ON "saving_accounts"("memberId");
CREATE INDEX "saving_accounts_accountNumber_idx" ON "saving_accounts"("accountNumber");

-- LoanApplication indexes
CREATE INDEX "loan_applications_cooperativeId_memberId_idx" ON "loan_applications"("cooperativeId", "memberId");
CREATE INDEX "loan_applications_cooperativeId_status_idx" ON "loan_applications"("cooperativeId", "status");
CREATE INDEX "loan_applications_cooperativeId_productId_idx" ON "loan_applications"("cooperativeId", "productId");
CREATE INDEX "loan_applications_cooperativeId_appliedDate_idx" ON "loan_applications"("cooperativeId", "appliedDate");
CREATE INDEX "loan_applications_memberId_idx" ON "loan_applications"("memberId");
CREATE INDEX "loan_applications_applicationNumber_idx" ON "loan_applications"("applicationNumber");

-- EMISchedule indexes
CREATE INDEX "emi_schedules_applicationId_idx" ON "emi_schedules"("applicationId");
CREATE INDEX "emi_schedules_cooperativeId_dueDate_idx" ON "emi_schedules"("cooperativeId", "dueDate");
CREATE INDEX "emi_schedules_cooperativeId_status_idx" ON "emi_schedules"("cooperativeId", "status");
CREATE INDEX "emi_schedules_dueDate_idx" ON "emi_schedules"("dueDate");
CREATE INDEX "emi_schedules_status_idx" ON "emi_schedules"("status");

-- ShareTransaction indexes
CREATE INDEX "share_transactions_cooperativeId_memberId_idx" ON "share_transactions"("cooperativeId", "memberId");
CREATE INDEX "share_transactions_cooperativeId_date_idx" ON "share_transactions"("cooperativeId", "date");
CREATE INDEX "share_transactions_cooperativeId_type_idx" ON "share_transactions"("cooperativeId", "type");
CREATE INDEX "share_transactions_memberId_idx" ON "share_transactions"("memberId");
CREATE INDEX "share_transactions_transactionNo_idx" ON "share_transactions"("transactionNo");

-- AuditLog indexes
CREATE INDEX "audit_logs_cooperativeId_timestamp_idx" ON "audit_logs"("cooperativeId", "timestamp");
CREATE INDEX "audit_logs_cooperativeId_action_idx" ON "audit_logs"("cooperativeId", "action");
CREATE INDEX "audit_logs_cooperativeId_entityType_idx" ON "audit_logs"("cooperativeId", "entityType");
CREATE INDEX "audit_logs_cooperativeId_userId_idx" ON "audit_logs"("cooperativeId", "userId");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- Employee indexes
CREATE INDEX "employees_cooperativeId_status_idx" ON "employees"("cooperativeId", "status");
CREATE INDEX "employees_cooperativeId_departmentId_idx" ON "employees"("cooperativeId", "departmentId");
CREATE INDEX "employees_cooperativeId_designationId_idx" ON "employees"("cooperativeId", "designationId");
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");
CREATE INDEX "employees_code_idx" ON "employees"("code");

-- MemberWorkflowHistory indexes
CREATE INDEX "member_workflow_history_memberId_idx" ON "member_workflow_history"("memberId");
CREATE INDEX "member_workflow_history_cooperativeId_toStatus_idx" ON "member_workflow_history"("cooperativeId", "toStatus");
CREATE INDEX "member_workflow_history_cooperativeId_action_idx" ON "member_workflow_history"("cooperativeId", "action");
CREATE INDEX "member_workflow_history_performedBy_idx" ON "member_workflow_history"("performedBy");
CREATE INDEX "member_workflow_history_createdAt_idx" ON "member_workflow_history"("createdAt");

-- AmlFlag indexes
CREATE INDEX "aml_flags_cooperativeId_memberId_idx" ON "aml_flags"("cooperativeId", "memberId");
CREATE INDEX "aml_flags_cooperativeId_type_idx" ON "aml_flags"("cooperativeId", "type");
CREATE INDEX "aml_flags_cooperativeId_status_idx" ON "aml_flags"("cooperativeId", "status");
CREATE INDEX "aml_flags_memberId_idx" ON "aml_flags"("memberId");

-- AmlTtrReport indexes
CREATE INDEX "aml_ttr_reports_cooperativeId_memberId_idx" ON "aml_ttr_reports"("cooperativeId", "memberId");
CREATE INDEX "aml_ttr_reports_cooperativeId_forDate_idx" ON "aml_ttr_reports"("cooperativeId", "forDate");
CREATE INDEX "aml_ttr_reports_cooperativeId_status_idx" ON "aml_ttr_reports"("cooperativeId", "status");
CREATE INDEX "aml_ttr_reports_memberId_idx" ON "aml_ttr_reports"("memberId");
CREATE INDEX "aml_ttr_reports_forDate_idx" ON "aml_ttr_reports"("forDate");

-- SourceOfFundsDeclaration indexes
CREATE INDEX "source_of_funds_declarations_cooperativeId_memberId_idx" ON "source_of_funds_declarations"("cooperativeId", "memberId");
CREATE INDEX "source_of_funds_declarations_cooperativeId_transactionId_idx" ON "source_of_funds_declarations"("cooperativeId", "transactionId");
CREATE INDEX "source_of_funds_declarations_memberId_idx" ON "source_of_funds_declarations"("memberId");
CREATE INDEX "source_of_funds_declarations_transactionId_idx" ON "source_of_funds_declarations"("transactionId");

-- AmlCase indexes
CREATE INDEX "aml_cases_cooperativeId_memberId_idx" ON "aml_cases"("cooperativeId", "memberId");
CREATE INDEX "aml_cases_cooperativeId_status_idx" ON "aml_cases"("cooperativeId", "status");
CREATE INDEX "aml_cases_cooperativeId_type_idx" ON "aml_cases"("cooperativeId", "type");
CREATE INDEX "aml_cases_memberId_idx" ON "aml_cases"("memberId");

-- PayrollLog indexes
CREATE INDEX "payroll_logs_cooperativeId_employeeId_idx" ON "payroll_logs"("cooperativeId", "employeeId");
CREATE INDEX "payroll_logs_cooperativeId_status_idx" ON "payroll_logs"("cooperativeId", "status");
CREATE INDEX "payroll_logs_cooperativeId_payPeriodStart_idx" ON "payroll_logs"("cooperativeId", "payPeriodStart");
CREATE INDEX "payroll_logs_employeeId_idx" ON "payroll_logs"("employeeId");

-- AttendanceLog indexes
CREATE INDEX "attendance_logs_cooperativeId_employeeId_idx" ON "attendance_logs"("cooperativeId", "employeeId");
CREATE INDEX "attendance_logs_cooperativeId_date_idx" ON "attendance_logs"("cooperativeId", "date");
CREATE INDEX "attendance_logs_cooperativeId_status_idx" ON "attendance_logs"("cooperativeId", "status");
CREATE INDEX "attendance_logs_employeeId_idx" ON "attendance_logs"("employeeId");

-- Attendance indexes
CREATE INDEX "attendances_cooperativeId_employeeId_idx" ON "attendances"("cooperativeId", "employeeId");
CREATE INDEX "attendances_cooperativeId_date_idx" ON "attendances"("cooperativeId", "date");
CREATE INDEX "attendances_cooperativeId_status_idx" ON "attendances"("cooperativeId", "status");
CREATE INDEX "attendances_employeeId_idx" ON "attendances"("employeeId");

-- LeaveRequest indexes
CREATE INDEX "leave_requests_cooperativeId_employeeId_idx" ON "leave_requests"("cooperativeId", "employeeId");
CREATE INDEX "leave_requests_cooperativeId_status_idx" ON "leave_requests"("cooperativeId", "status");
CREATE INDEX "leave_requests_cooperativeId_startDate_idx" ON "leave_requests"("cooperativeId", "startDate");
CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");

-- Payroll indexes
CREATE INDEX "payrolls_cooperativeId_employeeId_idx" ON "payrolls"("cooperativeId", "employeeId");
CREATE INDEX "payrolls_cooperativeId_fiscalYear_monthBs_idx" ON "payrolls"("cooperativeId", "fiscalYear", "monthBs");
CREATE INDEX "payrolls_cooperativeId_payrollRunId_idx" ON "payrolls"("cooperativeId", "payrollRunId");
CREATE INDEX "payrolls_employeeId_idx" ON "payrolls"("employeeId");
CREATE INDEX "payrolls_payrollRunId_idx" ON "payrolls"("payrollRunId");

-- PayrollRun indexes
CREATE INDEX "payroll_runs_cooperativeId_status_idx" ON "payroll_runs"("cooperativeId", "status");
CREATE INDEX "payroll_runs_cooperativeId_fiscalYear_idx" ON "payroll_runs"("cooperativeId", "fiscalYear");

-- ChartOfAccounts indexes
CREATE INDEX "chart_of_accounts_cooperativeId_type_idx" ON "chart_of_accounts"("cooperativeId", "type");
CREATE INDEX "chart_of_accounts_cooperativeId_isActive_idx" ON "chart_of_accounts"("cooperativeId", "isActive");
CREATE INDEX "chart_of_accounts_cooperativeId_parentId_idx" ON "chart_of_accounts"("cooperativeId", "parentId");
CREATE INDEX "chart_of_accounts_code_idx" ON "chart_of_accounts"("code");

-- MemberDocument indexes
CREATE INDEX "member_documents_cooperativeId_memberId_idx" ON "member_documents"("cooperativeId", "memberId");
CREATE INDEX "member_documents_memberId_idx" ON "member_documents"("memberId");
CREATE INDEX "member_documents_documentType_idx" ON "member_documents"("documentType");
