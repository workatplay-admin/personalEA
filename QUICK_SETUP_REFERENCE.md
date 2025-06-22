# ⚡ PersonalEA Quick Setup Reference

## 🔧 Critical Settings (Must Be Correct)

### 1. **CORS Headers** (openai-api-server.js line 16)
```javascript
allowedHeaders: ['Content-Type', 'Authorization', 'X-OpenAI-API-Key', 'Cache-Control', 'Pragma', 'Expires']
```
**⚠️ Without Cache-Control: Browser gets CORS errors**

### 2. **Port 3000 = PUBLIC** 
- Ports tab → Right-click port 3000 → Port Visibility → **Public**
- **⚠️ If Private: API calls fail with 401**

### 3. **Environment Variable**
```bash
export OPENAI_API_KEY="sk-your-actual-key"
```

## 🚀 Startup Commands

```bash
cd /workspaces/personalEA/testing/goal-strategy-test
npm run test-env-openai
```

## 🧪 Quick Verification

```bash
node verify-setup.js
```

## 📋 User Testing URL

**Ports tab → Click 🌐 next to port 5174**

---

## 🚨 If Goal Translation Fails:

1. **Check CORS**: Add Cache-Control to allowedHeaders
2. **Check Port**: Set port 3000 to PUBLIC  
3. **Clear Browser**: Ctrl+Shift+R
4. **Check API Key**: Starts with "sk-", no newlines

**✅ When all items pass: PersonalEA works perfectly**