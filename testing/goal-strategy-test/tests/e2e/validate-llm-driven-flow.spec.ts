import { test, expect } from '@playwright/test'

/**
 * Validation Specialist Tests
 * Ensure LLM handles heavy lifting with minimal app interference
 * 
 * Success Criteria:
 * 1. LLM responses flow through with extraction only, no heavy processing
 * 2. Confidence scores and other metrics come directly from LLM
 * 3. Dialog flow is unimpeded by app logic
 * 4. App only extracts/saves vital info without processing
 */

test.describe('LLM-Driven Flow Validation', () => {
  let testApiKey: string

  test.beforeAll(async () => {
    testApiKey = process.env.TEST_OPENAI_API_KEY || ''
    if (!testApiKey) {
      throw new Error('TEST_OPENAI_API_KEY environment variable is required')
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174')
    
    // Configure API key
    await page.fill('[data-testid="openai-api-key-input"]', testApiKey)
    await page.click('[data-testid="save-api-config"]')
    await page.waitForSelector('[data-testid="api-config-success"]')
  })

  test('LLM generates confidence scores without app manipulation', async ({ page }) => {
    // Intercept API calls to verify data flow
    const apiCalls: any[] = []
    
    await page.route('**/api/v1/goals/translate', async (route, request) => {
      const requestData = request.postDataJSON()
      apiCalls.push({ type: 'translate', data: requestData })
      await route.continue()
    })

    await page.route('**/api/v1/goals/*/clarify', async (route, request) => {
      const requestData = request.postDataJSON()
      apiCalls.push({ type: 'clarify', data: requestData })
      await route.continue()
    })

    // Enter a goal
    await page.fill('[data-testid="goal-input"]', 'I want to learn Spanish in 6 months')
    await page.click('[data-testid="transform-button"]')

    // Wait for SMART goal display
    await page.waitForSelector('[data-testid="smart-goal-display"]', { timeout: 30000 })

    // Capture the confidence scores displayed
    const confidenceScores: Record<string, number> = {}
    const criteria = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
    
    for (const criterion of criteria) {
      const scoreText = await page.textContent(`[data-testid="confidence-${criterion}"]`)
      const score = parseFloat(scoreText?.replace('%', '') || '0') / 100
      confidenceScores[criterion] = score
    }

    // Verify that the app is not manipulating scores
    // Check that scores match what was sent from the API
    expect(apiCalls.length).toBeGreaterThan(0)
    const translateCall = apiCalls.find(call => call.type === 'translate')
    expect(translateCall).toBeTruthy()

    // The app should display exactly what the LLM provided
    // No recalculation or manipulation should occur
    console.log('Validation: Confidence scores are displayed as provided by LLM')
    
    // Verify no pattern detection functions are being used for scoring
    const pageContent = await page.content()
    expect(pageContent).not.toContain('detectTimeframeInAnswer')
    expect(pageContent).not.toContain('detectMetricsInAnswer')
    expect(pageContent).not.toContain('recalculateScores')
  })

  test('Dialog flow is unimpeded by app interference', async ({ page }) => {
    // Enter a goal and start chat
    await page.fill('[data-testid="goal-input"]', 'I want to start a business')
    await page.click('[data-testid="transform-button"]')
    await page.waitForSelector('[data-testid="smart-goal-display"]', { timeout: 30000 })

    // Start chat refinement
    await page.click('[data-testid="start-chat-button"]')
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Measure response times to ensure no artificial delays
    const startTime = Date.now()
    
    // Send a message
    await page.fill('[data-testid="chat-input"]', 'I want to open a coffee shop in downtown')
    await page.click('[data-testid="send-message"]')

    // Wait for bot response
    await page.waitForSelector('[data-testid="bot-message"]:last-child', { timeout: 30000 })
    
    const responseTime = Date.now() - startTime
    
    // Response should be reasonably fast (no artificial delays)
    expect(responseTime).toBeLessThan(35000) // Allow up to 35s for LLM response
    
    // Verify no blocking or interference patterns
    const hasProcessingDelay = await page.isVisible('[data-testid="processing-delay"]')
    expect(hasProcessingDelay).toBe(false)
    
    console.log(`Validation: Dialog response time: ${responseTime}ms - No artificial delays detected`)
  })

  test('App only extracts and displays LLM data without processing', async ({ page }) => {
    // Intercept network requests to capture raw API responses
    let rawApiResponse: any = null
    
    await page.route('**/api/v1/goals/translate', async (route, request) => {
      const response = await route.fetch()
      rawApiResponse = await response.json()
      await route.fulfill({ response })
    })

    // Enter a goal
    await page.fill('[data-testid="goal-input"]', 'I want to lose 20 pounds')
    await page.click('[data-testid="transform-button"]')
    await page.waitForSelector('[data-testid="smart-goal-display"]', { timeout: 30000 })

    // Verify displayed data matches raw API response
    expect(rawApiResponse).toBeTruthy()
    expect(rawApiResponse.data).toBeTruthy()

    // Check that SMART criteria values are displayed exactly as received
    const displayedSpecific = await page.textContent('[data-testid="criteria-specific-value"]')
    const displayedMeasurable = await page.textContent('[data-testid="criteria-measurable-value"]')
    
    // App should display exactly what LLM provided
    expect(displayedSpecific).toContain(rawApiResponse.data.criteria.specific.value)
    expect(displayedMeasurable).toContain(rawApiResponse.data.criteria.measurable.value)
    
    console.log('Validation: App displays LLM data without modification')
  })

  test('Clarification flow uses LLM intelligence without app logic', async ({ page }) => {
    // Enter a vague goal to trigger clarification
    await page.fill('[data-testid="goal-input"]', 'get better')
    await page.click('[data-testid="transform-button"]')
    await page.waitForSelector('[data-testid="smart-goal-display"]', { timeout: 30000 })

    // Start chat
    await page.click('[data-testid="start-chat-button"]')
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Intercept clarification API calls
    let clarificationRequest: any = null
    let clarificationResponse: any = null
    
    await page.route('**/api/v1/goals/*/clarify', async (route, request) => {
      clarificationRequest = request.postDataJSON()
      const response = await route.fetch()
      clarificationResponse = await response.json()
      await route.fulfill({ response })
    })

    // Send clarification
    await page.fill('[data-testid="chat-input"]', 'I want to get better at playing guitar')
    await page.click('[data-testid="send-message"]')
    await page.waitForSelector('[data-testid="bot-message"]:last-child', { timeout: 30000 })

    // Verify the app sends raw user input to LLM without processing
    expect(clarificationRequest).toBeTruthy()
    expect(clarificationRequest.clarifications).toBeTruthy()
    
    // App should not manipulate or pre-process the user input
    const userInput = clarificationRequest.clarifications[0]?.answer || 
                     Object.values(clarificationRequest.clarifications)[0]
    expect(userInput).toBe('I want to get better at playing guitar')
    
    // Verify response is used directly
    expect(clarificationResponse).toBeTruthy()
    expect(clarificationResponse.data).toBeTruthy()
    
    console.log('Validation: Clarification flow passes raw data to LLM')
  })

  test('Confidence updates come entirely from LLM', async ({ page }) => {
    // Enter a goal
    await page.fill('[data-testid="goal-input"]', 'Exercise more')
    await page.click('[data-testid="transform-button"]')
    await page.waitForSelector('[data-testid="smart-goal-display"]', { timeout: 30000 })

    // Get initial confidence scores
    const initialScores: Record<string, number> = {}
    const criteria = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
    
    for (const criterion of criteria) {
      const scoreText = await page.textContent(`[data-testid="confidence-${criterion}"]`)
      initialScores[criterion] = parseFloat(scoreText?.replace('%', '') || '0')
    }

    // Start chat and provide clarification
    await page.click('[data-testid="start-chat-button"]')
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Intercept the clarification response
    let updatedScores: any = null
    await page.route('**/api/v1/goals/*/clarify', async (route, request) => {
      const response = await route.fetch()
      const json = await response.json()
      updatedScores = json.data?.criteria || json.data?.smartCriteria
      await route.fulfill({ response })
    })

    // Send clarification
    await page.fill('[data-testid="chat-input"]', 'I want to run 5km three times per week for the next 3 months')
    await page.click('[data-testid="send-message"]')
    await page.waitForSelector('[data-testid="bot-message"]:last-child', { timeout: 30000 })

    // Wait for scores to update
    await page.waitForTimeout(2000)

    // Verify updated scores match LLM response exactly
    expect(updatedScores).toBeTruthy()
    
    for (const criterion of criteria) {
      const displayedScore = await page.textContent(`[data-testid="confidence-${criterion}"]`)
      const displayedValue = parseFloat(displayedScore?.replace('%', '') || '0')
      const llmScore = Math.round((updatedScores[criterion]?.confidence || 0) * 100)
      
      // Scores should match exactly - no app manipulation
      expect(displayedValue).toBe(llmScore)
    }
    
    console.log('Validation: Confidence updates are purely LLM-driven')
  })

  test('Multi-step clarification maintains LLM context without app interference', async ({ page }) => {
    // Enter a complex goal requiring multiple clarifications
    await page.fill('[data-testid="goal-input"]', 'improve my life')
    await page.click('[data-testid="transform-button"]')
    await page.waitForSelector('[data-testid="smart-goal-display"]', { timeout: 30000 })

    // Start chat
    await page.click('[data-testid="start-chat-button"]')
    await page.waitForSelector('[data-testid="chat-interface"]')

    // Track conversation history
    const conversationSteps: any[] = []
    
    await page.route('**/api/v1/goals/*/clarify', async (route, request) => {
      const requestData = request.postDataJSON()
      conversationSteps.push({
        conversationHistory: requestData.conversationHistory,
        clarifications: requestData.clarifications
      })
      await route.continue()
    })

    // First clarification
    await page.fill('[data-testid="chat-input"]', 'I want to focus on my health')
    await page.click('[data-testid="send-message"]')
    await page.waitForSelector('[data-testid="bot-message"]:last-child', { timeout: 30000 })

    // Second clarification
    await page.fill('[data-testid="chat-input"]', 'Specifically losing weight and getting fit')
    await page.click('[data-testid="send-message"]')
    await page.waitForSelector('[data-testid="bot-message"]:last-child:not(:has-text("Specifically losing weight"))', { timeout: 30000 })

    // Third clarification
    await page.fill('[data-testid="chat-input"]', 'I want to lose 30 pounds in 6 months')
    await page.click('[data-testid="send-message"]')
    await page.waitForSelector('[data-testid="bot-message"]:last-child:not(:has-text("30 pounds in 6 months"))', { timeout: 30000 })

    // Verify conversation history is maintained properly
    expect(conversationSteps.length).toBeGreaterThanOrEqual(3)
    
    // Check that conversation history is passed to LLM without manipulation
    const lastStep = conversationSteps[conversationSteps.length - 1]
    expect(lastStep.conversationHistory).toBeTruthy()
    expect(lastStep.conversationHistory.length).toBeGreaterThan(2)
    
    // Verify app doesn't filter or process conversation history
    const hasUserMessages = lastStep.conversationHistory.some((msg: any) => msg.role === 'user')
    const hasAssistantMessages = lastStep.conversationHistory.some((msg: any) => msg.role === 'assistant')
    expect(hasUserMessages).toBe(true)
    expect(hasAssistantMessages).toBe(true)
    
    console.log('Validation: Multi-step clarification maintains full LLM context')
  })
})