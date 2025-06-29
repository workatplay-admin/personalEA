# Browser Verification Protocol

## ⚠️ CRITICAL REQUIREMENT: Always Verify Browser Access Before Claiming "Ready"

**NEVER claim a staging environment is ready for user testing without completing full browser verification.**

## Required Verification Steps

### 1. Service Status Check
```bash
# Check if services are running
ps aux | grep -E "(node|npm)" | grep -v grep
netstat -tlnp | grep -E ":(3000|5174|5173)"
```

### 2. API Connectivity Test
```bash
# Test API health
curl -s http://localhost:3000/health | jq '.'

# Test goal translation endpoint
curl -X POST http://localhost:3000/api/v1/goals/translate \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-API-Key: $OPENAI_API_KEY" \
  -d '{"raw_goal": "Test goal", "user_id": "test"}'
```

### 3. Frontend Content Verification
```bash
# Download and verify frontend content
curl -s http://localhost:5174 > /tmp/frontend-test.html
grep -i "goal.*strategy" /tmp/frontend-test.html
wc -l /tmp/frontend-test.html
```

### 4. **MANDATORY: Actual Browser Testing**

**The user MUST perform these steps:**

1. **Open your web browser**
2. **Navigate to the forwarded URL** (Codespaces will provide the public URL)
3. **Verify the page loads completely** - you should see:
   - "Goal & Strategy Service Testing Interface" title
   - Input form for goals
   - API key configuration section
4. **Test a sample goal translation**:
   - Enter API key in the configuration
   - Input: "I want to learn Python programming"
   - Click "Translate to SMART Goal"
   - Verify you get back a formatted SMART goal and task breakdown

### 5. Port Forwarding Verification (Codespaces)

In Codespaces, services run on:
- API: `http://localhost:3000` → `https://[codespace-name]-3000.app.github.dev`
- Frontend: `http://localhost:5174` → `https://[codespace-name]-5174.app.github.dev`

**Check forwarded URLs:**
- Go to Ports tab in Codespaces
- Look for ports 3000 and 5174
- Click the globe icon to get public URLs
- Test these URLs in your browser

## ❌ What NOT to Do

- **Never** claim services are "ready for testing" based only on curl/API tests
- **Never** assume port forwarding works without testing
- **Never** skip actual browser verification
- **Never** say "ready" if user reports "site cannot be reached"

## ✅ What TO Do

- **Always** test the actual user experience in a browser
- **Always** verify port forwarding works correctly
- **Always** test with real user interactions (forms, buttons, API key input)
- **Always** document any limitations or missing features clearly

## Future-Proofing Checklist

Before claiming ANY staging environment is ready:

- [ ] Services are running (ps/netstat check)
- [ ] API endpoints respond correctly (curl tests)
- [ ] Frontend serves correct content (content verification)
- [ ] **BROWSER ACCESS CONFIRMED** (actual browser test)
- [ ] Port forwarding working (public URLs accessible)
- [ ] User workflow tested (forms, interactions, API integration)
- [ ] Limitations documented clearly
- [ ] User instructions provided with exact URLs

## Emergency Fixes

If browser access fails:

1. **Check port forwarding in Codespaces**
2. **Restart services**: `./start-goal-testing.sh`
3. **Verify environment variables**: `echo $OPENAI_API_KEY`
4. **Test localhost access**: `curl http://localhost:5174`
5. **Check for firewall/proxy issues**
6. **Verify Codespaces permissions**

---

**REMEMBER: A staging environment is NOT ready until a human has successfully used it in an actual web browser.**