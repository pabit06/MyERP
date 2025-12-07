# Quick Start Guide

Get MyERP up and running in 5 minutes!

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 8.15.0 or higher
- **PostgreSQL** 15.x or higher
- **Git**

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/pabit06/MyERP.git
cd MyERP
```

### 2. Install Dependencies

```bash
# Install pnpm if you haven't
npm install -g pnpm@8.15.0

# Install project dependencies
pnpm install
```

### 3. Set Up Database

```bash
# Create database
createdb myerp

# Copy environment file
cp .env.example .env

# Edit .env and set your DATABASE_URL
# DATABASE_URL=postgresql://postgres:password@localhost:5432/myerp
```

### 4. Run Migrations

```bash
# Generate Prisma Client
pnpm --filter @myerp/db-schema generate

# Run migrations
pnpm --filter @myerp/db-schema prisma migrate deploy
```

### 5. Start Development Servers

```bash
# Start backend (Terminal 1)
pnpm --filter backend dev

# Start frontend (Terminal 2)
pnpm --filter frontend-web dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs

## 🐳 Quick Start with Docker

Prefer Docker? Even easier!

```bash
# Start entire stack
docker-compose up -d

# View logs
docker-compose logs -f

# Access:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:4000
```

## ✅ Verify Installation

### Check Backend

```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

### Check Frontend

Open http://localhost:3000 in your browser

### Run Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm --filter backend exec vitest run tests/integration/

# E2E tests
pnpm --filter backend test:e2e
```

## 🎯 Next Steps

Now that you're set up:

1. **Explore the codebase**
   - `apps/backend` - Express API
   - `apps/frontend-web` - Next.js frontend
   - `packages/db-schema` - Prisma schema

2. **Read the documentation**
   - [Architecture](../architecture/ARCHITECTURE.md)
   - [Development Guide](../development/CONTRIBUTING.md)
   - [API Reference](../reference/API_REFERENCE.md)

3. **Start developing**
   - Check [Roadmap](../planning/NEXT_STEPS_ROADMAP.md)
   - Pick a task
   - Create a feature branch
   - Start coding!

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 4000
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
# macOS: brew services restart postgresql
# Linux: sudo systemctl restart postgresql
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma Client
pnpm --filter @myerp/db-schema generate
```

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## 📚 Additional Resources

- [Full Setup Guide](./DEVELOPMENT.md)
- [Database Setup](./DATABASE_SETUP.md)
- [Docker Deployment](../deployment/DOCKER_DEPLOYMENT.md)
- [Troubleshooting Guide](../development/TROUBLESHOOTING.md)

## 🎉 You're Ready!

You now have MyERP running locally. Happy coding! 🚀

---

**Need help?** Check the [Troubleshooting Guide](../development/TROUBLESHOOTING.md) or open an issue on GitHub.
