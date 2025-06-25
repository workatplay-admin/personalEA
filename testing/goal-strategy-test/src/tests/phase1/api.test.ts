import { describe, it, expect, beforeEach, vi } from 'vitest'
import { goalAPI, setApiConfig, clearApiConfig } from '../../services/api'
import { Goal } from '../../types'

describe('Phase 1: SMART Goal Translation API', () => {
  beforeEach(() => {
    clearApiConfig()
    setApiConfig({
      jwtToken: 'test-jwt-token',
      openaiApiKey: 'sk-test-api-key-for-testing'
    })
  })

  describe('translateToSmart', () => {
    it('should translate a raw goal to SMART format successfully', async () => {
      const rawGoal = 'Increase website traffic'
      
      const result = await goalAPI.translateToSmart(rawGoal)
      
      expect(result).toBeValidSMARTGoal()
      expect(result.title).toBeTruthy()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.correlation_id).toBeTruthy()
    })

    it('should handle specific goal content and return appropriate SMART criteria', async () => {
      const rawGoal = 'Increase sales by 25% in the next quarter'
      
      const result = await goalAPI.translateToSmart(rawGoal)
      
      expect(result).toBeValidSMARTGoal()
      expect(result.criteria.specific.confidence).toBeGreaterThan(0.5)
      expect(result.criteria.measurable.confidence).toBeGreaterThan(0.8) // Should be high for quantified goals
      expect(result.criteria.timeBound.confidence).toBeGreaterThan(0.7) // Should be high for time-specified goals
    })

    it('should return appropriate confidence levels for vague goals', async () => {
      const rawGoal = 'Be more successful'
      
      const result = await goalAPI.translateToSmart(rawGoal)
      
      expect(result).toBeValidSMARTGoal()
      expect(result.confidence).toBeLessThan(0.7) // Should have lower confidence for vague goals
      expect(result.missingCriteria.length).toBeGreaterThan(0)
      expect(result.clarificationQuestions.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid API configuration', async () => {
      clearApiConfig()
      
      await expect(goalAPI.translateToSmart('test goal')).rejects.toThrow(
        'API configuration not set'
      )
    })

    it('should throw error for missing OpenAI API key', async () => {
      setApiConfig({
        jwtToken: 'test-jwt-token',
        openaiApiKey: ''
      })
      
      await expect(goalAPI.translateToSmart('test goal')).rejects.toThrow(
        'OpenAI API key missing'
      )
    })

    it('should throw error for invalid API key format', async () => {
      setApiConfig({
        jwtToken: 'test-jwt-token',
        openaiApiKey: 'invalid-key-format'
      })
      
      await expect(goalAPI.translateToSmart('test goal')).rejects.toThrow(
        'Invalid OpenAI API key format'
      )
    })

    it('should handle server errors gracefully', async () => {
      await expect(goalAPI.translateToSmart('error')).rejects.toThrow(
        'Server error processing goal'
      )
    })

    it('should handle invalid goal input', async () => {
      await expect(goalAPI.translateToSmart('invalid')).rejects.toThrow(
        'Invalid goal format'
      )
    })

    it('should include cache-busting parameters in requests', async () => {
      const spy = vi.spyOn(global, 'fetch')
      
      try {
        await goalAPI.translateToSmart('test goal')
      } catch (error) {
        // Expected to fail due to mock setup, but we want to check the request
      }
      
      // Check that cache-busting parameters are included
      const callUrl = spy.mock.calls[0]?.[0] as string
      expect(callUrl).toMatch(/[?&]t=\d+/)
      expect(callUrl).toMatch(/[?&]cb=[a-z0-9]+/)
    })
  })

  describe('clarifyGoal', () => {
    const mockGoal: Goal = {
      id: 'test-goal-1',
      title: 'Test Goal',
      criteria: {
        specific: { value: 'Test specific', confidence: 0.8, missing: [] },
        measurable: { value: 'Test measurable', confidence: 0.7, missing: [], metrics: [] },
        achievable: { value: 'Test achievable', confidence: 0.6, missing: ['budget'] },
        relevant: { value: 'Test relevant', confidence: 0.9, missing: [] },
        timeBound: { value: 'Test timebound', confidence: 0.8, missing: [] }
      },
      missingCriteria: ['budget'],
      clarificationQuestions: ['What is the budget?'],
      confidence: 0.76
    }

    it('should clarify goal with provided clarifications', async () => {
      const clarifications = {
        budget: '$10,000 quarterly budget available'
      }
      
      const result = await goalAPI.clarifyGoal(
        mockGoal.id,
        clarifications,
        { title: mockGoal.title, originalGoal: 'Original goal text' }
      )
      
      expect(result).toBeValidSMARTGoal()
      expect(result.confidence).toBeGreaterThan(mockGoal.confidence)
      expect(result.missingCriteria).not.toContain('budget')
    })

    it('should handle conversation history for context', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I want to improve my website' },
        { role: 'assistant', content: 'What specific aspect would you like to improve?' },
        { role: 'user', content: 'The conversion rate' }
      ]
      
      const result = await goalAPI.clarifyGoal(
        mockGoal.id,
        { specific: 'Improve conversion rate' },
        { title: mockGoal.title },
        conversationHistory
      )
      
      expect(result).toBeValidSMARTGoal()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should throw error for missing goal ID', async () => {
      await expect(goalAPI.clarifyGoal('', {}, {})).rejects.toThrow()
    })
  })

  describe('generateContextualHelp', () => {
    const mockGoal: Goal = {
      id: 'test-goal-1',
      title: 'Increase website conversions',
      criteria: {
        specific: { value: 'Increase conversions', confidence: 0.6, missing: [] },
        measurable: { value: 'Not specified', confidence: 0.3, missing: [], metrics: [] },
        achievable: { value: 'Unknown feasibility', confidence: 0.4, missing: [] },
        relevant: { value: 'Business growth', confidence: 0.8, missing: [] },
        timeBound: { value: 'No timeline', confidence: 0.2, missing: [] }
      },
      missingCriteria: ['timeline', 'metrics'],
      clarificationQuestions: [],
      confidence: 0.46
    }

    it('should generate specific help for measurable component', async () => {
      const result = await goalAPI.generateContextualHelp(
        mockGoal.title,
        'measurable',
        [],
        mockGoal
      )
      
      expect(result.helpMessage).toBeTruthy()
      expect(result.helpMessage.toLowerCase()).toContain('measur')
    })

    it('should generate specific help for time-bound component', async () => {
      const result = await goalAPI.generateContextualHelp(
        mockGoal.title,
        'timeBound',
        [],
        mockGoal
      )
      
      expect(result.helpMessage).toBeTruthy()
      expect(result.helpMessage.toLowerCase()).toMatch(/time|deadline|timeframe/)
    })

    it('should use conversation history for context', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I need help with making my goal more specific' },
        { role: 'assistant', content: 'What specific outcome are you trying to achieve?' }
      ]
      
      const result = await goalAPI.generateContextualHelp(
        mockGoal.title,
        'specific',
        conversationHistory,
        mockGoal
      )
      
      expect(result.helpMessage).toBeTruthy()
    })
  })

  describe('generateComponentQuestion', () => {
    const mockGoal: Goal = {
      id: 'test-goal-1',
      title: 'Launch new product',
      criteria: {
        specific: { value: 'Launch product', confidence: 0.5, missing: [] },
        measurable: { value: 'Not specified', confidence: 0.2, missing: [], metrics: [] },
        achievable: { value: 'Unknown', confidence: 0.3, missing: [] },
        relevant: { value: 'Business expansion', confidence: 0.7, missing: [] },
        timeBound: { value: 'Soon', confidence: 0.4, missing: [] }
      },
      missingCriteria: [],
      clarificationQuestions: [],
      confidence: 0.42
    }

    it('should generate appropriate question for low-confidence specific component', async () => {
      const result = await goalAPI.generateComponentQuestion(
        mockGoal.title,
        'specific',
        'Launch product',
        0.5,
        false,
        mockGoal
      )
      
      expect(result.question).toBeTruthy()
      expect(result.question).toContain(mockGoal.title)
      expect(result.question.toLowerCase()).toMatch(/specific|outcome|scope|deliverable/)
    })

    it('should generate measurement-focused question for measurable component', async () => {
      const result = await goalAPI.generateComponentQuestion(
        mockGoal.title,
        'measurable',
        'Not specified',
        0.2,
        false,
        mockGoal
      )
      
      expect(result.question).toBeTruthy()
      expect(result.question.toLowerCase()).toMatch(/measure|metric|indicator/)
    })

    it('should handle high-confidence components differently', async () => {
      const result = await goalAPI.generateComponentQuestion(
        mockGoal.title,
        'relevant',
        'Business expansion',
        0.9,
        true,
        mockGoal
      )
      
      expect(result.question).toBeTruthy()
      // Should still provide a question but potentially different in tone
    })
  })

  describe('SMART Criteria Validation', () => {
    it('should validate specific criteria completeness', async () => {
      const result = await goalAPI.translateToSmart('Increase revenue by 15% through better customer retention in Q2 2024')
      
      expect(result.criteria.specific.value).toBeTruthy()
      expect(result.criteria.specific.confidence).toBeGreaterThan(0.7)
      expect(result.criteria.specific.missing).toBeDefined()
    })

    it('should validate measurable criteria with metrics', async () => {
      const result = await goalAPI.translateToSmart('Reduce customer churn rate from 5% to 3% within 6 months')
      
      expect(result.criteria.measurable.value).toBeTruthy()
      expect(result.criteria.measurable.confidence).toBeGreaterThan(0.8)
      expect(result.criteria.measurable.metrics).toBeDefined()
      expect(result.criteria.measurable.metrics.length).toBeGreaterThan(0)
    })

    it('should validate achievable criteria assessment', async () => {
      const result = await goalAPI.translateToSmart('Double company revenue in 30 days')
      
      expect(result.criteria.achievable.value).toBeTruthy()
      expect(result.criteria.achievable.confidence).toBeLessThan(0.7) // Should be low for unrealistic goals
      expect(result.criteria.achievable.missing).toBeDefined()
    })

    it('should validate relevant criteria alignment', async () => {
      const result = await goalAPI.translateToSmart('Improve employee satisfaction scores by 20%')
      
      expect(result.criteria.relevant.value).toBeTruthy()
      expect(result.criteria.relevant.confidence).toBeGreaterThan(0.6)
    })

    it('should validate time-bound criteria with deadlines', async () => {
      const result = await goalAPI.translateToSmart('Launch mobile app by December 31st, 2024')
      
      expect(result.criteria.timeBound.value).toBeTruthy()
      expect(result.criteria.timeBound.confidence).toBeGreaterThan(0.8)
      expect(result.criteria.timeBound.deadline).toBeTruthy()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network Error'))
      
      await expect(goalAPI.translateToSmart('test goal')).rejects.toThrow(
        'Network connection failed'
      )
    })

    it('should handle timeout errors', async () => {
      // This test would timeout in real scenario
      const timeoutPromise = goalAPI.translateToSmart('timeout')
      
      // The mock should handle timeout scenario
      await expect(timeoutPromise).resolves.toBeDefined()
    })

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ malformed: 'response' })
      } as Response)
      
      await expect(goalAPI.translateToSmart('test goal')).rejects.toThrow()
    })

    it('should handle empty or null goal input', async () => {
      await expect(goalAPI.translateToSmart('')).rejects.toThrow()
      await expect(goalAPI.translateToSmart(null as any)).rejects.toThrow()
      await expect(goalAPI.translateToSmart(undefined as any)).rejects.toThrow()
    })
  })

  describe('Performance and Optimization', () => {
    it('should complete goal translation within acceptable time', async () => {
      const start = Date.now()
      
      await goalAPI.translateToSmart('Optimize website performance')
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(12000) // Should complete within 12 seconds
    })

    it('should handle concurrent requests efficiently', async () => {
      const goals = [
        'Increase sales',
        'Improve customer satisfaction',
        'Reduce costs',
        'Expand market reach'
      ]
      
      const start = Date.now()
      const promises = goals.map(goal => goalAPI.translateToSmart(goal))
      const results = await Promise.all(promises)
      const duration = Date.now() - start
      
      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result).toBeValidSMARTGoal()
      })
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(15000)
    })
  })
})