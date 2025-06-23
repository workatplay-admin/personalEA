#!/usr/bin/env node

/**
 * Phase 2 Test Runner for PersonalEA LLM-First Testing Framework
 * Usage: node runPhase2Tests.js [test-suite] [--api-key YOUR_KEY]
 */

import { PersonaTestRunner } from './PersonaTestRunner.ts';
import { testSuiteConfigs, quickTestScenarios } from './TestScenarios.ts';
import fs from 'fs';
import path from 'path';

class Phase2TestRunner {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.personalEAUrl = process.env.PERSONALEA_API_URL || 'http://localhost:3000';
    this.outputDir = './test-results';
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async run() {
    const args = process.argv.slice(2);
    const testSuite = args[0] || 'quick';
    
    // Check for API key in arguments
    const apiKeyIndex = args.indexOf('--api-key');
    if (apiKeyIndex !== -1 && args[apiKeyIndex + 1]) {
      this.apiKey = args[apiKeyIndex + 1];
    }

    if (!this.apiKey) {
      console.error('❌ OpenAI API key required. Set OPENAI_API_KEY environment variable or use --api-key flag');
      process.exit(1);
    }

    console.log('🧪 PersonalEA Phase 2: LLM-First Testing Framework');
    console.log('==================================================');
    console.log(`🎯 Test Suite: ${testSuite}`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
    console.log(`🌐 PersonalEA API: ${this.personalEAUrl}`);
    console.log('');

    try {
      // Verify PersonalEA is running
      await this.checkPersonalEAStatus();
      
      // Run the selected test suite
      await this.runTestSuite(testSuite);
      
    } catch (error) {
      console.error('❌ Test run failed:', error.message);
      process.exit(1);
    }
  }

  async checkPersonalEAStatus() {
    console.log('🔍 Checking PersonalEA system status...');
    
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(`${this.personalEAUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ PersonalEA system is running');
        console.log(`   Service: ${response.data.service || 'Unknown'}`);
        console.log(`   Status: ${response.data.status || 'Unknown'}`);
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`PersonalEA not accessible at ${this.personalEAUrl}: ${error.message}`);
    }
    
    console.log('');
  }

  async runTestSuite(suiteName) {
    const config = testSuiteConfigs[suiteName];
    
    if (!config) {
      console.error(`❌ Unknown test suite: ${suiteName}`);
      console.log('Available test suites:');
      Object.keys(testSuiteConfigs).forEach(name => {
        console.log(`  - ${name}: ${testSuiteConfigs[name].description}`);
      });
      return;
    }

    console.log(`🚀 Running: ${config.name}`);
    console.log(`📋 Description: ${config.description}`);
    console.log(`🎭 Scenarios: ${config.scenarios.length}`);
    console.log('');

    const testRunner = new PersonaTestRunner(this.apiKey, this.personalEAUrl);
    
    try {
      const results = await testRunner.runTestSuite(config.scenarios);
      
      // Save results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsFile = path.join(this.outputDir, `phase2-results-${suiteName}-${timestamp}.json`);
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      
      // Generate report
      this.generateReport(results, suiteName);
      
      console.log(`💾 Results saved: ${resultsFile}`);
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
      throw error;
    }
  }

  generateReport(results, suiteName) {
    console.log('');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const { aggregateMetrics, scenarios } = results;
    
    console.log(`Overall Performance:`);
    console.log(`  Pass Rate: ${aggregateMetrics.passRate.toFixed(1)}%`);
    console.log(`  Average Goal Improvement: ${aggregateMetrics.averageGoalImprovement.toFixed(2)}`);
    console.log(`  Average User Satisfaction: ${aggregateMetrics.averageUserSatisfaction.toFixed(2)}`);
    console.log(`  Total Conversations: ${aggregateMetrics.totalConversations}`);
    console.log('');
    
    console.log('Individual Scenario Results:');
    scenarios.forEach(scenario => {
      const status = scenario.passed ? '✅' : '❌';
      const quality = scenario.metrics ? scenario.metrics.goalImprovement.toFixed(2) : 'N/A';
      console.log(`  ${status} ${scenario.scenarioId}: Quality ${quality}`);
      
      if (scenario.deviations && scenario.deviations.length > 0) {
        scenario.deviations.forEach(deviation => {
          console.log(`     ⚠️  ${deviation}`);
        });
      }
    });
    
    console.log('');
    
    // Quality analysis
    const highQuality = scenarios.filter(s => s.metrics && s.metrics.goalImprovement >= 0.8);
    const lowQuality = scenarios.filter(s => s.metrics && s.metrics.goalImprovement < 0.5);
    
    if (highQuality.length > 0) {
      console.log('🌟 High Quality Conversations:');
      highQuality.forEach(s => {
        console.log(`  - ${s.scenarioId}: ${s.metrics.goalImprovement.toFixed(2)} quality`);
      });
      console.log('');
    }
    
    if (lowQuality.length > 0) {
      console.log('⚠️  Low Quality Conversations:');
      lowQuality.forEach(s => {
        console.log(`  - ${s.scenarioId}: ${s.metrics.goalImprovement.toFixed(2)} quality`);
        if (s.deviations) {
          s.deviations.slice(0, 2).forEach(dev => console.log(`    ${dev}`));
        }
      });
      console.log('');
    }
    
    // Recommendations
    console.log('💡 Key Insights:');
    if (results.insights) {
      results.insights.systemRecommendations?.slice(0, 3).forEach(rec => {
        console.log(`  - ${rec}`);
      });
    } else {
      console.log('  - Review individual scenario details for specific improvements');
      console.log('  - Focus on scenarios with quality scores below 0.6');
      console.log('  - Analyze conversation patterns in high-performing scenarios');
    }
    
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('  1. Review detailed results in the JSON output file');
    console.log('  2. Focus on improving low-quality conversation patterns');
    console.log('  3. Run specific test suites to validate improvements');
    console.log('  4. Consider adjusting quality thresholds based on results');
    
    // System readiness assessment
    console.log('');
    this.assessSystemReadiness(aggregateMetrics, scenarios);
  }

  assessSystemReadiness(aggregateMetrics, scenarios) {
    console.log('🏁 SYSTEM READINESS ASSESSMENT');
    console.log('===============================');
    
    const passRate = aggregateMetrics.passRate;
    const avgQuality = aggregateMetrics.averageGoalImprovement;
    const avgSatisfaction = aggregateMetrics.averageUserSatisfaction;
    
    let readinessLevel = 'Not Ready';
    let readinessColor = '🔴';
    
    if (passRate >= 80 && avgQuality >= 0.7 && avgSatisfaction >= 0.7) {
      readinessLevel = 'Production Ready';
      readinessColor = '🟢';
    } else if (passRate >= 60 && avgQuality >= 0.6 && avgSatisfaction >= 0.6) {
      readinessLevel = 'Beta Ready';
      readinessColor = '🟡';
    } else if (passRate >= 40 && avgQuality >= 0.5) {
      readinessLevel = 'Alpha Ready';
      readinessColor = '🟠';
    }
    
    console.log(`${readinessColor} System Status: ${readinessLevel}`);
    console.log('');
    
    if (readinessLevel === 'Production Ready') {
      console.log('🎉 Congratulations! PersonalEA has achieved production-ready quality.');
      console.log('   The system consistently delivers high-quality goal refinement conversations.');
      console.log('   Ready for real user testing and deployment.');
    } else {
      console.log('🔧 System needs improvement in the following areas:');
      if (passRate < 80) console.log(`   - Pass rate: ${passRate.toFixed(1)}% (target: 80%+)`);
      if (avgQuality < 0.7) console.log(`   - Goal improvement: ${avgQuality.toFixed(2)} (target: 0.7+)`);
      if (avgSatisfaction < 0.7) console.log(`   - User satisfaction: ${avgSatisfaction.toFixed(2)} (target: 0.7+)`);
    }
  }
}

// CLI Usage
function showUsage() {
  console.log('PersonalEA Phase 2 Test Runner');
  console.log('===============================');
  console.log('');
  console.log('Usage: node runPhase2Tests.js [test-suite] [--api-key YOUR_KEY]');
  console.log('');
  console.log('Test Suites:');
  Object.entries(testSuiteConfigs).forEach(([name, config]) => {
    console.log(`  ${name.padEnd(12)} - ${config.description}`);
  });
  console.log('');
  console.log('Examples:');
  console.log('  node runPhase2Tests.js quick');
  console.log('  node runPhase2Tests.js full --api-key sk-...');
  console.log('  OPENAI_API_KEY=sk-... node runPhase2Tests.js collaborative');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  const runner = new Phase2TestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}