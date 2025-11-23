# AML Module Setup Script for Windows PowerShell
# Run this script after starting your PostgreSQL database

Write-Host "🚀 Setting up AML & Compliance Module..." -ForegroundColor Green

# Step 1: Generate Prisma Client
Write-Host "📦 Generating Prisma Client..." -ForegroundColor Yellow
Set-Location packages/db-schema
npx prisma generate
Set-Location ../..

# Step 2: Run Migration
Write-Host "🗄️  Running database migration..." -ForegroundColor Yellow
Set-Location packages/db-schema
npx prisma migrate dev --name add_aml_compliance
Set-Location ../..

# Step 3: Seed AML Data
Write-Host "🌱 Seeding AML data (creating ComplianceOfficer role)..." -ForegroundColor Yellow
Set-Location apps/backend
tsx scripts/seed-aml-data.ts
Set-Location ../..

Write-Host "✅ AML module setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Import watchlists using:"
Write-Host "   tsx apps/backend/scripts/import-un-sanctions.ts <cooperativeId> <csvFilePath>"
Write-Host "   tsx apps/backend/scripts/import-home-ministry-sanctions.ts <cooperativeId> <csvFilePath>"
Write-Host "2. Configure cron jobs for automated risk reassessment"
Write-Host "3. Start your backend server"

