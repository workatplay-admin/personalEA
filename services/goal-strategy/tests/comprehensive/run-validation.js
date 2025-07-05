const { exec } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');

// Test suites to run
const testSuites = [
  {
    name: 'Conversation Flow',
    file: 'conversation-flow.test.ts',
    description: 'Tests multi-stage conversations, user journeys, and context preservation',
    priority: 'critical'
  },
  {
    name: 'SMART Scoring Accuracy',
    file: 'smart-scoring-accuracy.test.ts',
    description: 'Validates dynamic confidence scoring and removes artificial limits',
    priority: 'critical'
  },
  {
    name: 'Edge Cases & Error Handling',
    file: 'edge-cases-error-handling.test.ts',
    description: 'Tests extreme inputs, API errors, and security edge cases',
    priority: 'high'
  },
  {
    name: 'Performance & Reliability',
    file: 'performance-reliability.test.ts',
    description: 'Benchmarks response times, throughput, and resource usage',
    priority: 'medium'
  }
];

// Run a single test suite
async function runTestSuite(suite) {
  console.log(`\n🧪 Running ${suite.name} tests...`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testPath = path.join(__dirname, suite.file);
    
    exec(
      `npx jest ${testPath} --testTimeout=30000 --forceExit --json`,
      {
        cwd: path.join(__dirname, '../../../..'),
        env: { ...process.env, NODE_ENV: 'test' }
      },
      (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        
        try {
          // Try to parse Jest JSON output
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jestResult = JSON.parse(jsonMatch[0]);
            
            const result = {
              suite: suite.name,
              passed: jestResult.success,
              totalTests: jestResult.numTotalTests || 0,
              passedTests: jestResult.numPassedTests || 0,
              failedTests: jestResult.numFailedTests || 0,
              duration,
              errors: extractErrors(jestResult),
              timestamp: new Date().toISOString()
            };
            
            console.log(result.passed ? 
              `   ✅ PASSED (${result.passedTests}/${result.totalTests} tests)` :
              `   ❌ FAILED (${result.failedTests} failures)`
            );
            
            resolve(result);
          } else {
            // Fallback if JSON parsing fails
            const result = {
              suite: suite.name,
              passed: error === null,
              totalTests: 0,
              passedTests: 0,
              failedTests: error ? 1 : 0,
              duration,
              errors: error ? [error.message] : [],
              timestamp: new Date().toISOString()
            };
            
            console.log(result.passed ? '   ✅ PASSED' : '   ❌ FAILED');
            resolve(result);
          }
        } catch (e) {
          console.log('   ⚠️  Error parsing test results');
          resolve({
            suite: suite.name,
            passed: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 1,
            duration,
            errors: [`Test execution error: ${e.message}`],
            timestamp: new Date().toISOString()
          });
        }
      }
    );
  });
}

function extractErrors(jestResult) {
  const errors = [];
  
  if (jestResult.testResults) {
    jestResult.testResults.forEach((testFile) => {
      if (testFile.assertionResults) {
        testFile.assertionResults
          .filter((test) => test.status === 'failed')
          .forEach((test) => {
            errors.push(`${test.title}: ${test.failureMessages?.[0] || 'Unknown error'}`);
          });
      }
    });
  }
  
  return errors;
}

// Generate validation report
function generateReport(results, totalDuration) {
  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.passed).length;
  const failedSuites = totalSuites - passedSuites;
  
  const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
  const passedTests = results.reduce((sum, r) => sum + r.passedTests, 0);
  const failedTests = results.reduce((sum, r) => sum + r.failedTests, 0);
  
  // Identify critical failures
  const criticalFailures = [];
  const criticalSuites = ['Conversation Flow', 'SMART Scoring Accuracy'];
  
  results.forEach(result => {
    if (!result.passed && criticalSuites.includes(result.suite)) {
      criticalFailures.push(`${result.suite}: ${result.failedTests} failures`);
    }
  });
  
  // Calculate confidence score
  const weights = { 'critical': 3, 'high': 2, 'medium': 1 };
  let score = 0;
  let totalWeight = 0;
  
  results.forEach(result => {
    const suite = testSuites.find(s => s.name === result.suite);
    if (suite) {
      const weight = weights[suite.priority];
      const suiteScore = result.totalTests > 0 
        ? result.passedTests / result.totalTests 
        : 0;
      
      score += suiteScore * weight;
      totalWeight += weight;
    }
  });
  
  const confidenceScore = totalWeight > 0 ? score / totalWeight : 0;
  
  // Determine production readiness
  const productionReady = criticalFailures.length === 0 && 
                         confidenceScore >= 0.8 && 
                         passedSuites / totalSuites >= 0.9;
  
  return {
    timestamp: new Date().toISOString(),
    totalSuites,
    passedSuites,
    failedSuites,
    totalTests,
    passedTests,
    failedTests,
    totalDuration,
    criticalFailures,
    confidenceScore,
    productionReady,
    results
  };
}

// Main execution
async function main() {
  console.log('🚀 Starting Comprehensive Test Validation');
  console.log('====================================\n');
  
  const startTime = Date.now();
  const results = [];
  
  // Run all test suites
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }
  
  const totalDuration = Date.now() - startTime;
  const report = generateReport(results, totalDuration);
  
  // Save report
  const reportPath = path.join(__dirname, '../../validation-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n====================================');
  console.log('📊 VALIDATION SUMMARY');
  console.log('====================================');
  console.log(`Status: ${report.productionReady ? '✅ READY' : '❌ NOT READY'} for Production`);
  console.log(`Confidence Score: ${(report.confidenceScore * 100).toFixed(1)}%`);
  console.log(`Test Suites: ${report.passedSuites}/${report.totalSuites} passed`);
  console.log(`Total Tests: ${report.passedTests}/${report.totalTests} passed`);
  console.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
  
  if (report.criticalFailures.length > 0) {
    console.log(`\n⚠️  Critical Failures:`);
    report.criticalFailures.forEach(f => console.log(`  - ${f}`));
  }
  
  console.log(`\n📄 Full report saved to: validation-report.json`);
  console.log('====================================\n');
  
  return report;
}

// Run the validation
main()
  .then(report => {
    process.exit(report.productionReady ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });