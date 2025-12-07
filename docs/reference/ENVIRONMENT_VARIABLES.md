# Environment Variables Setup

This document describes the environment variables needed for each application in the monorepo.

## Backend (`apps/backend`)

Copy `apps/backend/env.example` to `apps/backend/.env` and configure the following:

### Required Variables

- **PORT**: Server port (default: 3001)
- **NODE_ENV**: Environment mode (`development`, `production`, `test`)
- **DATABASE_URL**: PostgreSQL connection string
  - Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`
  - Example: `postgresql://postgres:password@localhost:5432/myerp?schema=public`
- **JWT_SECRET**: Secret key for JWT token signing (use a strong random string in production)
- **JWT_EXPIRES_IN**: JWT token expiration time (e.g., "7d", "24h")

### Optional Variables

- **CORS_ORIGIN**: Allowed CORS origin (default: `http://localhost:3000`)
- **API_PREFIX**: API route prefix (default: `/api`)

### Setup Instructions

```bash
# Copy the example file
cp apps/backend/env.example apps/backend/.env

# Edit the .env file with your actual values
# Make sure to set a strong JWT_SECRET and configure your DATABASE_URL
```

## Frontend Web (`apps/frontend-web`)

Copy `apps/frontend-web/env.example` to `apps/frontend-web/.env.local` and configure:

### Required Variables

- **NEXT_PUBLIC_API_URL**: Backend API URL (default: `http://localhost:3001/api`)
- **NEXT_PUBLIC_APP_URL**: Frontend application URL (default: `http://localhost:3000`)

### Setup Instructions

```bash
# Copy the example file
cp apps/frontend-web/env.example apps/frontend-web/.env.local

# Edit .env.local with your actual values
```

**Note:** In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Mobile Member (`apps/mobile-member`)

Copy `apps/mobile-member/env.example` to `apps/mobile-member/.env` and configure:

### Required Variables

- **EXPO_PUBLIC_API_URL**: Backend API URL (default: `http://localhost:3001/api`)

### Setup Instructions

```bash
# Copy the example file
cp apps/mobile-member/env.example apps/mobile-member/.env

# Edit .env with your actual values
```

**Note:** In Expo, environment variables prefixed with `EXPO_PUBLIC_` are exposed to the app.

## Security Notes

⚠️ **Important Security Reminders:**

1. Never commit `.env` files to version control (they're already in `.gitignore`)
2. Use strong, random values for `JWT_SECRET` in production
3. Use different secrets for development and production environments
4. Keep your database credentials secure
5. Use environment-specific `.env` files (`.env.development`, `.env.production`)
