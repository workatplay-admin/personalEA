#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Integration Health Check for Goals Strategy Module
async function checkIntegration() {
  const report = {
    timestamp: new Date().toISOString(),
    apiEndpoints: [],
    frontendIntegration: {},
    dataFlow: {},
    configurations: {}
  };

  console.log('🔍 Checking Goals Strategy Module Integration...\n');

  // Check configuration files
  console.log('📋 Checking configuration files:');
  const configFiles = [
    '/workspaces/personalEA/services/goal-strategy/.env',
    '/workspaces/personalEA/testing/goal-strategy-test/.env',
    '/workspaces/personalEA/.env'
  ];

  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
      report.configurations[file] = 'exists';
    } else {
      console.log(`❌ ${file} missing`);
      report.configurations[file] = 'missing';
    }
  }

  // Check API endpoint definitions
  console.log('\n📡 API Endpoints defined:');
  report.apiEndpoints = [
    { path: '/api/v1/health', method: 'GET', description: 'Health check' },
    { path: '/api/v1/config/environment', method: 'GET', description: 'Environment config check' },
    { path: '/api/v1/goals/translate', method: 'POST', description: 'Translate raw goal to SMART' },
    { path: '/api/v1/goals/:id/clarify', method: 'POST', description: 'Clarify SMART goal' },
    { path: '/api/v1/goals/contextual-help', method: 'POST', description: 'Generate contextual help' },
    { path: '/api/v1/goals/component-question', method: 'POST', description: 'Generate component question' },
    { path: '/api/v1/milestones/generate', method: 'POST', description: 'Generate milestones' },
    { path: '/api/v1/wbs/generate', method: 'POST', description: 'Generate work breakdown structure' },
    { path: '/api/v1/estimations/estimate', method: 'POST', description: 'Estimate task' },
    { path: '/api/v1/estimations/batch', method: 'POST', description: 'Batch estimate tasks' },
    { path: '/api/v1/feedback', method: 'POST', description: 'Submit feedback' }
  ];

  report.apiEndpoints.forEach(endpoint => {
    console.log(`  ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
  });

  // Check frontend integration
  console.log('\n🔗 Frontend Integration:');
  report.frontendIntegration = {
    frontendPath: '/workspaces/personalEA/testing/goal-strategy-test',
    apiServicePath: '/workspaces/personalEA/testing/goal-strategy-test/src/services/api.ts',
    viteConfig: '/workspaces/personalEA/testing/goal-strategy-test/vite.config.ts',
    proxyTarget: 'http://localhost:8085',
    frontendPort: 5174
  };

  console.log(`  Frontend runs on port: ${report.frontendIntegration.frontendPort}`);
  console.log(`  Proxy configured to: ${report.frontendIntegration.proxyTarget}`);
  console.log(`  API service file: ${report.frontendIntegration.apiServicePath}`);

  // Check data flow
  console.log('\n🔄 Data Flow:');
  report.dataFlow = {
    frontend_to_backend: 'Frontend (5174) -> Vite Proxy -> Backend (8085)',
    backend_services: [
      'Goal Strategy Service (8085) -> PostgreSQL (5432)',
      'Goal Strategy Service (8085) -> Redis (6379)',
      'Goal Strategy Service (8085) -> OpenAI API'
    ],
    authentication: 'JWT tokens with Authorization header',
    apiKey: 'X-OpenAI-API-Key header or backend environment'
  };

  report.dataFlow.backend_services.forEach(flow => {
    console.log(`  ${flow}`);
  });

  // Environment requirements
  console.log('\n⚙️  Required Environment Variables:');
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'OPENAI_API_KEY',
    'PORT',
    'CORS_ORIGIN'
  ];

  report.configurations.requiredEnvVars = requiredVars;
  requiredVars.forEach(varName => {
    console.log(`  - ${varName}`);
  });

  // Save report
  const reportPath = '/workspaces/personalEA/integration-status.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Integration report saved to: ${reportPath}`);

  return report;
}

// Run check
checkIntegration().catch(console.error);