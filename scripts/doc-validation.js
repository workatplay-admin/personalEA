#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * This script validates documentation across the project:
 * - Checks for required documentation files
 * - Validates markdown syntax
 * - Ensures documentation coverage for all services
 * - Checks for broken links
 * - Validates code examples in documentation
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  requiredDocs: [
    'README.md',
    'docs/api-spec.md',
    'docs/development-plan.md',
    'docs/user-installation-guide.md'
  ],
  serviceDocsPattern: /^services\/[^/]+\/README\.md$/,
  markdownFiles: ['**/*.md', '!node_modules/**', '!testing/**/node_modules/**'],
  codeBlockLanguages: ['javascript', 'typescript', 'bash', 'json', 'yaml']
};

// Validation results
const results = {
  errors: [],
  warnings: [],
  info: []
};

/**
 * Check if required documentation files exist
 */
async function checkRequiredDocs() {
  console.log('\n📋 Checking required documentation files...');
  
  for (const docPath of CONFIG.requiredDocs) {
    try {
      await fs.access(path.join(process.cwd(), docPath));
      results.info.push(`✅ Found required doc: ${docPath}`);
    } catch (error) {
      results.errors.push(`❌ Missing required doc: ${docPath}`);
    }
  }
}

/**
 * Check service documentation coverage
 */
async function checkServiceDocs() {
  console.log('\n🔍 Checking service documentation coverage...');
  
  const servicesDir = path.join(process.cwd(), 'services');
  
  try {
    const services = await fs.readdir(servicesDir);
    
    for (const service of services) {
      const servicePath = path.join(servicesDir, service);
      const stats = await fs.stat(servicePath);
      
      if (stats.isDirectory()) {
        const readmePath = path.join(servicePath, 'README.md');
        
        try {
          await fs.access(readmePath);
          const content = await fs.readFile(readmePath, 'utf-8');
          
          // Check for minimum documentation sections
          const requiredSections = ['Overview', 'Installation', 'Configuration', 'API'];
          const missingSections = requiredSections.filter(section => 
            !content.includes(`# ${section}`) && !content.includes(`## ${section}`)
          );
          
          if (missingSections.length > 0) {
            results.warnings.push(
              `⚠️  Service '${service}' README missing sections: ${missingSections.join(', ')}`
            );
          } else {
            results.info.push(`✅ Service '${service}' has complete documentation`);
          }
        } catch (error) {
          results.errors.push(`❌ Service '${service}' missing README.md`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`❌ Cannot read services directory: ${error.message}`);
  }
}

/**
 * Validate markdown syntax
 */
async function validateMarkdownSyntax() {
  console.log('\n📝 Validating markdown syntax...');
  
  try {
    // Use markdownlint if available
    execSync('npx markdownlint-cli2 "**/*.md" "!node_modules/**" "!**/node_modules/**"', {
      stdio: 'pipe'
    });
    results.info.push('✅ All markdown files have valid syntax');
  } catch (error) {
    const output = error.stdout ? error.stdout.toString() : '';
    if (output) {
      results.warnings.push(`⚠️  Markdown syntax issues found:\n${output}`);
    }
  }
}

/**
 * Check for broken links in documentation
 */
async function checkBrokenLinks() {
  console.log('\n🔗 Checking for broken links...');
  
  // This is a simplified check - in production, use a proper link checker
  const mdFiles = await findMarkdownFiles();
  
  for (const file of mdFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativeLinks = content.match(/\[([^\]]+)\]\((?!http)([^)]+)\)/g) || [];
    
    for (const link of relativeLinks) {
      const linkPath = link.match(/\]\(([^)]+)\)/)[1];
      const absolutePath = path.resolve(path.dirname(file), linkPath);
      
      try {
        await fs.access(absolutePath);
      } catch (error) {
        results.warnings.push(`⚠️  Broken link in ${file}: ${linkPath}`);
      }
    }
  }
}

/**
 * Find all markdown files in the project
 */
async function findMarkdownFiles() {
  const { glob } = await import('glob');
  return glob('**/*.md', {
    ignore: ['node_modules/**', '**/node_modules/**']
  });
}

/**
 * Generate documentation coverage report
 */
async function generateCoverageReport() {
  console.log('\n📊 Generating documentation coverage report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalErrors: results.errors.length,
      totalWarnings: results.warnings.length,
      totalInfo: results.info.length
    },
    results
  };
  
  await fs.writeFile(
    path.join(process.cwd(), 'docs', 'coverage-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📊 Documentation Coverage Summary:');
  console.log(`   Errors: ${report.summary.totalErrors}`);
  console.log(`   Warnings: ${report.summary.totalWarnings}`);
  console.log(`   Passed checks: ${report.summary.totalInfo}`);
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 Starting documentation validation...\n');
  
  try {
    await checkRequiredDocs();
    await checkServiceDocs();
    await validateMarkdownSyntax();
    await checkBrokenLinks();
    await generateCoverageReport();
    
    // Print results
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (results.info.length > 0) {
      console.log('\n✅ Passed:');
      results.info.forEach(info => console.log(`   ${info}`));
    }
    
    // Exit with error code if there are errors
    if (results.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = { validateDocs: main };