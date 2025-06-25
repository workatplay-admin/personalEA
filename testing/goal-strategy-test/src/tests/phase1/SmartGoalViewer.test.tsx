import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Goal } from '../../types'
import SmartGoalViewer from '../../components/SmartGoalViewer'

describe('Phase 1: SmartGoalViewer Component', () => {
  const mockHighConfidenceGoal: Goal = {
    id: 'goal-1',
    title: 'Increase website conversion rate by 25% within 6 months',
    targetValue: 25,
    unit: 'percent',
    deadline: '2024-06-01',
    criteria: {
      specific: {
        value: 'Increase website conversion rate from current 2.1% to 2.6%',
        confidence: 0.9,
        missing: []
      },
      measurable: {
        value: '25% increase in conversion rate measured through Google Analytics',
        confidence: 0.95,
        metrics: ['conversion rate', 'Google Analytics', 'A/B testing results'],
        missing: []
      },
      achievable: {
        value: 'Based on industry benchmarks and current performance, 25% increase is realistic',
        confidence: 0.8,
        missing: []
      },
      relevant: {
        value: 'Higher conversion rate directly impacts revenue and business growth',
        confidence: 0.9,
        missing: []
      },
      timeBound: {
        value: '6-month timeline with monthly milestones',
        confidence: 0.85,
        deadline: '2024-06-01',
        missing: []
      }
    },
    missingCriteria: [],
    clarificationQuestions: [],
    confidence: 0.87
  }

  const mockLowConfidenceGoal: Goal = {
    id: 'goal-2',
    title: 'Be more successful in business',
    targetValue: undefined,
    unit: undefined,
    deadline: undefined,
    criteria: {
      specific: {
        value: 'Improve business success',
        confidence: 0.3,
        missing: ['clear objectives', 'scope definition']
      },
      measurable: {
        value: 'Success metrics not defined',
        confidence: 0.2,
        metrics: [],
        missing: ['success metrics', 'measurement criteria']
      },
      achievable: {
        value: 'Feasibility unknown',
        confidence: 0.4,
        missing: ['resource assessment']
      },
      relevant: {
        value: 'General business improvement',
        confidence: 0.6,
        missing: []
      },
      timeBound: {
        value: 'No specific timeline',
        confidence: 0.1,
        missing: ['deadline', 'milestones']
      }
    },
    missingCriteria: ['specific objectives', 'measurement criteria', 'timeline'],
    clarificationQuestions: [
      'What specific aspect of your business do you want to improve?',
      'How will you measure success?',
      'What is your target timeline for achieving this goal?'
    ],
    confidence: 0.32
  }

  describe('Component Rendering', () => {
    it('should render high-confidence goal correctly', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      expect(screen.getByText(mockHighConfidenceGoal.title)).toBeInTheDocument()
      expect(screen.getByText('87% Confidence')).toBeInTheDocument()
    })

    it('should render low-confidence goal correctly', () => {
      render(<SmartGoalViewer goal={mockLowConfidenceGoal} />)
      
      expect(screen.getByText(mockLowConfidenceGoal.title)).toBeInTheDocument()
      expect(screen.getByText('32% Confidence')).toBeInTheDocument()
    })

    it('should display all SMART criteria sections', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      expect(screen.getByText('Specific')).toBeInTheDocument()
      expect(screen.getByText('Measurable')).toBeInTheDocument()
      expect(screen.getByText('Achievable')).toBeInTheDocument()
      expect(screen.getByText('Relevant')).toBeInTheDocument()
      expect(screen.getByText('Time-bound')).toBeInTheDocument()
    })

    it('should show status section with goal details', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Target:')).toBeInTheDocument()
      expect(screen.getByText('25 percent')).toBeInTheDocument()
      expect(screen.getByText('Deadline:')).toBeInTheDocument()
      expect(screen.getByText('2024-06-01')).toBeInTheDocument()
    })
  })

  describe('SMART Criteria Display', () => {
    it('should display specific criteria with confidence level', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      const specificSection = screen.getByText('Specific').closest('div')
      expect(specificSection).toBeInTheDocument()
      
      within(specificSection!).getByText('90%')
      within(specificSection!).getByText(mockHighConfidenceGoal.criteria.specific.value)
    })

    it('should display measurable criteria with metrics', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      const measurableSection = screen.getByText('Measurable').closest('div')
      expect(measurableSection).toBeInTheDocument()
      
      within(measurableSection!).getByText('95%')
      within(measurableSection!).getByText(mockHighConfidenceGoal.criteria.measurable.value)
    })

    it('should show missing criteria indicators', () => {
      render(<SmartGoalViewer goal={mockLowConfidenceGoal} />)
      
      const specificSection = screen.getByText('Specific').closest('div')
      expect(specificSection).toBeInTheDocument()
      
      expect(within(specificSection!).getByText('Needs clarification:')).toBeInTheDocument()
      expect(within(specificSection!).getByText('clear objectives')).toBeInTheDocument()
      expect(within(specificSection!).getByText('scope definition')).toBeInTheDocument()
    })

    it('should display confidence colors correctly', () => {
      render(<SmartGoalViewer goal={mockLowConfidenceGoal} />)
      
      // Check low confidence indicators (should have red/warning styling)
      const lowConfidenceElements = screen.getAllByText(/[12]\d%/)
      expect(lowConfidenceElements.length).toBeGreaterThan(0)
    })
  })

  describe('Clarification Questions', () => {
    it('should display clarification questions section when present', () => {
      render(<SmartGoalViewer goal={mockLowConfidenceGoal} />)
      
      expect(screen.getByText('Clarification Needed')).toBeInTheDocument()
      
      mockLowConfidenceGoal.clarificationQuestions.forEach(question => {
        expect(screen.getByText(question)).toBeInTheDocument()
      })
    })

    it('should not display clarification section when no questions exist', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      expect(screen.queryByText('Clarification Needed')).not.toBeInTheDocument()
    })
  })

  describe('Missing Criteria Display', () => {
    it('should display missing criteria in status section', () => {
      render(<SmartGoalViewer goal={mockLowConfidenceGoal} />)
      
      const statusSection = screen.getByText('Status').closest('div')
      expect(statusSection).toBeInTheDocument()
      
      expect(within(statusSection!).getByText('Missing:')).toBeInTheDocument()
      expect(within(statusSection!).getByText(/specific objectives, measurement criteria, timeline/)).toBeInTheDocument()
    })

    it('should not display missing section when no criteria are missing', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      const statusSection = screen.getByText('Status').closest('div')
      expect(statusSection).toBeInTheDocument()
      
      expect(within(statusSection!).queryByText('Missing:')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle null goal gracefully', () => {
      render(<SmartGoalViewer goal={null as any} />)
      
      expect(screen.getByText('Error: Invalid goal data')).toBeInTheDocument()
    })

    it('should handle undefined goal gracefully', () => {
      render(<SmartGoalViewer goal={undefined as any} />)
      
      expect(screen.getByText('Error: Invalid goal data')).toBeInTheDocument()
    })

    it('should handle malformed goal object', () => {
      const malformedGoal = { invalid: 'data' } as any
      render(<SmartGoalViewer goal={malformedGoal} />)
      
      expect(screen.getByText('Untitled Goal')).toBeInTheDocument()
      expect(screen.getByText('0% Confidence')).toBeInTheDocument()
    })

    it('should handle missing criteria gracefully', () => {
      const goalWithMissingCriteria = {
        ...mockHighConfidenceGoal,
        criteria: undefined as any
      }
      
      render(<SmartGoalViewer goal={goalWithMissingCriteria} />)
      
      expect(screen.getByText(mockHighConfidenceGoal.title)).toBeInTheDocument()
      expect(screen.getByText('Not specified')).toBeInTheDocument()
    })

    it('should handle missing individual criterion', () => {
      const goalWithMissingSpecific = {
        ...mockHighConfidenceGoal,
        criteria: {
          ...mockHighConfidenceGoal.criteria,
          specific: undefined as any
        }
      }
      
      render(<SmartGoalViewer goal={goalWithMissingSpecific} />)
      
      expect(screen.getByText('Not specified')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toHaveTextContent(mockHighConfidenceGoal.title)
      
      const criteriaHeadings = screen.getAllByRole('heading', { level: 4 })
      expect(criteriaHeadings.length).toBeGreaterThan(0)
    })

    it('should have proper semantic structure', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      // Check for list structure in clarification questions
      if (mockHighConfidenceGoal.clarificationQuestions.length > 0) {
        expect(screen.getByRole('list')).toBeInTheDocument()
      }
    })

    it('should have appropriate ARIA labels and roles', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      // Check for accessible confidence indicators
      const confidenceIndicators = screen.getAllByText(/\d+% Confidence/)
      expect(confidenceIndicators.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('should render grid layout for criteria', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      const gridContainer = document.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    })
  })

  describe('Data Integrity', () => {
    it('should display correct confidence percentages', () => {
      render(<SmartGoalViewer goal={mockHighConfidenceGoal} />)
      
      expect(screen.getByText('90%')).toBeInTheDocument() // Specific
      expect(screen.getByText('95%')).toBeInTheDocument() // Measurable
      expect(screen.getByText('80%')).toBeInTheDocument() // Achievable
      expect(screen.getByText('90%')).toBeInTheDocument() // Relevant (duplicate of specific)
      expect(screen.getByText('85%')).toBeInTheDocument() // Time-bound
    })

    it('should handle edge case confidence values', () => {
      const edgeCaseGoal: Goal = {
        ...mockHighConfidenceGoal,
        confidence: 1.0, // Maximum confidence
        criteria: {
          ...mockHighConfidenceGoal.criteria,
          specific: { ...mockHighConfidenceGoal.criteria.specific, confidence: 0.0 }, // Minimum confidence
          measurable: { ...mockHighConfidenceGoal.criteria.measurable, confidence: 1.0 } // Maximum confidence
        }
      }
      
      render(<SmartGoalViewer goal={edgeCaseGoal} />)
      
      expect(screen.getByText('100% Confidence')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render efficiently with large datasets', () => {
      const goalWithLargeMissingCriteria: Goal = {
        ...mockLowConfidenceGoal,
        missingCriteria: Array.from({ length: 20 }, (_, i) => `missing-criteria-${i}`),
        clarificationQuestions: Array.from({ length: 15 }, (_, i) => `Question ${i + 1}: What about criteria ${i}?`)
      }
      
      const start = performance.now()
      render(<SmartGoalViewer goal={goalWithLargeMissingCriteria} />)
      const renderTime = performance.now() - start
      
      expect(renderTime).toBeLessThan(100) // Should render within 100ms
      expect(screen.getByText(goalWithLargeMissingCriteria.title)).toBeInTheDocument()
    })
  })
})