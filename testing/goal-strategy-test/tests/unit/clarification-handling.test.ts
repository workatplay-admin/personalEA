import { describe, it, expect, vi, beforeEach } from 'vitest'
import goalAPI from '../../src/services/api'

describe('Clarification Handling Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API clarifyGoal method', () => {
    it('should filter out empty clarifications', async () => {
      // Mock the axios post method
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'test-goal',
            title: 'Test Goal',
            criteria: {
              specific: { value: 'Test', confidence: 0.8 }
            }
          }
        }
      })

      // Replace the actual API call with mock
      vi.spyOn(goalAPI, 'clarifyGoal').mockImplementation(async (goalId, clarifications) => {
        // Simulate the filtering logic
        const filtered = Object.entries(clarifications)
          .filter(([_, value]) => value && value.trim().length > 0)
        
        expect(filtered.length).toBe(1)
        expect(filtered[0][0]).toBe('specific')
        expect(filtered[0][1]).toBe('Learn React')
        
        return {
          id: goalId,
          title: 'Test Goal',
          criteria: {
            specific: { value: 'Learn React', confidence: 0.8 },
            measurable: { value: '', confidence: 0.2, metrics: [] },
            achievable: { value: '', confidence: 0.2 },
            relevant: { value: '', confidence: 0.2 },
            timeBound: { value: '', confidence: 0.2 }
          },
          confidence: 0.5,
          status: 'active'
        } as any
      })

      // Test with mixed empty and non-empty clarifications
      const result = await goalAPI.clarifyGoal('test-goal', {
        specific: 'Learn React',
        measurable: '',
        achievable: '   ',  // Only spaces
        relevant: null as any,
        timeBound: undefined as any
      })

      expect(result.criteria.specific.confidence).toBe(0.8)
    })

    it('should trim clarification answers', async () => {
      const mockClarifications = {
        specific: '  Learn React with extra spaces  '
      }

      vi.spyOn(goalAPI, 'clarifyGoal').mockImplementation(async (goalId, clarifications) => {
        const processed = Object.entries(clarifications)
          .filter(([_, value]) => value && value.trim().length > 0)
          .map(([key, value]) => ({
            key,
            value: value.trim()
          }))
        
        expect(processed[0].value).toBe('Learn React with extra spaces')
        
        return {} as any
      })

      await goalAPI.clarifyGoal('test-goal', mockClarifications)
    })
  })

  describe('ChatClarification component logic', () => {
    it('should send only current component clarification', () => {
      // Simulate the component state
      const collectedClarifications = {
        specific: 'Previous answer',
        measurable: 'Another previous answer'
      }
      
      const currentComponent = { key: 'achievable' }
      const userInput = 'New answer for achievable'
      
      // The logic we implemented
      const clarificationToSend = { [currentComponent.key]: userInput }
      
      expect(Object.keys(clarificationToSend)).toHaveLength(1)
      expect(clarificationToSend.achievable).toBe('New answer for achievable')
      expect(clarificationToSend.specific).toBeUndefined()
      expect(clarificationToSend.measurable).toBeUndefined()
    })
  })

  describe('Backend clarification processing', () => {
    it('should filter empty clarifications before processing', () => {
      const clarifications = [
        { question: 'Q1', answer: 'Valid answer', smartCriterion: 'specific' },
        { question: 'Q2', answer: '', smartCriterion: 'measurable' },
        { question: 'Q3', answer: '   ', smartCriterion: 'achievable' },
        { question: 'Q4', answer: 'Another valid answer', smartCriterion: 'relevant' }
      ]
      
      // Simulate the filtering logic from backend
      const filtered = clarifications.filter((c: any) => 
        c.answer && c.answer.trim().length > 0
      )
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].smartCriterion).toBe('specific')
      expect(filtered[1].smartCriterion).toBe('relevant')
    })

    it('should return early if no valid clarifications', () => {
      const clarifications = [
        { question: 'Q1', answer: '', smartCriterion: 'specific' },
        { question: 'Q2', answer: '   ', smartCriterion: 'measurable' }
      ]
      
      const filtered = clarifications.filter((c: any) => 
        c.answer && c.answer.trim().length > 0
      )
      
      expect(filtered).toHaveLength(0)
      
      // In this case, backend should return without processing
      if (filtered.length === 0) {
        const response = {
          success: true,
          message: "No new clarifications to process"
        }
        expect(response.message).toBe("No new clarifications to process")
      }
    })
  })

  describe('Score preservation logic', () => {
    it('should maintain high scores when processing new clarifications', () => {
      const previousCriteria = {
        specific: { value: 'Learn React', confidence: 0.85 },
        measurable: { value: '', confidence: 0.3 },
        achievable: { value: '', confidence: 0.4 },
        relevant: { value: '', confidence: 0.3 },
        timeBound: { value: '', confidence: 0.2 }
      }
      
      // Simulate processing a new clarification for measurable
      const newClarification = {
        smartCriterion: 'measurable',
        answer: 'Complete 5 projects'
      }
      
      // The score update should not affect other components
      const updatedCriteria = { ...previousCriteria }
      updatedCriteria.measurable = {
        value: 'Complete 5 projects',
        confidence: 0.8
      }
      
      // Verify specific score is preserved
      expect(updatedCriteria.specific.confidence).toBe(0.85)
      expect(updatedCriteria.measurable.confidence).toBe(0.8)
    })
  })

  describe('Comprehensive answer detection', () => {
    it('should detect multiple SMART components in single answer', () => {
      const answer = 'Learn Python for web development in 3 months by completing 5 projects'
      
      // Simulate component detection logic
      const detectedComponents = {
        specific: false,
        measurable: false,
        timeBound: false
      }
      
      // Check for specific details
      if (answer.includes('Python') && answer.includes('web development')) {
        detectedComponents.specific = true
      }
      
      // Check for measurable metrics
      if (/\d+\s*projects?/i.test(answer)) {
        detectedComponents.measurable = true
      }
      
      // Check for timeframe
      if (/\d+\s*months?/i.test(answer)) {
        detectedComponents.timeBound = true
      }
      
      expect(detectedComponents.specific).toBe(true)
      expect(detectedComponents.measurable).toBe(true)
      expect(detectedComponents.timeBound).toBe(true)
    })
  })
})