const fs = require('fs');
const path = require('path');

const packages = [
  'package.json',
  'services/goal-strategy/package.json',
  'services/email-processing/package.json',
  'testing/goal-strategy-test/package.json',
  'shared/auth/package.json',
  'client-dev-kit/package.json'
];

const depVersions = {};

packages.forEach(pkgPath => {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const name = pkg.name || pkgPath;
    
    ['dependencies', 'devDependencies'].forEach(depType => {
      if (pkg[depType]) {
        Object.entries(pkg[depType]).forEach(([dep, version]) => {
          if (!depVersions[dep]) depVersions[dep] = {};
          depVersions[dep][name] = version;
        });
      }
    });
  } catch (e) {
    console.error(`Error reading ${pkgPath}:`, e.message);
  }
});

// Find conflicts
const conflicts = {};
Object.entries(depVersions).forEach(([dep, versions]) => {
  const uniqueVersions = [...new Set(Object.values(versions))];
  if (uniqueVersions.length > 1) {
    conflicts[dep] = versions;
  }
});

console.log('==== Dependency Version Conflicts ====');
console.log(JSON.stringify(conflicts, null, 2));

// Find common dependencies across services
const commonDeps = {};
Object.entries(depVersions).forEach(([dep, versions]) => {
  if (Object.keys(versions).length > 2) {
    commonDeps[dep] = versions;
  }
});

console.log('\n==== Common Dependencies (used in 3+ services) ====');
console.log(JSON.stringify(commonDeps, null, 2));

// Analyze specific problematic packages
const problematicPackages = ['typescript', 'jest', '@types/node', '@types/jest', 'openai', 'axios'];
console.log('\n==== Problematic Package Versions ====');
problematicPackages.forEach(pkg => {
  if (depVersions[pkg]) {
    console.log(`${pkg}:`, depVersions[pkg]);
  }
});