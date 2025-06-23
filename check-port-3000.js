#!/usr/bin/env node

/**
 * Check if port 3000 is properly configured as PUBLIC
 */

const axios = require('axios');

async function checkPort3000() {
  console.log('🔍 Checking port 3000 configuration...\n');
  
  // Try to access the Codespaces URL for port 3000
  const codespaceUrl = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
  
  try {
    console.log(`Testing: ${codespaceUrl}/health`);
    const response = await axios.get(`${codespaceUrl}/health`, { timeout: 10000 });
    
    if (response.data.status === 'OK') {
      console.log('✅ Port 3000 is PUBLIC and accessible!');
      console.log('✅ CORS should work now!');
      console.log('\n📋 Next steps:');
      console.log('1. Refresh your browser');
      console.log('2. Re-enter your API key');
      console.log('3. Test goal translation');
    } else {
      console.log('❌ Port 3000 responds but with unexpected data');
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.message.includes('getaddrinfo')) {
      console.log('❌ Port 3000 is NOT accessible from outside');
      console.log('\n🔧 FIX NEEDED:');
      console.log('1. Go to Ports tab in Codespaces');
      console.log('2. Find port 3000');
      console.log('3. Right-click → Port Visibility → Public');
      console.log('4. Make sure it shows "Public"');
    } else {
      console.log(`❌ Error accessing port 3000: ${error.message}`);
    }
  }
}

checkPort3000();