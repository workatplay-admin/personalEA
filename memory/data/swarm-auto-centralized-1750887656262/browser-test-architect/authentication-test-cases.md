# Authentication Test Cases

## Test Suite: API Key Configuration

### TC-AUTH-001: Valid API Key Configuration
**Priority**: Critical
**Type**: Functional

**Preconditions**:
- Application is accessible
- Valid OpenAI API key is available

**Test Steps**:
1. Navigate to application homepage
2. Verify API configuration screen is displayed
3. Enter valid API key in the input field
4. Click "Configure API" button
5. Verify successful configuration message
6. Verify navigation to goal input screen

**Expected Results**:
- API key is accepted
- Success message displayed
- User redirected to goal input
- API key stored in local storage

**Test Data**:
```javascript
const validApiKeys = [
  process.env.OPENAI_API_KEY,
  'sk-proj-' + generateRandomString(48)
];
```

### TC-AUTH-002: Invalid API Key Rejection
**Priority**: High
**Type**: Negative Testing

**Test Steps**:
1. Navigate to application
2. Enter invalid API key formats:
   - Empty string
   - Malformed key (wrong prefix)
   - Expired key
   - Revoked key
3. Click "Configure API"
4. Verify error messages

**Expected Results**:
- Clear error message for each invalid format
- No navigation away from config screen
- Input field highlighted with error state

### TC-AUTH-003: API Key Persistence
**Priority**: High
**Type**: Functional

**Test Steps**:
1. Configure valid API key
2. Navigate through application
3. Close browser tab
4. Reopen application
5. Verify API key persistence

**Expected Results**:
- User bypasses API config on return
- Stored key remains functional
- No re-authentication required

### TC-AUTH-004: API Key Security
**Priority**: Critical
**Type**: Security

**Test Steps**:
1. Configure API key
2. Inspect browser DevTools
3. Check Network tab for API calls
4. Verify key handling in:
   - Local Storage
   - Session Storage
   - HTTP headers
   - Console logs

**Expected Results**:
- Key stored securely (encrypted/hashed)
- Key not visible in network logs
- No key exposure in console
- Secure transmission only

### TC-AUTH-005: Rate Limiting Behavior
**Priority**: Medium
**Type**: Performance

**Test Steps**:
1. Configure valid API key
2. Rapidly submit multiple requests
3. Monitor response codes
4. Verify rate limit handling

**Expected Results**:
- Graceful handling of 429 errors
- User-friendly rate limit message
- Automatic retry with backoff
- Request queue management

### TC-AUTH-006: Multi-Tab Session Management
**Priority**: Medium
**Type**: Functional

**Test Steps**:
1. Open application in Tab 1
2. Configure API key
3. Open application in Tab 2
4. Verify shared authentication
5. Logout in Tab 1
6. Verify Tab 2 status

**Expected Results**:
- Authentication shared across tabs
- Real-time session updates
- Consistent state management
- No authentication conflicts

### TC-AUTH-007: API Key Rotation
**Priority**: Low
**Type**: Functional

**Test Steps**:
1. Configure initial API key
2. Navigate to settings
3. Update to new API key
4. Verify seamless transition
5. Test old key rejection

**Expected Results**:
- Smooth key rotation
- No service interruption
- Clear success confirmation
- Old key properly revoked

## Test Suite: Session Management

### TC-AUTH-008: Session Timeout
**Priority**: Medium
**Type**: Security

**Test Steps**:
1. Configure API key
2. Leave application idle for 30 minutes
3. Attempt to use application
4. Verify session expiry handling

**Expected Results**:
- Session expires after inactivity
- User prompted to re-authenticate
- Graceful state preservation
- No data loss

### TC-AUTH-009: Concurrent Session Handling
**Priority**: Low
**Type**: Functional

**Test Steps**:
1. Login on Device A
2. Login on Device B
3. Perform actions on both
4. Verify synchronization

**Expected Results**:
- Both sessions remain active
- No interference between sessions
- Proper session isolation
- Consistent data state

## Automation Implementation

```typescript
// authentication.spec.ts
import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/api-config.page';

test.describe('Authentication Test Suite', () => {
  let apiConfigPage: ApiConfigPage;
  
  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    await apiConfigPage.goto();
  });
  
  test('TC-AUTH-001: Valid API Key Configuration', async ({ page }) => {
    await apiConfigPage.enterApiKey(process.env.VALID_API_KEY);
    await apiConfigPage.clickConfigure();
    
    await expect(page).toHaveURL(/\/goal-input/);
    await expect(apiConfigPage.successMessage).toBeVisible();
    
    const storedKey = await page.evaluate(() => 
      localStorage.getItem('openai_api_key')
    );
    expect(storedKey).toBeTruthy();
  });
  
  test('TC-AUTH-002: Invalid API Key Rejection', async ({ page }) => {
    const invalidKeys = [
      '',
      'invalid-key',
      'sk-wrong-prefix',
      'sk-proj-' + 'a'.repeat(10)
    ];
    
    for (const key of invalidKeys) {
      await apiConfigPage.enterApiKey(key);
      await apiConfigPage.clickConfigure();
      
      await expect(apiConfigPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL(/\/api-config/);
      
      await apiConfigPage.clearApiKey();
    }
  });
});
```

## Page Object Model

```typescript
// page-objects/api-config.page.ts
export class ApiConfigPage {
  constructor(private page: Page) {}
  
  get apiKeyInput() {
    return this.page.locator('#openai-key');
  }
  
  get configureButton() {
    return this.page.getByRole('button', { name: /configure api/i });
  }
  
  get successMessage() {
    return this.page.locator('.success-message');
  }
  
  get errorMessage() {
    return this.page.locator('.error-message');
  }
  
  async goto() {
    await this.page.goto('/');
  }
  
  async enterApiKey(key: string) {
    await this.apiKeyInput.fill(key);
  }
  
  async clickConfigure() {
    await this.configureButton.click();
  }
  
  async clearApiKey() {
    await this.apiKeyInput.clear();
  }
}
```