import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SMARTGoalProcessor } from '@/services/smart-goal-processor'

/**
 * Unit Tests for LLM Delegation Validation
 * Ensures the SMARTGoalProcessor properly delegates to LLM without heavy processing
 */

describe('LLM Delegation Validation', () => {
  let processor: SMARTGoalProcessor
  let mockFetch: any

  beforeEach(() => {
    processor = new SMARTGoalProcessor()
    
    // Mock fetch to intercept OpenAI API calls
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  describe('translateGoal', () => {
    it('should pass raw goal to LLM without pre-processing', async () => {
      const rawGoal = 'I want to learn guitar'
      const mockLLMResponse = {
        smartGoal: 'Learn to play 5 songs on guitar within 3 months',
        smartCriteria: {
          specific: { value: 'Learn to play 5 songs on guitar', confidence: 0.85 },
          measurable: { value: 'Play 5 complete songs', metrics: ['5 songs'], confidence: 0.9 },
          achievable: { value: 'Realistic with daily practice', confidence: 0.8 },
          relevant: { value: 'Personal enjoyment and skill development', confidence: 0.75 },
          timeBound: { value: 'Within 3 months', deadline: '3 months', confidence: 0.95 }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.85
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }]
        })
      })

      const result = await processor.translateGoal({ goal: rawGoal })

      // Verify the raw goal was sent to LLM
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.messages[1].content).toContain(rawGoal)

      // Verify result matches LLM response without manipulation
      expect(result.smartGoal).toBe(mockLLMResponse.smartGoal)
      expect(result.confidence).toBe(mockLLMResponse.confidence)
      expect(result.smartCriteria.specific.confidence).toBe(0.85)
    })

    it('should not recalculate confidence scores from LLM', async () => {
      const mockLLMResponse = {
        smartGoal: 'Test goal',
        smartCriteria: {
          specific: { value: 'Test', confidence: 0.45 }, // Low confidence
          measurable: { value: 'Test', metrics: [], confidence: 0.3 },
          achievable: { value: 'Test', confidence: 0.6 },
          relevant: { value: 'Test', confidence: 0.2 },
          timeBound: { value: 'Test', confidence: 0.9 }
        },
        missingCriteria: ['specific', 'measurable', 'relevant'],
        clarificationQuestions: ['Need more details'],
        confidence: 0.49 // Overall low confidence
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }]
        })
      })

      const result = await processor.translateGoal({ goal: 'vague goal' })

      // App should not boost or recalculate these scores
      expect(result.smartCriteria.specific.confidence).toBe(0.45)
      expect(result.smartCriteria.measurable.confidence).toBe(0.3)
      expect(result.smartCriteria.relevant.confidence).toBe(0.2)
      expect(result.confidence).toBe(0.49)
    })
  })

  describe('processClarifications', () => {
    it('should send clarifications to LLM without pattern detection', async () => {
      const originalGoal = 'get fit'
      const smartCriteria = {
        specific: { value: 'get fit', confidence: 0.3, missing: ['details'] },
        measurable: { value: 'unknown', metrics: [], confidence: 0.2, missing: ['metrics'] },
        achievable: { value: 'unknown', confidence: 0.4, missing: [] },
        relevant: { value: 'health', confidence: 0.5, missing: [] },
        timeBound: { value: 'unknown', confidence: 0.1, missing: ['timeframe'] }
      }
      const answers = [
        { question: 'When?', answer: 'in 6 months', smartCriterion: 'timeBound' }
      ]

      const mockLLMResponse = {
        smartGoal: 'Get fit within 6 months',
        smartCriteria: {
          specific: { value: 'get fit', confidence: 0.3 },
          measurable: { value: 'unknown', metrics: [], confidence: 0.2 },
          achievable: { value: 'unknown', confidence: 0.4 },
          relevant: { value: 'health', confidence: 0.5 },
          timeBound: { value: 'within 6 months', confidence: 0.9 } // LLM decides the score
        },
        missingCriteria: ['specific', 'measurable'],
        clarificationQuestions: ['What does fit mean to you?'],
        confidence: 0.46
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }]
        })
      })

      const result = await processor.processClarifications(
        originalGoal,
        smartCriteria as any,
        answers as any
      )

      // Verify LLM response is used directly
      expect(result.smartCriteria.timeBound.confidence).toBe(0.9)
      expect(result.confidence).toBe(0.46)
      
      // The app should not have boosted the score based on detecting "6 months"
      // Pattern detection methods should not override LLM scores
    })

    it('should not use pattern detection to override LLM scores', async () => {
      const answers = [
        { 
          question: 'How much weight?', 
          answer: 'I want to lose 20 pounds', // Contains number pattern
          smartCriterion: 'measurable' 
        }
      ]

      const mockLLMResponse = {
        smartGoal: 'Lose 20 pounds',
        smartCriteria: {
          specific: { value: 'Lose weight', confidence: 0.6 },
          measurable: { 
            value: 'Lose 20 pounds', 
            metrics: ['20 pounds'], 
            confidence: 0.5 // LLM gives moderate confidence despite clear number
          },
          achievable: { value: 'Unknown', confidence: 0.3 },
          relevant: { value: 'Health', confidence: 0.4 },
          timeBound: { value: 'Unknown', confidence: 0.2 }
        },
        missingCriteria: ['timeBound', 'achievable'],
        clarificationQuestions: ['By when do you want to lose this weight?'],
        confidence: 0.4
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }]
        })
      })

      const result = await processor.processClarifications(
        'lose weight',
        {} as any,
        answers as any
      )

      // App should respect LLM's confidence assessment
      expect(result.smartCriteria.measurable.confidence).toBe(0.5)
      // Not artificially boosted to 0.85 by pattern detection
    })
  })

  describe('analyzeGoalInteractive', () => {
    it('should analyze without transforming the goal', async () => {
      const input = { goal: 'start a business' }
      
      const mockAnalysis = {
        rawGoal: 'start a business',
        analysis: {
          strengths: ['Clear intent'],
          weaknesses: ['Lacks specifics', 'No timeline'],
          suggestions: ['Define business type', 'Set launch date']
        },
        smartComponents: {
          specific: { present: false, description: 'Type of business not specified' },
          measurable: { present: false, description: 'No success metrics defined' },
          achievable: { present: false, description: 'Resources not assessed' },
          relevant: { present: true, description: 'Entrepreneurial goal' },
          timeBound: { present: false, description: 'No timeline provided' }
        },
        confidence: 0.3,
        recommendedQuestions: [
          'What type of business?',
          'When do you want to launch?',
          'What resources do you have?'
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAnalysis) } }]
        })
      })

      const result = await processor.analyzeGoalInteractive(input)

      // Verify goal was not transformed
      expect(result.rawGoal).toBe(input.goal)
      expect(result.analysis).toEqual(mockAnalysis.analysis)
      expect(result.confidence).toBe(0.3)
      
      // Verify it's an analysis, not a transformation
      expect(result).not.toHaveProperty('smartGoal')
    })
  })

  describe('Prompt validation', () => {
    it('should use prompts that delegate intelligence to LLM', async () => {
      const rawGoal = 'exercise more'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            smartGoal: 'Exercise 3 times per week',
            smartCriteria: {
              specific: { value: 'Exercise', confidence: 0.4 },
              measurable: { value: '3 times per week', metrics: ['3 times'], confidence: 0.8 },
              achievable: { value: 'Yes', confidence: 0.7 },
              relevant: { value: 'Health', confidence: 0.6 },
              timeBound: { value: 'Weekly', confidence: 0.5 }
            },
            missingCriteria: ['specific'],
            clarificationQuestions: ['What type of exercise?'],
            confidence: 0.6
          }) } }]
        })
      })

      await processor.translateGoal({ goal: rawGoal })

      // Check that the prompt asks LLM to analyze and score
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      const prompt = requestBody.messages[1].content

      // Prompt should ask LLM to provide confidence scores
      expect(prompt).toContain('confidence score')
      expect(prompt).toContain('Confidence score (0-1)')
      
      // Prompt should not contain app-side pattern matching logic
      expect(prompt).not.toContain('detectTimeframe')
      expect(prompt).not.toContain('detectMetrics')
      expect(prompt).not.toContain('recalculate')
    })
  })
})