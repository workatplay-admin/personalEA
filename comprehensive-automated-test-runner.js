#!/usr/bin/env node

/**
 * Comprehensive Automated Test Runner for Goal Translation Fix Verification
 * 
 * This script runs extensive automated tests to verify the Transform to SMART Goal button
 * functionality works correctly under various conditions including:
 * - Error scenarios (invalid API keys, service down, malformed inputs)
 * - Network conditions and timeouts
 * - Edge cases and malicious input protection
 * - Cross-browser compatibility
 * - Performance under stress
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveTestRunner {
    constructor() {
        this.testResults = {
            timestamp: new Date().toISOString(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            testSuites: [],
            errors: [],
            screenshots: [],
            performance: {},
            coverage: {},
            summary: ''
        };
        
        this.testDirectory = '/workspaces/personalEA/testing/goal-strategy-test';
        this.reportDirectory = '/workspaces/personalEA/test-results';
    }

    async initialize() {
        console.log('🚀 Initializing Comprehensive Test Runner...');
        
        // Ensure test directories exist
        await this.ensureDirectories();
        
        // Start backend services for testing
        await this.startTestServices();
        
        // Install browser dependencies
        await this.installBrowserDependencies();
        
        console.log('✅ Initialization complete');
    }

    async ensureDirectories() {
        const directories = [
            this.reportDirectory,
            `${this.reportDirectory}/screenshots`,
            `${this.reportDirectory}/videos`,
            `${this.reportDirectory}/reports`,
            `${this.reportDirectory}/coverage`
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.warn(`Warning: Could not create directory ${dir}:`, error.message);
            }
        }
    }

    async startTestServices() {
        console.log('🔧 Starting test services...');
        
        // Start OpenAI API server for testing
        return new Promise((resolve, reject) => {
            const apiServer = spawn('node', ['openai-api-server.js'], {
                cwd: this.testDirectory,
                stdio: 'pipe'
            });
            
            apiServer.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`API Server: ${output}`);
                if (output.includes('Server running on port')) {
                    resolve();
                }
            });
            
            apiServer.stderr.on('data', (data) => {
                console.error(`API Server Error: ${data}`);
            });
            
            // Store process for cleanup
            this.apiServerProcess = apiServer;
            
            // Timeout after 30 seconds
            setTimeout(() => {
                resolve(); // Continue even if server doesn't start perfectly
            }, 30000);
        });
    }

    async installBrowserDependencies() {
        console.log('🌐 Installing browser dependencies...');
        
        return new Promise((resolve) => {
            const install = spawn('npx', ['playwright', 'install'], {
                cwd: this.testDirectory,
                stdio: 'pipe'
            });
            
            install.stdout.on('data', (data) => {
                console.log(`Browser Install: ${data.toString()}`);
            });
            
            install.on('close', (code) => {
                console.log(`Browser installation completed with code: ${code}`);
                resolve();
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                resolve();
            }, 300000);
        });
    }

    async runTestSuite(suiteName, testPath, options = {}) {
        console.log(`\n🧪 Running test suite: ${suiteName}`);
        console.log(`📁 Test path: ${testPath}`);
        
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const args = [
                'test',
                testPath,
                '--reporter=json',
                '--reporter=html',
                '--output-dir=' + this.reportDirectory,
                ...Object.entries(options).map(([key, value]) => `--${key}=${value}`)
            ];
            
            const testProcess = spawn('npx', ['playwright', ...args], {
                cwd: this.testDirectory,
                stdio: 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            testProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log(output);
            });
            
            testProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error(output);
            });
            
            testProcess.on('close', (code) => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                const suiteResult = {
                    name: suiteName,
                    path: testPath,
                    exitCode: code,
                    duration: duration,
                    stdout: stdout,
                    stderr: stderr,
                    timestamp: new Date().toISOString()
                };
                
                this.testResults.testSuites.push(suiteResult);
                
                if (code === 0) {
                    console.log(`✅ ${suiteName} completed successfully in ${duration}ms`);
                } else {
                    console.log(`❌ ${suiteName} failed with exit code ${code} after ${duration}ms`);
                    this.testResults.errors.push({
                        suite: suiteName,
                        error: stderr || 'Unknown error',
                        code: code
                    });
                }
                
                resolve(suiteResult);
            });
            
            // Timeout after 15 minutes per test suite
            setTimeout(() => {
                testProcess.kill('SIGTERM');
                reject(new Error(`Test suite ${suiteName} timed out after 15 minutes`));
            }, 900000);
        });
    }

    async runAllTests() {
        console.log('\n🎯 Starting comprehensive test execution...');
        
        const testSuites = [
            {
                name: 'Existing Phase 1 Tests',
                path: 'tests/e2e/phase1/goal-to-smart.spec.ts',
                options: { 'project': 'chromium' }
            },
            {
                name: 'Comprehensive Error Scenarios',
                path: 'tests/e2e/error-scenarios/comprehensive-error-testing.spec.ts',
                options: { 'project': 'chromium', 'timeout': '60000' }
            },
            {
                name: 'Network Timeout Testing',
                path: 'tests/e2e/network-scenarios/network-timeout-testing.spec.ts',
                options: { 'project': 'chromium', 'timeout': '120000' }
            },
            {
                name: 'Edge Case Testing',
                path: 'tests/e2e/edge-cases/comprehensive-edge-case-testing.spec.ts',
                options: { 'project': 'chromium', 'timeout': '90000' }
            },
            {
                name: 'Cross-Browser Error Testing',
                path: 'tests/e2e/error-scenarios/comprehensive-error-testing.spec.ts',
                options: { 'project': 'firefox' }
            },
            {
                name: 'Cross-Browser Network Testing',
                path: 'tests/e2e/network-scenarios/network-timeout-testing.spec.ts',
                options: { 'project': 'webkit' }
            },
            {
                name: 'Mobile Browser Testing',
                path: 'tests/e2e/phase1/goal-to-smart.spec.ts',
                options: { 'project': 'Mobile Chrome' }
            }
        ];
        
        for (const suite of testSuites) {
            try {
                await this.runTestSuite(suite.name, suite.path, suite.options);
                
                // Brief pause between test suites
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                console.error(`Failed to run test suite ${suite.name}:`, error.message);
                this.testResults.errors.push({
                    suite: suite.name,
                    error: error.message,
                    fatal: true
                });
            }
        }
    }

    async collectScreenshots() {
        console.log('📸 Collecting screenshots...');
        
        try {
            const screenshotDir = `${this.reportDirectory}/screenshots`;
            const files = await fs.readdir(screenshotDir);
            
            this.testResults.screenshots = files
                .filter(file => file.endsWith('.png'))
                .map(file => ({
                    filename: file,
                    path: path.join(screenshotDir, file),
                    timestamp: new Date().toISOString()
                }));
                
            console.log(`📸 Collected ${this.testResults.screenshots.length} screenshots`);
        } catch (error) {
            console.warn('Warning: Could not collect screenshots:', error.message);
        }
    }

    async generatePerformanceReport() {
        console.log('📊 Generating performance report...');
        
        this.testResults.performance = {
            totalDuration: this.testResults.testSuites.reduce((sum, suite) => sum + suite.duration, 0),
            averageDuration: this.testResults.testSuites.length > 0 
                ? this.testResults.testSuites.reduce((sum, suite) => sum + suite.duration, 0) / this.testResults.testSuites.length 
                : 0,
            slowestSuite: this.testResults.testSuites.reduce((slowest, suite) => 
                suite.duration > (slowest?.duration || 0) ? suite : slowest, null),
            fastestSuite: this.testResults.testSuites.reduce((fastest, suite) => 
                suite.duration < (fastest?.duration || Infinity) ? suite : fastest, null)
        };
        
        console.log(`📊 Total test duration: ${this.testResults.performance.totalDuration}ms`);
        console.log(`📊 Average suite duration: ${this.testResults.performance.averageDuration.toFixed(2)}ms`);
    }

    async parseTestResults() {
        console.log('📋 Parsing test results...');
        
        try {
            // Look for Playwright JSON results
            const resultsPath = path.join(this.reportDirectory, 'results.json');
            
            try {
                const resultsData = await fs.readFile(resultsPath, 'utf8');
                const parsedResults = JSON.parse(resultsData);
                
                this.testResults.totalTests = parsedResults.stats?.total || 0;
                this.testResults.passedTests = parsedResults.stats?.passed || 0;
                this.testResults.failedTests = parsedResults.stats?.failed || 0;
                this.testResults.skippedTests = parsedResults.stats?.skipped || 0;
            } catch (error) {
                console.warn('Could not parse detailed test results:', error.message);
                
                // Fallback: estimate from test suites
                this.testResults.totalTests = this.testResults.testSuites.length;
                this.testResults.passedTests = this.testResults.testSuites.filter(s => s.exitCode === 0).length;
                this.testResults.failedTests = this.testResults.testSuites.filter(s => s.exitCode !== 0).length;
            }
        } catch (error) {
            console.warn('Warning: Could not parse test results:', error.message);
        }
    }

    generateSummary() {
        const passRate = this.testResults.totalTests > 0 
            ? ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(2)
            : '0';
            
        this.testResults.summary = `
🎯 COMPREHENSIVE TEST EXECUTION SUMMARY
========================================

📊 Overall Results:
- Total Tests: ${this.testResults.totalTests}
- Passed: ${this.testResults.passedTests} (${passRate}%)
- Failed: ${this.testResults.failedTests}
- Skipped: ${this.testResults.skippedTests}

⏱️ Performance:
- Total Duration: ${(this.testResults.performance.totalDuration / 1000 / 60).toFixed(2)} minutes
- Average Suite Duration: ${(this.testResults.performance.averageDuration / 1000).toFixed(2)} seconds
- Slowest Suite: ${this.testResults.performance.slowestSuite?.name || 'N/A'}
- Fastest Suite: ${this.testResults.performance.fastestSuite?.name || 'N/A'}

🧪 Test Suites Executed:
${this.testResults.testSuites.map(suite => 
    `- ${suite.name}: ${suite.exitCode === 0 ? '✅ PASSED' : '❌ FAILED'} (${(suite.duration / 1000).toFixed(2)}s)`
).join('\n')}

${this.testResults.errors.length > 0 ? `
❌ Errors Encountered:
${this.testResults.errors.map(error => 
    `- ${error.suite}: ${error.error.substring(0, 100)}...`
).join('\n')}
` : '✅ No critical errors encountered'}

📸 Screenshots Captured: ${this.testResults.screenshots.length}

🎯 Transform to SMART Goal Button Testing Status:
${this.testResults.failedTests === 0 
    ? '✅ All tests passed - Goal translation fix is working correctly'
    : '⚠️ Some tests failed - Review errors and fix issues'
}
`;
    }

    async saveResults() {
        console.log('💾 Saving comprehensive test results...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = path.join(this.reportDirectory, `comprehensive-test-results-${timestamp}.json`);
        const summaryFile = path.join(this.reportDirectory, `test-summary-${timestamp}.txt`);
        
        try {
            await fs.writeFile(resultsFile, JSON.stringify(this.testResults, null, 2));
            await fs.writeFile(summaryFile, this.testResults.summary);
            
            console.log(`💾 Results saved to: ${resultsFile}`);
            console.log(`💾 Summary saved to: ${summaryFile}`);
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up test services...');
        
        if (this.apiServerProcess) {
            this.apiServerProcess.kill('SIGTERM');
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.runAllTests();
            await this.collectScreenshots();
            await this.parseTestResults();
            await this.generatePerformanceReport();
            this.generateSummary();
            await this.saveResults();
            
            console.log('\n' + this.testResults.summary);
            
            // Return appropriate exit code
            return this.testResults.failedTests === 0 ? 0 : 1;
            
        } catch (error) {
            console.error('💥 Fatal error during test execution:', error);
            return 1;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the comprehensive test runner
if (require.main === module) {
    const runner = new ComprehensiveTestRunner();
    runner.run().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveTestRunner;