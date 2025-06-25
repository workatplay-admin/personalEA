#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  services: {
    backend: {
      name: 'Goal Strategy Backend API',
      port: 3001,
      healthEndpoint: '/api/health',
      processName: 'node.*goal-strategy'
    },
    frontend: {
      name: 'Goal Strategy Test Frontend',
      port: 5173,
      healthEndpoint: '/',
      processName: 'vite'
    },
    openaiProxy: {
      name: 'OpenAI API Proxy',
      port: 3002,
      healthEndpoint: '/api/test',
      processName: 'node.*openai-api-server'
    }
  },
  checkInterval: 5000, // 5 seconds
  memoryPath: '/workspaces/personalEA/memory/data/entries.json',
  swarmId: 'swarm-testing-centralized-1750818479518'
};

// Health check results
let healthStatus = {
  timestamp: new Date().toISOString(),
  services: {},
  overall: 'unknown'
};

// HTTP health check
async function checkHttpHealth(serviceName, port, endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port,
      path: endpoint,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      const isHealthy = res.statusCode >= 200 && res.statusCode < 400;
      resolve({
        healthy: isHealthy,
        statusCode: res.statusCode,
        message: `HTTP ${res.statusCode}`
      });
    });

    req.on('error', (error) => {
      resolve({
        healthy: false,
        error: error.message,
        message: `Connection failed: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        healthy: false,
        error: 'timeout',
        message: 'Request timeout'
      });
    });

    req.end();
  });
}

// Process check
async function checkProcess(processName) {
  return new Promise((resolve) => {
    exec(`ps aux | grep -E "${processName}" | grep -v grep`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({
          running: false,
          message: 'Process not found'
        });
      } else {
        const lines = stdout.trim().split('\n');
        resolve({
          running: true,
          count: lines.length,
          message: `${lines.length} process(es) running`
        });
      }
    });
  });
}

// Port check
async function checkPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -i :${port} | grep LISTEN`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({
          listening: false,
          message: `Port ${port} not listening`
        });
      } else {
        resolve({
          listening: true,
          message: `Port ${port} is listening`
        });
      }
    });
  });
}

// Perform all health checks for a service
async function checkServiceHealth(serviceName, config) {
  const health = {
    name: config.name,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // HTTP health check
  const httpHealth = await checkHttpHealth(serviceName, config.port, config.healthEndpoint);
  health.checks.http = httpHealth;

  // Process check
  const processHealth = await checkProcess(config.processName);
  health.checks.process = processHealth;

  // Port check
  const portHealth = await checkPort(config.port);
  health.checks.port = portHealth;

  // Overall health
  health.healthy = httpHealth.healthy && processHealth.running && portHealth.listening;
  health.status = health.healthy ? 'healthy' : 'unhealthy';
  
  return health;
}

// Save results to Memory
async function saveToMemory(status) {
  try {
    const entries = JSON.parse(fs.readFileSync(CONFIG.memoryPath, 'utf8'));
    
    const monitorEntry = {
      id: 'entry_monitor_health_' + Date.now(),
      key: `${CONFIG.swarmId}/monitor-agent/health-status`,
      value: {
        step: 'Health Check',
        timestamp: status.timestamp,
        healthStatus: status.services,
        overall: status.overall,
        status: 'monitoring',
        activeSvcs: Object.values(status.services).filter(s => s.healthy).length,
        totalSvcs: Object.keys(status.services).length
      },
      type: 'health_check',
      namespace: CONFIG.swarmId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    entries.push(monitorEntry);
    fs.writeFileSync(CONFIG.memoryPath, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('Failed to save to memory:', error.message);
  }
}

// Main monitoring loop
async function monitor() {
  console.log(`\n=== Health Monitor Started at ${new Date().toISOString()} ===`);
  console.log(`Monitoring interval: ${CONFIG.checkInterval}ms`);
  console.log(`Memory namespace: ${CONFIG.swarmId}\n`);

  setInterval(async () => {
    const status = {
      timestamp: new Date().toISOString(),
      services: {},
      overall: 'healthy'
    };

    // Check each service
    for (const [serviceName, config] of Object.entries(CONFIG.services)) {
      const health = await checkServiceHealth(serviceName, config);
      status.services[serviceName] = health;
      
      if (!health.healthy) {
        status.overall = 'unhealthy';
      }
    }

    // Display results
    console.log(`\n[${status.timestamp}] Health Check Results:`);
    console.log('─'.repeat(60));
    
    for (const [serviceName, health] of Object.entries(status.services)) {
      const statusIcon = health.healthy ? '✓' : '✗';
      const statusColor = health.healthy ? '\x1b[32m' : '\x1b[31m';
      console.log(`${statusColor}${statusIcon} ${health.name}\x1b[0m`);
      console.log(`  HTTP: ${health.checks.http.message}`);
      console.log(`  Process: ${health.checks.process.message}`);
      console.log(`  Port: ${health.checks.port.message}`);
    }
    
    console.log('─'.repeat(60));
    console.log(`Overall Status: ${status.overall.toUpperCase()}`);

    // Save to memory
    await saveToMemory(status);
    
    // Update global status
    healthStatus = status;
  }, CONFIG.checkInterval);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down health monitor...');
  process.exit(0);
});

// API endpoint for external health checks
function startHealthAPI() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthStatus, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(8080, () => {
    console.log('Health Monitor API listening on http://localhost:8080/health');
  });
}

// Check for other agents' reports in Memory
async function checkOtherAgents() {
  try {
    const entries = JSON.parse(fs.readFileSync(CONFIG.memoryPath, 'utf8'));
    const swarmEntries = entries.filter(e => e.key && e.key.startsWith(CONFIG.swarmId));
    
    console.log(`\nFound ${swarmEntries.length} entries for this swarm:`);
    swarmEntries.forEach(entry => {
      if (entry.key.includes('service-url') || entry.key.includes('started')) {
        console.log(`- ${entry.key}: ${JSON.stringify(entry.value)}`);
      }
    });
  } catch (error) {
    console.error('Failed to check other agents:', error.message);
  }
}

// Start monitoring
async function start() {
  console.log('Health Monitor Agent for Testing Environment');
  console.log('==========================================');
  
  // Check for other agents first
  await checkOtherAgents();
  
  // Start health API
  startHealthAPI();
  
  // Start monitoring
  monitor();
}

// Run if called directly
if (require.main === module) {
  start();
}

module.exports = {
  checkServiceHealth,
  checkHttpHealth,
  checkProcess,
  checkPort,
  CONFIG
};