import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
}

interface TestResult {
  suite: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  errors: string[];
  timestamp: string;
}

interface ValidationReport {
  timestamp: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  criticalFailures: string[];
  recommendations: string[];
  productionReady: boolean;
  confidenceScore: number;
  results: TestResult[];
}

class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
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

  private existingTests: TestSuite[] = [
    {
      name: 'Unit Tests - Chat Refinement',
      file: '../unit/chat-refinement.test.ts',
      description: 'Existing unit tests for chat refinement functionality',
      priority: 'high'
    },
    {
      name: 'Unit Tests - SMART Goal Processor',
      file: '../unit/smart-goal-processor.test.ts',
      description: 'Existing unit tests for SMART goal processing',
      priority: 'high'
    }
  ];

  async runAllTests(): Promise<ValidationReport> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const allSuites = [...this.testSuites, ...this.existingTests];

    console.log('🚀 Starting Comprehensive Test Validation');
    console.log(`📋 Running ${allSuites.length} test suites\n`);

    for (const suite of allSuites) {
      console.log(`\n🧪 Running ${suite.name} (${suite.priority} priority)`);
      console.log(`   📄 ${suite.description}`);
      
      const result = await this.runTestSuite(suite);
      results.push(result);
      
      if (result.passed) {
        console.log(`   ✅ PASSED (${result.passedTests}/${result.totalTests} tests)`);
      } else {
        console.log(`   ❌ FAILED (${result.failedTests} failures)`);
        result.errors.slice(0, 3).forEach(error => {
          console.log(`      - ${error}`);
        });
      }
    }

    const report = this.generateReport(results, Date.now() - startTime);
    await this.saveReport(report);
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();
    const testPath = path.join(__dirname, suite.file);

    return new Promise((resolve) => {
      const jestProcess = spawn('npx', [
        'jest',
        testPath,
        '--json',
        '--testTimeout=30000',
        '--forceExit'
      ], {
        cwd: path.join(__dirname, '../../../..'),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      let errorOutput = '';

      jestProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      jestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      jestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        try {
          // Parse Jest JSON output
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jestResult = JSON.parse(jsonMatch[0]);
            
            resolve({
              suite: suite.name,
              passed: jestResult.success,
              totalTests: jestResult.numTotalTests || 0,
              passedTests: jestResult.numPassedTests || 0,
              failedTests: jestResult.numFailedTests || 0,
              duration,
              errors: this.extractErrors(jestResult),
              timestamp: new Date().toISOString()
            });
          } else {
            // Fallback if JSON parsing fails
            resolve({
              suite: suite.name,
              passed: code === 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              duration,
              errors: errorOutput ? [errorOutput] : [],
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          resolve({
            suite: suite.name,
            passed: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 1,
            duration,
            errors: [`Test execution error: ${error}`],
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }

  private extractErrors(jestResult: any): string[] {
    const errors: string[] = [];
    
    if (jestResult.testResults) {
      jestResult.testResults.forEach((testFile: any) => {
        if (testFile.assertionResults) {
          testFile.assertionResults
            .filter((test: any) => test.status === 'failed')
            .forEach((test: any) => {
              errors.push(`${test.title}: ${test.failureMessages?.[0] || 'Unknown error'}`);
            });
        }
      });
    }

    return errors;
  }

  private generateReport(results: TestResult[], totalDuration: number): ValidationReport {
    const totalSuites = results.length;
    const passedSuites = results.filter(r => r.passed).length;
    const failedSuites = totalSuites - passedSuites;
    
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const passedTests = results.reduce((sum, r) => sum + r.passedTests, 0);
    const failedTests = results.reduce((sum, r) => sum + r.failedTests, 0);

    // Identify critical failures
    const criticalFailures: string[] = [];
    const criticalSuites = ['Conversation Flow', 'SMART Scoring Accuracy'];
    
    results.forEach(result => {
      if (!result.passed && criticalSuites.includes(result.suite)) {
        criticalFailures.push(`${result.suite}: ${result.failedTests} failures`);
      }
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(results);

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
      recommendations,
      productionReady,
      confidenceScore,
      results
    };
  }

  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      if (!result.passed) {
        switch (result.suite) {
          case 'Conversation Flow':
            recommendations.push('Fix conversation flow issues to ensure smooth user experience');
            recommendations.push('Review clarification logic and context preservation');
            break;
          case 'SMART Scoring Accuracy':
            recommendations.push('Remove artificial confidence caps (0.3-0.5 limits)');
            recommendations.push('Implement dynamic scoring based on answer quality');
            recommendations.push('Ensure holistic updates across all SMART criteria');
            break;
          case 'Edge Cases & Error Handling':
            recommendations.push('Improve error handling for edge cases');
            recommendations.push('Add input validation and sanitization');
            break;
          case 'Performance & Reliability':
            recommendations.push('Optimize performance for identified bottlenecks');
            recommendations.push('Review memory usage patterns');
            break;
        }
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('All tests passing - ready for production deployment');
      recommendations.push('Consider adding more stress tests for scalability');
      recommendations.push('Set up continuous monitoring for production');
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private calculateConfidenceScore(results: TestResult[]): number {
    let score = 0;
    let totalWeight = 0;

    const weights = {
      'critical': 3,
      'high': 2,
      'medium': 1
    };

    results.forEach(result => {
      const suite = [...this.testSuites, ...this.existingTests]
        .find(s => s.name === result.suite);
      
      if (suite) {
        const weight = weights[suite.priority];
        const suiteScore = result.totalTests > 0 
          ? result.passedTests / result.totalTests 
          : 0;
        
        score += suiteScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private async saveReport(report: ValidationReport): Promise<void> {
    const reportPath = path.join(__dirname, '../../validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also save a markdown summary
    const markdownPath = path.join(__dirname, '../../validation-report.md');
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(markdownPath, markdown);
  }

  private generateMarkdownReport(report: ValidationReport): string {
    const emoji = report.productionReady ? '✅' : '❌';
    const status = report.productionReady ? 'READY' : 'NOT READY';
    
    let markdown = `# Test Validation Report
    
**Date:** ${new Date(report.timestamp).toLocaleString()}  
**Status:** ${emoji} **${status} for Production**  
**Confidence Score:** ${(report.confidenceScore * 100).toFixed(1)}%

## Summary

- **Total Test Suites:** ${report.totalSuites} (${report.passedSuites} passed, ${report.failedSuites} failed)
- **Total Tests:** ${report.totalTests} (${report.passedTests} passed, ${report.failedTests} failed)
- **Total Duration:** ${(report.totalDuration / 1000).toFixed(2)}s

${report.criticalFailures.length > 0 ? `
## ⚠️ Critical Failures

${report.criticalFailures.map(f => `- ${f}`).join('\n')}
` : ''}

## Test Results

| Suite | Status | Tests | Pass Rate | Duration |
|-------|--------|-------|-----------|----------|
${report.results.map(r => 
  `| ${r.suite} | ${r.passed ? '✅' : '❌'} | ${r.totalTests} | ${r.totalTests > 0 ? ((r.passedTests / r.totalTests * 100).toFixed(1) + '%') : 'N/A'} | ${(r.duration / 1000).toFixed(2)}s |`
).join('\n')}

## Recommendations

${report.recommendations.map(r => `- ${r}`).join('\n')}

${!report.productionReady ? `
## Required Actions for Production

1. Fix all critical test failures
2. Achieve at least 90% test pass rate
3. Resolve identified issues in recommendations
4. Re-run validation after fixes
` : `
## Production Deployment Checklist

- [x] All critical tests passing
- [x] High confidence score (${(report.confidenceScore * 100).toFixed(1)}%)
- [x] No blocking issues identified
- [ ] Deploy to staging environment
- [ ] Run integration tests in staging
- [ ] Deploy to production with monitoring
`}
`;

    return markdown;
  }

  private printSummary(report: ValidationReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    const emoji = report.productionReady ? '✅' : '❌';
    const status = report.productionReady ? 'READY' : 'NOT READY';
    
    console.log(`\nStatus: ${emoji} ${status} for Production`);
    console.log(`Confidence Score: ${(report.confidenceScore * 100).toFixed(1)}%`);
    
    console.log(`\nTest Results:`);
    console.log(`  - Suites: ${report.passedSuites}/${report.totalSuites} passed`);
    console.log(`  - Tests: ${report.passedTests}/${report.totalTests} passed`);
    console.log(`  - Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    
    if (report.criticalFailures.length > 0) {
      console.log(`\n⚠️  Critical Failures:`);
      report.criticalFailures.forEach(f => console.log(`  - ${f}`));
    }
    
    console.log(`\n📋 Recommendations:`);
    report.recommendations.slice(0, 5).forEach(r => console.log(`  - ${r}`));
    
    console.log('\n' + '='.repeat(60));
    console.log('📄 Full report saved to: validation-report.json');
    console.log('📝 Markdown summary saved to: validation-report.md');
    console.log('='.repeat(60) + '\n');
  }
}

// Export for use in other scripts
export { ComprehensiveTestRunner, ValidationReport };

// Run if called directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runAllTests()
    .then(report => {
      process.exit(report.productionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}