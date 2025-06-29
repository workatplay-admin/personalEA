# 📋 PersonalEA Setup Documentation Cross-Reference Index

## 🎯 Main Setup Documents

### **Primary References**
- **`RELIABLE_TESTING_SETUP.md`** - Complete setup guide with troubleshooting
- **`QUICK_SETUP_REFERENCE.md`** - Essential settings only  
- **`verify-setup.js`** - Automated verification script
- **`FINAL_WORKING_STATUS.md`** - Confirmed working status and documentation summary

### **Verification Command**
```bash
node verify-setup.js
```

---

## 📖 Cross-Referenced Documents

### **Project Documentation**
1. **`CLAUDE.md`** (Line 248) - Main project instructions
   - Section: "PersonalEA User Testing Setup"
   - Includes quick verification and key requirements

2. **`README.md`** (Line 68) - Main project readme
   - Section: "User Testing Setup (Codespaces)"
   - Includes prerequisites and testing URL

### **Staging Environment Documentation**
3. **`STAGING_ENVIRONMENT_STATUS.md`** (Line 21) - Current staging status
   - Section: "HOW TO TEST RIGHT NOW"
   - Verification required before testing

4. **`STAGING_USER_TESTING_GUIDE.md`** (Line 3) - User testing guide
   - Section: "SETUP VERIFICATION REQUIRED"
   - Prerequisites and setup documentation references

5. **`USER_TESTING_READY.md`** (Line 3) - Ready status document
   - Section: "FIRST: Verify Setup"
   - Quick verification and setup guide references

### **SPARC Methodology Documentation**
6. **`sparc/plans/methodology/README.md`** (Line 135) - SPARC methodology
   - Section: "CRITICAL: Staging Setup Verification"
   - Requirements for user testing milestones

7. **`sparc/plans/milestones/TESTING_MILESTONE_FRAMEWORK.md`** (Line 321) - Testing milestones
   - Section: "CRITICAL: User Testing Environment Verification"
   - Milestone 4 entry criteria requirements

---

## 🔧 Key Configuration Requirements

### **Critical Settings (Always Required)**
1. **Port 3000 = PUBLIC** in Codespaces
2. **CORS Headers** must include: `Cache-Control`, `Pragma`, `Expires`
3. **OpenAI API Key** set in environment: `OPENAI_API_KEY`

### **Verification Checklist**
- [ ] Run `node verify-setup.js` and all tests pass
- [ ] Port 3000 shows as "Public" in Codespaces Ports tab
- [ ] Goal translation works end-to-end
- [ ] No CORS errors in browser console

---

## 🚨 Common Issues & Solutions

### **CORS Errors**
- **Issue**: "cache-control is not allowed by Access-Control-Allow-Headers"
- **Fix**: Add `Cache-Control`, `Pragma`, `Expires` to allowedHeaders in `openai-api-server.js`

### **Port Access Issues**
- **Issue**: API calls return 401 or "access denied"
- **Fix**: Set port 3000 to PUBLIC in Codespaces Ports tab

### **Translation Failures**
- **Issue**: "Translation Failed - Network Error"
- **Fix**: Verify port configuration and hard refresh browser (`Ctrl+Shift+R`)

### **API Key Issues**
- **Issue**: "Invalid or unauthorized API key"
- **Fix**: Ensure key starts with "sk-" and has no trailing newlines

---

## 📍 Quick Access Summary

**For Developers:**
- Main setup guide: `RELIABLE_TESTING_SETUP.md`
- Quick reference: `QUICK_SETUP_REFERENCE.md`
- Automated check: `node verify-setup.js`

**For User Testing:**
- Prerequisites check: Run verification script first
- Testing URL: Codespaces port 5174 (globe icon)
- Common issues: See troubleshooting in setup guides

**For SPARC Processes:**
- Milestone gates: Include setup verification in entry criteria
- Quality gates: All user testing requires verified environment
- Documentation: Reference setup guides in all testing documents

---

## ✅ Documentation Status

**Complete Cross-Referencing:** All major entry points to user testing now reference the reliable setup documentation.

**Maintenance:** When adding new user testing documents, always include:
1. Link to `RELIABLE_TESTING_SETUP.md`
2. Requirement to run `node verify-setup.js`
3. Reference to key configuration requirements

**Last Updated:** 2025-06-22 - All cross-references verified and updated