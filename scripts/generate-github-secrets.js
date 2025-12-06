#!/usr/bin/env node

/**
 * Generate GitHub Secrets for CI/CD
 * This script generates secure values for GitHub Actions secrets
 */

const crypto = require('crypto');

console.log('==========================================');
console.log('GitHub Secrets Generator for MyERP');
console.log('==========================================');
console.log('');
console.log('Copy these values to GitHub Repository Settings → Secrets and variables → Actions');
console.log('');
console.log('==========================================');
console.log('REQUIRED SECRETS FOR CI');
console.log('==========================================');
console.log('');

// Generate JWT_SECRET
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('1. JWT_SECRET');
console.log(`   Value: ${jwtSecret}`);
console.log('   Description: Secret key for JWT token signing (minimum 32 characters)');
console.log('');

console.log('2. JWT_EXPIRES_IN');
console.log('   Value: 7d');
console.log('   Description: JWT token expiration time');
console.log('');

console.log('3. NEXT_PUBLIC_API_URL');
console.log('   Value: https://api.yourdomain.com/api');
console.log('   Description: Backend API URL for frontend builds');
console.log('   ⚠️  Update with your actual API URL');
console.log('');

console.log('==========================================');
console.log('OPTIONAL SECRETS FOR CD (Deployment)');
console.log('==========================================');
console.log('');
console.log('Add these only if you\'re setting up deployment:');
console.log('');
console.log('See .github/SECRETS_SETUP.md for complete list');
console.log('');

console.log('==========================================');
console.log('QUICK COPY');
console.log('==========================================');
console.log('');
console.log('JWT_SECRET (copy this):');
console.log(jwtSecret);
console.log('');

// Try to copy to clipboard (optional)
try {
  const { execSync } = require('child_process');
  const platform = process.platform;
  
  if (platform === 'darwin') {
    execSync(`echo "${jwtSecret}" | pbcopy`);
    console.log('✅ JWT_SECRET copied to clipboard (macOS)!');
  } else if (platform === 'linux') {
    try {
      execSync(`echo "${jwtSecret}" | xclip -selection clipboard`);
      console.log('✅ JWT_SECRET copied to clipboard (Linux)!');
    } catch {
      console.log('💡 Install xclip to auto-copy: sudo apt-get install xclip');
    }
  } else if (platform === 'win32') {
    try {
      execSync(`echo ${jwtSecret} | clip`);
      console.log('✅ JWT_SECRET copied to clipboard (Windows)!');
    } catch {
      console.log('💡 JWT_SECRET is shown above - copy it manually');
    }
  }
} catch (error) {
  console.log('💡 JWT_SECRET is shown above - copy it manually');
}

console.log('');
console.log('==========================================');
console.log('NEXT STEPS');
console.log('==========================================');
console.log('1. Go to: Repository Settings → Secrets and variables → Actions');
console.log('2. Click "New repository secret"');
console.log('3. Add each secret with the values above');
console.log('4. Push a change to trigger workflows');
console.log('');
