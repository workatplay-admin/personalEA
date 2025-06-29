# 🎯 PersonalEA Reliable Testing Setup Guide

## ✅ CONFIRMED WORKING CONFIGURATION

This document captures the exact settings and process that ensure PersonalEA works reliably for user testing.

---

## 🔧 CRITICAL CONFIGURATION REQUIREMENTS

### 1. **API Server CORS Configuration**

**File:** `/workspaces/personalEA/testing/goal-strategy-test/openai-api-server.js`

**Required CORS Headers (Line 16):**
```javascript
allowedHeaders: ['Content-Type', 'Authorization', 'X-OpenAI-API-Key', 'Cache-Control', 'Pragma', 'Expires'],
```

**⚠️ CRITICAL:** The `Cache-Control`, `Pragma`, and `Expires` headers are **REQUIRED**. Without them, browsers get CORS errors when axios sends cache-control headers automatically.

**Complete CORS Configuration:**
```javascript
app.use(cors({
  origin: function(origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-OpenAI-API-Key', 'Cache-Control', 'Pragma', 'Expires'],
  optionsSuccessStatus: 200
}));
```

### 2. **Codespaces Port Configuration**

**CRITICAL REQUIREMENT:** Port 3000 MUST be set to **PUBLIC**

**Steps:**
1. Go to **Ports tab** in Codespaces (bottom panel)
2. Find **port 3000** in the list
3. **Right-click** on port 3000
4. Select **"Port Visibility" → "Public"**
5. **Verify** it shows "Public" (not Private)

**Verification:**
```bash
curl -s https://[codespace-name]-3000.app.github.dev/health
# Should return: {"status":"OK","timestamp":"...","service":"OpenAI-powered Goal Strategy API"}
```

### 3. **API Key Environment Variable**

**Set in terminal:**
```bash
export OPENAI_API_KEY="sk-your-actual-key-here"
```

**⚠️ NOTE:** Remove any trailing newlines from the API key:
```bash
CLEAN_API_KEY=$(echo -n "$OPENAI_API_KEY" | tr -d '\n\r')
```

---

## 🚀 RELIABLE STARTUP PROCESS

### Step 1: Start Services
```bash
cd /workspaces/personalEA/testing/goal-strategy-test
npm run test-env-openai
```

**This starts:**
- API server on port 3000
- Frontend on port 5174

### Step 2: Configure Port Visibility
1. **Ports tab** → Right-click port 3000 → **Port Visibility** → **Public**
2. **Verify** both ports 3000 and 5174 are visible/public

### Step 3: Verify Services
```bash
# Test API
curl -s http://localhost:3000/health

# Test Frontend  
curl -s http://localhost:5174 | grep "Goal & Strategy"
```

### Step 4: Test CORS (Critical)
```bash
curl -X OPTIONS https://[codespace-name]-3000.app.github.dev/api/v1/goals/translate \
  -H "Origin: https://[codespace-name]-5174.app.github.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-OpenAI-API-Key, Cache-Control"
```

**Expected:** Should return 200 with CORS headers (not 401)

---

## 🧪 USER TESTING CHECKLIST

### Before User Testing - Technical Verification:

- [ ] **Services Running:** Both API and frontend respond
- [ ] **Port 3000 Public:** API accessible via Codespaces URL
- [ ] **CORS Working:** No preflight errors in browser console
- [ ] **API Key Valid:** Backend accepts OpenAI API key
- [ ] **Goal Translation:** Test API call succeeds

### User Testing Process:

1. **Get Frontend URL:**
   - Ports tab → Click globe icon next to port 5174
   - Open URL in browser

2. **Test Complete Workflow:**
   - [ ] Page loads without JavaScript errors
   - [ ] API key input field works
   - [ ] "Configure API" button works
   - [ ] Goal input field accepts text
   - [ ] "Transform into SMART Goal" button works
   - [ ] Loading spinner appears
   - [ ] SMART goal results display (not "Translation Failed")
   - [ ] No CORS errors in browser console

---

## 🔧 TROUBLESHOOTING GUIDE

### Issue: "Translation Failed - Network Error"

**Root Causes & Fixes:**

1. **CORS Headers Missing**
   ```
   Error: "cache-control is not allowed by Access-Control-Allow-Headers"
   Fix: Add Cache-Control, Pragma, Expires to allowedHeaders in CORS config
   ```

2. **Port 3000 Not Public**
   ```
   Error: "Access denied" or 401 responses
   Fix: Set port 3000 to PUBLIC in Codespaces Ports tab
   ```

3. **Browser Cache Issues**
   ```
   Error: Previous CORS failures cached
   Fix: Hard refresh (Ctrl+Shift+R) and clear browser storage
   ```

4. **API Key Issues**
   ```
   Error: "Invalid or unauthorized API key"
   Fix: Verify key starts with "sk-" and has no trailing newlines
   ```

### Issue: Buttons Not Working

**Causes & Fixes:**

1. **JavaScript Errors**
   ```
   Check: Browser console (F12) for red errors
   Fix: Address any component or import errors
   ```

2. **React App Not Loading**
   ```
   Check: Network tab shows main.tsx loading
   Fix: Restart Vite dev server
   ```

3. **Button Disabled State**
   ```
   Check: Button appears gray/disabled
   Fix: Ensure text is entered in required fields
   ```

---

## 📋 DEPLOYMENT VERIFICATION SCRIPT

**Save as `verify-setup.js`:**
```javascript
#!/usr/bin/env node
const axios = require('axios');

async function verifySetup() {
  console.log('🔍 Verifying PersonalEA Setup...\n');
  
  // Test 1: Local services
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ API server running');
  } catch (e) {
    console.log('❌ API server not running');
    return false;
  }
  
  // Test 2: CORS configuration
  try {
    const codespaceUrl = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
    await axios.options(`${codespaceUrl}/api/v1/goals/translate`, {
      headers: {
        'Origin': codespaceUrl.replace('-3000', '-5174'),
        'Access-Control-Request-Headers': 'Content-Type, X-OpenAI-API-Key, Cache-Control'
      }
    });
    console.log('✅ CORS properly configured');
  } catch (e) {
    if (e.response?.status === 401) {
      console.log('❌ Port 3000 not PUBLIC');
      return false;
    }
    console.log('❌ CORS configuration issue');
    return false;
  }
  
  // Test 3: Full API flow
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      await axios.post(`https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev/api/v1/goals/translate`, {
        raw_goal: 'Test goal translation',
        user_id: 'setup-verification'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': apiKey
        }
      });
      console.log('✅ Goal translation working');
    } catch (e) {
      console.log('❌ Goal translation failed');
      return false;
    }
  }
  
  console.log('\n🎉 Setup verification complete - ready for user testing!');
  return true;
}

verifySetup();
```

---

## 🎯 SUCCESS CRITERIA

**PersonalEA is ready for user testing when:**

✅ All services start without errors  
✅ Port 3000 is PUBLIC in Codespaces  
✅ CORS allows all required headers  
✅ Goal translation completes successfully  
✅ Browser shows SMART goal results  
✅ No JavaScript or network errors  

**User Testing URL:** Codespaces port 5174 public URL

---

## 📝 VERSION HISTORY

- **v1.0 (2025-06-22):** Initial working configuration with CORS fix
- **Issue Resolved:** Cache-Control header CORS blocking
- **Key Fix:** Added Cache-Control, Pragma, Expires to allowedHeaders
- **Verification:** Goal translation confirmed working

---

**This configuration has been tested and verified working for user testing.** 🚀