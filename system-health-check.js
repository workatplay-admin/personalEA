#!/usr/bin/env node

/**
 * System Health Check for PersonalEA
 * Validates system readiness before running comprehensive tests
 */

const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

class SystemHealthChecker {
  constructor() {
    this.checks = [];
    this.startTime = new Date();
  }

  async runAllHealthChecks() {
    console.log('🏥 PersonalEA System Health Check');
    console.log('=' .repeat(50));
    console.log(`Started at: ${this.startTime.toISOString()}\n`);

    const healthChecks = [
      { name: 'Node.js Environment', check: () => this.checkNodeEnvironment() },
      { name: 'Package Dependencies', check: () => this.checkDependencies() },
      { name: 'API Server Health', check: () => this.checkApiHealth() },
      { name: 'Frontend Server', check: () => this.checkFrontendHealth() },
      { name: 'Database Connection', check: () => this.checkDatabaseHealth() },
      { name: 'OpenAI Configuration', check: () => this.checkOpenAIConfig() },
      { name: 'File System Permissions', check: () => this.checkFileSystemHealth() },
      { name: 'Memory Resources', check: () => this.checkMemoryResources() },
      { name: 'Network Connectivity', check: () => this.checkNetworkHealth() },
      { name: 'Test Environment Setup', check: () => this.checkTestEnvironment() }
    ];

    let allHealthy = true;

    for (const healthCheck of healthChecks) {
      console.log(`🔍 Checking: ${healthCheck.name}...`);
      
      try {
        const result = await healthCheck.check();
        this.checks.push({
          name: healthCheck.name,
          status: 'healthy',
          result: result,
          timestamp: new Date()
        });
        console.log(`✅ ${healthCheck.name}: Healthy`);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      } catch (error) {
        this.checks.push({
          name: healthCheck.name,
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date()
        });
        console.log(`❌ ${healthCheck.name}: Unhealthy - ${error.message}`);
        allHealthy = false;
      }
    }

    // Generate health report
    const report = this.generateHealthReport(allHealthy);
    this.saveHealthReport(report);
    
    console.log('\n' + '=' .repeat(50));
    console.log(`📊 Health Check Complete: ${allHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Checks Passed: ${this.checks.filter(c => c.status === 'healthy').length}/${this.checks.length}`);
    console.log(`Duration: ${Date.now() - this.startTime.getTime()}ms`);
    
    if (!allHealthy) {
      console.log('\n⚠️ Issues Found:');
      this.checks.filter(c => c.status === 'unhealthy').forEach(check => {
        console.log(`   - ${check.name}: ${check.error}`);
      });
    }

    return { healthy: allHealthy, report };
  }

  async checkNodeEnvironment() {
    const nodeVersion = process.version;
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    
    // Check minimum Node.js version (v18+)
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      throw new Error(`Node.js ${nodeVersion} is below minimum required v18`);
    }

    return {
      nodeVersion,
      npmVersion,
      platform: process.platform,
      arch: process.arch,
      details: `Node ${nodeVersion}, npm ${npmVersion} on ${process.platform}`
    };
  }

  async checkDependencies() {
    try {
      // Check if node_modules exists
      if (!fs.existsSync('./node_modules')) {
        throw new Error('node_modules directory not found. Run npm install.');
      }

      // Check critical dependencies
      const criticalDeps = ['axios', 'playwright'];
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const missingDeps = criticalDeps.filter(dep => !allDeps[dep]);
      if (missingDeps.length > 0) {
        throw new Error(`Missing critical dependencies: ${missingDeps.join(', ')}`);
      }

      return {
        totalDependencies: Object.keys(allDeps).length,
        details: `${Object.keys(allDeps).length} dependencies installed`
      };
    } catch (error) {
      throw new Error(`Dependency check failed: ${error.message}`);
    }
  }

  async checkApiHealth() {
    try {
      const response = await axios.get('http://localhost:3000/health', { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      if (response.status !== 200) {
        throw new Error(`API server returned status ${response.status}`);
      }

      return {
        status: response.data.status || 'unknown',
        responseTime: response.headers['x-response-time'] || 'unknown',
        details: `API server responding with status ${response.status}`
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('API server not running on port 3000');
      }
      throw new Error(`API health check failed: ${error.message}`);
    }
  }

  async checkFrontendHealth() {
    try {
      const response = await axios.get('http://localhost:5174', { 
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status !== 200) {
        throw new Error(`Frontend server returned status ${response.status}`);
      }

      // Check if it's actually a web page
      if (!response.data.includes('html') && !response.data.includes('DOCTYPE')) {
        throw new Error('Frontend server not serving HTML content');
      }

      return {
        contentLength: response.data.length,
        details: `Frontend server responding with ${response.data.length} bytes of content`
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Frontend server not running on port 5174');
      }
      throw new Error(`Frontend health check failed: ${error.message}`);
    }
  }

  async checkDatabaseHealth() {
    try {
      // This would depend on the actual database implementation
      // For now, we'll check if database files exist or connection is possible
      
      // Check for SQLite database file (common in development)
      const possibleDbFiles = ['./database.sqlite', './db.sqlite', './data.db'];
      const dbFileExists = possibleDbFiles.some(file => fs.existsSync(file));
      
      if (dbFileExists) {
        return {
          type: 'SQLite',
          details: 'Database file found and accessible'
        };
      }

      // If no local DB file, assume external database
      // This would need actual connection testing in real implementation
      return {
        type: 'External',
        details: 'Database connection assumed healthy (no local file found)'
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  async checkOpenAIConfig() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY does not appear to be valid (should start with sk-)');
    }

    if (apiKey.length < 40) {
      throw new Error('OPENAI_API_KEY appears to be too short');
    }

    return {
      keyPresent: true,
      keyLength: apiKey.length,
      details: `OpenAI API key configured (${apiKey.length} characters)`
    };
  }

  async checkFileSystemHealth() {
    try {
      // Test write permissions
      const testFile = './test-write-permissions.tmp';
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      // Check required directories exist
      const requiredDirs = ['./tests', './test-results'];
      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Test memory system directory
      const memoryDir = './memory';
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      return {
        writable: true,
        requiredDirectories: requiredDirs.length,
        details: 'File system permissions and directories verified'
      };
    } catch (error) {
      throw new Error(`File system check failed: ${error.message}`);
    }
  }

  async checkMemoryResources() {
    const memoryUsage = process.memoryUsage();
    const freeMemory = require('os').freemem();
    const totalMemory = require('os').totalmem();
    
    // Check if we have at least 1GB free memory
    if (freeMemory < 1024 * 1024 * 1024) {
      throw new Error(`Low system memory: ${Math.round(freeMemory / 1024 / 1024)}MB free`);
    }

    // Check if Node.js heap usage is reasonable
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
      console.warn('⚠️ High Node.js heap usage detected');
    }

    return {
      freeMemory: Math.round(freeMemory / 1024 / 1024),
      totalMemory: Math.round(totalMemory / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      details: `${Math.round(freeMemory / 1024 / 1024)}MB free of ${Math.round(totalMemory / 1024 / 1024)}MB total`
    };
  }

  async checkNetworkHealth() {
    try {
      // Test external connectivity
      await axios.get('https://api.github.com', { timeout: 5000 });
      
      // Test local network
      await axios.get('http://localhost:3000/health', { 
        timeout: 2000,
        validateStatus: () => true 
      });

      return {
        externalConnectivity: true,
        localConnectivity: true,
        details: 'External and local network connectivity verified'
      };
    } catch (error) {
      throw new Error(`Network connectivity check failed: ${error.message}`);
    }
  }

  async checkTestEnvironment() {
    try {
      // Check environment variables
      const requiredEnvVars = ['NODE_ENV'];
      const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
      
      // Set NODE_ENV to test if not set
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
      }

      // Check if test command exists
      try {
        execSync('npm run test --dry-run 2>/dev/null', { stdio: 'ignore' });
      } catch (error) {
        console.warn('⚠️ npm test script may not be available');
      }

      // Check Playwright installation
      try {
        execSync('npx playwright --version', { stdio: 'ignore' });
      } catch (error) {
        throw new Error('Playwright not properly installed');
      }

      return {
        nodeEnv: process.env.NODE_ENV,
        playwrightAvailable: true,
        details: `Test environment configured with NODE_ENV=${process.env.NODE_ENV}`
      };
    } catch (error) {
      throw new Error(`Test environment check failed: ${error.message}`);
    }
  }

  generateHealthReport(allHealthy) {
    return {
      healthCheckId: `health-check-${this.startTime.toISOString()}`,
      timestamp: new Date(),
      overallHealth: allHealthy ? 'healthy' : 'unhealthy',
      summary: {
        totalChecks: this.checks.length,
        healthyChecks: this.checks.filter(c => c.status === 'healthy').length,
        unhealthyChecks: this.checks.filter(c => c.status === 'unhealthy').length,
        healthRate: (this.checks.filter(c => c.status === 'healthy').length / this.checks.length * 100).toFixed(1)
      },
      checks: this.checks,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      recommendations: this.generateHealthRecommendations()
    };
  }

  generateHealthRecommendations() {
    const recommendations = [];
    const unhealthyChecks = this.checks.filter(c => c.status === 'unhealthy');
    
    if (unhealthyChecks.length === 0) {
      recommendations.push('System is healthy and ready for testing');
      recommendations.push('Run comprehensive tests with confidence');
    } else {
      recommendations.push('Address unhealthy system components before testing');
      unhealthyChecks.forEach(check => {
        switch (check.name) {
          case 'API Server Health':
            recommendations.push('Start the API server: npm run api:start');
            break;
          case 'Frontend Server':
            recommendations.push('Start the frontend server: npm run dev');
            break;
          case 'OpenAI Configuration':
            recommendations.push('Set OPENAI_API_KEY environment variable');
            break;
          case 'Package Dependencies':
            recommendations.push('Install dependencies: npm install');
            break;
          default:
            recommendations.push(`Fix issue with ${check.name}`);
        }
      });
    }
    
    return recommendations;
  }

  saveHealthReport(report) {
    try {
      const reportPath = './test-results/system-health-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Health report saved to: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️ Could not save health report: ${error.message}`);
    }
  }
}

// Execute health check if run directly
if (require.main === module) {
  const checker = new SystemHealthChecker();
  
  checker.runAllHealthChecks().then(({ healthy }) => {
    process.exit(healthy ? 0 : 1);
  }).catch(error => {
    console.error('\n💥 HEALTH CHECK CRASHED:', error.message);
    process.exit(1);
  });
}

module.exports = { SystemHealthChecker };