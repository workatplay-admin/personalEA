import { test, expect } from '@playwright/test'
import { GoalInputPage } from './page-objects/GoalInputPage'
import { SmartGoalPage } from './page-objects/SmartGoalPage'

// Test configuration with retries for stability
test.describe.configure({ mode: 'parallel' })

test.describe('SMART Goal Clarification - Prioritization Logic', () => {
  let goalInputPage: GoalInputPage
  let smartGoalPage: SmartGoalPage

  test.beforeEach(async ({ page }) => {
    goalInputPage = new GoalInputPage(page)
    smartGoalPage = new SmartGoalPage(page)
    
    await page.goto('/goal-strategy')
    await page.waitForLoadState('networkidle')
  })

  test('should focus on aspects below 90% and prioritize lowest scores', async ({ page }) => {
    // Test scenario 1: Goal with varying confidence scores
    const testGoal = {
      title: 'Learn a new programming language',
      criteria: {
        specific: { confidence: 85 },    // Below 90%
        measurable: { confidence: 40 },  // Lowest score - should be addressed first
        achievable: { confidence: 92 },  // Above 90% - should be skipped
        relevant: { confidence: 65 },    // Below 90%
        timeBound: { confidence: 30 }    // Very low - should be high priority
      }
    }

    // Enter goal and start clarification
    await goalInputPage.enterGoal(testGoal.title)
    await goalInputPage.clickTransformButton()
    
    // Wait for chat interface
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    
    // Track the order of components being addressed
    const componentOrder: string[] = []
    
    // Monitor which components are being clarified
    await page.on('response', async response => {
      if (response.url().includes('/api/v1/goals/component-question')) {
        const data = await response.json()
        if (data.data?.componentKey) {
          componentOrder.push(data.data.componentKey)
        }
      }
    })

    // Wait for first question
    await page.waitForSelector('[data-testid="bot-message"]', { timeout: 10000 })
    
    // Verify that the lowest confidence component (timeBound: 30%) is addressed first
    const firstQuestion = await page.locator('[data-testid="bot-message"]').last().textContent()
    expect(firstQuestion).toContain('time')
    expect(componentOrder[0]).toBe('timeBound')
    
    // Provide a weak answer to keep confidence below 90%
    await page.fill('[data-testid="chat-input"]', 'Maybe in a few months')
    await page.click('[data-testid="send-button"]')
    
    await page.waitForTimeout(2000)
    
    // Verify it continues with the same component (timeBound) since it's still below 90%
    const followUpQuestion = await page.locator('[data-testid="bot-message"]').last().textContent()
    expect(followUpQuestion).toMatch(/deadline|specific date|timeline/)
    
    // Provide a better answer to increase confidence above 90%
    await page.fill('[data-testid="chat-input"]', 'I will complete this by March 31st, 2025, with weekly progress checks')
    await page.click('[data-testid="send-button"]')
    
    await page.waitForTimeout(2000)
    
    // Now it should move to the next lowest component (measurable: 40%)
    const nextQuestion = await page.locator('[data-testid="bot-message"]').last().textContent()
    expect(nextQuestion).toMatch(/measure|track|metric/)
    expect(componentOrder[1]).toBe('measurable')
    
    // Verify achievable (92%) is skipped
    expect(componentOrder).not.toContain('achievable')
  })

  test('should skip aspects already above 90% confidence', async ({ page }) => {
    // Test scenario 2: Goal with some high-confidence aspects
    const testGoal = {
      title: 'Run a 5K race in under 25 minutes by April 1st',
      initialConfidences: {
        specific: 95,     // Above 90% - should skip
        measurable: 98,   // Above 90% - should skip
        achievable: 60,   // Below 90% - should clarify
        relevant: 45,     // Below 90% - should clarify
        timeBound: 93     // Above 90% - should skip
      }
    }

    // Mock API to return high confidence scores for certain aspects
    await page.route('**/api/v1/goals/translate', async route => {
      const response = {
        success: true,
        data: {
          id: 'test-goal-1',
          title: testGoal.title,
          criteria: {
            specific: { value: 'Run a 5K race', confidence: 95 },
            measurable: { value: 'Under 25 minutes', confidence: 98 },
            achievable: { value: 'Need to assess current fitness', confidence: 60 },
            relevant: { value: 'Not clear why this matters', confidence: 45 },
            timeBound: { value: 'April 1st deadline', confidence: 93 }
          }
        }
      }
      await route.fulfill({ json: response })
    })

    await goalInputPage.enterGoal(testGoal.title)
    await goalInputPage.clickTransformButton()
    
    // Track clarification requests
    const clarifiedComponents = new Set<string>()
    
    await page.on('request', request => {
      if (request.url().includes('/api/v1/goals/clarify')) {
        const postData = request.postData()
        if (postData) {
          const data = JSON.parse(postData)
          data.answers?.forEach((answer: any) => {
            clarifiedComponents.add(answer.smartCriterion)
          })
        }
      }
    })

    // Wait for chat to start
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    
    // Answer questions for low-confidence components
    for (let i = 0; i < 3; i++) {
      const question = await page.locator('[data-testid="bot-message"]').last().textContent()
      
      if (question?.includes('relevant') || question?.includes('why')) {
        await page.fill('[data-testid="chat-input"]', 'To improve my health and prove I can achieve fitness goals')
        await page.click('[data-testid="send-button"]')
      } else if (question?.includes('achievable') || question?.includes('realistic')) {
        await page.fill('[data-testid="chat-input"]', 'Yes, I currently run 5K in 28 minutes and have been training for 3 months')
        await page.click('[data-testid="send-button"]')
      }
      
      await page.waitForTimeout(2000)
    }

    // Verify high-confidence components were skipped
    expect(clarifiedComponents.has('specific')).toBe(false)
    expect(clarifiedComponents.has('measurable')).toBe(false)
    expect(clarifiedComponents.has('timeBound')).toBe(false)
    
    // Verify low-confidence components were addressed
    expect(clarifiedComponents.has('relevant')).toBe(true)
    expect(clarifiedComponents.has('achievable')).toBe(true)
  })

  test('should continue clarifying same aspect until 90% confidence reached', async ({ page }) => {
    // Test scenario 3: Persistent clarification of low-confidence aspect
    let clarificationAttempts = 0
    let currentComponent = ''
    
    // Track API calls
    await page.on('request', request => {
      if (request.url().includes('/api/v1/goals/component-question')) {
        const postData = request.postData()
        if (postData) {
          const data = JSON.parse(postData)
          if (currentComponent === data.componentKey) {
            clarificationAttempts++
          } else {
            currentComponent = data.componentKey
            clarificationAttempts = 1
          }
        }
      }
    })

    // Mock responses to simulate gradual confidence increase
    let measurableConfidence = 30
    await page.route('**/api/v1/goals/clarify', async route => {
      measurableConfidence += 25 // Increase by 25% each time
      const response = {
        success: true,
        data: {
          criteria: {
            measurable: { 
              value: 'Track progress with metrics', 
              confidence: measurableConfidence 
            }
          },
          needsFollowUp: measurableConfidence < 90
        }
      }
      await route.fulfill({ json: response })
    })

    await goalInputPage.enterGoal('Improve my coding skills')
    await goalInputPage.clickTransformButton()
    
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    
    // Answer multiple times for the same component
    for (let i = 0; i < 4; i++) {
      await page.waitForSelector('[data-testid="bot-message"]', { timeout: 10000 })
      const question = await page.locator('[data-testid="bot-message"]').last().textContent()
      
      if (question?.includes('measur')) {
        await page.fill('[data-testid="chat-input"]', `Attempt ${i + 1}: Complete ${i + 1} coding challenges`)
        await page.click('[data-testid="send-button"]')
        await page.waitForTimeout(2000)
      }
    }

    // Verify the same component was clarified multiple times until 90%
    expect(clarificationAttempts).toBeGreaterThan(2)
    expect(measurableConfidence).toBeGreaterThanOrEqual(90)
  })

  test('should not cycle through all aspects sequentially', async ({ page }) => {
    // Test scenario 4: Verify non-sequential processing
    const componentSequence: string[] = []
    
    await page.on('response', async response => {
      if (response.url().includes('/api/v1/goals/component-question')) {
        try {
          const data = await response.json()
          if (data.data?.componentKey) {
            componentSequence.push(data.data.componentKey)
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    })

    // Create a goal with specific confidence distribution
    await page.route('**/api/v1/goals/translate', async route => {
      const response = {
        success: true,
        data: {
          id: 'test-goal-2',
          title: 'Start a business',
          criteria: {
            specific: { confidence: 70 },    // Third lowest
            measurable: { confidence: 85 },  // Fourth lowest
            achievable: { confidence: 50 },  // Second lowest
            relevant: { confidence: 95 },    // Skip (above 90%)
            timeBound: { confidence: 20 }    // Lowest - should be first
          }
        }
      }
      await route.fulfill({ json: response })
    })

    await goalInputPage.enterGoal('Start a business')
    await goalInputPage.clickTransformButton()
    
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    
    // Interact with the chat to capture the sequence
    for (let i = 0; i < 3; i++) {
      await page.waitForSelector('[data-testid="bot-message"]', { timeout: 10000 })
      await page.fill('[data-testid="chat-input"]', 'Generic answer to move forward')
      await page.click('[data-testid="send-button"]')
      await page.waitForTimeout(2000)
    }

    // Verify the sequence is based on confidence scores, not alphabetical/sequential
    expect(componentSequence[0]).toBe('timeBound')  // Lowest (20%)
    expect(componentSequence[1]).toBe('achievable') // Second lowest (50%)
    expect(componentSequence[2]).toBe('specific')   // Third lowest (70%)
    
    // Verify it's not the default sequential order
    const sequentialOrder = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
    expect(componentSequence.slice(0, 3)).not.toEqual(sequentialOrder.slice(0, 3))
  })

  test('should handle edge case: all aspects above 90%', async ({ page }) => {
    // Test scenario 5: Goal with all high-confidence aspects
    await page.route('**/api/v1/goals/translate', async route => {
      const response = {
        success: true,
        data: {
          id: 'test-goal-3',
          title: 'Complete marathon in 4 hours by December 2025',
          criteria: {
            specific: { confidence: 92 },
            measurable: { confidence: 95 },
            achievable: { confidence: 91 },
            relevant: { confidence: 93 },
            timeBound: { confidence: 98 }
          },
          confidence: 94,
          needsRefinement: false
        }
      }
      await route.fulfill({ json: response })
    })

    await goalInputPage.enterGoal('Complete marathon in 4 hours by December 2025')
    await goalInputPage.clickTransformButton()
    
    // Should skip chat and go directly to completion
    await page.waitForSelector('[data-testid="goal-complete"]', { timeout: 10000 })
    
    const successMessage = await page.locator('[data-testid="success-message"]').textContent()
    expect(successMessage).toContain('Your goal is already well-defined')
  })

  test('should handle edge case: all aspects below 90%', async ({ page }) => {
    // Test scenario 6: Goal with all low-confidence aspects
    const clarificationOrder: string[] = []
    
    await page.route('**/api/v1/goals/translate', async route => {
      const response = {
        success: true,
        data: {
          id: 'test-goal-4',
          title: 'Be successful',
          criteria: {
            specific: { confidence: 20 },
            measurable: { confidence: 15 },  // Lowest
            achievable: { confidence: 25 },
            relevant: { confidence: 30 },
            timeBound: { confidence: 18 }
          }
        }
      }
      await route.fulfill({ json: response })
    })

    await page.on('request', request => {
      if (request.url().includes('/api/v1/goals/component-question')) {
        const postData = request.postData()
        if (postData) {
          const data = JSON.parse(postData)
          clarificationOrder.push(data.componentKey)
        }
      }
    })

    await goalInputPage.enterGoal('Be successful')
    await goalInputPage.clickTransformButton()
    
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    await page.waitForTimeout(2000)
    
    // Verify it starts with the lowest confidence
    expect(clarificationOrder[0]).toBe('measurable') // 15% - lowest
  })
})

test.describe('SMART Goal Clarification - User Experience', () => {
  test('should provide contextual feedback based on confidence improvement', async ({ page }) => {
    // Track feedback messages
    const feedbackMessages: string[] = []
    
    await page.on('response', async response => {
      if (response.url().includes('/api/v1/goals/clarify')) {
        try {
          const data = await response.json()
          if (data.data?.feedback) {
            feedbackMessages.push(data.data.feedback)
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    })

    const goalInputPage = new GoalInputPage(page)
    await page.goto('/goal-strategy')
    
    await goalInputPage.enterGoal('Learn something new')
    await goalInputPage.clickTransformButton()
    
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    
    // Provide increasingly specific answers
    const answers = [
      'Maybe programming',              // Vague
      'Python programming language',    // Better
      'Master Python for data science' // Specific
    ]
    
    for (const answer of answers) {
      await page.waitForSelector('[data-testid="bot-message"]', { timeout: 10000 })
      await page.fill('[data-testid="chat-input"]', answer)
      await page.click('[data-testid="send-button"]')
      await page.waitForTimeout(2000)
    }

    // Verify feedback improves with answer quality
    expect(feedbackMessages.some(msg => msg.includes('more specific'))).toBe(true)
    expect(feedbackMessages.some(msg => msg.includes('great') || msg.includes('excellent'))).toBe(true)
  })

  test('should save progress and allow resuming clarification', async ({ page }) => {
    const goalInputPage = new GoalInputPage(page)
    await page.goto('/goal-strategy')
    
    // Start clarification
    await goalInputPage.enterGoal('Build a mobile app')
    await goalInputPage.clickTransformButton()
    
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
    
    // Answer one question
    await page.waitForSelector('[data-testid="bot-message"]', { timeout: 10000 })
    await page.fill('[data-testid="chat-input"]', 'A fitness tracking app for iOS')
    await page.click('[data-testid="send-button"]')
    
    await page.waitForTimeout(2000)
    
    // Simulate interruption - refresh page
    await page.reload()
    
    // Should be able to resume
    await page.waitForSelector('[data-testid="resume-clarification"]', { timeout: 10000 })
    await page.click('[data-testid="resume-clarification"]')
    
    // Verify previous progress is maintained
    const chatHistory = await page.locator('[data-testid="chat-message"]').count()
    expect(chatHistory).toBeGreaterThan(2) // Should have previous messages
  })
})