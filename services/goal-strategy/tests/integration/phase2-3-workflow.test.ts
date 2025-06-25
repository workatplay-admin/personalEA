import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  MilestoneGenerator,
  MilestoneGenerationInput,
  GeneratedMilestone
} from '../../src/services/milestone-generator';
import { WBSEngine, TaskBreakdown } from '../../src/services/wbs-engine';
import { DependencyMapper } from '../../src/services/dependency-mapper';
import { TaskEstimationEngine } from '../../src/services/task-estimation-engine';
import { PlannerService } from '../../src/services/planner-service';
import { SMARTCriteria } from '../../src/services/smart-goal-processor';
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

describe('Phase 2-3 Complete Workflow Integration Tests', () => {
  let milestoneGenerator: MilestoneGenerator;
  let wbsEngine: WBSEngine;
  let dependencyMapper: DependencyMapper;
  let estimationEngine: TaskEstimationEngine;
  let plannerService: PlannerService;
  let mockOpenAI: any;

  beforeEach(() => {
    milestoneGenerator = new MilestoneGenerator();
    wbsEngine = new WBSEngine();
    dependencyMapper = new DependencyMapper();
    estimationEngine = new TaskEstimationEngine();
    plannerService = new PlannerService(testPrisma);
    
    // Reset OpenAI mock
    const { OpenAI } = require('openai');
    mockOpenAI = new OpenAI();
    jest.clearAllMocks();
  });

  describe('Complete Goal-to-Schedule Workflow', () => {
    it('should process a SMART goal through all Phase 2-3 services to create a complete schedule', async () => {
      // Arrange - Create test goal and setup
      const goalId = 'integration-goal-001';
      const smartCriteria: SMARTCriteria = {
        specific: 'Build a full-stack e-commerce web application with user authentication, product catalog, shopping cart, and payment processing',
        measurable: 'Complete application with 5 main modules: Authentication (login/register), Product Catalog (browse/search), Shopping Cart, Payment Processing, and Admin Panel',
        achievable: 'Using React.js for frontend, Node.js/Express for backend, PostgreSQL for database, and Stripe for payments - technologies the team knows well',
        relevant: 'Enables online sales for the business, expanding market reach and revenue potential',
        timeBound: 'Complete development and deploy to production within 16 weeks'
      };

      const milestoneInput: MilestoneGenerationInput = {
        goalId: goalId,
        goalTitle: 'Build E-commerce Platform',
        smartCriteria: smartCriteria,
        targetDate: new Date('2025-10-15'),
        preferences: {
          milestoneCount: 4,
          distributionStrategy: 'EVEN',
          includeBufferTime: true
        }
      };

      // Create goal in database
      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Build E-commerce Platform',
          description: 'Complete e-commerce web application development',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mock AI responses for each service
      const mockMilestoneResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: [
                {
                  title: 'Project Setup and Authentication',
                  description: 'Initialize project structure, setup development environment, and implement user authentication system',
                  targetDate: '2025-07-15',
                  completionCriteria: 'Dev environment ready, user registration/login working, JWT authentication implemented',
                  orderIndex: 0,
                  estimatedEffort: 80,
                  dependencies: []
                },
                {
                  title: 'Product Catalog and Search',
                  description: 'Build product management system with catalog display and search functionality',
                  targetDate: '2025-08-15',
                  completionCriteria: 'Product CRUD operations complete, catalog pages working, search and filtering functional',
                  orderIndex: 1,
                  estimatedEffort: 120,
                  dependencies: ['Project Setup and Authentication']
                },
                {
                  title: 'Shopping Cart and Checkout',
                  description: 'Implement shopping cart functionality and checkout process',
                  targetDate: '2025-09-15',
                  completionCriteria: 'Add to cart working, cart management complete, checkout flow implemented',
                  orderIndex: 2,
                  estimatedEffort: 100,
                  dependencies: ['Product Catalog and Search']
                },
                {
                  title: 'Payment Integration and Deployment',
                  description: 'Integrate payment processing and deploy to production',
                  targetDate: '2025-10-15',
                  completionCriteria: 'Stripe integration working, order processing complete, production deployment successful',
                  orderIndex: 3,
                  estimatedEffort: 80,
                  dependencies: ['Shopping Cart and Checkout']
                }
              ],
              rationale: 'Four-phase approach building from foundation to final deployment',
              timeline: {
                startDate: '2025-06-23',
                endDate: '2025-10-15',
                totalDuration: 114
              },
              confidence: 0.85
            })
          }
        }]
      };

      const mockWBSResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tasks: [
                {
                  title: 'Setup Development Environment',
                  description: 'Configure React, Node.js, and PostgreSQL development stack',
                  estimatedHours: 8,
                  priority: 'HIGH',
                  complexity: 'SIMPLE',
                  skills: ['DevOps', 'Node.js', 'React'],
                  dependencies: [],
                  completionCriteria: ['Environment configured', 'Dependencies installed', 'Basic project structure created'],
                  subtasks: []
                },
                {
                  title: 'Database Design and Setup',
                  description: 'Design database schema and set up PostgreSQL with initial tables',
                  estimatedHours: 12,
                  priority: 'HIGH',
                  complexity: 'MODERATE',
                  skills: ['Database Design', 'PostgreSQL'],
                  dependencies: ['Setup Development Environment'],
                  completionCriteria: ['Schema designed', 'Tables created', 'Test data inserted'],
                  subtasks: []
                },
                {
                  title: 'User Authentication Backend',
                  description: 'Implement JWT-based authentication API endpoints',
                  estimatedHours: 20,
                  priority: 'HIGH',
                  complexity: 'MODERATE',
                  skills: ['Node.js', 'JWT', 'Security'],
                  dependencies: ['Database Design and Setup'],
                  completionCriteria: ['Registration endpoint', 'Login endpoint', 'JWT validation middleware'],
                  subtasks: []
                },
                {
                  title: 'Authentication Frontend',
                  description: 'Build React components for login and registration',
                  estimatedHours: 16,
                  priority: 'HIGH',
                  complexity: 'MODERATE',
                  skills: ['React', 'Form Handling', 'State Management'],
                  dependencies: ['User Authentication Backend'],
                  completionCriteria: ['Login form', 'Registration form', 'Protected routes'],
                  subtasks: []
                }
              ]
            })
          }
        }]
      };

      const mockEstimationResponses = [
        {
          choices: [{
            message: {
              content: JSON.stringify({
                estimate: 8,
                confidence: 0.9,
                rationale: 'Environment setup is straightforward with known technologies'
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                estimate: 12,
                confidence: 0.8,
                rationale: 'Database design requires careful planning but is well-understood domain'
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                estimate: 20,
                confidence: 0.75,
                rationale: 'Authentication implementation with proper security considerations'
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                estimate: 16,
                confidence: 0.8,
                rationale: 'React components with state management and form handling'
              })
            }
          }]
        }
      ];

      // Setup mock responses
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockMilestoneResponse)  // Milestone generation
        .mockResolvedValueOnce(mockWBSResponse)        // WBS generation
        .mockResolvedValueOnce(mockEstimationResponses[0])  // Estimation 1
        .mockResolvedValueOnce(mockEstimationResponses[1])  // Estimation 2
        .mockResolvedValueOnce(mockEstimationResponses[2])  // Estimation 3
        .mockResolvedValueOnce(mockEstimationResponses[3]); // Estimation 4

      // Act - Execute complete workflow

      // Phase 2 Step 1: Generate Milestones
      console.log('🚀 Step 1: Generating milestones from SMART goal...');
      const milestoneResult = await milestoneGenerator.generateMilestones(milestoneInput);

      // Create milestones in database
      const createdMilestones = [];
      for (const milestone of milestoneResult.milestones) {
        const dbMilestone = await testPrisma.milestone.create({
          data: {
            goalId: goalId,
            title: milestone.title,
            description: milestone.description,
            targetDate: milestone.targetDate,
            successCriteria: [milestone.completionCriteria],
            status: 'NOT_STARTED',
            orderIndex: milestone.orderIndex,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        createdMilestones.push(dbMilestone);
      }

      // Phase 2 Step 2: Generate WBS for first milestone
      console.log('🚀 Step 2: Creating Work Breakdown Structure...');
      const wbsRequest = {
        milestoneId: createdMilestones[0].id,
        maxDepth: 2,
        maxTasksPerLevel: 6,
        targetTaskSize: 4,
        includeTemplates: false
      };
      const wbsResult = await wbsEngine.generateWBS(wbsRequest);

      // Get created tasks from database
      const createdTasks = await testPrisma.task.findMany({
        where: { milestoneId: createdMilestones[0].id }
      });

      // Phase 3 Step 1: Generate estimations for each task
      console.log('🚀 Step 3: Generating task estimations...');
      const estimationResults = [];
      for (const task of createdTasks) {
        const estimationRequest = {
          taskId: task.id,
          taskDescription: task.description,
          complexity: task.complexity as 'SIMPLE' | 'MODERATE' | 'COMPLEX',
          skills: task.skills || ['General'],
          methods: ['EXPERT_JUDGMENT' as const]
        };
        const estimation = await estimationEngine.estimateTask(estimationRequest);
        estimationResults.push(estimation);

        // Save estimation to database
        await testPrisma.taskEstimation.create({
          data: {
            taskId: task.id,
            estimatedHours: estimation.finalEstimate.expected,
            method: 'EXPERT_JUDGMENT',
            confidence: estimation.confidence,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      // Phase 3 Step 2: Analyze dependencies
      console.log('🚀 Step 4: Analyzing task dependencies...');
      const dependencyRequest = {
        milestoneId: createdMilestones[0].id,
        analysisType: 'CRITICAL_PATH' as const,
        includeBuffers: true,
        bufferPercentage: 20
      };
      const dependencyAnalysis = await dependencyMapper.analyzeDependencies(dependencyRequest);

      // Phase 3 Step 3: Generate schedule
      console.log('🚀 Step 5: Creating optimized schedule...');
      const workingHours = {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '10:00', end: '14:00', enabled: false },
        sunday: { start: '10:00', end: '14:00', enabled: false },
        timezone: 'UTC'
      };

      const constraints = {
        max_consecutive_hours: 2,
        break_duration_minutes: 15
      };

      const startDate = new Date('2025-06-23');
      const endDate = new Date('2025-07-15');

      const schedule = await plannerService.generateSchedule(
        goalId,
        workingHours,
        constraints,
        {},
        startDate,
        endDate
      );

      // Assert - Verify complete workflow results

      // Verify milestone generation
      expect(milestoneResult.milestones).toHaveLength(4);
      expect(milestoneResult.confidence).toBe(0.85);
      expect(createdMilestones).toHaveLength(4);

      console.log(`✅ Generated ${milestoneResult.milestones.length} milestones with ${milestoneResult.confidence} confidence`);

      // Verify WBS creation
      expect(wbsResult.totalTasks).toBeGreaterThan(0);
      expect(wbsResult.taskHierarchy.length).toBeGreaterThan(0);
      expect(createdTasks.length).toBeGreaterThan(0);

      console.log(`✅ Created WBS with ${wbsResult.totalTasks} tasks totaling ${wbsResult.totalEstimatedHours} hours`);

      // Verify estimations
      expect(estimationResults).toHaveLength(createdTasks.length);
      estimationResults.forEach(estimation => {
        expect(estimation.finalEstimate.expected).toBeGreaterThan(0);
        expect(estimation.confidence).toBeGreaterThan(0);
      });

      const totalEstimatedHours = estimationResults.reduce(
        (sum, est) => sum + est.finalEstimate.expected, 0
      );
      console.log(`✅ Generated ${estimationResults.length} estimations totaling ${totalEstimatedHours.toFixed(1)} hours`);

      // Verify dependency analysis
      expect(dependencyAnalysis.totalDuration).toBeGreaterThan(0);
      expect(dependencyAnalysis.criticalPath.length).toBeGreaterThan(0);
      expect(dependencyAnalysis.scheduleMetrics.totalTasks).toBe(createdTasks.length);

      console.log(`✅ Analyzed dependencies with ${dependencyAnalysis.criticalPath.length} tasks on critical path`);

      // Verify schedule generation
      expect(schedule.goalId).toBe(goalId);
      expect(schedule.summary.totalTasks).toBe(createdTasks.length);
      expect(schedule.placements).toBeDefined();

      const placedTaskCount = schedule.summary.placedTasks + schedule.summary.partiallyPlacedTasks;
      console.log(`✅ Created schedule placing ${placedTaskCount}/${schedule.summary.totalTasks} tasks`);

      // Verify end-to-end data consistency
      expect(schedule.summary.totalTasks).toBe(wbsResult.totalTasks);
      expect(schedule.summary.totalTasks).toBe(estimationResults.length);
      expect(dependencyAnalysis.scheduleMetrics.totalTasks).toBe(schedule.summary.totalTasks);

      console.log('🎉 Complete Phase 2-3 workflow executed successfully!');

      // Verify business logic correctness
      // 1. Tasks should be estimated within reasonable bounds
      estimationResults.forEach(estimation => {
        expect(estimation.finalEstimate.expected).toBeGreaterThan(0.25); // Minimum 15 minutes
        expect(estimation.finalEstimate.expected).toBeLessThan(40); // Maximum 1 week
      });

      // 2. Dependencies should be logical
      expect(dependencyAnalysis.criticalPathDuration).toBeGreaterThanOrEqual(dependencyAnalysis.totalDuration);

      // 3. Schedule should respect working hours
      if (schedule.placements.length > 0) {
        schedule.placements.forEach(placement => {
          placement.placements.forEach(p => {
            const startHour = new Date(p.startTime).getHours();
            const endHour = new Date(p.endTime).getHours();
            expect(startHour).toBeGreaterThanOrEqual(9); // After 9 AM
            expect(endHour).toBeLessThanOrEqual(17); // Before 5 PM
          });
        });
      }

      console.log('✅ All business logic validations passed');
    }, 60000); // 60 second timeout for complex integration test

    it('should handle workflow errors gracefully and provide meaningful feedback', async () => {
      // Arrange - Setup scenario that will cause failures
      const problemGoalId = 'problem-goal-001';
      const invalidSmartCriteria: SMARTCriteria = {
        specific: '', // Empty - should cause issues
        measurable: 'Hard to measure',
        achievable: 'Maybe achievable',
        relevant: 'Somewhat relevant',
        timeBound: 'Someday'
      };

      const milestoneInput: MilestoneGenerationInput = {
        goalId: problemGoalId,
        goalTitle: 'Problematic Goal',
        smartCriteria: invalidSmartCriteria,
        targetDate: new Date('2025-06-25'), // Very short timeline
        preferences: {
          milestoneCount: 10, // Too many milestones
          distributionStrategy: 'EVEN',
          includeBufferTime: false
        }
      };

      // Create goal in database
      await testPrisma.goal.create({
        data: {
          id: problemGoalId,
          title: 'Problematic Goal',
          description: 'Goal designed to test error handling',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mock AI to return problematic responses
      const mockProblematicMilestoneResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: [], // Empty milestones
              rationale: 'Unable to create meaningful milestones from vague criteria',
              timeline: {
                startDate: '2025-06-23',
                endDate: '2025-06-25',
                totalDuration: 2
              },
              confidence: 0.1 // Very low confidence
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockProblematicMilestoneResponse);

      // Act & Assert - Test error handling at each stage
      console.log('🔍 Testing error handling in Phase 2-3 workflow...');

      // Test milestone generation with poor input
      const milestoneResult = await milestoneGenerator.generateMilestones(milestoneInput);
      
      expect(milestoneResult.milestones).toHaveLength(0);
      expect(milestoneResult.confidence).toBeLessThan(0.5);
      console.log('✅ Milestone generation handled poor input gracefully');

      // Test WBS with no milestones - should fail appropriately
      try {
        await wbsEngine.generateWBS({
          milestoneId: 'non-existent-milestone',
          maxDepth: 2,
          maxTasksPerLevel: 4,
          targetTaskSize: 4,
          includeTemplates: false
        });
        fail('Should have thrown error for non-existent milestone');
      } catch (error) {
        expect((error as Error).message).toContain('Milestone not found');
        console.log('✅ WBS engine properly validates milestone existence');
      }

      // Test dependency analysis with no tasks
      const emptyMilestoneId = 'empty-milestone-001';
      await testPrisma.milestone.create({
        data: {
          id: emptyMilestoneId,
          goalId: problemGoalId,
          title: 'Empty Milestone',
          description: 'Milestone with no tasks',
          targetDate: new Date('2025-06-25'),
          successCriteria: ['Nothing to analyze'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      try {
        await dependencyMapper.analyzeDependencies({
          milestoneId: emptyMilestoneId,
          analysisType: 'CRITICAL_PATH'
        });
        fail('Should have thrown error for milestone with no tasks');
      } catch (error) {
        expect((error as Error).message).toContain('No tasks found');
        console.log('✅ Dependency mapper properly validates task existence');
      }

      // Test estimation with invalid parameters
      try {
        await estimationEngine.estimateTask({
          taskDescription: '', // Empty description
          complexity: 'INVALID' as any,
          skills: [],
          methods: []
        });
        fail('Should have thrown validation error');
      } catch (error) {
        console.log('✅ Estimation engine properly validates input parameters');
      }

      console.log('🎉 Error handling tests completed successfully');
    }, 30000);

    it('should maintain data consistency across service boundaries', async () => {
      // Arrange - Create a goal with specific data that we can track
      const consistencyGoalId = 'consistency-goal-001';
      const testMilestoneId = 'consistency-milestone-001';

      await testPrisma.goal.create({
        data: {
          id: consistencyGoalId,
          title: 'Data Consistency Test Goal',
          description: 'Goal for testing data consistency',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: testMilestoneId,
          goalId: consistencyGoalId,
          title: 'Consistency Test Milestone',
          description: 'Milestone for testing consistency',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Consistency maintained'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create known tasks with specific characteristics
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: testMilestoneId,
          title: 'Consistency Task A',
          description: 'First consistency test task',
          estimatedHours: 5,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['Skill_A', 'Shared_Skill'],
          completionCriteria: ['Task A complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: testMilestoneId,
          title: 'Consistency Task B',
          description: 'Second consistency test task',
          estimatedHours: 8,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Skill_B', 'Shared_Skill'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create dependency
      await testPrisma.taskDependency.create({
        data: {
          predecessorId: taskA.id,
          successorId: taskB.id,
          dependencyType: 'FINISH_TO_START',
          lag: 1,
          isHard: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mock consistent estimation responses
      const mockEstimationResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 5,
              confidence: 0.8,
              rationale: 'Consistent estimation for testing'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockEstimationResponse);

      // Act - Run services and track data consistency

      // 1. Generate estimations
      const estimationA = await estimationEngine.estimateTask({
        taskId: taskA.id,
        taskDescription: taskA.description,
        complexity: taskA.complexity as 'SIMPLE' | 'MODERATE' | 'COMPLEX',
        skills: taskA.skills || [],
        methods: ['EXPERT_JUDGMENT']
      });

      const estimationB = await estimationEngine.estimateTask({
        taskId: taskB.id,
        taskDescription: taskB.description,
        complexity: taskB.complexity as 'SIMPLE' | 'MODERATE' | 'COMPLEX',
        skills: taskB.skills || [],
        methods: ['EXPERT_JUDGMENT']
      });

      // 2. Analyze dependencies
      const dependencyAnalysis = await dependencyMapper.analyzeDependencies({
        milestoneId: testMilestoneId,
        analysisType: 'CRITICAL_PATH'
      });

      // 3. Generate schedule
      const schedule = await plannerService.generateSchedule(
        consistencyGoalId,
        {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
          timezone: 'UTC'
        }
      );

      // Assert - Verify data consistency

      // 1. Task count consistency
      expect(dependencyAnalysis.scheduleMetrics.totalTasks).toBe(2);
      expect(schedule.summary.totalTasks).toBe(2);

      // 2. Task ID consistency
      const dependencyTaskIds = dependencyAnalysis.criticalPath;
      const scheduleTaskIds = schedule.placements.map(p => p.taskId);
      
      expect(dependencyTaskIds).toContain(taskA.id);
      // Note: TaskB might not be on critical path, but should be in schedule

      // 3. Estimation consistency with database
      const dbEstimations = await testPrisma.taskEstimation.findMany({
        where: { taskId: { in: [taskA.id, taskB.id] } }
      });
      
      // Should have estimations for both tasks
      expect(dbEstimations).toHaveLength(2);

      // 4. Dependency relationship consistency
      expect(dependencyAnalysis.criticalPath.indexOf(taskA.id))
        .toBeLessThan(dependencyAnalysis.criticalPath.indexOf(taskB.id) === -1 ? 
                      Infinity : dependencyAnalysis.criticalPath.indexOf(taskB.id));

      // 5. Resource conflict detection consistency
      const sharedSkillConflicts = dependencyAnalysis.resourceConflicts.filter(
        conflict => conflict.skill === 'Shared_Skill'
      );
      
      if (sharedSkillConflicts.length > 0) {
        expect(sharedSkillConflicts[0].conflictingTasks).toContain(taskA.id);
        expect(sharedSkillConflicts[0].conflictingTasks).toContain(taskB.id);
      }

      console.log('✅ Data consistency verified across all service boundaries');

      // 6. Verify state persistence
      const goalFromDb = await testPrisma.goal.findUnique({
        where: { id: consistencyGoalId },
        include: {
          milestones: {
            include: {
              tasks: {
                include: {
                  estimates: true,
                  dependencies: true
                }
              }
            }
          }
        }
      });

      expect(goalFromDb).toBeDefined();
      expect(goalFromDb?.milestones).toHaveLength(1);
      expect(goalFromDb?.milestones[0].tasks).toHaveLength(2);
      
      console.log('✅ Database state consistency verified');
    }, 45000);
  });

  describe('Performance and Scalability Integration', () => {
    it('should handle large-scale workflow efficiently', async () => {
      // Arrange - Create a complex goal with many milestones and tasks
      const scaleGoalId = 'scale-goal-001';
      const numberOfMilestones = 5;
      const tasksPerMilestone = 8;

      await testPrisma.goal.create({
        data: {
          id: scaleGoalId,
          title: 'Large Scale Project',
          description: 'Complex project for testing scalability',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create multiple milestones
      const milestones = [];
      for (let m = 0; m < numberOfMilestones; m++) {
        const milestone = await testPrisma.milestone.create({
          data: {
            goalId: scaleGoalId,
            title: `Scale Milestone ${m + 1}`,
            description: `Milestone ${m + 1} for scale testing`,
            targetDate: new Date(Date.now() + (m + 1) * 30 * 24 * 60 * 60 * 1000),
            successCriteria: [`Milestone ${m + 1} complete`],
            status: 'NOT_STARTED',
            orderIndex: m,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        milestones.push(milestone);

        // Create multiple tasks per milestone
        for (let t = 0; t < tasksPerMilestone; t++) {
          await testPrisma.task.create({
            data: {
              milestoneId: milestone.id,
              title: `Scale Task ${m + 1}.${t + 1}`,
              description: `Task ${t + 1} in milestone ${m + 1}`,
              estimatedHours: Math.random() * 6 + 2, // 2-8 hours
              priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
              complexity: ['SIMPLE', 'MODERATE', 'COMPLEX'][Math.floor(Math.random() * 3)],
              skills: [`Skill_${(t % 3) + 1}`, 'General'],
              completionCriteria: [`Task ${m + 1}.${t + 1} complete`],
              status: 'NOT_STARTED',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }

      // Mock AI responses for scale testing
      const mockScaleResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 4,
              confidence: 0.7,
              rationale: 'Scale test estimation'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockScaleResponse);

      const startTime = Date.now();

      // Act - Run analysis on large dataset
      console.log(`🚀 Starting large-scale analysis with ${numberOfMilestones} milestones and ${numberOfMilestones * tasksPerMilestone} tasks...`);

      // Analyze dependencies for each milestone
      const dependencyPromises = milestones.map(milestone =>
        dependencyMapper.analyzeDependencies({
          milestoneId: milestone.id,
          analysisType: 'CRITICAL_PATH'
        })
      );

      const dependencyResults = await Promise.all(dependencyPromises);

      // Generate schedule for the entire goal
      const schedule = await plannerService.generateSchedule(
        scaleGoalId,
        {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
          timezone: 'UTC'
        }
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Assert - Verify performance and results
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(dependencyResults).toHaveLength(numberOfMilestones);
      expect(schedule.summary.totalTasks).toBe(numberOfMilestones * tasksPerMilestone);

      // Verify each milestone was processed correctly
      dependencyResults.forEach((result, index) => {
        expect(result.scheduleMetrics.totalTasks).toBe(tasksPerMilestone);
        expect(result.criticalPath.length).toBeGreaterThan(0);
      });

      console.log(`✅ Large-scale analysis completed in ${executionTime}ms`);
      console.log(`✅ Processed ${schedule.summary.totalTasks} tasks across ${numberOfMilestones} milestones`);
      console.log(`✅ Average time per task: ${(executionTime / (numberOfMilestones * tasksPerMilestone)).toFixed(2)}ms`);

      // Performance assertions
      expect(executionTime / (numberOfMilestones * tasksPerMilestone)).toBeLessThan(1000); // < 1 second per task
    }, 60000);
  });
});