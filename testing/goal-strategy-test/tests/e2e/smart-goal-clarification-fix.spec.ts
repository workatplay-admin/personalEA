import { test, expect } from '@playwright/test'
import { SmartGoalTestUtils } from './utils/SmartGoalTestUtils'

test.describe('SMART Goal Clarification Bug Fix Tests', () => {
  let utils: SmartGoalTestUtils

  test.beforeEach(async ({ page }) => {
    utils = new SmartGoalTestUtils(page)
    await utils.navigateToApp()
  })

  test('should send only current clarification, not accumulated ones', async ({ page }) => {
    // Intercept API calls to verify request payload
    const clarifyRequests: any[] = []
    await page.route('**/api/v1/goals/*/clarify', async (route, request) => {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON()
        clarifyRequests.push(payload)
      }
      await route.continue()
    })

    // Start with a vague goal
    await utils.enterGoal('Learn to race')
    await utils.submitGoal()
    
    // Wait for chat interface
    await expect(page.locator('.chat-interface')).toBeVisible({ timeout: 10000 })
    
    // Answer first clarification (specific)
    await page.fill('input[placeholder*="specific"]', 'Hobby karting at local track')
    await page.click('button[aria-label="Send"]')
    
    // Verify first request contains only specific clarification
    await page.waitForTimeout(1000)
    expect(clarifyRequests.length).toBeGreaterThan(0)
    const firstRequest = clarifyRequests[clarifyRequests.length - 1]
    expect(Object.keys(firstRequest.clarifications)).toHaveLength(1)
    expect(firstRequest.clarifications[0].smartCriterion).toBe('specific')
    
    // Answer second clarification (measurable)
    await page.fill('input[placeholder*="measurable"]', 'Weekly practice sessions, compete in 3 races')
    await page.click('button[aria-label="Send"]')
    
    // Verify second request contains only measurable clarification
    await page.waitForTimeout(1000)
    const secondRequest = clarifyRequests[clarifyRequests.length - 1]
    expect(Object.keys(secondRequest.clarifications)).toHaveLength(1)
    expect(secondRequest.clarifications[0].smartCriterion).toBe('measurable')
  })

  test('should filter empty clarifications before sending', async ({ page }) => {
    // Intercept API calls
    let requestPayload: any = null
    await page.route('**/api/v1/goals/*/clarify', async (route, request) => {
      if (request.method() === 'POST') {
        requestPayload = request.postDataJSON()
      }
      await route.continue()
    })

    await utils.enterGoal('Get fit')
    await utils.submitGoal()
    
    // Send empty answer
    await page.fill('input[placeholder*="specific"]', '   ')  // Only spaces
    await page.click('button[aria-label="Send"]')
    
    // Verify no API call was made with empty clarification
    await page.waitForTimeout(1000)
    expect(requestPayload).toBeNull()
  })

  test('should update multiple SMART components from single answer', async ({ page }) => {
    await utils.enterGoal('Learn programming')
    await utils.submitGoal()
    
    // Wait for chat interface
    await expect(page.locator('.chat-interface')).toBeVisible({ timeout: 10000 })
    
    // Provide comprehensive answer that addresses multiple components
    const comprehensiveAnswer = 'Learn Python for web development by completing an online course in 3 months, building 5 projects'
    await page.fill('input[type="text"]', comprehensiveAnswer)
    await page.click('button[aria-label="Send"]')
    
    // Wait for score updates
    await page.waitForTimeout(2000)
    
    // Check that multiple components were updated
    const specificScore = await utils.getComponentScore('specific')
    const measurableScore = await utils.getComponentScore('measurable')
    const timeBoundScore = await utils.getComponentScore('timeBound')
    
    expect(specificScore).toBeGreaterThan(70)  // Should detect "Python for web development"
    expect(measurableScore).toBeGreaterThan(70)  // Should detect "5 projects"
    expect(timeBoundScore).toBeGreaterThan(70)  // Should detect "3 months"
  })

  test('should maintain high scores when processing new clarifications', async ({ page }) => {
    await utils.enterGoal('Exercise more')
    await utils.submitGoal()
    
    // First clarification - specific
    await page.fill('input[type="text"]', 'Run 5K races at local park')
    await page.click('button[aria-label="Send"]')
    await page.waitForTimeout(2000)
    
    const initialSpecificScore = await utils.getComponentScore('specific')
    expect(initialSpecificScore).toBeGreaterThan(70)
    
    // Second clarification - measurable
    await page.fill('input[type="text"]', 'Three times per week, track with Strava')
    await page.click('button[aria-label="Send"]')
    await page.waitForTimeout(2000)
    
    // Verify specific score didn't decrease
    const updatedSpecificScore = await utils.getComponentScore('specific')
    expect(updatedSpecificScore).toBeGreaterThanOrEqual(initialSpecificScore)
    
    // And measurable score increased
    const measurableScore = await utils.getComponentScore('measurable')
    expect(measurableScore).toBeGreaterThan(70)
  })

  test('should complete refinement in less than 5 iterations', async ({ page }) => {
    await utils.enterGoal('Start a business')
    await utils.submitGoal()
    
    let iterationCount = 0
    const maxIterations = 5
    
    // Answer questions comprehensively
    const answers = [
      'Online consulting business in digital marketing',  // Specific
      'Generate $5000/month revenue within first year',  // Measurable
      'I have 10 years marketing experience and initial clients',  // Achievable
      'Want financial independence and use my expertise',  // Relevant
      'Launch in 3 months, profitable by month 6'  // Time-bound
    ]
    
    for (const answer of answers) {
      iterationCount++
      
      // Check if completion message appears
      const isComplete = await page.locator('text=/Congratulations.*refined/').isVisible()
      if (isComplete) break
      
      // Answer current question
      await page.fill('input[type="text"]', answer)
      await page.click('button[aria-label="Send"]')
      await page.waitForTimeout(2000)
    }
    
    expect(iterationCount).toBeLessThanOrEqual(maxIterations)
    
    // Verify all scores are high
    const finalScores = await utils.getAllComponentScores()
    Object.values(finalScores).forEach(score => {
      expect(score).toBeGreaterThan(80)
    })
  })

  test('should handle comprehensive initial answer correctly', async ({ page }) => {
    // Provide a very detailed initial goal
    const detailedGoal = 'Learn Spanish to B2 level by December 2024 through daily 30-minute Duolingo sessions and weekly conversation practice with native speakers'
    
    await utils.enterGoal(detailedGoal)
    await utils.submitGoal()
    
    await page.waitForTimeout(3000)
    
    // Check initial scores - should be high for most components
    const scores = await utils.getAllComponentScores()
    
    expect(scores.specific).toBeGreaterThan(80)  // "Spanish to B2 level"
    expect(scores.measurable).toBeGreaterThan(80)  // "daily 30-minute", "weekly"
    expect(scores.timeBound).toBeGreaterThan(80)  // "by December 2024"
    
    // Should need minimal clarifications
    const questionsCount = await page.locator('.chat-message.bot.question').count()
    expect(questionsCount).toBeLessThan(3)
  })

  test('should not ask for information already provided', async ({ page }) => {
    await utils.enterGoal('Get certified')
    await utils.submitGoal()
    
    // Provide answer with timeline
    await page.fill('input[type="text"]', 'AWS Solutions Architect certification by June 2024')
    await page.click('button[aria-label="Send"]')
    await page.waitForTimeout(2000)
    
    // Check that subsequent questions don't ask about timeline
    const botMessages = await page.locator('.chat-message.bot').allTextContents()
    const lastBotMessage = botMessages[botMessages.length - 1].toLowerCase()
    
    expect(lastBotMessage).not.toContain('when')
    expect(lastBotMessage).not.toContain('deadline')
    expect(lastBotMessage).not.toContain('timeline')
    expect(lastBotMessage).not.toContain('time')
  })

  test('should handle edge case of very short answers appropriately', async ({ page }) => {
    await utils.enterGoal('Learn')
    await utils.submitGoal()
    
    // Provide very short answer
    await page.fill('input[type="text"]', 'Yes')
    await page.click('button[aria-label="Send"]')
    await page.waitForTimeout(2000)
    
    // Should recognize this as insufficient and ask for more detail
    const responseText = await page.locator('.chat-message.bot').last().textContent()
    expect(responseText).toMatch(/more specific|detail|could you|example/i)
    
    // Scores should remain low
    const specificScore = await utils.getComponentScore('specific')
    expect(specificScore).toBeLessThan(50)
  })

  test('should properly handle conversation history context', async ({ page }) => {
    await utils.enterGoal('Improve fitness')
    await utils.submitGoal()
    
    // First answer mentions running
    await page.fill('input[type="text"]', 'I want to start running regularly')
    await page.click('button[aria-label="Send"]')
    await page.waitForTimeout(2000)
    
    // Second answer references "it" - should understand from context
    await page.fill('input[type="text"]', 'Do it 3 times per week for 30 minutes')
    await page.click('button[aria-label="Send"]')
    await page.waitForTimeout(2000)
    
    // Should properly update measurable with context understanding
    const measurableScore = await utils.getComponentScore('measurable')
    expect(measurableScore).toBeGreaterThan(70)
  })

  test('should show proper feedback after each clarification', async ({ page }) => {
    await utils.enterGoal('Save money')
    await utils.submitGoal()
    
    // Provide specific answer
    await page.fill('input[type="text"]', 'Save $10,000 for emergency fund')
    await page.click('button[aria-label="Send"]')
    
    // Wait for feedback message
    await expect(page.locator('text=/Good progress|Excellent|improved/i')).toBeVisible({ timeout: 5000 })
    
    // Should show score improvement
    await expect(page.locator('text=/%/')).toBeVisible()
  })
})

// Additional test for API-level validation
test.describe('API Level Clarification Tests', () => {
  test('backend should handle single clarification correctly', async ({ request }) => {
    // This would need actual API endpoint testing
    // Example structure:
    const goalId = 'test-goal-id'
    const response = await request.post(`/api/v1/goals/${goalId}/clarify`, {
      data: {
        clarifications: [{
          question: 'What is the specific aspect of your goal?',
          answer: 'Learn React.js for web development',
          smartCriterion: 'specific'
        }],
        goalContext: {
          title: 'Learn programming',
          originalGoal: 'Learn programming'
        }
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.criteria.specific.confidence).toBeGreaterThan(0.7)
  })
})