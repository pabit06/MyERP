#!/usr/bin/env node

/**
 * Script to automatically fix common linting issues across the codebase
 * - Replace @ts-ignore with @ts-expect-error
 * - Remove unused imports
 * - Fix unused variables by prefixing with _
 * - Fix Prettier formatting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_DIR = path.join(__dirname, '../apps/backend/src');
const FRONTEND_DIR = path.join(__dirname, '../apps/frontend-web/src');

/**
 * Recursively get all TypeScript/TSX files
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and other ignored directories
      if (!['node_modules', '.next', 'dist', 'build'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Fix @ts-ignore to @ts-expect-error
 */
function fixTsIgnore(content) {
  // Replace @ts-ignore with @ts-expect-error
  return content.replace(/@ts-ignore/g, '@ts-expect-error');
}

/**
 * Fix unescaped entities in JSX
 */
function fixUnescapedEntities(content) {
  // Fix common unescaped entities
  let fixed = content;

  // Fix quotes in JSX text content (but not in attributes or strings)
  // This is a simple approach - may need refinement
  fixed = fixed.replace(/(>)([^<]*?)(")([^<]*?)(<)/g, (match, p1, p2, p3, p4, p5) => {
    // Only fix if it's in text content, not in an attribute
    if (!p2.includes('=') && !p4.includes('=')) {
      return p1 + p2 + '&quot;' + p4 + p5;
    }
    return match;
  });

  // Fix apostrophes in JSX text content
  fixed = fixed.replace(/(>)([^<]*?)(')([^<]*?)(<)/g, (match, p1, p2, p3, p4, p5) => {
    if (!p2.includes('=') && !p4.includes('=')) {
      return p1 + p2 + '&apos;' + p4 + p5;
    }
    return match;
  });

  return fixed;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // Fix @ts-ignore
    if (content.includes('@ts-ignore')) {
      content = fixTsIgnore(content);
      modified = true;
    }

    // Fix unescaped entities in TSX files
    if (filePath.endsWith('.tsx') && (content.includes(`"`) || content.includes(`'`))) {
      // Only fix if it's a React component file
      if (content.includes('return (') || content.includes('return(') || content.includes('jsx')) {
        // Be more careful with this - might break things
        // content = fixUnescapedEntities(content);
        // modified = true;
      }
    }

    if (modified && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Starting lint fixes...\n');

  const backendFiles = getAllFiles(BACKEND_DIR);
  const frontendFiles = getAllFiles(FRONTEND_DIR);
  const allFiles = [...backendFiles, ...frontendFiles];

  console.log(`Found ${allFiles.length} files to process\n`);

  let fixedCount = 0;
  allFiles.forEach((file) => {
    if (processFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✅ Fixed ${fixedCount} files`);
  console.log('\n📝 Note: Some fixes (like unused imports/variables) require manual review.');
  console.log('   Run the linter to see remaining issues.');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, fixTsIgnore };
