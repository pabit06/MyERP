# MyERP - Project Stack Overview

## 🏗️ Architecture

**Type:** Monorepo (pnpm workspaces)  
**Multi-Tenant:** Yes  
**SaaS:** Yes  
**Language:** TypeScript (100%)

---

## 📦 Package Manager

- **pnpm** v8.15.0
- **Node.js:** >=18.0.0

---

## 🎯 Project Structure

### Apps

1. **@myerp/frontend-web** - Web Application
2. **@myerp/backend** - API Server
3. **@myerp/mobile-member** - Mobile App (React Native/Expo)

### Packages

1. **@myerp/db-schema** - Prisma Schema & Database
2. **@myerp/shared-types** - Shared TypeScript Types

---

## 🖥️ Frontend Stack (Web)

### Core Framework

- **Next.js** 14.2.33 (React 18.3.1)
- **React** 18.3.1
- **TypeScript** 5.3.3

### UI & Styling

- **Tailwind CSS** 3.4.1
- **Radix UI** Components:
  - Accordion
  - Checkbox
  - Select
  - Slot
- **Lucide React** 0.555.0 (Icons)
- **Noto Sans Devanagari** (Nepali Font)

### Forms & Validation

- **React Hook Form** 7.66.1
- **Zod** 3.25.76 (Schema Validation)
- **@hookform/resolvers** 5.2.2

### Date Handling

- **nepali-date-converter** 3.4.0 (AD ↔ BS conversion)
- **@sajanm/nepali-date-picker** 5.0.6 (Date picker UI)
- **date-fns** 4.1.0

### Charts & Visualization

- **Recharts** 2.15.4

### Utilities

- **clsx** 2.1.1 (Conditional classes)
- **tailwind-merge** 3.4.0
- **class-variance-authority** 0.7.1
- **react-hot-toast** 2.6.0 (Notifications)

### Testing

- **Vitest** 3.2.4
- **@testing-library/react** 16.2.0
- **@testing-library/jest-dom** 6.6.3
- **jsdom** 26.1.0

---

## 🔧 Backend Stack

### Core Framework

- **Express.js** 4.21.2
- **TypeScript** 5.3.3
- **tsx** 4.7.1 (TypeScript execution)

### Database & ORM

- **Prisma** 6.19.0
- **@prisma/client** 6.19.0
- **PostgreSQL** (assumed, based on Prisma usage)

### Authentication & Security

- **jsonwebtoken** 9.0.2 (JWT)
- **bcryptjs** 2.4.3 (Password hashing)

### File Handling

- **multer** 2.0.2 (File uploads)
- **@types/multer** 2.0.0

### Communication

- **nodemailer** 7.0.11 (Email)
- **twilio** 5.10.6 (SMS)

### PDF Generation

- **pdfkit** 0.17.2

### Utilities

- **cors** 2.8.5
- **dotenv** 16.6.1
- **node-cache** 5.1.2 (Caching)
- **xmlbuilder2** 3.1.1
- **nepali-date-converter** 3.4.0

### Testing

- **Vitest** 1.6.1

---

## 📱 Mobile Stack

### Framework

- **Expo** 50.0.21
- **React Native** 0.73.2
- **expo-router** 3.4.10
- **expo-status-bar** 1.11.1

---

## 🗄️ Database

### ORM

- **Prisma** 6.19.0

### Features

- Multi-tenant architecture
- Migrations support
- Type-safe database client

---

## 🛠️ Development Tools

### Code Quality

- **ESLint** 8.57.1
- **Prettier** 3.7.1
- **TypeScript ESLint** 6.21.0
- **Husky** 9.1.7 (Git hooks)
- **lint-staged** 16.2.7

### Build Tools

- **TypeScript** 5.3.3
- **PostCSS** 8.4.33
- **Autoprefixer** 10.4.17

---

## 📚 Key Features

### Modules

1. **CBS (Core Banking System)**
   - Members Management
   - Shares
   - Savings
   - Loans
   - General Ledger
   - Day Begin/Day End

2. **DMS (Document Management System)**
   - Darta/Chalani

3. **HRM (Human Resource Management)**
   - Employees
   - Payroll
   - Attendance

4. **Inventory Management**

5. **Compliance & Audit**
   - AML (Anti-Money Laundering)
   - Sanctions Screening

6. **Governance**
   - Meetings

7. **Reports**
   - Member Reports
   - Savings Reports
   - Loan Reports
   - Financial Statements

### Special Features

- **Nepali Calendar Support** (Bikram Sambat)
- **Multi-tenant Architecture**
- **Role-Based Access Control (RBAC)**
- **Notification System** (Email + SMS)
- **Fiscal Year Management** (Nepali Fiscal Year)
- **Day Begin/Day End** (Accounting System Date)

---

## 🌐 Deployment

### Frontend

- **Next.js** (SSR/SSG capable)
- Static file serving from `/public`

### Backend

- **Express.js** API server
- Environment-based configuration

---

## 📦 Shared Packages

### @myerp/shared-types

- Shared TypeScript interfaces
- API response types
- KYC types
- Institution types

### @myerp/db-schema

- Prisma schema
- Database client
- Migrations
- Seed scripts

---

## 🔐 Security

- JWT Authentication
- bcryptjs password hashing
- CORS configuration
- Role-based access control
- Multi-tenant isolation

---

## 📝 Notes

- **Monorepo:** Uses pnpm workspaces
- **Type Safety:** Full TypeScript coverage
- **Code Quality:** ESLint + Prettier + Husky
- **Testing:** Vitest for unit/integration tests
- **Nepali Support:** Full Bikram Sambat calendar integration

---

## 🚀 Scripts

### Root

- `pnpm dev` - Start frontend + backend
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check all packages

### Backend

- `pnpm dev` - Start dev server (tsx watch)
- `pnpm build` - Compile TypeScript
- `pnpm start` - Start production server
- Various seed/utility scripts

### Frontend

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests

---

## 📊 Version Summary

| Package    | Version | Status                   |
| ---------- | ------- | ------------------------ |
| Next.js    | 14.2.33 | ⚠️ Can upgrade to 16.0.5 |
| React      | 18.3.1  | ⚠️ Can upgrade to 19.2.0 |
| Prisma     | 6.19.0  | ⚠️ Can upgrade to 7.0.1  |
| TypeScript | 5.3.3   | ✅ Latest                |
| Express    | 4.21.2  | ⚠️ Can upgrade to 5.1.0  |

_See `DEPENDENCY_UPGRADE_SUMMARY.md` for detailed upgrade information_
