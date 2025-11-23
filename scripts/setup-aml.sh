#!/bin/bash
# AML Module Setup Script
# Run this script after starting your PostgreSQL database

set -e

echo "🚀 Setting up AML & Compliance Module..."

# Step 1: Generate Prisma Client
echo "📦 Generating Prisma Client..."
cd packages/db-schema
npx prisma generate
cd ../..

# Step 2: Run Migration
echo "🗄️  Running database migration..."
cd packages/db-schema
npx prisma migrate dev --name add_aml_compliance
cd ../..

# Step 3: Seed AML Data
echo "🌱 Seeding AML data (creating ComplianceOfficer role)..."
cd apps/backend
tsx scripts/seed-aml-data.ts
cd ../..

echo "✅ AML module setup complete!"
echo ""
echo "Next steps:"
echo "1. Import watchlists using:"
echo "   tsx apps/backend/scripts/import-un-sanctions.ts <cooperativeId> <csvFilePath>"
echo "   tsx apps/backend/scripts/import-home-ministry-sanctions.ts <cooperativeId> <csvFilePath>"
echo "2. Configure cron jobs for automated risk reassessment"
echo "3. Start your backend server"

