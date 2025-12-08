# Project Roadmap & Tasks

Based on [FEATURES_ANALYSIS.md](../FEATURES_ANALYSIS.md), this document outlines the roadmap for implementing new features, prioritizing high-value additions and quick wins.

## 🚀 Phase 1: Quick Wins (Immediate Impact)

- [x] **Transaction Reversal**: Implement mechanism to reverse incorrect transactions improperly.
- [x] **Bulk Notifications**: Implement Bulk SMS/Email system for mass communication.
- [x] **Data Export**: Add Excel/CSV/PDF export functionality for key reports and statements.
- [x] **Dashboard Widgets**: Add quick statistic widgets to the main dashboard.
- [x] **Search Enhancements**: Improve member and transaction search filters.

## 🌟 Phase 2: High Priority Features (Core Banking & Member Services)

- [/] **Fixed Deposits (FD)**:
  - [ ] Design Database Schema for FD Products and Accounts
  - [ ] Implement Backend Logic (Account creation, Interest calculation, Premature withdrawal)
  - [ ] Create Frontend UI for FD Management
- [ ] **Member Portal**:
  - [ ] Develop dedicated Web/Mobile-responsive Member Dashboard
  - [ ] Implement Member Login/Auth (separate from Admin)
  - [ ] Add View-only access for Accounts, Loans, and Statements
- [ ] **Mobile Banking API**:
  - [ ] Design API endpoints for Mobile App consumption
  - [ ] Implement QR Payment generation/scanning logic
- [ ] **Regulatory Reports**:
  - [ ] Implement NRB (Nepal Rastra Bank) standard reports
  - [ ] Implement Tax Deducted at Source (TDS) reporting

## 🔮 Phase 3: Medium Priority & Integrations

- [ ] **Recurring Deposits (RD)**: Implement RD product logic and auto-debit scheduling.
- [ ] **Budget Management**: Add module for cooperative's internal budgeting.
- [ ] **Payment Gateway Integration**: Integrate Fonepay/Khalti/Esewa for digital funds load.
- [ ] **2FA Security**: Implement TOTP/SMS-based Two-Factor Authentication.

## 📈 Phase 4: Advanced Features

- [ ] **Custom Report Builder**: Drag-and-drop tool for custom data reporting.
- [ ] **CRM Module**: Follow-up reminders, interaction history, and lead management.
- [ ] **Advanced HRM**: Performance appraisals and recruitment tracking.
