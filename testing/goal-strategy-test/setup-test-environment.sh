#!/bin/bash

# Enhanced Test Environment Setup Script for Browser-Based Testing
# Optimized for Codespaces and CI environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Test Environment Setup for Browser Testing${NC}"
echo "============================================="

# Detect environment
detect_environment() {
    if [ -n "$CODESPACES" ]; then
        echo -e "${YELLOW}🔍 Running in GitHub Codespaces${NC}"
        export ENVIRONMENT="codespaces"
        export DISPLAY=:99
        export PLAYWRIGHT_BROWSERS_PATH=/usr/bin
    elif [ -n "$CI" ]; then
        echo -e "${YELLOW}🔍 Running in CI environment${NC}"
        export ENVIRONMENT="ci"
        export PLAYWRIGHT_BROWSERS_PATH=/usr/bin
    else
        echo -e "${YELLOW}🔍 Running in local environment${NC}"
        export ENVIRONMENT="local"
    fi
}

# Install system dependencies for browser testing
install_system_deps() {
    echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
    
    if [ "$ENVIRONMENT" = "codespaces" ] || [ "$ENVIRONMENT" = "ci" ]; then
        # Update package lists
        sudo apt-get update -qq
        
        # Install dependencies for browsers
        sudo apt-get install -y \
            libnss3 \
            libatk-bridge2.0-0 \
            libdrm2 \
            libxcomposite1 \
            libxdamage1 \
            libxfixes3 \
            libxrandr2 \
            libgbm1 \
            libxkbcommon0 \
            libxss1 \
            libasound2 \
            libatspi2.0-0 \
            libgtk-3-0 \
            xvfb \
            fonts-liberation \
            libappindicator3-1 \
            libnss3-tools \
            libatk1.0-0 \
            libcups2 \
            libdbus-1-3 \
            libglib2.0-0 \
            libnspr4 \
            libx11-xcb1 \
            libxcb1 \
            libxcursor1 \
            libxi6 \
            libxtst6 \
            lsb-release \
            wget \
            xdg-utils
        
        # Install additional fonts for consistent rendering
        sudo apt-get install -y \
            fonts-noto-color-emoji \
            fonts-noto-cjk
        
        echo -e "${GREEN}✅ System dependencies installed${NC}"
    fi
}

# Setup virtual display for headless environments
setup_virtual_display() {
    if [ "$ENVIRONMENT" = "codespaces" ] || [ "$ENVIRONMENT" = "ci" ]; then
        echo -e "${YELLOW}🖥️ Setting up virtual display...${NC}"
        
        # Kill any existing Xvfb processes
        pkill -f Xvfb || true
        
        # Start Xvfb on display :99
        Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
        export DISPLAY=:99
        
        # Wait for Xvfb to start
        sleep 2
        
        # Verify Xvfb is running
        if pgrep -f Xvfb > /dev/null; then
            echo -e "${GREEN}✅ Virtual display started on DISPLAY=:99${NC}"
        else
            echo -e "${RED}❌ Failed to start virtual display${NC}"
            exit 1
        fi
    fi
}

# Install Node dependencies
install_node_deps() {
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    
    # Install dependencies
    npm ci --prefer-offline --no-audit
    
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
}

# Install and configure Playwright
setup_playwright() {
    echo -e "${YELLOW}🎭 Setting up Playwright...${NC}"
    
    # Install Playwright browsers with dependencies
    if [ "$ENVIRONMENT" = "codespaces" ] || [ "$ENVIRONMENT" = "ci" ]; then
        # Use system-provided browsers in CI/Codespaces
        npx playwright install-deps
        npx playwright install chromium firefox webkit
    else
        # Full installation for local development
        npx playwright install --with-deps chromium firefox webkit
    fi
    
    # Verify installation
    echo "Verifying Playwright installation..."
    npx playwright --version
    
    echo -e "${GREEN}✅ Playwright setup complete${NC}"
}

# Configure browser launch options for different environments
create_browser_config() {
    echo -e "${YELLOW}⚙️ Creating browser configuration...${NC}"
    
    cat > test-browser-config.json << EOF
{
  "chromium": {
    "headless": ${HEADLESS:-true},
    "args": [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process"
    ]
  },
  "firefox": {
    "headless": ${HEADLESS:-true},
    "firefoxUserPrefs": {
      "ui.systemUsesDarkTheme": 0,
      "media.navigator.streams.fake": true,
      "media.navigator.permission.disabled": true
    }
  },
  "webkit": {
    "headless": ${HEADLESS:-true}
  },
  "viewport": {
    "width": 1280,
    "height": 720
  },
  "deviceScaleFactor": 1,
  "isMobile": false,
  "hasTouch": false,
  "timeout": 30000,
  "locale": "en-US",
  "timezoneId": "America/New_York",
  "permissions": [],
  "geolocation": null,
  "colorScheme": "light",
  "reducedMotion": "no-preference",
  "forcedColors": "none"
}
EOF
    
    echo -e "${GREEN}✅ Browser configuration created${NC}"
}

# Create test environment validation script
create_validation_script() {
    echo -e "${YELLOW}🔍 Creating environment validation script...${NC}"
    
    cat > validate-test-env.js << 'EOF'
const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');

async function validateBrowser(browserType, name) {
  console.log(`\nValidating ${name}...`);
  
  try {
    const browser = await browserType.launch({
      headless: true,
      args: name === 'Chromium' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('data:text/html,<h1>Test Page</h1>');
    const title = await page.textContent('h1');
    
    if (title === 'Test Page') {
      console.log(`✅ ${name} is working correctly`);
    } else {
      console.log(`❌ ${name} failed validation`);
      return false;
    }
    
    await browser.close();
    return true;
  } catch (error) {
    console.error(`❌ ${name} error:`, error.message);
    return false;
  }
}

async function validateEnvironment() {
  console.log('🔍 Validating test environment...\n');
  
  const results = {
    environment: process.env.ENVIRONMENT || 'unknown',
    display: process.env.DISPLAY || 'not set',
    browsers: {
      chromium: false,
      firefox: false,
      webkit: false
    },
    timestamp: new Date().toISOString()
  };
  
  // Validate each browser
  results.browsers.chromium = await validateBrowser(chromium, 'Chromium');
  results.browsers.firefox = await validateBrowser(firefox, 'Firefox');
  results.browsers.webkit = await validateBrowser(webkit, 'WebKit');
  
  // Write results
  fs.writeFileSync('test-env-validation.json', JSON.stringify(results, null, 2));
  
  // Summary
  const allPassed = Object.values(results.browsers).every(v => v);
  
  console.log('\n📊 Validation Summary:');
  console.log('====================');
  console.log(`Environment: ${results.environment}`);
  console.log(`Display: ${results.display}`);
  console.log(`Chromium: ${results.browsers.chromium ? '✅' : '❌'}`);
  console.log(`Firefox: ${results.browsers.firefox ? '✅' : '❌'}`);
  console.log(`WebKit: ${results.browsers.webkit ? '✅' : '❌'}`);
  
  if (allPassed) {
    console.log('\n✅ All browsers validated successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Some browsers failed validation');
    process.exit(1);
  }
}

validateEnvironment().catch(console.error);
EOF
    
    echo -e "${GREEN}✅ Validation script created${NC}"
}

# Create enhanced Playwright configuration for Codespaces/CI
create_enhanced_playwright_config() {
    echo -e "${YELLOW}📝 Creating enhanced Playwright configuration...${NC}"
    
    cat > playwright.config.enhanced.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const isCI = !!process.env.CI;
const isCodespaces = !!process.env.CODESPACES;
const isHeadless = process.env.HEADLESS !== 'false';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 1 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    ['list', { printSteps: true }]
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Codespaces/CI specific options
    ...(isCodespaces || isCI ? {
      launchOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
      }
    } : {})
  },
  
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: isHeadless,
        ...(isCodespaces || isCI ? {
          launchOptions: {
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage'
            ]
          }
        } : {})
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        headless: isHeadless,
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        headless: isHeadless,
      },
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        headless: isHeadless,
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        headless: isHeadless,
      },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  timeout: 60 * 1000,
  
  expect: {
    timeout: 10 * 1000,
    threshold: 0.2,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  
  outputDir: 'test-results/',
  snapshotDir: 'tests/e2e/screenshots/',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
});
EOF
    
    echo -e "${GREEN}✅ Enhanced Playwright configuration created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🎯 Starting Test Environment Setup${NC}"
    echo "=================================="
    
    # Detect environment
    detect_environment
    
    # Install system dependencies
    install_system_deps
    
    # Setup virtual display for headless environments
    setup_virtual_display
    
    # Install Node dependencies
    install_node_deps
    
    # Setup Playwright
    setup_playwright
    
    # Create configurations
    create_browser_config
    create_enhanced_playwright_config
    create_validation_script
    
    # Validate environment
    echo -e "${YELLOW}🔍 Validating test environment...${NC}"
    node validate-test-env.js
    
    echo ""
    echo -e "${GREEN}✅ Test environment setup complete!${NC}"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "1. Run tests with: npm run test:e2e"
    echo "2. Run tests in headed mode: HEADLESS=false npm run test:e2e:headed"
    echo "3. Run specific browser: npm run test:e2e:chromium"
    echo "4. Debug tests: npm run test:e2e:debug"
    echo ""
    
    # Store configuration in memory
    if [ -d "/workspaces/personalEA/memory/data" ]; then
        cat > /workspaces/personalEA/memory/data/swarm-auto-centralized-1751222675065-test-env-setup.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$ENVIRONMENT",
  "display": "$DISPLAY",
  "playwrightVersion": "$(npx playwright --version | cut -d' ' -f2)",
  "browsersInstalled": true,
  "virtualDisplay": $([ "$ENVIRONMENT" != "local" ] && echo "true" || echo "false"),
  "configFiles": [
    "playwright.config.enhanced.ts",
    "test-browser-config.json",
    "validate-test-env.js"
  ],
  "status": "ready"
}
EOF
        echo -e "${GREEN}✅ Configuration saved to Memory${NC}"
    fi
}

# Run main function
main