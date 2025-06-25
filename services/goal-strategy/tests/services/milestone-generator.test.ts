import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MilestoneGenerator, MilestoneGenerationInput, GeneratedMilestone } from '../../src/services/milestone-generator';
import { SMARTCriteria } from '../../src/services/smart-goal-processor';

// Mock OpenAI module
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('MilestoneGenerator - Phase 2 TDD Tests', () => {
  let milestoneGenerator: MilestoneGenerator;
  let mockOpenAI: any;

  beforeEach(() => {
    milestoneGenerator = new MilestoneGenerator();
    
    // Reset OpenAI mock
    const { OpenAI } = require('openai');
    mockOpenAI = new OpenAI();
    jest.clearAllMocks();
  });

  describe('generateMilestones', () => {
    it('should generate milestones for a simple SMART goal', async () => {
      // Arrange
      const smartCriteria: SMARTCriteria = {
        specific: 'Launch a personal finance tracking web application',
        measurable: 'Complete application with user registration, expense tracking, and basic reporting',
        achievable: 'Using React, Node.js, and PostgreSQL technologies I already know',
        relevant: 'Helps users manage personal finances more effectively',
        timeBound: 'Complete within 12 weeks'
      };

      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-001',
        goalTitle: 'Build Personal Finance App',
        smartCriteria,
        targetDate: new Date('2025-09-15'),
        preferences: {
          milestoneCount: 4,
          distributionStrategy: 'EVEN',
          includeBufferTime: true
        }
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: [
                {
                  title: 'Project Setup and Planning',
                  description: 'Set up development environment, create project structure, and finalize technical specifications',
                  targetDate: '2025-07-01',
                  completionCriteria: 'Development environment configured, database schema designed, API endpoints documented',
                  orderIndex: 0,
                  estimatedEffort: 40,
                  dependencies: []
                },
                {
                  title: 'Core Backend Development',
                  description: 'Implement user authentication, database models, and core API endpoints',
                  targetDate: '2025-07-29',
                  completionCriteria: 'User registration/login working, expense CRUD operations complete, data validation implemented',
                  orderIndex: 1,
                  estimatedEffort: 80,
                  dependencies: ['Project Setup and Planning']
                },
                {
                  title: 'Frontend Development',
                  description: 'Build React components, implement user interface, and integrate with backend API',
                  targetDate: '2025-08-26',
                  completionCriteria: 'All UI components implemented, API integration complete, responsive design working',
                  orderIndex: 2,
                  estimatedEffort: 100,
                  dependencies: ['Core Backend Development']
                },
                {
                  title: 'Testing and Deployment',
                  description: 'Comprehensive testing, bug fixes, and production deployment',
                  targetDate: '2025-09-15',
                  completionCriteria: 'All tests passing, application deployed to production, user documentation complete',
                  orderIndex: 3,
                  estimatedEffort: 60,
                  dependencies: ['Frontend Development']
                }
              ],
              rationale: 'Milestones are structured to follow a logical development sequence with even distribution across the 12-week timeline. Each milestone represents a major deliverable that builds upon the previous one.',
              timeline: {
                startDate: '2025-06-23',
                endDate: '2025-09-15',
                totalDuration: 84
              },
              confidence: 0.85
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.generateMilestones(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.milestones).toHaveLength(4);
      expect(result.confidence).toBe(0.85);
      expect(result.timeline.totalDuration).toBe(84);

      // Verify milestone structure
      const firstMilestone = result.milestones[0];
      expect(firstMilestone.title).toBe('Project Setup and Planning');
      expect(firstMilestone.orderIndex).toBe(0);
      expect(firstMilestone.estimatedEffort).toBe(40);
      expect(firstMilestone.dependencies).toEqual([]);

      // Verify dependency chain
      const secondMilestone = result.milestones[1];
      expect(secondMilestone.dependencies).toContain('Project Setup and Planning');

      // Verify OpenAI was called with correct parameters
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert project manager')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(input.goalTitle)
            })
          ]),
          temperature: 0.3,
          max_tokens: 3000
        })
      );
    });

    it('should handle AI service failures gracefully', async () => {
      // Arrange
      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-002',
        goalTitle: 'Test Goal',
        smartCriteria: {
          specific: 'Test specific',
          measurable: 'Test measurable',
          achievable: 'Test achievable',
          relevant: 'Test relevant',
          timeBound: 'Test time bound'
        }
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'));

      // Act & Assert
      await expect(milestoneGenerator.generateMilestones(input)).rejects.toThrow('OpenAI API Error');
    });

    it('should validate milestone count preferences', async () => {
      // Arrange
      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-003',
        goalTitle: 'Test Goal with Many Milestones',
        smartCriteria: {
          specific: 'Test specific',
          measurable: 'Test measurable',
          achievable: 'Test achievable',
          relevant: 'Test relevant',
          timeBound: 'Test time bound'
        },
        preferences: {
          milestoneCount: 6,
          distributionStrategy: 'FRONT_LOADED'
        }
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: Array.from({ length: 6 }, (_, i) => ({
                title: `Milestone ${i + 1}`,
                description: `Description for milestone ${i + 1}`,
                targetDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                completionCriteria: `Criteria for milestone ${i + 1}`,
                orderIndex: i,
                estimatedEffort: 20,
                dependencies: i > 0 ? [`Milestone ${i}`] : []
              })),
              rationale: 'Front-loaded distribution with more milestones early in the project',
              timeline: {
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                totalDuration: 42
              },
              confidence: 0.8
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.generateMilestones(input);

      // Assert
      expect(result.milestones).toHaveLength(6);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('FRONT_LOADED')
            })
          ])
        })
      );
    });

    it('should handle malformed AI responses', async () => {
      // Arrange
      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-004',
        goalTitle: 'Test Goal',
        smartCriteria: {
          specific: 'Test specific',
          measurable: 'Test measurable',
          achievable: 'Test achievable',
          relevant: 'Test relevant',
          timeBound: 'Test time bound'
        }
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(milestoneGenerator.generateMilestones(input)).rejects.toThrow('Failed to parse AI response');
    });
  });

  describe('validateMilestoneSequence', () => {
    it('should validate a correct milestone sequence', async () => {
      // Arrange
      const milestones: GeneratedMilestone[] = [
        {
          title: 'Planning',
          description: 'Project planning phase',
          targetDate: new Date('2025-07-01'),
          completionCriteria: 'Plans complete',
          orderIndex: 0,
          estimatedEffort: 20,
          dependencies: []
        },
        {
          title: 'Development',
          description: 'Development phase',
          targetDate: new Date('2025-08-01'),
          completionCriteria: 'Code complete',
          orderIndex: 1,
          estimatedEffort: 40,
          dependencies: ['Planning']
        }
      ];

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              issues: [],
              suggestions: ['Consider adding a testing milestone']
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.validateMilestoneSequence(milestones);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toContain('Consider adding a testing milestone');
    });

    it('should identify circular dependencies', async () => {
      // Arrange
      const milestones: GeneratedMilestone[] = [
        {
          title: 'A',
          description: 'Task A',
          targetDate: new Date('2025-07-01'),
          completionCriteria: 'A complete',
          orderIndex: 0,
          estimatedEffort: 20,
          dependencies: ['B']
        },
        {
          title: 'B',
          description: 'Task B',
          targetDate: new Date('2025-08-01'),
          completionCriteria: 'B complete',
          orderIndex: 1,
          estimatedEffort: 30,
          dependencies: ['A']
        }
      ];

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: false,
              issues: ['Circular dependency detected between A and B'],
              suggestions: ['Remove circular dependency', 'Reorder milestones logically']
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.validateMilestoneSequence(milestones);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Circular dependency detected between A and B');
      expect(result.suggestions).toContain('Remove circular dependency');
    });
  });

  describe('optimizeTimeline', () => {
    it('should optimize timeline with resource constraints', async () => {
      // Arrange
      const milestones: GeneratedMilestone[] = [
        {
          title: 'Development',
          description: 'Main development work',
          targetDate: new Date('2025-08-01'),
          completionCriteria: 'Development complete',
          orderIndex: 0,
          estimatedEffort: 160,
          dependencies: []
        }
      ];

      const constraints = {
        maxDuration: 60, // 60 days
        availableHoursPerWeek: 20,
        blackoutDates: [new Date('2025-07-15')],
        priorityMilestones: [0]
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizedMilestones: [
                {
                  title: 'Development',
                  description: 'Main development work - split into phases',
                  targetDate: '2025-07-30',
                  completionCriteria: 'Development complete',
                  orderIndex: 0,
                  estimatedEffort: 160,
                  dependencies: []
                }
              ],
              adjustments: [
                'Split large milestone into smaller phases',
                'Adjusted timeline to account for blackout dates',
                'Optimized for 20 hours/week availability'
              ],
              feasibilityScore: 0.8
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.optimizeTimeline(milestones, constraints);

      // Assert
      expect(result.feasibilityScore).toBe(0.8);
      expect(result.adjustments).toContain('Split large milestone into smaller phases');
      expect(result.optimizedMilestones).toHaveLength(1);
    });

    it('should handle infeasible constraints', async () => {
      // Arrange
      const milestones: GeneratedMilestone[] = [
        {
          title: 'Large Project',
          description: 'Very large project',
          targetDate: new Date('2025-12-31'),
          completionCriteria: 'Project complete',
          orderIndex: 0,
          estimatedEffort: 1000,
          dependencies: []
        }
      ];

      const constraints = {
        maxDuration: 7, // Only 7 days
        availableHoursPerWeek: 10
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizedMilestones: [],
              adjustments: [
                'Timeline is not feasible with current constraints',
                'Recommend extending duration or increasing available hours'
              ],
              feasibilityScore: 0.1
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.optimizeTimeline(milestones, constraints);

      // Assert
      expect(result.feasibilityScore).toBe(0.1);
      expect(result.adjustments).toContain('Timeline is not feasible with current constraints');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty milestone array', async () => {
      // Arrange
      const emptyMilestones: GeneratedMilestone[] = [];

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: false,
              issues: ['No milestones provided'],
              suggestions: ['Add at least one milestone']
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.validateMilestoneSequence(emptyMilestones);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('No milestones provided');
    });

    it('should handle missing OpenAI API key', async () => {
      // Arrange
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const milestoneGeneratorWithoutKey = new MilestoneGenerator();
      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-005',
        goalTitle: 'Test Goal',
        smartCriteria: {
          specific: 'Test specific',
          measurable: 'Test measurable',
          achievable: 'Test achievable',
          relevant: 'Test relevant',
          timeBound: 'Test time bound'
        }
      };

      // Act & Assert
      await expect(milestoneGeneratorWithoutKey.generateMilestones(input)).rejects.toThrow('OpenAI API key not configured');

      // Cleanup
      if (originalApiKey) {
        process.env.OPENAI_API_KEY = originalApiKey;
      }
    });

    it('should validate date consistency in milestones', async () => {
      // Arrange
      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-006',
        goalTitle: 'Test Goal with Date Issues',
        smartCriteria: {
          specific: 'Test specific',
          measurable: 'Test measurable',
          achievable: 'Test achievable',
          relevant: 'Test relevant',
          timeBound: 'Complete by December 2025'
        },
        targetDate: new Date('2025-12-31')
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: [
                {
                  title: 'Late Milestone',
                  description: 'This milestone is scheduled after the target date',
                  targetDate: '2026-01-15', // After target date
                  completionCriteria: 'Milestone complete',
                  orderIndex: 0,
                  estimatedEffort: 40,
                  dependencies: []
                }
              ],
              rationale: 'Test milestone with date issues',
              timeline: {
                startDate: '2025-06-23',
                endDate: '2026-01-15',
                totalDuration: 200
              },
              confidence: 0.5
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await milestoneGenerator.generateMilestones(input);

      // Assert - Should still parse but may have date inconsistencies
      expect(result.milestones).toHaveLength(1);
      expect(result.confidence).toBe(0.5);
      
      // The milestone target date should be after the goal target date
      const milestoneDate = new Date(result.milestones[0].targetDate);
      const goalTargetDate = new Date('2025-12-31');
      expect(milestoneDate.getTime()).toBeGreaterThan(goalTargetDate.getTime());
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of milestones efficiently', async () => {
      // Arrange
      const input: MilestoneGenerationInput = {
        goalId: 'test-goal-007',
        goalTitle: 'Large Project',
        smartCriteria: {
          specific: 'Large scale project',
          measurable: 'Multiple deliverables',
          achievable: 'With proper planning',
          relevant: 'Business critical',
          timeBound: 'Complete in 6 months'
        },
        preferences: {
          milestoneCount: 12, // Large number of milestones
          distributionStrategy: 'EVEN'
        }
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: Array.from({ length: 12 }, (_, i) => ({
                title: `Phase ${i + 1}`,
                description: `Description for phase ${i + 1}`,
                targetDate: new Date(Date.now() + (i + 1) * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                completionCriteria: `Phase ${i + 1} completion criteria`,
                orderIndex: i,
                estimatedEffort: 40,
                dependencies: i > 0 ? [`Phase ${i}`] : []
              })),
              rationale: 'Structured approach with 12 phases',
              timeline: {
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 168 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                totalDuration: 168
              },
              confidence: 0.7
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      const startTime = Date.now();

      // Act
      const result = await milestoneGenerator.generateMilestones(input);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(result.milestones).toHaveLength(12);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify all milestones have proper dependencies
      for (let i = 1; i < result.milestones.length; i++) {
        expect(result.milestones[i].dependencies).toContain(`Phase ${i}`);
      }
    });
  });
});