# MyERP API Documentation

## Base URL

- Development: `http://localhost:3001/api`
- Production: Configure via `API_PREFIX` environment variable

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check

#### GET /health

Check if the server is running.

**Response:**

```json
{
  "status": "ok",
  "message": "Backend server is running"
}
```

---

### SaaS Registration

#### POST /api/saas/register

Register a new cooperative and create the first admin user.

**Request Body:**

```json
{
  "name": "My Cooperative",
  "subdomain": "mycoop",
  "email": "admin@mycoop.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**

```json
{
  "message": "Cooperative registered successfully",
  "cooperative": {
    "id": "clx...",
    "name": "My Cooperative",
    "subdomain": "mycoop"
  },
  "user": {
    "id": "clx...",
    "email": "admin@mycoop.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `400`: Missing required fields
- `409`: Subdomain or email already taken

---

### Authentication

#### POST /api/auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "admin@mycoop.com",
  "password": "securepassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "clx...",
    "email": "admin@mycoop.com",
    "firstName": "John",
    "lastName": "Doe",
    "cooperativeId": "clx...",
    "roleId": null
  },
  "cooperative": {
    "id": "clx...",
    "name": "My Cooperative",
    "subdomain": "mycoop",
    "enabledModules": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `400`: Missing email or password
- `401`: Invalid credentials

#### GET /api/auth/me

Get current authenticated user information.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "user": {
    "id": "clx...",
    "email": "admin@mycoop.com",
    "firstName": "John",
    "lastName": "Doe",
    "roleId": null
  },
  "cooperative": {
    "id": "clx...",
    "name": "My Cooperative",
    "subdomain": "mycoop",
    "enabledModules": []
  }
}
```

**Errors:**

- `401`: Invalid or expired token
- `404`: User not found

---

### Onboarding

#### GET /api/onboarding/profile

Get cooperative profile (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "profile": {
    "id": "clx...",
    "cooperativeId": "clx...",
    "description": null,
    "logoUrl": null,
    "website": null,
    "address": null,
    "phone": null,
    "email": null,
    "cooperative": {
      "id": "clx...",
      "name": "My Cooperative",
      "subdomain": "mycoop",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### PUT /api/onboarding/profile

Update cooperative profile (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "description": "A cooperative for managing our community",
  "logoUrl": "https://example.com/logo.png",
  "website": "https://mycoop.com",
  "address": "123 Main St, City, Country",
  "phone": "+1234567890",
  "email": "contact@mycoop.com"
}
```

**Response (200):**

```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": "clx...",
    "cooperativeId": "clx...",
    "description": "A cooperative for managing our community",
    "logoUrl": "https://example.com/logo.png",
    "website": "https://mycoop.com",
    "address": "123 Main St, City, Country",
    "phone": "+1234567890",
    "email": "contact@mycoop.com"
  }
}
```

**Errors:**

- `401`: Not authenticated
- `403`: Tenant context required
- `500`: Internal server error

---

## Subscription Plans

The system includes default plans:

- **Basic**: $0/month - No modules
- **Standard**: $49.99/month - CBS module
- **Premium**: $99.99/month - CBS, DMS, HRM modules
- **Enterprise**: $199.99/month - All modules (CBS, DMS, HRM, Governance, Inventory, Compliance)

New cooperatives are automatically assigned the Basic plan upon registration.

## Module Access Control

Module access is controlled by the `isModuleEnabled` middleware. Modules are:

- `cbs`: Core Banking System ✅ (Phase 2 - Implemented)
- `dms`: Document Management System
- `hrm`: Human Resource Management
- `governance`: Governance & Meetings
- `inventory`: Inventory Management
- `compliance`: Compliance & Audit

---

## Financial Product Modules (CBS)

All CBS endpoints require authentication, tenant context, and the `cbs` module to be enabled.

### Savings Module

#### GET /api/savings/products

Get all saving products for the cooperative.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "products": [
    {
      "id": "...",
      "code": "REGULAR",
      "name": "Regular Savings",
      "description": "Standard savings account",
      "interestRate": 5.5,
      "minimumBalance": 100,
      "isActive": true
    }
  ]
}
```

#### POST /api/savings/products

Create a new saving product.

**Request Body:**

```json
{
  "code": "REGULAR",
  "name": "Regular Savings",
  "description": "Standard savings account",
  "interestRate": 5.5,
  "minimumBalance": 100
}
```

#### GET /api/savings/accounts

Get all saving accounts (with optional filters: `?memberId=...&status=...`).

#### POST /api/savings/accounts

Create a new saving account.

**Request Body:**

```json
{
  "memberId": "member-id",
  "productId": "product-id",
  "accountNumber": "SAV-001",
  "initialDeposit": 1000
}
```

#### GET /api/savings/accounts/:id

Get specific account details.

---

### Loans Module

#### GET /api/loans/products

Get all loan products.

#### POST /api/loans/products

Create a new loan product.

**Request Body:**

```json
{
  "code": "PERSONAL",
  "name": "Personal Loan",
  "description": "Personal loan product",
  "interestRate": 12.0,
  "maxLoanAmount": 500000,
  "minLoanAmount": 10000,
  "maxTenureMonths": 60,
  "minTenureMonths": 6,
  "processingFee": 500
}
```

#### GET /api/loans/applications

Get all loan applications (with optional filters: `?memberId=...&status=...`).

#### POST /api/loans/applications

Create a new loan application.

**Request Body:**

```json
{
  "memberId": "member-id",
  "productId": "product-id",
  "loanAmount": 100000,
  "tenureMonths": 24,
  "purpose": "Home improvement"
}
```

#### POST /api/loans/applications/:id/approve

Approve a loan application and generate EMI schedule.

**Request Body:**

```json
{
  "disbursedDate": "2024-01-15"
}
```

**Response (200):**

```json
{
  "message": "Loan application approved and EMI schedule generated",
  "application": { ... },
  "emiSchedule": [
    {
      "installmentNumber": 1,
      "dueDate": "2024-02-15",
      "principalAmount": 4000,
      "interestAmount": 1000,
      "totalAmount": 5000,
      "status": "pending"
    }
  ]
}
```

#### GET /api/loans/applications/:id/emi-schedule

Get EMI schedule for a loan application.

---

### Shares Module

#### GET /api/shares/ledgers

Get all share ledgers (with optional filter: `?memberId=...`).

#### GET /api/shares/ledgers/:memberId

Get member's share ledger (creates if doesn't exist).

#### POST /api/shares/transactions

Create a share transaction.

**Request Body:**

```json
{
  "memberId": "member-id",
  "type": "purchase",
  "shares": 100,
  "sharePrice": 100,
  "remarks": "Initial share purchase"
}
```

**Transaction Types:**

- `purchase`: Buy shares
- `sale`: Sell shares
- `dividend`: Dividend distribution
- `bonus`: Bonus shares

#### GET /api/shares/transactions

Get all share transactions (with optional filters: `?memberId=...&type=...`).
