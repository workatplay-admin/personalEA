import fetch from 'node-fetch';

async function testBackendAPI() {
  console.log('🔍 Testing Backend API with Real OpenAI Key...\n');
  
  const apiUrl = 'http://localhost:8085/api/v1';
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await fetch(`${apiUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    
    // Test 2: Test Goal Translation with Real API
    console.log('\n2️⃣ Testing Goal Translation with Real OpenAI API...');
    
    const goalData = {
      goal: "I want to learn web development and get a job",
      userApiKey: process.env.OPENAI_API_KEY
    };
    
    const translateResponse = await fetch(`${apiUrl}/goals/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData)
    });
    
    if (translateResponse.ok) {
      const result = await translateResponse.json();
      console.log('✅ Goal Translation Success!');
      console.log('📊 Confidence Score:', result.confidence);
      console.log('🎯 SMART Goal:', result.smartGoal);
      
      if (result.smartCriteria) {
        console.log('\n📋 SMART Criteria:');
        console.log('  - Specific:', result.smartCriteria.specific?.confidence || 'N/A');
        console.log('  - Measurable:', result.smartCriteria.measurable?.confidence || 'N/A');
        console.log('  - Achievable:', result.smartCriteria.achievable?.confidence || 'N/A');
        console.log('  - Relevant:', result.smartCriteria.relevant?.confidence || 'N/A');
        console.log('  - Time-bound:', result.smartCriteria.timeBound?.confidence || 'N/A');
      }
      
      console.log('\n✅ BACKEND IS WORKING WITH REAL OPENAI API!');
      
      // Test 3: Test Interactive Analysis
      console.log('\n3️⃣ Testing Interactive Goal Analysis...');
      
      const analyzeResponse = await fetch(`${apiUrl}/goals/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal: "Build a mobile app",
          userApiKey: process.env.OPENAI_API_KEY
        })
      });
      
      if (analyzeResponse.ok) {
        const analysis = await analyzeResponse.json();
        console.log('✅ Interactive Analysis Success!');
        console.log('📊 Analysis Confidence:', analysis.confidence);
        console.log('💪 Strengths:', analysis.analysis?.strengths?.length || 0);
        console.log('⚠️  Weaknesses:', analysis.analysis?.weaknesses?.length || 0);
        console.log('❓ Recommended Questions:', analysis.recommendedQuestions?.length || 0);
      }
      
    } else {
      console.log('❌ Goal Translation Failed:', translateResponse.status);
      const error = await translateResponse.text();
      console.log('Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

// Run the test
testBackendAPI().catch(console.error);