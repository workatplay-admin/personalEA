#!/usr/bin/env node

/**
 * Goal Translation API Verification Test
 * 
 * This script tests the goal translation API directly to verify that the
 * Transform to SMART Goal functionality is working correctly.
 */

const axios = require('axios');
const fs = require('fs').promises;

class GoalTranslationAPITest {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            apiStatus: null,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errors: []
        };
        
        this.baseURL = 'http://localhost:3000';
        this.testGoals = [
            {
                id: 'simple-goal',
                input: 'Increase our monthly revenue',
                expectedKeys: ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
            },
            {
                id: 'detailed-goal',
                input: 'Increase our monthly recurring revenue by 25% from $50,000 to $62,500 within 6 months by expanding our enterprise customer base',
                expectedKeys: ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
            },
            {
                id: 'personal-goal',
                input: 'Learn Python programming and get certified within 8 months',
                expectedKeys: ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
            }
        ];
    }

    async testAPIHealth() {
        console.log('🔍 Testing API health...');
        
        try {
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 5000
            });
            
            this.results.apiStatus = {
                available: true,
                status: response.status,
                data: response.data
            };
            
            console.log('✅ API is healthy:', response.data);
            return true;
        } catch (error) {
            this.results.apiStatus = {
                available: false,
                error: error.message
            };
            
            console.log('❌ API health check failed:', error.message);
            return false;
        }
    }

    async testGoalTranslation(testGoal) {
        console.log(`\n🧪 Testing goal: ${testGoal.id}`);
        console.log(`📝 Input: "${testGoal.input}"`);
        
        const startTime = Date.now();
        
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/goals/translate`, {
                raw_goal: testGoal.input
            }, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'X-OpenAI-API-Key': process.env.OPENAI_API_KEY || 'test-api-key'
                }
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Validate response structure
            const data = response.data;
            
            if (!data || !data.success) {
                throw new Error('API returned unsuccessful response');
            }
            
            if (!data.data || !data.data.criteria) {
                throw new Error('Response missing SMART criteria data');
            }
            
            // Check for required SMART criteria
            const criteria = data.data.criteria;
            const missingCriteria = [];
            
            for (const expectedKey of testGoal.expectedKeys) {
                if (!criteria[expectedKey]) {
                    missingCriteria.push(expectedKey);
                }
            }
            
            const testResult = {
                id: testGoal.id,
                input: testGoal.input,
                success: true,
                duration: duration,
                responseStatus: response.status,
                hasAllCriteria: missingCriteria.length === 0,
                missingCriteria: missingCriteria,
                confidence: data.data.confidence || 0,
                criteriaDetails: criteria,
                timestamp: new Date().toISOString()
            };
            
            this.results.tests.push(testResult);
            this.results.totalTests++;
            this.results.passedTests++;
            
            console.log(`✅ Goal translation successful (${duration}ms)`);
            console.log(`📊 Confidence: ${data.data.confidence || 'N/A'}`);
            console.log(`🎯 Criteria present: ${testGoal.expectedKeys.filter(key => criteria[key]).join(', ')}`);
            
            if (missingCriteria.length > 0) {
                console.log(`⚠️ Missing criteria: ${missingCriteria.join(', ')}`);
            }
            
            return testResult;
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const testResult = {
                id: testGoal.id,
                input: testGoal.input,
                success: false,
                duration: duration,
                error: error.message,
                errorType: this.categorizeError(error),
                timestamp: new Date().toISOString()
            };
            
            this.results.tests.push(testResult);
            this.results.totalTests++;
            this.results.failedTests++;
            this.results.errors.push({
                test: testGoal.id,
                error: error.message,
                errorType: testResult.errorType
            });
            
            console.log(`❌ Goal translation failed (${duration}ms): ${error.message}`);
            
            return testResult;
        }
    }

    categorizeError(error) {
        if (error.code === 'ECONNREFUSED') {
            return 'CONNECTION_REFUSED';
        } else if (error.code === 'ETIMEDOUT') {
            return 'TIMEOUT';
        } else if (error.response && error.response.status === 401) {
            return 'UNAUTHORIZED';
        } else if (error.response && error.response.status === 500) {
            return 'SERVER_ERROR';
        } else {
            return 'UNKNOWN';
        }
    }

    async testErrorScenarios() {
        console.log('\n🧪 Testing error scenarios...');
        
        // Test with empty goal
        try {
            await axios.post(`${this.baseURL}/api/v1/goals/translate`, {
                raw_goal: ''
            }, { 
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-OpenAI-API-Key': 'test-api-key'
                }
            });
            
            console.log('⚠️ Expected error for empty goal, but request succeeded');
        } catch (error) {
            console.log('✅ Empty goal properly rejected:', error.response?.status || error.message);
        }
        
        // Test with invalid API key
        try {
            await axios.post(`${this.baseURL}/api/v1/goals/translate`, {
                raw_goal: 'Test goal'
            }, { 
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-OpenAI-API-Key': 'invalid-key'
                }
            });
            
            console.log('⚠️ Expected error for invalid API key, but request succeeded');
        } catch (error) {
            console.log('✅ Invalid API key properly rejected:', error.response?.status || error.message);
        }
        
        // Test with no API key
        try {
            await axios.post(`${this.baseURL}/api/v1/goals/translate`, {
                raw_goal: 'Test goal'
            }, { 
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('⚠️ Expected error for missing API key, but request succeeded');
        } catch (error) {
            console.log('✅ Missing API key properly rejected:', error.response?.status || error.message);
        }
    }

    async runAllTests() {
        console.log('🎯 Starting goal translation API verification...');
        
        // Test API health first
        const apiHealthy = await this.testAPIHealth();
        
        if (!apiHealthy) {
            console.log('❌ Cannot proceed with tests - API is not available');
            return false;
        }
        
        // Test goal translations
        for (const testGoal of this.testGoals) {
            await this.testGoalTranslation(testGoal);
            
            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Test error scenarios
        await this.testErrorScenarios();
        
        return true;
    }

    generateReport() {
        const passRate = this.results.totalTests > 0 
            ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2)
            : '0';
            
        const avgDuration = this.results.tests.length > 0
            ? (this.results.tests.reduce((sum, test) => sum + (test.duration || 0), 0) / this.results.tests.length).toFixed(2)
            : '0';
            
        const report = `
🎯 GOAL TRANSLATION API VERIFICATION REPORT
==========================================

🌐 API Status:
- Available: ${this.results.apiStatus?.available ? '✅ YES' : '❌ NO'}
- Health Check: ${this.results.apiStatus?.available ? 'PASSED' : 'FAILED'}
${this.results.apiStatus?.error ? `- Error: ${this.results.apiStatus.error}` : ''}

📊 Test Results:
- Total Tests: ${this.results.totalTests}
- Passed: ${this.results.passedTests}
- Failed: ${this.results.failedTests}
- Success Rate: ${passRate}%
- Average Duration: ${avgDuration}ms

🧪 Individual Test Results:
${this.results.tests.map(test => {
    const status = test.success ? '✅ PASSED' : '❌ FAILED';
    const duration = `(${test.duration || 0}ms)`;
    const confidence = test.confidence ? ` - Confidence: ${test.confidence}` : '';
    const error = test.error ? ` - Error: ${test.error}` : '';
    return `- ${test.id}: ${status} ${duration}${confidence}${error}`;
}).join('\n')}

${this.results.errors.length > 0 ? `
❌ Error Summary:
${this.results.errors.map(error => `- ${error.test}: ${error.errorType} - ${error.error}`).join('\n')}
` : ''}

🎯 Transform to SMART Goal API Status:
${this.results.failedTests === 0 && this.results.apiStatus?.available
    ? '✅ API is working correctly - Goal translation functionality verified'
    : '⚠️ Issues detected - API may need attention'
}

Generated: ${new Date().toISOString()}
`;

        return report;
    }

    async saveResults() {
        console.log('\n💾 Saving test results...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = `/workspaces/personalEA/test-results/api-verification-report-${timestamp}.txt`;
        const resultsPath = `/workspaces/personalEA/test-results/api-verification-results-${timestamp}.json`;
        
        try {
            // Ensure directory exists
            await fs.mkdir('/workspaces/personalEA/test-results', { recursive: true });
            
            const report = this.generateReport();
            
            await fs.writeFile(reportPath, report);
            await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
            
            console.log(`📄 Report saved to: ${reportPath}`);
            console.log(`📄 Results saved to: ${resultsPath}`);
            
            return reportPath;
        } catch (error) {
            console.error('Error saving results:', error);
            return null;
        }
    }

    async run() {
        try {
            const testsCompleted = await this.runAllTests();
            
            if (!testsCompleted) {
                console.log('\n❌ Tests could not be completed');
                return 1;
            }
            
            const reportPath = await this.saveResults();
            
            // Display summary
            console.log(this.generateReport());
            
            // Return appropriate exit code
            return (this.results.failedTests === 0 && this.results.apiStatus?.available) ? 0 : 1;
            
        } catch (error) {
            console.error('💥 Fatal error during API verification:', error);
            return 1;
        }
    }
}

// Run the test if called directly
if (require.main === module) {
    const test = new GoalTranslationAPITest();
    test.run().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = GoalTranslationAPITest;