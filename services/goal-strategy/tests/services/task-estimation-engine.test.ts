import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  TaskEstimationEngine, 
  EstimationResult,
  EstimationMethod,
  RiskFactor,
  HistoricalComparison,
  ThreePointEstimate
} from '../../src/services/task-estimation-engine';

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

describe('TaskEstimationEngine - Phase 3 TDD Tests', () => {
  let estimationEngine: TaskEstimationEngine;
  let mockOpenAI: any;

  beforeEach(() => {
    estimationEngine = new TaskEstimationEngine();
    
    // Reset OpenAI mock
    const { OpenAI } = require('openai');
    mockOpenAI = new OpenAI();
    jest.clearAllMocks();
  });

  describe('estimateTask - Expert Judgment Method', () => {
    it('should generate expert judgment estimate using AI', async () => {
      // Arrange
      const request = {
        taskId: 'test-task-001',
        taskDescription: 'Implement user authentication system with JWT tokens',
        complexity: 'MODERATE' as const,
        skills: ['Node.js', 'JWT', 'Database', 'Security'],
        methods: ['EXPERT_JUDGMENT' as const],
        includeUncertainty: true,
        confidenceLevel: 0.8
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 12,
              confidence: 0.85,
              rationale: 'Authentication implementation typically requires 8-16 hours. Considering JWT implementation (3h), database integration (4h), security measures (3h), and testing (2h). Added buffer for potential edge cases.',
              assumptions: [
                'Using existing JWT library',
                'Database schema already designed',
                'Basic security requirements only'
              ],
              risks: [
                'OAuth integration complexity',
                'Security audit requirements',
                'Third-party service dependencies'
              ]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.taskId).toBe('test-task-001');
      expect(result.estimationMethods).toHaveLength(1);
      
      const expertMethod = result.estimationMethods[0];
      expect(expertMethod.name).toBe('Expert Judgment (AI)');
      expect(expertMethod.estimate).toBe(12);
      expect(expertMethod.confidence).toBe(0.85);
      expect(expertMethod.rationale).toContain('Authentication implementation');
      
      expect(result.finalEstimate.expected).toBeCloseTo(12, 1);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Verify AI was called with correct parameters
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
              content: expect.stringContaining('user authentication system')
            })
          ]),
          temperature: 0.3,
          max_tokens: 1000
        })
      );
    });

    it('should handle AI service failures with fallback estimation', async () => {
      // Arrange
      const request = {
        taskDescription: 'Simple UI component',
        complexity: 'SIMPLE' as const,
        skills: ['React'],
        methods: ['EXPERT_JUDGMENT' as const]
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'));

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const fallbackMethod = result.estimationMethods[0];
      expect(fallbackMethod.name).toBe('Expert Judgment (Fallback)');
      expect(fallbackMethod.estimate).toBeGreaterThan(0);
      expect(fallbackMethod.confidence).toBe(0.5);
      expect(fallbackMethod.rationale).toContain('Fallback heuristic');
    });
  });

  describe('estimateTask - Analogy Method', () => {
    it('should use historical data for analogy-based estimation', async () => {
      // Arrange
      const request = {
        taskDescription: 'Create product listing page with search and filters',
        complexity: 'MODERATE' as const,
        skills: ['React', 'API Integration', 'CSS'],
        methods: ['ANALOGY' as const]
      };

      // Mock historical data loading
      const mockHistoricalData = [
        {
          taskTitle: 'User listing page',
          description: 'Create user listing with search functionality',
          estimatedHours: 14,
          actualHours: 16,
          complexity: 'MODERATE',
          skills: ['React', 'API Integration'],
          completedAt: new Date('2025-05-01'),
          accuracy: 0.875 // |14-16|/16 = 0.125, so accuracy = 1-0.125 = 0.875
        },
        {
          taskTitle: 'Product catalog display',
          description: 'Display products with filtering options',
          estimatedHours: 18,
          actualHours: 20,
          complexity: 'MODERATE',
          skills: ['React', 'CSS', 'Filtering'],
          completedAt: new Date('2025-04-15'),
          accuracy: 0.9
        },
        {
          taskTitle: 'Search implementation',
          description: 'Add search functionality to existing page',
          estimatedHours: 8,
          actualHours: 6,
          complexity: 'SIMPLE',
          skills: ['JavaScript', 'API Integration'],
          completedAt: new Date('2025-03-20'),
          accuracy: 0.75
        }
      ];

      // Mock the loadHistoricalData method
      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue(mockHistoricalData);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const analogyMethod = result.estimationMethods[0];
      expect(analogyMethod.name).toBe('Analogy');
      expect(analogyMethod.estimate).toBeGreaterThan(0);
      expect(analogyMethod.confidence).toBeGreaterThan(0);
      expect(analogyMethod.dataPoints).toBeGreaterThan(0);
      expect(analogyMethod.rationale).toContain('similar tasks');

      // Should find historical comparisons
      expect(result.historicalComparisons.length).toBeGreaterThan(0);
      
      const bestComparison = result.historicalComparisons[0];
      expect(bestComparison.similarity).toBeGreaterThan(0.3);
    });

    it('should handle lack of historical data gracefully', async () => {
      // Arrange
      const request = {
        taskDescription: 'Completely new type of task',
        complexity: 'COMPLEX' as const,
        skills: ['NewTechnology', 'ExperimentalFeature'],
        methods: ['ANALOGY' as const]
      };

      // Mock empty historical data
      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue([]);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const analogyMethod = result.estimationMethods[0];
      expect(analogyMethod.name).toBe('Analogy');
      expect(analogyMethod.estimate).toBe(0);
      expect(analogyMethod.confidence).toBe(0);
      expect(analogyMethod.weight).toBe(0);
      expect(analogyMethod.rationale).toContain('No historical data available');
    });
  });

  describe('estimateTask - Three-Point PERT Method', () => {
    it('should generate three-point estimates and calculate PERT estimate', async () => {
      // Arrange
      const request = {
        taskDescription: 'Implement payment processing integration',
        complexity: 'COMPLEX' as const,
        skills: ['Payment APIs', 'Security', 'Error Handling'],
        methods: ['THREE_POINT_PERT' as const]
      };

      const mockThreePointResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimistic: 12,
              mostLikely: 20,
              pessimistic: 32,
              rationale: {
                optimisticReason: 'Using well-documented payment API with clear examples',
                mostLikelyReason: 'Standard implementation with basic error handling and testing',
                pessimisticReason: 'Complex error scenarios, compliance requirements, and extensive testing needed'
              }
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockThreePointResponse);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const pertMethod = result.estimationMethods[0];
      expect(pertMethod.name).toBe('Three-Point PERT');
      
      // PERT formula: (O + 4M + P) / 6 = (12 + 4*20 + 32) / 6 = 124/6 ≈ 20.67
      expect(pertMethod.estimate).toBeCloseTo(20.67, 1);
      expect(pertMethod.confidence).toBe(0.8);
      expect(pertMethod.rationale).toContain('optimistic (12h)');
      expect(pertMethod.rationale).toContain('most likely (20h)');
      expect(pertMethod.rationale).toContain('pessimistic (32h)');

      // Final estimate should incorporate three-point data
      expect(result.finalEstimate.optimistic).toBeLessThan(result.finalEstimate.mostLikely);
      expect(result.finalEstimate.mostLikely).toBeLessThan(result.finalEstimate.pessimistic);
    });

    it('should use fallback when AI three-point estimation fails', async () => {
      // Arrange
      const request = {
        taskDescription: 'Simple task',
        complexity: 'SIMPLE' as const,
        skills: ['HTML'],
        methods: ['THREE_POINT_PERT' as const]
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI Error'));

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const pertMethod = result.estimationMethods[0];
      expect(pertMethod.name).toBe('Three-Point PERT');
      expect(pertMethod.estimate).toBeGreaterThan(0);
      
      // Should use fallback PERT calculation
      // Base = 2 for SIMPLE, so optimistic = 1.4, mostLikely = 2, pessimistic = 3
      // PERT = (1.4 + 4*2 + 3) / 6 = 12.4/6 ≈ 2.07
      expect(pertMethod.estimate).toBeCloseTo(2.07, 1);
    });
  });

  describe('estimateTask - Parametric Method', () => {
    it('should calculate parametric estimates based on historical complexity factors', async () => {
      // Arrange
      const request = {
        taskDescription: 'Database optimization task',
        complexity: 'MODERATE' as const,
        skills: ['Database', 'Performance', 'SQL'],
        methods: ['PARAMETRIC' as const]
      };

      const mockHistoricalData = [
        { complexity: 'SIMPLE', actualHours: 4 },
        { complexity: 'SIMPLE', actualHours: 6 },
        { complexity: 'MODERATE', actualHours: 12 },
        { complexity: 'MODERATE', actualHours: 14 },
        { complexity: 'MODERATE', actualHours: 16 },
        { complexity: 'COMPLEX', actualHours: 24 },
        { complexity: 'COMPLEX', actualHours: 28 }
      ];

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue(mockHistoricalData);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const parametricMethod = result.estimationMethods[0];
      expect(parametricMethod.name).toBe('Parametric');
      
      // Average for MODERATE complexity: (12 + 14 + 16) / 3 = 14
      // With skill factor: 14 * (1 + 3 * 0.3) = 14 * 1.9 = 26.6
      expect(parametricMethod.estimate).toBeCloseTo(26.6, 1);
      expect(parametricMethod.confidence).toBeGreaterThan(0);
      expect(parametricMethod.dataPoints).toBe(3); // 3 MODERATE tasks
    });

    it('should handle insufficient historical data', async () => {
      // Arrange
      const request = {
        taskDescription: 'New type of task',
        complexity: 'COMPLEX' as const,
        skills: ['NewSkill'],
        methods: ['PARAMETRIC' as const]
      };

      // Mock insufficient data (< 5 items)
      const mockHistoricalData = [
        { complexity: 'SIMPLE', actualHours: 4 },
        { complexity: 'MODERATE', actualHours: 12 }
      ];

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue(mockHistoricalData);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const parametricMethod = result.estimationMethods[0];
      expect(parametricMethod.name).toBe('Parametric');
      expect(parametricMethod.estimate).toBe(0);
      expect(parametricMethod.confidence).toBe(0);
      expect(parametricMethod.weight).toBe(0);
      expect(parametricMethod.rationale).toContain('Insufficient historical data');
    });
  });

  describe('estimateTask - Bottom-Up Method', () => {
    it('should break down tasks into subtasks and sum estimates', async () => {
      // Arrange
      const request = {
        taskDescription: 'Build complete user registration system',
        complexity: 'COMPLEX' as const,
        skills: ['Frontend', 'Backend', 'Database', 'Validation'],
        methods: ['BOTTOM_UP' as const]
      };

      const mockBottomUpResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              subtasks: [
                {
                  name: 'UI Design and Layout',
                  description: 'Create registration form with proper styling',
                  estimatedHours: 6
                },
                {
                  name: 'Form Validation',
                  description: 'Implement client-side and server-side validation',
                  estimatedHours: 4
                },
                {
                  name: 'Backend API Development',
                  description: 'Create registration endpoint with password hashing',
                  estimatedHours: 8
                },
                {
                  name: 'Database Integration',
                  description: 'Set up user table and queries',
                  estimatedHours: 3
                },
                {
                  name: 'Email Verification',
                  description: 'Implement email verification workflow',
                  estimatedHours: 5
                },
                {
                  name: 'Testing and Bug Fixes',
                  description: 'Comprehensive testing and issue resolution',
                  estimatedHours: 4
                }
              ],
              totalEstimate: 30,
              rationale: 'Comprehensive breakdown covering all aspects of user registration from UI to backend processing and verification'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockBottomUpResponse);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const bottomUpMethod = result.estimationMethods[0];
      expect(bottomUpMethod.name).toBe('Bottom-Up');
      expect(bottomUpMethod.estimate).toBe(30);
      expect(bottomUpMethod.confidence).toBe(0.85);
      expect(bottomUpMethod.dataPoints).toBe(6); // 6 subtasks
      expect(bottomUpMethod.rationale).toContain('6 subtasks');
    });

    it('should handle AI failure in bottom-up method', async () => {
      // Arrange
      const request = {
        taskDescription: 'Complex task',
        complexity: 'COMPLEX' as const,
        skills: ['Skill1'],
        methods: ['BOTTOM_UP' as const]
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI Error'));

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(1);
      
      const bottomUpMethod = result.estimationMethods[0];
      expect(bottomUpMethod.name).toBe('Bottom-Up (Fallback)');
      expect(bottomUpMethod.estimate).toBe(0);
      expect(bottomUpMethod.confidence).toBe(0);
      expect(bottomUpMethod.weight).toBe(0);
    });
  });

  describe('estimateTask - Multiple Methods Integration', () => {
    it('should combine multiple estimation methods with weighted average', async () => {
      // Arrange
      const request = {
        taskId: 'multi-method-task-001',
        taskDescription: 'Implement search functionality with auto-complete',
        complexity: 'MODERATE' as const,
        skills: ['JavaScript', 'API Integration', 'UI/UX'],
        methods: ['EXPERT_JUDGMENT' as const, 'THREE_POINT_PERT' as const, 'BOTTOM_UP' as const],
        includeUncertainty: true,
        confidenceLevel: 0.8
      };

      // Mock expert judgment response
      const mockExpertResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 14,
              confidence: 0.8,
              rationale: 'Search with auto-complete typically requires API integration, debouncing, and UI components'
            })
          }
        }]
      };

      // Mock three-point response
      const mockThreePointResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimistic: 8,
              mostLikely: 16,
              pessimistic: 24,
              rationale: {
                optimisticReason: 'Using existing search library',
                mostLikelyReason: 'Standard implementation with auto-complete',
                pessimisticReason: 'Complex filtering and performance optimization needed'
              }
            })
          }
        }]
      };

      // Mock bottom-up response
      const mockBottomUpResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              subtasks: [
                { name: 'Search API Integration', estimatedHours: 4 },
                { name: 'Auto-complete UI', estimatedHours: 6 },
                { name: 'Debouncing Logic', estimatedHours: 2 },
                { name: 'Result Display', estimatedHours: 3 },
                { name: 'Testing', estimatedHours: 3 }
              ],
              totalEstimate: 18,
              rationale: 'Detailed breakdown of search functionality components'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpertResponse)
        .mockResolvedValueOnce(mockThreePointResponse)
        .mockResolvedValueOnce(mockBottomUpResponse);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.estimationMethods).toHaveLength(3);
      expect(result.estimationMethods.map(m => m.name)).toContain('Expert Judgment (AI)');
      expect(result.estimationMethods.map(m => m.name)).toContain('Three-Point PERT');
      expect(result.estimationMethods.map(m => m.name)).toContain('Bottom-Up');

      // Final estimate should be weighted combination
      // Expert: 14 (weight: 0.3, confidence: 0.8) = adjusted weight: 0.24
      // PERT: (8 + 4*16 + 24)/6 = 96/6 = 16 (weight: 0.35, confidence: 0.8) = adjusted weight: 0.28
      // Bottom-Up: 18 (weight: 0.4, confidence: 0.85) = adjusted weight: 0.34
      // Weighted average: (14*0.24 + 16*0.28 + 18*0.34) / (0.24+0.28+0.34)
      expect(result.finalEstimate.expected).toBeGreaterThan(13);
      expect(result.finalEstimate.expected).toBeLessThan(19);

      // Should have confidence interval
      expect(result.finalEstimate.confidenceInterval.lower).toBeLessThan(result.finalEstimate.expected);
      expect(result.finalEstimate.confidenceInterval.upper).toBeGreaterThan(result.finalEstimate.expected);
      expect(result.finalEstimate.confidenceInterval.level).toBe(0.8);
    });

    it('should fail when no methods produce valid estimates', async () => {
      // Arrange
      const request = {
        taskDescription: 'Task with no valid methods',
        complexity: 'SIMPLE' as const,
        skills: ['UnknownSkill'],
        methods: ['ANALOGY' as const, 'PARAMETRIC' as const] // Both will fail due to no historical data
      };

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue([]);

      // Act & Assert
      await expect(estimationEngine.estimateTask(request))
        .rejects.toThrow('No valid estimation methods produced results');
    });
  });

  describe('Risk Factor Identification', () => {
    it('should identify risk factors based on task characteristics', async () => {
      // Arrange
      const request = {
        taskDescription: 'Implement complex machine learning model',
        complexity: 'COMPLEX' as const,
        skills: ['Python', 'TensorFlow', 'Data Science', 'Statistics', 'MLOps'],
        methods: ['EXPERT_JUDGMENT' as const]
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 40,
              confidence: 0.6,
              rationale: 'Complex ML implementation with multiple skill requirements'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Mock historical data with poor accuracy
      const mockHistoricalData = [
        {
          taskTitle: 'Previous ML task',
          description: 'ML model implementation',
          estimatedHours: 30,
          actualHours: 50,
          complexity: 'COMPLEX',
          skills: ['Python', 'TensorFlow'],
          accuracy: 0.6 // Poor accuracy
        }
      ];

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue(mockHistoricalData);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.riskFactors.length).toBeGreaterThan(0);

      // Should identify complexity risk
      const complexityRisk = result.riskFactors.find(rf => rf.factor === 'High Complexity');
      expect(complexityRisk).toBeDefined();
      expect(complexityRisk?.impact).toBe('HIGH');
      expect(complexityRisk?.probability).toBe(0.7);
      expect(complexityRisk?.adjustmentFactor).toBe(1.3);

      // Should identify multiple skills risk
      const skillsRisk = result.riskFactors.find(rf => rf.factor === 'Multiple Skills Required');
      expect(skillsRisk).toBeDefined();
      expect(skillsRisk?.impact).toBe('MEDIUM');
      expect(skillsRisk?.adjustmentFactor).toBe(1.2);

      // Should identify historical accuracy risk
      const accuracyRisk = result.riskFactors.find(rf => rf.factor === 'Poor Historical Accuracy');
      expect(accuracyRisk).toBeDefined();
      expect(accuracyRisk?.impact).toBe('HIGH');
      expect(accuracyRisk?.adjustmentFactor).toBe(1.4);
    });

    it('should adjust confidence based on risk factors', async () => {
      // Arrange
      const request = {
        taskDescription: 'Simple HTML page creation',
        complexity: 'SIMPLE' as const,
        skills: ['HTML'],
        methods: ['EXPERT_JUDGMENT' as const]
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 4,
              confidence: 0.9,
              rationale: 'Simple HTML page, straightforward implementation'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue([]);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.riskFactors.length).toBe(0); // No risk factors for simple task
      expect(result.confidence).toBeGreaterThan(0.8); // High confidence due to simplicity
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate appropriate recommendations based on estimation context', async () => {
      // Arrange
      const request = {
        taskDescription: 'Complex integration task',
        complexity: 'COMPLEX' as const,
        skills: ['Integration', 'API'],
        methods: ['EXPERT_JUDGMENT' as const, 'ANALOGY' as const]
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 25,
              confidence: 0.5, // Low confidence
              rationale: 'Complex integration with uncertain requirements'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Mock limited historical data
      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue([
          { complexity: 'COMPLEX', actualHours: 30, accuracy: 0.8 },
          { complexity: 'COMPLEX', actualHours: 20, accuracy: 0.7 }
        ]);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should recommend gathering more data
      expect(result.recommendations).toContain(
        'Start collecting more detailed task completion data for better future estimates'
      );

      // Should recommend buffer time for high risks
      const bufferRecommendation = result.recommendations.find(r => 
        r.includes('buffer time')
      );
      expect(bufferRecommendation).toBeDefined();
    });

    it('should recommend task breakdown for high variance estimates', async () => {
      // Arrange
      const request = {
        taskDescription: 'Variable complexity task',
        complexity: 'MODERATE' as const,
        skills: ['Mixed'],
        methods: ['EXPERT_JUDGMENT' as const, 'THREE_POINT_PERT' as const]
      };

      // Mock responses with high variance
      const mockExpertResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 10,
              confidence: 0.8,
              rationale: 'Conservative estimate'
            })
          }
        }]
      };

      const mockPertResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimistic: 20,
              mostLikely: 30,
              pessimistic: 40,
              rationale: { optimisticReason: 'Best case', mostLikelyReason: 'Normal', pessimisticReason: 'Worst case' }
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockExpertResponse)
        .mockResolvedValueOnce(mockPertResponse);

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue([]);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      const varianceRecommendation = result.recommendations.find(r => 
        r.includes('High variance') || r.includes('breaking down')
      );
      expect(varianceRecommendation).toBeDefined();
    });
  });

  describe('updateWithActual - Learning and Feedback', () => {
    it('should update estimation accuracy with actual completion data', async () => {
      // Arrange
      const taskId = 'learning-task-001';
      const actualHours = 18;
      const completionNotes = 'Task took longer due to unexpected API changes';

      // Mock existing estimation
      const mockEstimation: EstimationResult = {
        taskId,
        estimationMethods: [{
          name: 'Expert Judgment (AI)',
          estimate: 15,
          confidence: 0.8,
          rationale: 'Initial estimate',
          dataPoints: 1,
          weight: 0.3
        }],
        finalEstimate: {
          optimistic: 12,
          mostLikely: 15,
          pessimistic: 20,
          expected: 15,
          standardDeviation: 2.5,
          confidenceInterval: { lower: 10, upper: 20, level: 0.8 }
        },
        confidence: 0.8,
        riskFactors: [],
        recommendations: [],
        historicalComparisons: [],
        metadata: {
          estimatedAt: new Date(),
          estimatedBy: 'AI_ESTIMATION_ENGINE',
          methodsUsed: ['EXPERT_JUDGMENT'],
          dataQuality: 'MEDIUM'
        }
      };

      jest.spyOn(estimationEngine as any, 'getEstimation')
        .mockResolvedValue(mockEstimation);
      
      jest.spyOn(estimationEngine as any, 'saveHistoricalData')
        .mockResolvedValue(undefined);
      
      jest.spyOn(estimationEngine as any, 'updateLearningModels')
        .mockResolvedValue(undefined);

      // Act
      await estimationEngine.updateWithActual(taskId, actualHours, completionNotes);

      // Assert
      // Calculate expected accuracy: 1 - |15 - 18| / 18 = 1 - 3/18 = 1 - 0.167 = 0.833
      const expectedAccuracy = 1 - Math.abs(15 - 18) / 18;

      expect((estimationEngine as any).saveHistoricalData).toHaveBeenCalledWith({
        taskId,
        estimatedHours: 15,
        actualHours: 18,
        accuracy: expectedAccuracy,
        completionNotes,
        completedAt: expect.any(Date)
      });

      expect((estimationEngine as any).updateLearningModels).toHaveBeenCalledWith(
        mockEstimation,
        actualHours,
        expectedAccuracy
      );
    });

    it('should handle missing estimation gracefully', async () => {
      // Arrange
      const taskId = 'non-existent-task';
      const actualHours = 10;

      jest.spyOn(estimationEngine as any, 'getEstimation')
        .mockResolvedValue(null);

      // Act & Assert
      await expect(estimationEngine.updateWithActual(taskId, actualHours))
        .rejects.toThrow('No estimation found for task');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid estimation request data', async () => {
      // Arrange
      const invalidRequest = {
        taskDescription: '', // Empty description
        complexity: 'INVALID' as any,
        skills: [], // No skills
        methods: [] // No methods
      };

      // Act & Assert
      await expect(estimationEngine.estimateTask(invalidRequest as any))
        .rejects.toThrow();
    });

    it('should handle malformed AI responses', async () => {
      // Arrange
      const request = {
        taskDescription: 'Valid task',
        complexity: 'SIMPLE' as const,
        skills: ['HTML'],
        methods: ['EXPERT_JUDGMENT' as const]
      };

      const mockMalformedResponse = {
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockMalformedResponse);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      // Should fall back to heuristic estimation
      expect(result.estimationMethods).toHaveLength(1);
      expect(result.estimationMethods[0].name).toBe('Expert Judgment (Fallback)');
    });

    it('should validate confidence level bounds', async () => {
      // Arrange
      const request = {
        taskDescription: 'Test task',
        complexity: 'SIMPLE' as const,
        skills: ['Test'],
        methods: ['EXPERT_JUDGMENT' as const],
        confidenceLevel: 1.5 // Invalid confidence level > 1
      };

      // Act & Assert
      await expect(estimationEngine.estimateTask(request))
        .rejects.toThrow();
    });

    it('should handle extreme estimation values', async () => {
      // Arrange
      const request = {
        taskDescription: 'Extreme task',
        complexity: 'COMPLEX' as const,
        skills: ['Extreme'],
        methods: ['EXPERT_JUDGMENT' as const]
      };

      const mockExtremeResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 1000, // Very large estimate
              confidence: 0.1, // Very low confidence
              rationale: 'Extremely complex task'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockExtremeResponse);

      // Act
      const result = await estimationEngine.estimateTask(request);

      // Assert
      expect(result.finalEstimate.expected).toBe(1000);
      expect(result.confidence).toBeLessThan(0.5); // Should be low due to extreme values
      
      // Should generate recommendations for such extreme estimates
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple estimation methods efficiently', async () => {
      // Arrange
      const request = {
        taskDescription: 'Performance test task',
        complexity: 'MODERATE' as const,
        skills: ['Performance'],
        methods: [
          'EXPERT_JUDGMENT' as const,
          'ANALOGY' as const,
          'THREE_POINT_PERT' as const,
          'PARAMETRIC' as const,
          'BOTTOM_UP' as const
        ]
      };

      // Mock all AI responses
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 15,
              confidence: 0.8,
              rationale: 'Test response'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      jest.spyOn(estimationEngine as any, 'loadHistoricalData')
        .mockResolvedValue([
          { complexity: 'MODERATE', actualHours: 12, accuracy: 0.8 },
          { complexity: 'MODERATE', actualHours: 14, accuracy: 0.9 },
          { complexity: 'MODERATE', actualHours: 16, accuracy: 0.85 },
          { complexity: 'MODERATE', actualHours: 18, accuracy: 0.7 },
          { complexity: 'MODERATE', actualHours: 13, accuracy: 0.95 }
        ]);

      const startTime = Date.now();

      // Act
      const result = await estimationEngine.estimateTask(request);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(result.estimationMethods.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.finalEstimate.expected).toBeGreaterThan(0);
    });
  });
});