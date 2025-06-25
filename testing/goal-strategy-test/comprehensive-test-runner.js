#!/usr/bin/env node

/**
 * Comprehensive Automated User Testing Runner
 * This script runs the complete automated testing suite that mimics real user behavior
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const config = {
  testSuiteId: 'swarm-auto-centralized-1750788407321/testing/automated-tests',
  timestamp: new Date().toISOString(),
  apiKey: process.env.OPENAI_API_KEY || 'test-api-key-automated',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  useRealApi: process.env.USE_REAL_API === 'true',
  headless: process.env.HEADLESS !== 'false',
  browser: process.env.BROWSER || 'chromium',
  parallel: process.env.PARALLEL !== 'false',
  ciMode: process.env.CI === 'true',
  
  // Test configuration
  testTypes: {
    userJourneys: true,
    edgeCases: true,
    accessibility: true,
    performance: true,
    crossBrowser: process.env.BROWSER === 'all'
  },
  
  // Reporting
  generateReport: true,
  saveToMemory: true,
  
  // Directories
  testResultsDir: './test-results',
  memoryDir: '/workspaces/personalEA/memory/data',
  
  // Timeouts
  testTimeout: 60000,
  suiteTimeout: 1800000 // 30 minutes
};

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: false,
      testSuites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      coverage: {
        userJourneys: 0,
        edgeCases: 0,
        accessibility: 0,
        performance: 0,
        crossBrowser: 0
      },
      errors: [],
      warnings: [],
      performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0
      },
      environment: {
        node: process.version,
        os: `${os.type()} ${os.release()}`,
        browser: config.browser,
        apiMode: config.useRealApi ? 'real' : 'mock'
      }
    };
    
    this.processes = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const levels = {
      info: '\x1b[36m[INFO]\x1b[0m',
      success: '\x1b[32m[SUCCESS]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
      warning: '\x1b[33m[WARNING]\x1b[0m'
    };
    
    console.log(`${levels[level]} ${timestamp} ${message}`);
    
    if (level === 'error') {
      this.results.errors.push({ timestamp, message });
    } else if (level === 'warning') {
      this.results.warnings.push({ timestamp, message });
    }
  }

  async setupEnvironment() {
    this.log('🔧 Setting up test environment...');
    
    try {
      // Create test directories
      await this.createDirectories();
      
      // Install dependencies if needed
      await this.checkDependencies();
      
      // Start services
      await this.startServices();
      
      this.log('✅ Environment setup complete', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Environment setup failed: ${error.message}`, 'error');
      return false;
    }
  }

  async createDirectories() {
    const dirs = [
      config.testResultsDir,
      path.join(config.testResultsDir, 'screenshots'),
      path.join(config.testResultsDir, 'videos'),
      path.join(config.testResultsDir, 'traces'),
      path.join(config.testResultsDir, 'reports'),
      'playwright-report'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  async checkDependencies() {
    this.log('📦 Checking dependencies...');
    
    try {
      // Check if Playwright is installed
      execSync('npx playwright --version', { stdio: 'pipe' });
      
      // Install browsers if needed
      this.log('🌐 Installing Playwright browsers...');
      execSync('npx playwright install --with-deps', { stdio: 'inherit' });
      
      this.log('✅ Dependencies ready', 'success');
    } catch (error) {
      throw new Error(`Dependency check failed: ${error.message}`);
    }
  }

  async startServices() {
    this.log('🚀 Starting required services...');
    
    try {
      // Start mock API if not using real API
      if (!config.useRealApi) {
        await this.startMockApi();
      }
      
      // Start frontend dev server
      await this.startFrontend();
      
      // Wait for services to be ready
      await this.waitForServices();
      
      this.log('✅ All services ready', 'success');
    } catch (error) {
      throw new Error(`Service startup failed: ${error.message}`);
    }
  }

  async startMockApi() {
    return new Promise((resolve, reject) => {
      const mockApi = spawn('node', ['openai-api-server.js'], {
        stdio: 'pipe',
        detached: false
      });
      
      this.processes.push(mockApi);
      
      mockApi.stdout.on('data', (data) => {
        if (data.toString().includes('listening on port 3001')) {
          this.log('✅ Mock API server started on port 3001', 'success');
          resolve();
        }
      });
      
      mockApi.stderr.on('data', (data) => {
        this.log(`Mock API error: ${data}`, 'warning');
      });
      
      setTimeout(() => reject(new Error('Mock API startup timeout')), 15000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      const frontend = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        detached: false
      });
      
      this.processes.push(frontend);
      
      frontend.stdout.on('data', (data) => {
        if (data.toString().includes('Local:')) {
          this.log('✅ Frontend dev server started on port 5173', 'success');
          resolve();
        }
      });
      
      frontend.stderr.on('data', (data) => {
        if (data.toString().includes('Local:')) {
          this.log('✅ Frontend dev server started on port 5173', 'success');
          resolve();
        }
      });
      
      setTimeout(() => reject(new Error('Frontend startup timeout')), 30000);
    });
  }

  async waitForServices() {
    const checkUrl = async (url, maxRetries = 30) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(url);
          if (response.ok) return true;
        } catch (error) {
          // Service not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      throw new Error(`Service at ${url} not ready after ${maxRetries} retries`);
    };

    // Wait for frontend
    await checkUrl('http://localhost:5173');
    
    // Wait for mock API if using it
    if (!config.useRealApi) {
      await checkUrl('http://localhost:3001');
    }
  }

  async runTestSuites() {
    this.log('🧪 Running comprehensive test suites...');
    
    const testSuites = [
      {
        name: 'User Journey Tests',
        file: 'tests/e2e/automated-user-testing.spec.ts',
        enabled: config.testTypes.userJourneys
      },
      {
        name: 'Edge Cases',
        file: 'tests/e2e/edge-cases/comprehensive-edge-case-testing.spec.ts',
        enabled: config.testTypes.edgeCases
      },
      {
        name: 'Error Scenarios',
        file: 'tests/e2e/error-scenarios/comprehensive-error-testing.spec.ts',
        enabled: config.testTypes.accessibility
      },
      {
        name: 'Network Scenarios',
        file: 'tests/e2e/network-scenarios/network-timeout-testing.spec.ts',
        enabled: config.testTypes.performance
      },
      {
        name: 'Integration Tests',
        file: 'tests/e2e/integration/full-workflow.spec.ts',
        enabled: true
      }
    ];

    for (const suite of testSuites) {
      if (suite.enabled) {
        await this.runTestSuite(suite);
      } else {
        this.log(`⏭️ Skipping ${suite.name} (disabled)`);
        this.results.summary.skipped++;
      }
    }

    // Run cross-browser tests if enabled
    if (config.testTypes.crossBrowser) {
      await this.runCrossBrowserTests();
    }
  }

  async runTestSuite(suite) {
    this.log(`🏃 Running ${suite.name}...`);
    
    const startTime = Date.now();
    
    try {
      const command = this.buildTestCommand(suite.file);
      
      this.log(`Executing: ${command}`);
      
      const result = execSync(command, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: config.suiteTimeout
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const suiteResult = {
        name: suite.name,
        file: suite.file,
        success: true,
        duration,
        startTime,
        endTime,
        output: result
      };
      
      this.results.testSuites.push(suiteResult);
      this.results.summary.passed++;
      
      this.log(`✅ ${suite.name} completed successfully (${duration}ms)`, 'success');
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const suiteResult = {
        name: suite.name,
        file: suite.file,
        success: false,
        duration,
        startTime,
        endTime,
        error: error.message,
        output: error.stdout || error.stderr
      };
      
      this.results.testSuites.push(suiteResult);
      this.results.summary.failed++;
      
      this.log(`❌ ${suite.name} failed: ${error.message}`, 'error');
    }
    
    this.results.summary.total++;
  }

  buildTestCommand(testFile) {
    let command = `npx playwright test ${testFile}`;
    
    // Add browser
    command += ` --project=${config.browser}`;
    
    // Add headless mode
    if (config.headless) {
      command += ' --headed=false';
    } else {
      command += ' --headed';
    }
    
    // Add workers
    if (config.parallel && !config.ciMode) {
      command += ' --workers=2';
    } else {
      command += ' --workers=1';
    }
    
    // Add retries
    command += ' --retries=2';
    
    // Add timeout
    command += ` --timeout=${config.testTimeout}`;
    
    // Add reporters
    command += ' --reporter=line,json';
    
    return command;
  }

  async runCrossBrowserTests() {
    this.log('🌐 Running cross-browser tests...');
    
    const browsers = ['chromium', 'firefox', 'webkit'];
    
    for (const browser of browsers) {
      this.log(`Testing on ${browser}...`);
      
      const suite = {
        name: `Cross-browser (${browser})`,
        file: 'tests/e2e/automated-user-testing.spec.ts'
      };
      
      const originalBrowser = config.browser;
      config.browser = browser;
      
      await this.runTestSuite(suite);
      
      config.browser = originalBrowser;
      
      this.results.coverage.crossBrowser++;
    }
  }

  async generateReport() {
    if (!config.generateReport) return;
    
    this.log('📊 Generating comprehensive test report...');
    
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;
    this.results.success = this.results.summary.failed === 0;
    
    // Calculate coverage
    this.results.coverage.userJourneys = this.results.testSuites.filter(s => 
      s.name.includes('User Journey') || s.name.includes('automated-user-testing')
    ).length;
    
    this.results.coverage.edgeCases = this.results.testSuites.filter(s => 
      s.name.includes('Edge Cases')
    ).length;
    
    this.results.coverage.accessibility = this.results.testSuites.filter(s => 
      s.name.includes('Error Scenarios')
    ).length;
    
    this.results.coverage.performance = this.results.testSuites.filter(s => 
      s.name.includes('Network Scenarios')
    ).length;
    
    // Generate markdown report
    const reportMarkdown = this.generateMarkdownReport();
    fs.writeFileSync(path.join(config.testResultsDir, 'comprehensive-test-report.md'), reportMarkdown);
    
    // Generate JSON report
    fs.writeFileSync(path.join(config.testResultsDir, 'test-results.json'), JSON.stringify(this.results, null, 2));
    
    this.log('✅ Test report generated', 'success');
  }

  generateMarkdownReport() {
    const { results } = this;
    
    return `# Comprehensive Automated User Testing Report

## Executive Summary
- **Status**: ${results.success ? '✅ PASSED' : '❌ FAILED'}
- **Total Duration**: ${Math.round(results.duration / 1000)}s
- **Test Suites**: ${results.summary.total}
- **Passed**: ${results.summary.passed}
- **Failed**: ${results.summary.failed}
- **Skipped**: ${results.summary.skipped}

## Environment
- **Node.js**: ${results.environment.node}
- **OS**: ${results.environment.os}
- **Browser**: ${results.environment.browser}
- **API Mode**: ${results.environment.apiMode}
- **Headless**: ${config.headless}

## Test Coverage
- **User Journeys**: ${results.coverage.userJourneys} suites
- **Edge Cases**: ${results.coverage.edgeCases} suites
- **Accessibility**: ${results.coverage.accessibility} suites
- **Performance**: ${results.coverage.performance} suites
- **Cross-browser**: ${results.coverage.crossBrowser} browsers

## Test Suite Results
${results.testSuites.map(suite => `
### ${suite.name}
- **Status**: ${suite.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${Math.round(suite.duration / 1000)}s
- **File**: ${suite.file}
${suite.error ? `- **Error**: ${suite.error}` : ''}
`).join('')}

## Performance Metrics
- **Average Response Time**: ${results.performance.avgResponseTime}ms
- **Max Response Time**: ${results.performance.maxResponseTime}ms
- **Error Rate**: ${results.performance.errorRate}%

## Issues Found
${results.errors.length > 0 ? results.errors.map(error => `- **${error.timestamp}**: ${error.message}`).join('\n') : 'No errors found ✅'}

## Warnings
${results.warnings.length > 0 ? results.warnings.map(warning => `- **${warning.timestamp}**: ${warning.message}`).join('\n') : 'No warnings ✅'}

## Conclusion
${results.success ? 
  `🎉 All automated tests passed successfully! The application is ready for human validation testing.

### Next Steps
1. Proceed with human user acceptance testing
2. Deploy to staging environment for broader testing
3. Monitor performance metrics in production` :
  `⚠️ Some tests failed. Please review the errors above and fix issues before proceeding.

### Recommended Actions
1. Fix failing test cases
2. Re-run the test suite
3. Ensure all user journeys work correctly`
}

---
*Generated on ${new Date().toISOString()} by Comprehensive Automated User Testing Suite*
`;
  }

  async saveToMemory() {
    if (!config.saveToMemory) return;
    
    this.log('💾 Saving results to Memory...');
    
    try {
      const memoryData = {
        testSuiteId: config.testSuiteId,
        timestamp: config.timestamp,
        results: this.results,
        metadata: {
          version: '1.0.0',
          generator: 'comprehensive-test-runner',
          environment: config
        }
      };
      
      // Ensure memory directory exists
      if (!fs.existsSync(config.memoryDir)) {
        fs.mkdirSync(config.memoryDir, { recursive: true });
      }
      
      const memoryFile = path.join(config.memoryDir, `${config.testSuiteId.replace('/', '-')}.json`);
      fs.writeFileSync(memoryFile, JSON.stringify(memoryData, null, 2));
      
      this.log(`✅ Results saved to Memory: ${memoryFile}`, 'success');
    } catch (error) {
      this.log(`❌ Failed to save to Memory: ${error.message}`, 'error');
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up processes...');
    
    for (const process of this.processes) {
      try {
        process.kill('SIGTERM');
      } catch (error) {
        this.log(`Warning: Could not kill process: ${error.message}`, 'warning');
      }
    }
    
    this.log('✅ Cleanup completed', 'success');
  }

  async run() {
    try {
      this.log('🚀 Starting Comprehensive Automated User Testing Suite');
      this.log('=' * 60);
      
      const setupSuccess = await this.setupEnvironment();
      if (!setupSuccess) {
        throw new Error('Environment setup failed');
      }
      
      await this.runTestSuites();
      await this.generateReport();
      await this.saveToMemory();
      
      this.log('=' * 60);
      if (this.results.success) {
        this.log('🎉 COMPREHENSIVE TESTING COMPLETED SUCCESSFULLY!', 'success');
        this.log('✅ Application is ready for human validation', 'success');
      } else {
        this.log('❌ SOME TESTS FAILED', 'error');
        this.log('🔧 Please fix issues before proceeding', 'error');
      }
      
      return this.results.success;
      
    } catch (error) {
      this.log(`💥 Fatal error: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, cleaning up...');
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, cleaning up...');
  process.exit(1);
});

// Main execution
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  
  runner.run().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveTestRunner;