#!/usr/bin/env node

/**
 * Comprehensive Test Runner for PersonalEA
 * Orchestrates all automated testing suites
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      suites: [],
      startTime: new Date(),
      endTime: null,
      overallSuccess: false
    };
    this.config = {
      timeout: 300000, // 5 minutes per suite
      concurrent: false, // Run suites sequentially for stability
      reportDir: './test-results',
      saveArtifacts: true
    };
  }

  async runAllTestSuites() {
    console.log('🚀 Starting Comprehensive Test Runner');
    console.log('=' .repeat(80));
    console.log(`📅 Started at: ${this.results.startTime.toISOString()}`);
    console.log(`📂 Results will be saved to: ${this.config.reportDir}\n`);

    // Ensure report directory exists
    this.ensureReportDirectory();

    // Define test suites in execution order
    const testSuites = [
      {
        name: 'System Health Check',
        command: 'node',
        args: ['./system-health-check.js'],
        essential: true,
        timeout: 30000
      },
      {
        name: 'Unit Tests',
        command: 'npm',
        args: ['run', 'test:unit'],
        essential: true,
        timeout: 120000
      },
      {
        name: 'API Integration Tests',
        command: 'npm',
        args: ['run', 'test:integration'],
        essential: true,
        timeout: 180000
      },
      {
        name: 'Automated User Testing',
        command: 'node',
        args: ['./automated-user-testing.js'],
        essential: true,
        timeout: 240000
      },
      {
        name: 'Browser User Testing',
        command: 'node',
        args: ['./browser-automated-testing.js'],
        essential: true,
        timeout: 180000
      },
      {
        name: 'Comprehensive Automated Testing',
        command: 'node',
        args: ['./comprehensive-automated-testing.js'],
        essential: true,
        timeout: 300000
      },
      {
        name: 'Playwright E2E Tests',
        command: 'npx',
        args: ['playwright', 'test', './tests/playwright/comprehensive-e2e.spec.ts'],
        essential: true,
        timeout: 300000
      },
      {
        name: 'Performance Benchmarks',
        command: 'npm',
        args: ['run', 'test:performance'],
        essential: false,
        timeout: 120000
      },
      {
        name: 'Security Scan',
        command: 'npm',
        args: ['run', 'test:security'],
        essential: false,
        timeout: 60000
      }
    ];

    // Execute test suites
    for (const suite of testSuites) {
      console.log(`\n🧪 Running: ${suite.name}`);
      console.log('-' .repeat(40));
      
      const suiteResult = await this.runTestSuite(suite);
      this.results.suites.push(suiteResult);
      
      // Stop execution if essential test fails
      if (!suiteResult.success && suite.essential) {
        console.log(`\n❌ Essential test suite "${suite.name}" failed. Stopping execution.`);
        break;
      }
    }

    // Generate comprehensive report
    this.results.endTime = new Date();
    this.results.overallSuccess = this.calculateOverallSuccess();
    
    await this.generateFinalReport();
    this.printSummary();
    
    return this.results;
  }

  async runTestSuite(suite) {
    const startTime = Date.now();
    
    const result = {
      name: suite.name,
      command: `${suite.command} ${suite.args.join(' ')}`,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      success: false,
      exitCode: null,
      output: '',
      error: '',
      artifacts: []
    };

    try {
      const { success, output, error, exitCode } = await this.executeCommand(
        suite.command, 
        suite.args, 
        suite.timeout
      );
      
      result.success = success;
      result.output = output;
      result.error = error;
      result.exitCode = exitCode;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;
      
      // Save artifacts if configured
      if (this.config.saveArtifacts) {
        await this.saveTestArtifacts(suite, result);
      }
      
      console.log(`${result.success ? '✅' : '❌'} ${suite.name}: ${result.success ? 'PASSED' : 'FAILED'}`);
      console.log(`   Duration: ${result.duration}ms`);
      if (result.error && !result.success) {
        console.log(`   Error: ${result.error.substring(0, 200)}...`);
      }
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;
      
      console.log(`❌ ${suite.name}: FAILED - ${error.message}`);
    }
    
    return result;
  }

  async executeCommand(command, args, timeout) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      let output = '';
      let error = '';
      
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text); // Stream output in real-time
      });
      
      child.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        process.stderr.write(text); // Stream errors in real-time
      });
      
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: code === 0,
          output,
          error,
          exitCode: code
        });
      });
      
      child.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });
    });
  }

  async saveTestArtifacts(suite, result) {
    const artifactDir = path.join(this.config.reportDir, 'artifacts', suite.name.replace(/\s+/g, '-').toLowerCase());
    
    try {
      // Create artifact directory
      fs.mkdirSync(artifactDir, { recursive: true });
      
      // Save command output
      const outputFile = path.join(artifactDir, 'output.log');
      fs.writeFileSync(outputFile, result.output);
      result.artifacts.push(outputFile);
      
      // Save error output if present
      if (result.error) {
        const errorFile = path.join(artifactDir, 'error.log');
        fs.writeFileSync(errorFile, result.error);
        result.artifacts.push(errorFile);
      }
      
      // Save test result metadata
      const metadataFile = path.join(artifactDir, 'metadata.json');
      fs.writeFileSync(metadataFile, JSON.stringify({
        suite: suite.name,
        success: result.success,
        duration: result.duration,
        exitCode: result.exitCode,
        timestamp: result.endTime
      }, null, 2));
      result.artifacts.push(metadataFile);
      
    } catch (error) {
      console.log(`⚠️ Failed to save artifacts for ${suite.name}: ${error.message}`);
    }
  }

  calculateOverallSuccess() {
    const essentialSuites = this.results.suites.filter(s => 
      ['System Health Check', 'Unit Tests', 'API Integration Tests', 
       'Automated User Testing', 'Comprehensive Automated Testing'].includes(s.name)
    );
    
    const essentialSuccessCount = essentialSuites.filter(s => s.success).length;
    const totalSuites = this.results.suites.length;
    const successfulSuites = this.results.suites.filter(s => s.success).length;
    
    // Must pass all essential tests and at least 80% of total tests
    const essentialTestsPassed = essentialSuccessCount === essentialSuites.length;
    const overallSuccessRate = successfulSuites / totalSuites;
    
    return essentialTestsPassed && overallSuccessRate >= 0.8;
  }

  async generateFinalReport() {
    const report = {
      testRun: {
        id: `comprehensive-test-run-${this.results.startTime.toISOString()}`,
        startTime: this.results.startTime,
        endTime: this.results.endTime,
        duration: this.results.endTime - this.results.startTime,
        overallSuccess: this.results.overallSuccess
      },
      summary: {
        totalSuites: this.results.suites.length,
        successfulSuites: this.results.suites.filter(s => s.success).length,
        failedSuites: this.results.suites.filter(s => !s.success).length,
        successRate: (this.results.suites.filter(s => s.success).length / this.results.suites.length * 100).toFixed(1),
        totalDuration: this.results.suites.reduce((sum, s) => sum + s.duration, 0)
      },
      suites: this.results.suites,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString()
      },
      recommendations: this.generateRecommendations()
    };
    
    const reportFile = path.join(this.config.reportDir, 'comprehensive-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    await this.generateHtmlReport(report);
    
    console.log(`\n📊 Comprehensive test report saved to: ${reportFile}`);
  }

  async generateHtmlReport(report) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PersonalEA Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 4px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .suite { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 4px; }
        .suite.passed { border-left: 4px solid #28a745; }
        .suite.failed { border-left: 4px solid #dc3545; }
        .artifacts { margin-top: 10px; }
        .artifacts a { margin-right: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PersonalEA Comprehensive Test Report</h1>
        <p><strong>Test Run ID:</strong> ${report.testRun.id}</p>
        <p><strong>Started:</strong> ${report.testRun.startTime}</p>
        <p><strong>Completed:</strong> ${report.testRun.endTime}</p>
        <p><strong>Overall Result:</strong> <span class="${report.testRun.overallSuccess ? 'success' : 'failure'}">${report.testRun.overallSuccess ? 'PASSED' : 'FAILED'}</span></p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Suites</h3>
            <div class="value">${report.summary.totalSuites}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value ${parseFloat(report.summary.successRate) >= 80 ? 'success' : 'failure'}">${report.summary.successRate}%</div>
        </div>
        <div class="metric">
            <h3>Total Duration</h3>
            <div class="value">${Math.round(report.summary.totalDuration / 1000)}s</div>
        </div>
        <div class="metric">
            <h3>Failed Suites</h3>
            <div class="value ${report.summary.failedSuites === 0 ? 'success' : 'failure'}">${report.summary.failedSuites}</div>
        </div>
    </div>
    
    <h2>Test Suite Results</h2>
    ${report.suites.map(suite => `
        <div class="suite ${suite.success ? 'passed' : 'failed'}">
            <h3>${suite.name} <span class="${suite.success ? 'success' : 'failure'}">${suite.success ? 'PASSED' : 'FAILED'}</span></h3>
            <p><strong>Duration:</strong> ${suite.duration}ms</p>
            <p><strong>Exit Code:</strong> ${suite.exitCode}</p>
            ${suite.error ? `<p><strong>Error:</strong> ${suite.error.substring(0, 500)}${suite.error.length > 500 ? '...' : ''}</p>` : ''}
            ${suite.artifacts.length > 0 ? `
                <div class="artifacts">
                    <strong>Artifacts:</strong>
                    ${suite.artifacts.map(artifact => `<a href="${path.relative(this.config.reportDir, artifact)}">${path.basename(artifact)}</a>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('')}
    
    <h2>Recommendations</h2>
    <ul>
        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>`;
    
    const htmlFile = path.join(this.config.reportDir, 'comprehensive-test-report.html');
    fs.writeFileSync(htmlFile, htmlContent);
    console.log(`📄 HTML report saved to: ${htmlFile}`);
  }

  generateRecommendations() {
    const failedSuites = this.results.suites.filter(s => !s.success);
    const recommendations = [];
    
    if (failedSuites.length === 0) {
      recommendations.push('All test suites passed successfully! System is performing well.');
      recommendations.push('Consider running tests more frequently to maintain quality.');
      recommendations.push('Review test coverage and add tests for new features.');
    } else {
      recommendations.push('Address failing test suites before deploying to production.');
      failedSuites.forEach(suite => {
        recommendations.push(`Fix issues in "${suite.name}" test suite.`);
      });
      recommendations.push('Investigate root causes of test failures.');
      recommendations.push('Consider adding more granular tests for better error isolation.');
    }
    
    // Performance recommendations
    const slowSuites = this.results.suites.filter(s => s.duration > 180000); // > 3 minutes
    if (slowSuites.length > 0) {
      recommendations.push('Optimize performance of slow test suites.');
      slowSuites.forEach(suite => {
        recommendations.push(`Investigate performance issues in "${suite.name}" (${Math.round(suite.duration/1000)}s).`);
      });
    }
    
    return recommendations;
  }

  ensureReportDirectory() {
    if (!fs.existsSync(this.config.reportDir)) {
      fs.mkdirSync(this.config.reportDir, { recursive: true });
    }
  }

  printSummary() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Overall Result: ${this.results.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Suites: ${this.results.suites.length}`);
    console.log(`Successful: ${this.results.suites.filter(s => s.success).length}`);
    console.log(`Failed: ${this.results.suites.filter(s => !s.success).length}`);
    console.log(`Success Rate: ${(this.results.suites.filter(s => s.success).length / this.results.suites.length * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${Math.round((this.results.endTime - this.results.startTime) / 1000)}s`);
    console.log(`Started: ${this.results.startTime.toISOString()}`);
    console.log(`Completed: ${this.results.endTime.toISOString()}`);
    
    if (this.results.suites.filter(s => !s.success).length > 0) {
      console.log('\n❌ Failed Suites:');
      this.results.suites.filter(s => !s.success).forEach(suite => {
        console.log(`   - ${suite.name}: ${suite.error?.substring(0, 100) || 'Unknown error'}`);
      });
    }
    
    console.log(`\n📄 Detailed reports available in: ${this.config.reportDir}`);
    console.log('=' .repeat(80));
  }
}

// Execute comprehensive testing if run directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  
  runner.runAllTestSuites().then(results => {
    process.exit(results.overallSuccess ? 0 : 1);
  }).catch(error => {
    console.error('\n💥 TEST RUNNER CRASHED:', error.message);
    process.exit(1);
  });
}

module.exports = { ComprehensiveTestRunner };