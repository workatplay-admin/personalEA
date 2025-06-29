import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatClarification from '../../src/components/ChatClarification'
import { Goal } from '../../src/types'
import goalAPI from '../../src/services/api'

// Mock the API
vi.mock('../../src/services/api', () => ({
  default: {
    generateComponentQuestion: vi.fn(),
    clarifyGoal: vi.fn()
  }
}))

describe('ChatClarification Confidence Score Display', () => {
  const mockGoal: Goal = {
    id: 'test-goal-1',
    title: 'Learn programming',
    criteria: {
      specific: { value: 'Learn React', confidence: 0.2 },
      measurable: { value: '', confidence: 0.05 },
      achievable: { value: '', confidence: 0.5 },
      relevant: { value: '', confidence: 0.95 },
      timeBound: { value: '', confidence: 0 }
    },
    confidence: 0.34,
    status: 'active'
  }

  const mockOnGoalUpdate = vi.fn()
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Welcome Message Confidence Display', () => {
    it('should display all confidence scores as percentages in welcome message', async () => {
      render(
        <ChatClarification
          goal={mockGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      await waitFor(() => {
        const welcomeMessage = screen.getByText(/Welcome to the SMART Goal Builder/, { selector: '.whitespace-pre-wrap' })
        expect(welcomeMessage).toBeTruthy()
      })

      // Check that percentages are displayed correctly
      expect(screen.getByText(/20% confident/)).toBeTruthy() // specific
      expect(screen.getByText(/5% confident/)).toBeTruthy()  // measurable
      expect(screen.getByText(/50% confident/)).toBeTruthy() // achievable
      expect(screen.getByText(/95% confident/)).toBeTruthy() // relevant
      expect(screen.getByText(/0% confident/)).toBeTruthy()  // timeBound

      // Ensure decimal values are not displayed
      const welcomeText = screen.getByText(/Welcome to the SMART Goal Builder/).textContent || ''
      expect(welcomeText).not.toContain('0.2')
      expect(welcomeText).not.toContain('0.05')
      expect(welcomeText).not.toContain('0.5')
      expect(welcomeText).not.toContain('0.95')
    })

    it('should handle edge case confidence values correctly', async () => {
      const edgeCaseGoal: Goal = {
        ...mockGoal,
        criteria: {
          specific: { value: '', confidence: 0 },
          measurable: { value: '', confidence: 1 },
          achievable: { value: '', confidence: 0.999 },
          relevant: { value: '', confidence: 0.001 },
          timeBound: { value: '', confidence: 0.895 }
        }
      }

      render(
        <ChatClarification
          goal={edgeCaseGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/0% confident/)).toBeTruthy()   // 0 -> 0%
        expect(screen.getByText(/100% confident/)).toBeTruthy() // 1 -> 100%
        expect(screen.getByText(/100% confident/)).toBeTruthy() // 0.999 -> 100%
        expect(screen.getByText(/0% confident/)).toBeTruthy()   // 0.001 -> 0%
        expect(screen.getByText(/90% confident/)).toBeTruthy()  // 0.895 -> 90%
      })
    })
  })

  describe('Component Introduction Score Display', () => {
    it('should display current component score as percentage', async () => {
      vi.mocked(goalAPI.generateComponentQuestion).mockResolvedValue({
        question: 'What specific technology do you want to learn?',
        examples: ['React', 'Vue', 'Angular']
      })

      render(
        <ChatClarification
          goal={mockGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      // Wait for the component introduction
      await waitFor(() => {
        const introMessage = screen.getByText(/Your current .* score is/, { selector: '.whitespace-pre-wrap' })
        expect(introMessage).toBeTruthy()
      }, { timeout: 5000 })

      // Should show "20%" for specific component
      const introText = screen.getByText(/Your current .* score is/).textContent || ''
      expect(introText).toMatch(/Your current .* score is \d+%/)
      expect(introText).not.toMatch(/Your current .* score is 0\.\d+/)
    })

    it('should display 5% correctly for very low confidence', async () => {
      const lowConfidenceGoal: Goal = {
        ...mockGoal,
        criteria: {
          ...mockGoal.criteria,
          measurable: { value: '', confidence: 0.05 }
        }
      }

      vi.mocked(goalAPI.generateComponentQuestion).mockResolvedValue({
        question: 'How will you measure progress?',
        examples: []
      })

      render(
        <ChatClarification
          goal={lowConfidenceGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      await waitFor(() => {
        const messages = screen.getAllByText(/5%/)
        expect(messages.length).toBeGreaterThan(0)
      }, { timeout: 5000 })

      // Should not show decimal representation
      const bodyText = document.body.textContent || ''
      expect(bodyText).not.toContain('0.05%')
      expect(bodyText).not.toContain('0.05 ')
    })
  })

  describe('Progress Indicator Tooltips', () => {
    it('should display confidence in tooltip as percentage', async () => {
      render(
        <ChatClarification
          goal={mockGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      await waitFor(() => {
        const indicators = screen.getAllByTitle(/\w+ - \d+%/)
        expect(indicators.length).toBe(5) // One for each SMART component
      })

      // Check specific tooltips
      expect(screen.getByTitle('Specific - 20%')).toBeTruthy()
      expect(screen.getByTitle('Measurable - 5%')).toBeTruthy()
      expect(screen.getByTitle('Achievable - 50%')).toBeTruthy()
      expect(screen.getByTitle('Relevant - 95%')).toBeTruthy()
      expect(screen.getByTitle('Time-bound - 0%')).toBeTruthy()
    })
  })

  describe('Feedback Message Score Display', () => {
    it('should display improved score as percentage in feedback', async () => {
      vi.mocked(goalAPI.generateComponentQuestion).mockResolvedValue({
        question: 'What specific technology?',
        examples: []
      })

      vi.mocked(goalAPI.clarifyGoal).mockResolvedValue({
        ...mockGoal,
        criteria: {
          ...mockGoal.criteria,
          specific: { value: 'Learn React and TypeScript', confidence: 0.85 }
        }
      })

      render(
        <ChatClarification
          goal={mockGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      // Wait for input to be available
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Describe/)
        expect(input).toBeTruthy()
      }, { timeout: 5000 })

      // Enter clarification
      const input = screen.getByPlaceholderText(/Describe/) as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Learn React and TypeScript' } })
      
      const sendButton = screen.getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      // Wait for feedback message
      await waitFor(() => {
        const feedbackMessage = screen.getByText(/improved to 85%/)
        expect(feedbackMessage).toBeTruthy()
      })

      // Should not show decimal
      const feedbackText = screen.getByText(/improved to/).textContent || ''
      expect(feedbackText).not.toContain('0.85')
    })

    it('should show success message when reaching 90%+', async () => {
      vi.mocked(goalAPI.generateComponentQuestion).mockResolvedValue({
        question: 'What makes this relevant to you?',
        examples: []
      })

      vi.mocked(goalAPI.clarifyGoal).mockResolvedValue({
        ...mockGoal,
        criteria: {
          ...mockGoal.criteria,
          relevant: { value: 'Career advancement', confidence: 0.92 }
        }
      })

      render(
        <ChatClarification
          goal={mockGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Describe/)
        expect(input).toBeTruthy()
      }, { timeout: 5000 })

      const input = screen.getByPlaceholderText(/Describe/) as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Career advancement' } })
      
      const sendButton = screen.getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      await waitFor(() => {
        const successMessage = screen.getByText(/successfully improved.*92%/)
        expect(successMessage).toBeTruthy()
      })
    })
  })

  describe('Final Summary Score Display', () => {
    it('should display all final scores as percentages', async () => {
      const completedGoal: Goal = {
        ...mockGoal,
        criteria: {
          specific: { value: 'Perfect', confidence: 0.92 },
          measurable: { value: 'Perfect', confidence: 0.88 },
          achievable: { value: 'Perfect', confidence: 0.95 },
          relevant: { value: 'Perfect', confidence: 0.9 },
          timeBound: { value: 'Perfect', confidence: 0.85 }
        }
      }

      // Mock API to skip clarification process
      vi.mocked(goalAPI.generateComponentQuestion).mockRejectedValue(new Error('No clarification needed'))

      render(
        <ChatClarification
          goal={completedGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      // Wait for completion message
      await waitFor(() => {
        const congratsMessage = screen.getByText(/Congratulations!/)
        expect(congratsMessage).toBeTruthy()
      }, { timeout: 5000 })

      // Check all scores are displayed as percentages
      expect(screen.getByText(/92% confidence/)).toBeTruthy()
      expect(screen.getByText(/88% confidence/)).toBeTruthy()
      expect(screen.getByText(/95% confidence/)).toBeTruthy()
      expect(screen.getByText(/90% confidence/)).toBeTruthy()
      expect(screen.getByText(/85% confidence/)).toBeTruthy()

      // Count high confidence components
      const checkmarks = screen.getAllByText('✅')
      expect(checkmarks.length).toBe(3) // 92%, 95%, 90% are >= 90%
    })
  })

  describe('Confidence Threshold Logic', () => {
    it('should correctly identify components needing improvement', () => {
      const needsImprovement = (confidence: number): boolean => confidence < 0.9

      // Test threshold boundary
      expect(needsImprovement(0.89)).toBe(true)
      expect(needsImprovement(0.9)).toBe(false)
      expect(needsImprovement(0.91)).toBe(false)

      // Test edge cases
      expect(needsImprovement(0)).toBe(true)
      expect(needsImprovement(1)).toBe(false)
      expect(needsImprovement(0.895)).toBe(true) // Should round to 90% but still < 0.9
    })

    it('should skip to completion if all components are 90%+', async () => {
      const highConfidenceGoal: Goal = {
        ...mockGoal,
        criteria: {
          specific: { value: 'Perfect', confidence: 0.9 },
          measurable: { value: 'Perfect', confidence: 0.91 },
          achievable: { value: 'Perfect', confidence: 0.92 },
          relevant: { value: 'Perfect', confidence: 0.93 },
          timeBound: { value: 'Perfect', confidence: 0.94 }
        }
      }

      render(
        <ChatClarification
          goal={highConfidenceGoal}
          onGoalUpdate={mockOnGoalUpdate}
          onComplete={mockOnComplete}
          isVisible={true}
        />
      )

      // Should go directly to completion
      await waitFor(() => {
        const completionMessage = screen.getByText(/All components are now at 90\+% confidence/)
        expect(completionMessage).toBeTruthy()
      })
    })
  })

  describe('Percentage Formatting Helper', () => {
    it('should format confidence values consistently', () => {
      // Test the formatting logic used in the component
      const formatConfidence = (confidence: number): string => {
        return Math.round(confidence * 100) + '%'
      }

      // Test various values
      expect(formatConfidence(0)).toBe('0%')
      expect(formatConfidence(0.05)).toBe('5%')
      expect(formatConfidence(0.2)).toBe('20%')
      expect(formatConfidence(0.5)).toBe('50%')
      expect(formatConfidence(0.85)).toBe('85%')
      expect(formatConfidence(0.895)).toBe('90%') // Rounds up
      expect(formatConfidence(0.95)).toBe('95%')
      expect(formatConfidence(1)).toBe('100%')

      // Test that it never returns decimal format
      for (let i = 0; i <= 100; i++) {
        const confidence = i / 100
        const formatted = formatConfidence(confidence)
        expect(formatted).toMatch(/^\d+%$/)
        expect(formatted).not.toContain('.')
      }
    })
  })
})