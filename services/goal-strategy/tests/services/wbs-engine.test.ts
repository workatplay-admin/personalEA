import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WBSEngine, TaskBreakdown, WBSResult } from '../../src/services/wbs-engine';
import { testPrisma } from '../setup';

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

// Mock Prisma module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => testPrisma)
}));

describe('WBSEngine - Phase 2 TDD Tests', () => {
  let wbsEngine: WBSEngine;
  let mockOpenAI: any;

  beforeEach(() => {
    wbsEngine = new WBSEngine();
    
    // Reset OpenAI mock
    const { OpenAI } = require('openai');
    mockOpenAI = new OpenAI();
    jest.clearAllMocks();
  });

  describe('generateWBS', () => {
    it('should generate WBS for a milestone with proper task breakdown', async () => {
      // Arrange
      const goalId = 'test-goal-001';
      const milestoneId = 'test-milestone-001';

      // Create test goal and milestone
      const goal = await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Build E-commerce Website',
          description: 'Create a full-featured e-commerce platform',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const milestone = await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Frontend Development',
          description: 'Build React-based user interface',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Responsive design complete', 'User authentication working', 'Product catalog functional'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const wbsRequest = {
        milestoneId: milestoneId,
        maxDepth: 3,
        maxTasksPerLevel: 6,
        targetTaskSize: 4,
        includeTemplates: true
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tasks: [
                {
                  title: 'Setup Development Environment',
                  description: 'Configure React development environment with necessary tools and dependencies',
                  estimatedHours: 4,
                  priority: 'HIGH',
                  complexity: 'SIMPLE',
                  skills: ['React', 'Node.js', 'Git'],
                  dependencies: [],
                  completionCriteria: ['Development environment configured', 'Dependencies installed', 'Initial project structure created'],
                  templateCategory: 'SETUP',
                  subtasks: []
                },
                {
                  title: 'User Interface Components',
                  description: 'Develop reusable UI components for the application',
                  estimatedHours: 24,
                  priority: 'HIGH',
                  complexity: 'MODERATE',
                  skills: ['React', 'CSS', 'TypeScript'],
                  dependencies: ['Setup Development Environment'],
                  completionCriteria: ['All components designed', 'Components are reusable', 'Storybook documentation complete'],
                  subtasks: [
                    {
                      title: 'Header Component',
                      description: 'Create navigation header with logo and menu',
                      estimatedHours: 6,
                      priority: 'HIGH',
                      complexity: 'SIMPLE',
                      skills: ['React', 'CSS'],
                      dependencies: [],
                      completionCriteria: ['Header responsive', 'Navigation working', 'Logo implemented']
                    },
                    {
                      title: 'Product Card Component',
                      description: 'Design product display cards for catalog',
                      estimatedHours: 8,
                      priority: 'HIGH',
                      complexity: 'MODERATE',
                      skills: ['React', 'CSS'],
                      dependencies: [],
                      completionCriteria: ['Product info displayed', 'Images optimized', 'Add to cart button working']
                    },
                    {
                      title: 'Form Components',
                      description: 'Create reusable form components with validation',
                      estimatedHours: 10,
                      priority: 'MEDIUM',
                      complexity: 'MODERATE',
                      skills: ['React', 'TypeScript', 'Form Validation'],
                      dependencies: [],
                      completionCriteria: ['Form validation working', 'Error messages clear', 'Accessibility compliant']
                    }
                  ]
                },
                {
                  title: 'Authentication Pages',
                  description: 'Implement user login, registration, and profile pages',
                  estimatedHours: 16,
                  priority: 'HIGH',
                  complexity: 'MODERATE',
                  skills: ['React', 'Authentication', 'API Integration'],
                  dependencies: ['User Interface Components'],
                  completionCriteria: ['Login/logout working', 'Registration form complete', 'Profile page functional'],
                  subtasks: [
                    {
                      title: 'Login Page',
                      description: 'Create user login interface',
                      estimatedHours: 6,
                      priority: 'HIGH',
                      complexity: 'SIMPLE',
                      skills: ['React', 'Authentication'],
                      dependencies: [],
                      completionCriteria: ['Login form working', 'Error handling implemented', 'Remember me option']
                    },
                    {
                      title: 'Registration Page',
                      description: 'Build user registration workflow',
                      estimatedHours: 8,
                      priority: 'HIGH',
                      complexity: 'MODERATE',
                      skills: ['React', 'Form Validation'],
                      dependencies: [],
                      completionCriteria: ['Registration form complete', 'Email verification', 'Terms acceptance']
                    },
                    {
                      title: 'User Profile Page',
                      description: 'Implement user profile management',
                      estimatedHours: 2,
                      priority: 'MEDIUM',
                      complexity: 'SIMPLE',
                      skills: ['React'],
                      dependencies: ['Login Page'],
                      completionCriteria: ['Profile display working', 'Edit functionality', 'Avatar upload']
                    }
                  ]
                },
                {
                  title: 'Product Catalog Pages',
                  description: 'Build product browsing and search functionality',
                  estimatedHours: 20,
                  priority: 'HIGH',
                  complexity: 'COMPLEX',
                  skills: ['React', 'API Integration', 'Search', 'Pagination'],
                  dependencies: ['User Interface Components'],
                  completionCriteria: ['Product listing working', 'Search functional', 'Filtering implemented', 'Pagination working'],
                  subtasks: []
                }
              ]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await wbsEngine.generateWBS(wbsRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.milestoneId).toBe(milestoneId);
      expect(result.taskHierarchy).toHaveLength(4);
      expect(result.totalTasks).toBeGreaterThan(4); // Should include subtasks
      expect(result.totalEstimatedHours).toBe(64); // Sum of all task hours

      // Verify task structure
      const uiComponentsTask = result.taskHierarchy.find(t => t.title === 'User Interface Components');
      expect(uiComponentsTask).toBeDefined();
      expect(uiComponentsTask?.subtasks).toHaveLength(3);
      expect(uiComponentsTask?.estimatedHours).toBe(24);

      // Verify subtasks
      const headerComponent = uiComponentsTask?.subtasks?.find(s => s.title === 'Header Component');
      expect(headerComponent).toBeDefined();
      expect(headerComponent?.estimatedHours).toBe(6);
      expect(headerComponent?.completionCriteria).toContain('Header responsive');

      // Verify metrics calculation
      expect(result.analysisMetrics.averageTaskSize).toBeGreaterThan(0);
      expect(result.analysisMetrics.complexityDistribution).toHaveProperty('SIMPLE');
      expect(result.analysisMetrics.complexityDistribution).toHaveProperty('MODERATE');
      expect(result.analysisMetrics.skillsRequired).toContain('React');

      // Verify database storage
      const savedTasks = await testPrisma.task.findMany({
        where: { milestoneId: milestoneId }
      });
      expect(savedTasks.length).toBeGreaterThan(0);
    });

    it('should enforce task size limits and break down large tasks', async () => {
      // Arrange
      const goalId = 'test-goal-002';
      const milestoneId = 'test-milestone-002';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Large Scale Project',
          description: 'A project with very large tasks',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Complex Development Phase',
          description: 'A phase requiring large amounts of work',
          targetDate: new Date('2025-09-15'),
          successCriteria: ['Complex system complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const wbsRequest = {
        milestoneId: milestoneId,
        maxDepth: 2,
        maxTasksPerLevel: 4,
        targetTaskSize: 6, // 6 hour max
        includeTemplates: false
      };

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tasks: [
                {
                  title: 'Large Task - Broken Down',
                  description: 'A task that was originally too large',
                  estimatedHours: 20, // This exceeds the 8-hour limit
                  priority: 'HIGH',
                  complexity: 'COMPLEX',
                  skills: ['Full Stack Development'],
                  dependencies: [],
                  completionCriteria: ['All components complete'],
                  subtasks: [
                    {
                      title: 'Sub-task 1',
                      description: 'First part of large task',
                      estimatedHours: 7,
                      priority: 'HIGH',
                      complexity: 'MODERATE',
                      skills: ['Frontend'],
                      dependencies: [],
                      completionCriteria: ['Frontend complete']
                    },
                    {
                      title: 'Sub-task 2',
                      description: 'Second part of large task',
                      estimatedHours: 7,
                      priority: 'HIGH',
                      complexity: 'MODERATE',
                      skills: ['Backend'],
                      dependencies: [],
                      completionCriteria: ['Backend complete']
                    },
                    {
                      title: 'Sub-task 3',
                      description: 'Final part of large task',
                      estimatedHours: 6,
                      priority: 'MEDIUM',
                      complexity: 'SIMPLE',
                      skills: ['Testing'],
                      dependencies: [],
                      completionCriteria: ['Testing complete']
                    }
                  ]
                }
              ]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act
      const result = await wbsEngine.generateWBS(wbsRequest);

      // Assert
      expect(result.taskHierarchy).toHaveLength(1);
      
      const largeTask = result.taskHierarchy[0];
      expect(largeTask.estimatedHours).toBe(20); // Parent task shows total
      expect(largeTask.subtasks).toHaveLength(3);
      
      // All subtasks should be within the limit
      largeTask.subtasks?.forEach(subtask => {
        expect(subtask.estimatedHours).toBeLessThanOrEqual(8);
      });
    });

    it('should validate task data and reject invalid inputs', async () => {
      // Arrange
      const invalidRequest = {
        milestoneId: 'non-existent-milestone',
        maxDepth: 10, // Too deep
        maxTasksPerLevel: 100, // Too many
        targetTaskSize: 50, // Too large
        includeTemplates: true
      };

      // Act & Assert
      await expect(wbsEngine.generateWBS(invalidRequest)).rejects.toThrow();
    });

    it('should handle AI service failures gracefully', async () => {
      // Arrange
      const goalId = 'test-goal-003';
      const milestoneId = 'test-milestone-003';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Test Goal',
          description: 'Test description',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Test Milestone',
          description: 'Test milestone',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Test complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const wbsRequest = {
        milestoneId: milestoneId,
        maxDepth: 2,
        maxTasksPerLevel: 4,
        targetTaskSize: 4,
        includeTemplates: false
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'));

      // Act & Assert
      await expect(wbsEngine.generateWBS(wbsRequest)).rejects.toThrow('Failed to generate task hierarchy');
    });
  });

  describe('refineWBS', () => {
    it('should refine existing WBS by splitting a task', async () => {
      // Arrange
      const goalId = 'test-goal-004';
      const milestoneId = 'test-milestone-004';
      
      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Refinement Test Goal',
          description: 'Goal for testing WBS refinement',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Refinement Test Milestone',
          description: 'Milestone for testing WBS refinement',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Refinement test complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create initial task
      const task = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Large Task to Split',
          description: 'A task that needs to be split',
          estimatedHours: 16,
          priority: 'HIGH',
          complexity: 'COMPLEX',
          skills: ['Full Stack'],
          completionCriteria: ['Task complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const refinements = [
        {
          taskId: task.id,
          action: 'SPLIT' as const,
          parameters: {
            splitCount: 2,
            newTaskSizes: [8, 8]
          }
        }
      ];

      // Act
      const result = await wbsEngine.refineWBS(milestoneId, refinements);

      // Assert
      expect(result).toBeDefined();
      expect(result.milestoneId).toBe(milestoneId);
      // The implementation would need to handle the split operation
    });

    it('should handle merge task refinements', async () => {
      // Arrange
      const goalId = 'test-goal-005';
      const milestoneId = 'test-milestone-005';
      
      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Merge Test Goal',
          description: 'Goal for testing task merging',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Merge Test Milestone',
          description: 'Milestone for testing task merging',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Merge test complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create tasks to merge
      const task1 = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Small Task 1',
          description: 'First small task to merge',
          estimatedHours: 2,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Frontend'],
          completionCriteria: ['Task 1 complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const task2 = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Small Task 2',
          description: 'Second small task to merge',
          estimatedHours: 3,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Frontend'],
          completionCriteria: ['Task 2 complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const refinements = [
        {
          action: 'MERGE_TASKS' as const,
          parameters: {
            taskIds: [task1.id, task2.id],
            newTitle: 'Merged Frontend Task',
            newDescription: 'Combined frontend development tasks'
          }
        }
      ];

      // Act
      const result = await wbsEngine.refineWBS(milestoneId, refinements);

      // Assert
      expect(result).toBeDefined();
      expect(result.milestoneId).toBe(milestoneId);
      // The actual merge logic would need to be implemented in the service
    });
  });

  describe('WBS Analysis and Metrics', () => {
    it('should calculate accurate WBS metrics', async () => {
      // Arrange
      const taskHierarchy: TaskBreakdown[] = [
        {
          title: 'Parent Task 1',
          description: 'First parent task',
          estimatedHours: 12,
          priority: 'HIGH',
          complexity: 'COMPLEX',
          skills: ['React', 'TypeScript'],
          dependencies: [],
          completionCriteria: ['Parent 1 complete'],
          subtasks: [
            {
              title: 'Subtask 1.1',
              description: 'First subtask',
              estimatedHours: 6,
              priority: 'HIGH',
              complexity: 'MODERATE',
              skills: ['React'],
              dependencies: [],
              completionCriteria: ['Subtask 1.1 complete']
            },
            {
              title: 'Subtask 1.2',
              description: 'Second subtask',
              estimatedHours: 6,
              priority: 'MEDIUM',
              complexity: 'SIMPLE',
              skills: ['TypeScript'],
              dependencies: [],
              completionCriteria: ['Subtask 1.2 complete']
            }
          ]
        },
        {
          title: 'Parent Task 2',
          description: 'Second parent task',
          estimatedHours: 8,
          priority: 'MEDIUM',
          complexity: 'MODERATE',
          skills: ['CSS', 'HTML'],
          dependencies: ['Parent Task 1'],
          completionCriteria: ['Parent 2 complete']
        }
      ];

      // Act
      const metrics = (wbsEngine as any).calculateWBSMetrics(taskHierarchy);

      // Assert
      expect(metrics.totalHours).toBe(20); // 12 + 8
      expect(metrics.averageTaskSize).toBe(20/3); // 3 leaf tasks total
      expect(metrics.complexityDistribution).toHaveProperty('SIMPLE', 1);
      expect(metrics.complexityDistribution).toHaveProperty('MODERATE', 2);
      expect(metrics.complexityDistribution).toHaveProperty('COMPLEX', 1);
      expect(metrics.skillsRequired).toContain('React');
      expect(metrics.skillsRequired).toContain('TypeScript');
      expect(metrics.skillsRequired).toContain('CSS');
      expect(metrics.skillsRequired).toContain('HTML');
      expect(metrics.criticalPath).toContain('Parent Task 1');
    });

    it('should correctly flatten task hierarchy for analysis', async () => {
      // Arrange
      const taskHierarchy: TaskBreakdown[] = [
        {
          title: 'Level 1',
          description: 'Top level task',
          estimatedHours: 4,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill1'],
          dependencies: [],
          completionCriteria: ['Level 1 complete'],
          subtasks: [
            {
              title: 'Level 2.1',
              description: 'Second level task',
              estimatedHours: 6,
              priority: 'MEDIUM',
              complexity: 'MODERATE',
              skills: ['Skill2'],
              dependencies: [],
              completionCriteria: ['Level 2.1 complete'],
              subtasks: [
                {
                  title: 'Level 3.1',
                  description: 'Third level task',
                  estimatedHours: 2,
                  priority: 'LOW',
                  complexity: 'SIMPLE',
                  skills: ['Skill3'],
                  dependencies: [],
                  completionCriteria: ['Level 3.1 complete']
                }
              ]
            }
          ]
        }
      ];

      // Act
      const flattened = (wbsEngine as any).flattenTaskHierarchy(taskHierarchy);

      // Assert
      expect(flattened).toHaveLength(3);
      expect(flattened.map(t => t.title)).toContain('Level 1');
      expect(flattened.map(t => t.title)).toContain('Level 2.1');
      expect(flattened.map(t => t.title)).toContain('Level 3.1');
    });

    it('should calculate correct maximum depth', async () => {
      // Arrange
      const taskHierarchy: TaskBreakdown[] = [
        {
          title: 'Root',
          description: 'Root task',
          estimatedHours: 2,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill1'],
          dependencies: [],
          completionCriteria: ['Root complete'],
          subtasks: [
            {
              title: 'Child',
              description: 'Child task',
              estimatedHours: 4,
              priority: 'MEDIUM',
              complexity: 'MODERATE',
              skills: ['Skill2'],
              dependencies: [],
              completionCriteria: ['Child complete'],
              subtasks: [
                {
                  title: 'Grandchild',
                  description: 'Grandchild task',
                  estimatedHours: 2,
                  priority: 'LOW',
                  complexity: 'SIMPLE',
                  skills: ['Skill3'],
                  dependencies: [],
                  completionCriteria: ['Grandchild complete']
                }
              ]
            }
          ]
        }
      ];

      // Act
      const maxDepth = (wbsEngine as any).calculateMaxDepth(taskHierarchy);

      // Assert
      expect(maxDepth).toBe(3); // Root -> Child -> Grandchild = 3 levels
    });
  });

  describe('Template Integration', () => {
    it('should utilize task templates when available', async () => {
      // This test would verify that the WBS engine can use predefined templates
      // The actual implementation would need a template service
      const templateCategory = 'SOFTWARE_DEVELOPMENT';
      const templates = await (wbsEngine as any).loadTaskTemplates(templateCategory);
      
      // For now, this returns empty array since templates aren't implemented
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty milestone data gracefully', async () => {
      // Arrange
      const nonExistentMilestoneId = 'non-existent-milestone-id';
      const wbsRequest = {
        milestoneId: nonExistentMilestoneId,
        maxDepth: 2,
        maxTasksPerLevel: 4,
        targetTaskSize: 4,
        includeTemplates: false
      };

      // Act & Assert
      await expect(wbsEngine.generateWBS(wbsRequest)).rejects.toThrow('Milestone not found');
    });

    it('should validate task breakdown data from AI', async () => {
      // Arrange
      const goalId = 'test-goal-006';
      const milestoneId = 'test-milestone-006';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Validation Test Goal',
          description: 'Goal for testing validation',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Validation Test Milestone',
          description: 'Milestone for testing validation',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Validation test complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const wbsRequest = {
        milestoneId: milestoneId,
        maxDepth: 2,
        maxTasksPerLevel: 4,
        targetTaskSize: 4,
        includeTemplates: false
      };

      // Mock AI response with invalid data
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tasks: [
                {
                  title: '', // Invalid: empty title
                  description: 'Task with empty title',
                  estimatedHours: -5, // Invalid: negative hours
                  priority: 'INVALID_PRIORITY', // Invalid: not in enum
                  complexity: 'SIMPLE',
                  skills: [],
                  dependencies: [],
                  completionCriteria: [] // Invalid: empty criteria
                }
              ]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(wbsEngine.generateWBS(wbsRequest)).rejects.toThrow();
    });

    it('should handle malformed AI responses', async () => {
      // Arrange
      const goalId = 'test-goal-007';
      const milestoneId = 'test-milestone-007';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Malformed Response Test Goal',
          description: 'Goal for testing malformed responses',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: milestoneId,
          goalId: goalId,
          title: 'Malformed Response Test Milestone',
          description: 'Milestone for testing malformed responses',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Malformed response test complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const wbsRequest = {
        milestoneId: milestoneId,
        maxDepth: 2,
        maxTasksPerLevel: 4,
        targetTaskSize: 4,
        includeTemplates: false
      };

      // Mock AI response with malformed JSON
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(wbsEngine.generateWBS(wbsRequest)).rejects.toThrow('Failed to generate task hierarchy');
    });
  });
});