#!/usr/bin/env node

/**
 * Simple Browser Access Verification
 * Checks if the staging environment is accessible via browser
 */

const axios = require('axios');

async function verifyBrowserAccess() {
    console.log('🌐 Verifying PersonalEA Staging Environment Browser Access\n');
    
    const services = [
        {
            name: 'Goal Testing Interface',
            url: 'http://localhost:5174',
            type: 'frontend',
            expectedContent: 'Goal & Strategy Service Testing Interface'
        },
        {
            name: 'API Health Endpoint',
            url: 'http://localhost:3000/health',
            type: 'api',
            expectedContent: 'OpenAI-powered Goal Strategy API'
        }
    ];
    
    let allGood = true;
    
    for (const service of services) {
        console.log(`🔍 Checking ${service.name}...`);
        console.log(`   URL: ${service.url}`);
        
        try {
            const response = await axios.get(service.url, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'PersonalEA-Staging-Test/1.0'
                }
            });
            
            if (response.status === 200) {
                const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                
                if (content.includes(service.expectedContent)) {
                    console.log(`   ✅ ACCESSIBLE - Serving correct content`);
                    console.log(`   📊 Status: HTTP ${response.status}`);
                    
                    if (service.type === 'frontend') {
                        console.log(`   🖥️  Content: Frontend interface loaded`);
                    } else {
                        console.log(`   📋 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
                    }
                } else {
                    console.log(`   ⚠️  ACCESSIBLE but unexpected content`);
                    console.log(`   📄 Got: ${content.substring(0, 100)}...`);
                }
            } else {
                console.log(`   ❌ ACCESSIBLE but wrong status: HTTP ${response.status}`);
                allGood = false;
            }
            
        } catch (error) {
            console.log(`   ❌ NOT ACCESSIBLE`);
            console.log(`   🔍 Error: ${error.message}`);
            allGood = false;
        }
        
        console.log('');
    }
    
    console.log('=' .repeat(60));
    
    if (allGood) {
        console.log('🎉 STAGING ENVIRONMENT IS BROWSER-ACCESSIBLE!');
        console.log('');
        console.log('📋 User Testing Instructions:');
        console.log('   1. Open your web browser');
        console.log('   2. Navigate to: http://localhost:5174');
        console.log('   3. You should see: "Goal & Strategy Service Testing Interface"');
        console.log('   4. Enter your OpenAI API key to begin testing');
        console.log('');
        console.log('🔗 Quick Access Links:');
        console.log('   🎯 Main Interface: http://localhost:5174');
        console.log('   📊 API Health:     http://localhost:3000/health');
        console.log('   🧪 Browser Test:   file://' + process.cwd() + '/browser-test.html');
        console.log('');
        console.log('⚠️  Testing Limitations:');
        console.log('   - Only Goal Strategy Service available (~35% of PersonalEA)');
        console.log('   - Calendar Service missing (blocks full workflow)');
        console.log('   - Data Sovereignty Framework not implemented');
        console.log('   - Do not enter sensitive personal information');
        
    } else {
        console.log('❌ STAGING ENVIRONMENT HAS ACCESS ISSUES');
        console.log('');
        console.log('🔧 Troubleshooting Steps:');
        console.log('   1. Check if services are running: ps aux | grep node');
        console.log('   2. Restart environment: ./start-goal-testing.sh');
        console.log('   3. Check port availability: netstat -tlnp | grep 5174');
        console.log('   4. Verify no firewall blocking localhost access');
    }
    
    return allGood;
}

async function quickConnectivityTest() {
    console.log('⚡ Quick Connectivity Test\n');
    
    const endpoints = [
        'http://localhost:5174',
        'http://localhost:3000/health'
    ];
    
    for (const url of endpoints) {
        try {
            const response = await axios.get(url, { timeout: 5000 });
            console.log(`✅ ${url} - HTTP ${response.status}`);
        } catch (error) {
            console.log(`❌ ${url} - ${error.message}`);
        }
    }
    console.log('');
}

// Main execution
async function main() {
    const mode = process.argv[2] || 'full';
    
    if (mode === 'quick') {
        await quickConnectivityTest();
    } else {
        await verifyBrowserAccess();
    }
}

main().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
});