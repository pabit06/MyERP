#!/usr/bin/env node

/**
 * Comprehensive script to fix common linting issues
 * This script uses ESLint's --fix where possible and handles specific patterns
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

console.log('🔧 Fixing common linting issues...\n');

try {
  // 1. Run ESLint auto-fix on backend
  console.log('1️⃣  Running ESLint --fix on backend...');
  try {
    execSync('cd apps/backend && pnpm lint --fix', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    console.log('✅ Backend ESLint fixes applied\n');
  } catch (error) {
    console.log('⚠️  Some backend ESLint issues could not be auto-fixed\n');
  }

  // 2. Run ESLint auto-fix on frontend
  console.log('2️⃣  Running ESLint --fix on frontend...');
  try {
    execSync('cd apps/frontend-web && pnpm lint --fix', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    console.log('✅ Frontend ESLint fixes applied\n');
  } catch (error) {
    console.log('⚠️  Some frontend ESLint issues could not be auto-fixed\n');
  }

  // 3. Run Prettier to fix formatting
  console.log('3️⃣  Running Prettier to fix formatting...');
  try {
    execSync('pnpm format', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    console.log('✅ Prettier formatting applied\n');
  } catch (error) {
    console.log('⚠️  Prettier formatting completed with warnings\n');
  }

  console.log('✨ Common issues fixed!');
  console.log('\n📝 Remaining issues may require manual fixes:');
  console.log("   - Unused imports/variables (check if they're actually needed)");
  console.log('   - React Hook dependencies (may need useCallback/useMemo)');
  console.log('   - Type issues (may need proper type definitions)');
  console.log('\n💡 Run the linter again to see remaining issues.');
} catch (error) {
  console.error('❌ Error running fixes:', error.message);
  process.exit(1);
}
