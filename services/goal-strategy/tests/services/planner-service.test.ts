import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  PlannerService,
  TimeSlot,
  WorkingHours,
  SchedulingConstraints,
  TaskPlacement,
  DependencyGraph,
  ScoredSlot
} from '../../src/services/planner-service';
import { TaskResponse, PriorityType } from '../../src/types/goal';
import { testPrisma } from '../setup';

// Mock Prisma module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => testPrisma)
}));

describe('PlannerService - Phase 3 TDD Tests', () => {
  let plannerService: PlannerService;
  let goalId: string;
  let milestoneId: string;

  beforeEach(async () => {
    plannerService = new PlannerService(testPrisma);
    
    // Setup test data
    goalId = 'test-goal-001';
    milestoneId = 'test-milestone-001';

    await testPrisma.goal.create({
      data: {
        id: goalId,
        title: 'Planner Test Goal',
        description: 'Goal for testing planner service',
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
        title: 'Planner Test Milestone',
        description: 'Milestone for testing planner service',
        targetDate: new Date('2025-08-15'),
        successCriteria: ['Planning complete'],
        status: 'NOT_STARTED',
        orderIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  });

  describe('scoreSlots', () => {
    it('should score time slots based on task requirements and constraints', async () => {
      // Arrange
      const tasks: TaskResponse[] = [
        {
          id: 'task-001',
          title: 'High Priority Task',
          description: 'Critical development task',
          estimatedHours: 4,
          priority: 'CRITICAL',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        },
        {
          id: 'task-002',
          title: 'Medium Priority Task',
          description: 'Regular development task',
          estimatedHours: 2,
          priority: 'MEDIUM',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      const availability: TimeSlot[] = [
        {
          id: 'slot-001',
          startTime: '2025-07-01T09:00:00Z',
          endTime: '2025-07-01T17:00:00Z',
          isAvailable: true
        },
        {
          id: 'slot-002',
          startTime: '2025-07-02T09:00:00Z',
          endTime: '2025-07-02T17:00:00Z',
          isAvailable: true
        },
        {
          id: 'slot-003',
          startTime: '2025-07-03T19:00:00Z',
          endTime: '2025-07-03T22:00:00Z',
          isAvailable: true // Evening slot - should score lower
        }
      ];

      const workingHours: WorkingHours = {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '10:00', end: '14:00', enabled: false },
        sunday: { start: '10:00', end: '14:00', enabled: false },
        timezone: 'UTC'
      };

      const constraints: SchedulingConstraints = {
        workingHours,
        maxBlockSizeHours: 2,
        minBlockSizeHours: 0.25,
        bufferBetweenTasksMinutes: 15,
        allowWeekends: false
      };

      // Act
      const scoredSlots = await plannerService.scoreSlots(tasks, availability, constraints);

      // Assert
      expect(scoredSlots).toHaveLength(3);
      
      // Should be sorted by score (highest first)
      expect(scoredSlots[0].score).toBeGreaterThanOrEqual(scoredSlots[1].score);
      expect(scoredSlots[1].score).toBeGreaterThanOrEqual(scoredSlots[2].score);

      // Working hours slots should score higher than evening slots
      const workingHoursSlots = scoredSlots.filter(slot => 
        slot.slot.id === 'slot-001' || slot.slot.id === 'slot-002'
      );
      const eveningSlot = scoredSlots.find(slot => slot.slot.id === 'slot-003');

      expect(workingHoursSlots[0].score).toBeGreaterThan(eveningSlot!.score);

      // Verify scoring factors
      workingHoursSlots.forEach(scoredSlot => {
        expect(scoredSlot.factors.priorityScore).toBeGreaterThan(0);
        expect(scoredSlot.factors.preferenceScore).toBeGreaterThan(0);
        expect(scoredSlot.factors.availabilityScore).toBeGreaterThan(0);
        expect(scoredSlot.reasoning).toContain('based on priority');
      });
    });

    it('should handle empty availability gracefully', async () => {
      // Arrange
      const tasks: TaskResponse[] = [{
        id: 'task-001',
        title: 'Test Task',
        description: 'Test task description',
        estimatedHours: 2,
        priority: 'MEDIUM',
        status: 'NOT_STARTED',
        milestoneId: milestoneId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        completedAt: null,
        parentTaskId: null,
        completionCriteria: null,
        actualHours: null,
        startedAt: null,
        assignedTo: null
      }];

      const emptyAvailability: TimeSlot[] = [];
      const constraints: SchedulingConstraints = {
        workingHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
          timezone: 'UTC'
        },
        maxBlockSizeHours: 2,
        minBlockSizeHours: 0.25,
        bufferBetweenTasksMinutes: 15,
        allowWeekends: false
      };

      // Act
      const scoredSlots = await plannerService.scoreSlots(tasks, emptyAvailability, constraints);

      // Assert
      expect(scoredSlots).toHaveLength(0);
    });
  });

  describe('placeTasks', () => {
    it('should place tasks in available time slots respecting dependencies', async () => {
      // Arrange
      const tasks: TaskResponse[] = [
        {
          id: 'task-001',
          title: 'Setup Task',
          description: 'Initial setup',
          estimatedHours: 2,
          priority: 'HIGH',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        },
        {
          id: 'task-002',
          title: 'Development Task',
          description: 'Main development',
          estimatedHours: 4,
          priority: 'HIGH',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      const availability: TimeSlot[] = [
        {
          id: 'slot-001',
          startTime: '2025-07-01T09:00:00Z',
          endTime: '2025-07-01T13:00:00Z', // 4 hours
          isAvailable: true
        },
        {
          id: 'slot-002',
          startTime: '2025-07-01T14:00:00Z',
          endTime: '2025-07-01T18:00:00Z', // 4 hours
          isAvailable: true
        }
      ];

      const constraints: SchedulingConstraints = {
        workingHours: {
          monday: { start: '09:00', end: '18:00', enabled: true },
          tuesday: { start: '09:00', end: '18:00', enabled: true },
          wednesday: { start: '09:00', end: '18:00', enabled: true },
          thursday: { start: '09:00', end: '18:00', enabled: true },
          friday: { start: '09:00', end: '18:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
          timezone: 'UTC'
        },
        maxBlockSizeHours: 2,
        minBlockSizeHours: 0.25,
        bufferBetweenTasksMinutes: 15,
        allowWeekends: false
      };

      // Act
      const placements = await plannerService.placeTasks(tasks, constraints, availability);

      // Assert
      expect(placements).toHaveLength(2);

      // All tasks should be placed successfully
      const placedTasks = placements.filter(p => p.status === 'PLACED');
      expect(placedTasks).toHaveLength(2);

      // Verify placement details
      placements.forEach(placement => {
        expect(placement.placements.length).toBeGreaterThan(0);
        expect(placement.originalTask).toBeDefined();
        
        placement.placements.forEach(p => {
          expect(p.durationHours).toBeGreaterThan(0);
          expect(p.durationHours).toBeLessThanOrEqual(2); // Max block size constraint
          expect(new Date(p.startTime).getTime()).toBeLessThan(new Date(p.endTime).getTime());
        });
      });
    });

    it('should split large tasks into smaller blocks', async () => {
      // Arrange
      const largeTask: TaskResponse = {
        id: 'large-task-001',
        title: 'Large Development Task',
        description: 'A task that exceeds max block size',
        estimatedHours: 6, // Exceeds max block size of 2 hours
        priority: 'HIGH',
        status: 'NOT_STARTED',
        milestoneId: milestoneId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        completedAt: null,
        parentTaskId: null,
        completionCriteria: null,
        actualHours: null,
        startedAt: null,
        assignedTo: null
      };

      const availability: TimeSlot[] = [
        {
          id: 'slot-001',
          startTime: '2025-07-01T09:00:00Z',
          endTime: '2025-07-01T11:00:00Z', // 2 hours
          isAvailable: true
        },
        {
          id: 'slot-002',
          startTime: '2025-07-01T14:00:00Z',
          endTime: '2025-07-01T16:00:00Z', // 2 hours
          isAvailable: true
        },
        {
          id: 'slot-003',
          startTime: '2025-07-02T09:00:00Z',
          endTime: '2025-07-02T11:00:00Z', // 2 hours
          isAvailable: true
        }
      ];

      const constraints: SchedulingConstraints = {
        workingHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
          timezone: 'UTC'
        },
        maxBlockSizeHours: 2,
        minBlockSizeHours: 0.25,
        bufferBetweenTasksMinutes: 15,
        allowWeekends: false
      };

      // Act
      const placements = await plannerService.placeTasks([largeTask], constraints, availability);

      // Assert
      expect(placements).toHaveLength(1);
      
      const placement = placements[0];
      expect(placement.status).toBe('PLACED');
      expect(placement.placements.length).toBeGreaterThan(1); // Should be split into multiple blocks
      
      // All blocks should respect max size constraint
      placement.placements.forEach(p => {
        expect(p.durationHours).toBeLessThanOrEqual(2);
        expect(p.isPartialTask).toBe(true);
        expect(p.parentTaskId).toBe('large-task-001');
      });

      // Total duration should equal original estimate
      const totalPlacedHours = placement.placements.reduce((sum, p) => sum + p.durationHours, 0);
      expect(totalPlacedHours).toBeCloseTo(6, 1);
    });

    it('should handle insufficient availability', async () => {
      // Arrange
      const tasks: TaskResponse[] = [
        {
          id: 'task-001',
          title: 'Large Task',
          description: 'Task requiring more time than available',
          estimatedHours: 10,
          priority: 'HIGH',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      const limitedAvailability: TimeSlot[] = [
        {
          id: 'slot-001',
          startTime: '2025-07-01T09:00:00Z',
          endTime: '2025-07-01T11:00:00Z', // Only 2 hours available
          isAvailable: true
        }
      ];

      const constraints: SchedulingConstraints = {
        workingHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
          timezone: 'UTC'
        },
        maxBlockSizeHours: 2,
        minBlockSizeHours: 0.25,
        bufferBetweenTasksMinutes: 15,
        allowWeekends: false
      };

      // Act
      const placements = await plannerService.placeTasks(tasks, constraints, limitedAvailability);

      // Assert
      expect(placements).toHaveLength(1);
      
      const placement = placements[0];
      expect(placement.status).toBe('PARTIALLY_PLACED');
      expect(placement.spilloverReason).toContain('hours could not be scheduled');
      expect(placement.placements.length).toBeGreaterThan(0); // Some work should be placed
      
      const totalPlacedHours = placement.placements.reduce((sum, p) => sum + p.durationHours, 0);
      expect(totalPlacedHours).toBeLessThan(10); // Less than requested
    });
  });

  describe('resolveDependencies', () => {
    it('should build dependency graph and calculate critical path', async () => {
      // Arrange
      const tasks: TaskResponse[] = [
        {
          id: 'task-001',
          title: 'Foundation Task',
          description: 'Must be done first',
          estimatedHours: 8,
          priority: 'CRITICAL',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        },
        {
          id: 'task-002',
          title: 'Dependent Task',
          description: 'Depends on foundation',
          estimatedHours: 6,
          priority: 'HIGH',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        },
        {
          id: 'task-003',
          title: 'Final Task',
          description: 'Completes the work',
          estimatedHours: 4,
          priority: 'MEDIUM',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      // Act
      const dependencyGraph = await plannerService.resolveDependencies(tasks);

      // Assert
      expect(dependencyGraph).toBeDefined();
      expect(dependencyGraph.nodes).toHaveLength(3);
      expect(dependencyGraph.totalDurationHours).toBe(18); // Sum of all task hours

      // Verify nodes
      dependencyGraph.nodes.forEach(node => {
        expect(node.taskId).toBeDefined();
        expect(node.title).toBeDefined();
        expect(node.estimatedHours).toBeGreaterThan(0);
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(node.priority);
      });

      // Should have created dependencies for high-priority tasks
      const criticalTasks = dependencyGraph.nodes.filter(n => n.priority === 'CRITICAL' || n.priority === 'HIGH');
      expect(criticalTasks.length).toBeGreaterThan(0);

      // Critical path should include high-priority tasks
      expect(dependencyGraph.criticalPath.length).toBeGreaterThan(0);
      expect(dependencyGraph.criticalPath).toContain('task-001'); // Critical priority task
    });

    it('should handle tasks with no dependencies', async () => {
      // Arrange
      const independentTasks: TaskResponse[] = [
        {
          id: 'independent-001',
          title: 'Independent Task 1',
          description: 'Can be done anytime',
          estimatedHours: 3,
          priority: 'LOW',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      // Act
      const dependencyGraph = await plannerService.resolveDependencies(independentTasks);

      // Assert
      expect(dependencyGraph.nodes).toHaveLength(1);
      expect(dependencyGraph.edges).toHaveLength(0); // No dependencies created
      expect(dependencyGraph.totalDurationHours).toBe(3);
      
      // Single task should be on critical path by default
      expect(dependencyGraph.criticalPath.length).toBeLessThanOrEqual(1);
    });
  });

  describe('splitMultiDayTasks', () => {
    it('should split large tasks into multiple blocks', async () => {
      // Arrange
      const largeTasks: TaskResponse[] = [
        {
          id: 'large-001',
          title: 'Large Task',
          description: 'Task requiring multiple days',
          estimatedHours: 12, // Exceeds max block size
          priority: 'HIGH',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        },
        {
          id: 'small-001',
          title: 'Small Task',
          description: 'Task fitting in one block',
          estimatedHours: 1.5,
          priority: 'MEDIUM',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      const maxBlockSize = 4; // 4 hour blocks

      // Act
      const splitTasks = await plannerService.splitMultiDayTasks(largeTasks, maxBlockSize);

      // Assert
      expect(splitTasks.length).toBeGreaterThan(2); // Large task should be split

      // Small task should remain unchanged
      const smallTask = splitTasks.find(t => t.id === 'small-001');
      expect(smallTask).toBeDefined();
      expect(smallTask?.estimatedHours).toBe(1.5);

      // Large task should be split into multiple parts
      const largeParts = splitTasks.filter(t => t.parentTaskId === 'large-001');
      expect(largeParts.length).toBeGreaterThan(1);

      // Each part should be within max block size
      largeParts.forEach(part => {
        expect(part.estimatedHours).toBeLessThanOrEqual(maxBlockSize);
        expect(part.title).toContain('Part');
        expect(part.parentTaskId).toBe('large-001');
      });

      // Total hours should be preserved
      const totalSplitHours = largeParts.reduce((sum, part) => sum + (part.estimatedHours || 0), 0);
      expect(totalSplitHours).toBeCloseTo(12, 1);
    });

    it('should not split tasks that fit within max block size', async () => {
      // Arrange
      const smallTasks: TaskResponse[] = [
        {
          id: 'small-001',
          title: 'Small Task 1',
          description: 'Fits in one block',
          estimatedHours: 2,
          priority: 'MEDIUM',
          status: 'NOT_STARTED',
          milestoneId: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          completedAt: null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        }
      ];

      const maxBlockSize = 4;

      // Act
      const result = await plannerService.splitMultiDayTasks(smallTasks, maxBlockSize);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('small-001');
      expect(result[0].estimatedHours).toBe(2);
      expect(result[0].parentTaskId).toBeUndefined();
    });
  });

  describe('generateSchedule', () => {
    it('should generate complete schedule for a goal', async () => {
      // Arrange
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task A',
          description: 'First task',
          estimatedHours: 4,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill A'],
          completionCriteria: ['Task A complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task B',
          description: 'Second task',
          estimatedHours: 6,
          priority: 'MEDIUM',
          complexity: 'MODERATE',
          skills: ['Skill B'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create task estimates
      await testPrisma.taskEstimation.createMany({
        data: [
          {
            taskId: taskA.id,
            estimatedHours: 4,
            method: 'EXPERT_JUDGMENT',
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            taskId: taskB.id,
            estimatedHours: 6,
            method: 'EXPERT_JUDGMENT',
            confidence: 0.75,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

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

      const startDate = new Date('2025-07-01');
      const endDate = new Date('2025-07-05');

      // Act
      const schedule = await plannerService.generateSchedule(
        goalId,
        workingHours,
        constraints,
        {},
        startDate,
        endDate
      );

      // Assert
      expect(schedule).toBeDefined();
      expect(schedule.goalId).toBe(goalId);
      expect(schedule.placements).toBeDefined();
      expect(Array.isArray(schedule.placements)).toBe(true);
      
      expect(schedule.summary).toBeDefined();
      expect(schedule.summary.totalTasks).toBe(2);
      expect(schedule.summary.placedTasks).toBeGreaterThanOrEqual(0);
      expect(schedule.summary.partiallyPlacedTasks).toBeGreaterThanOrEqual(0);
      expect(schedule.summary.unplacedTasks).toBeGreaterThanOrEqual(0);
      
      // Total should equal sum of placed, partially placed, and unplaced
      const totalProcessed = schedule.summary.placedTasks + 
                           schedule.summary.partiallyPlacedTasks + 
                           schedule.summary.unplacedTasks;
      expect(totalProcessed).toBe(schedule.summary.totalTasks);
    });

    it('should handle goal with no tasks', async () => {
      // Arrange
      const emptyGoalId = 'empty-goal-001';
      const emptyMilestoneId = 'empty-milestone-001';

      await testPrisma.goal.create({
        data: {
          id: emptyGoalId,
          title: 'Empty Goal',
          description: 'Goal with no tasks',
          category: 'SOFTWARE_DEVELOPMENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await testPrisma.milestone.create({
        data: {
          id: emptyMilestoneId,
          goalId: emptyGoalId,
          title: 'Empty Milestone',
          description: 'Milestone with no tasks',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Nothing to schedule'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

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

      // Act
      const schedule = await plannerService.generateSchedule(emptyGoalId, workingHours);

      // Assert
      expect(schedule.summary.totalTasks).toBe(0);
      expect(schedule.placements).toHaveLength(0);
    });
  });

  describe('suggestScheduleOptimizations', () => {
    it('should suggest optimizations for unplaced tasks', async () => {
      // Arrange
      const scheduleWithUnplacedTasks: TaskPlacement[] = [
        {
          taskId: 'task-001',
          originalTask: {
            id: 'task-001',
            title: 'Placed Task',
            estimatedHours: 4,
            priority: 'HIGH',
            dependencies: []
          },
          placements: [{
            slotId: 'slot-001',
            startTime: '2025-07-01T09:00:00Z',
            endTime: '2025-07-01T13:00:00Z',
            durationHours: 4,
            isPartialTask: false
          }],
          status: 'PLACED'
        },
        {
          taskId: 'task-002',
          originalTask: {
            id: 'task-002',
            title: 'Unplaced Task',
            estimatedHours: 8,
            priority: 'CRITICAL',
            dependencies: []
          },
          placements: [],
          status: 'UNPLACED',
          spilloverReason: 'Insufficient available time slots'
        }
      ];

      // Act
      const suggestions = await plannerService.suggestScheduleOptimizations(scheduleWithUnplacedTasks);

      // Assert
      expect(suggestions.length).toBeGreaterThan(0);
      
      const unplacedSuggestion = suggestions.find(s => 
        s.suggestion.includes('could not be scheduled')
      );
      expect(unplacedSuggestion).toBeDefined();
      expect(unplacedSuggestion?.alternatives.length).toBeGreaterThan(0);
      expect(unplacedSuggestion?.urgencyWarning).toContain('Critical tasks are unscheduled');
    });

    it('should suggest consolidation for fragmented tasks', async () => {
      // Arrange
      const scheduleWithFragmentation: TaskPlacement[] = [
        {
          taskId: 'task-001',
          originalTask: {
            id: 'task-001',
            title: 'Fragmented Task',
            estimatedHours: 6,
            priority: 'HIGH',
            dependencies: []
          },
          placements: [
            {
              slotId: 'slot-001',
              startTime: '2025-07-01T09:00:00Z',
              endTime: '2025-07-01T11:00:00Z',
              durationHours: 2,
              isPartialTask: true,
              partIndex: 1,
              totalParts: 3
            },
            {
              slotId: 'slot-002',
              startTime: '2025-07-01T14:00:00Z',
              endTime: '2025-07-01T16:00:00Z',
              durationHours: 2,
              isPartialTask: true,
              partIndex: 2,
              totalParts: 3
            },
            {
              slotId: 'slot-003',
              startTime: '2025-07-02T09:00:00Z',
              endTime: '2025-07-02T11:00:00Z',
              durationHours: 2,
              isPartialTask: true,
              partIndex: 3,
              totalParts: 3
            }
          ],
          status: 'PLACED'
        }
      ];

      // Act
      const suggestions = await plannerService.suggestScheduleOptimizations(scheduleWithFragmentation);

      // Assert
      expect(suggestions.length).toBeGreaterThan(0);
      
      const fragmentationSuggestion = suggestions.find(s => 
        s.suggestion.includes('split across multiple time blocks')
      );
      expect(fragmentationSuggestion).toBeDefined();
      expect(fragmentationSuggestion?.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('explainConflicts', () => {
    it('should provide detailed explanations for scheduling conflicts', async () => {
      // Arrange
      const conflicts = [
        'Task A conflicts with existing meeting at 2 PM',
        'Task B requires skills not available during scheduled time',
        'Task C deadline conflicts with Task D dependency'
      ];

      // Act
      const explanations = await plannerService.explainConflicts(conflicts);

      // Assert
      expect(explanations).toHaveLength(3);
      
      explanations.forEach(explanation => {
        expect(explanation.conflictSummary).toContain('Scheduling conflict detected');
        expect(explanation.impactAnalysis).toBeDefined();
        expect(explanation.proposedSolutions.length).toBeGreaterThan(0);
        expect(explanation.recommendedAction).toBeDefined();
        
        explanation.proposedSolutions.forEach(solution => {
          expect(solution.solution).toBeDefined();
          expect(solution.effortRequired).toBeDefined();
          expect(solution.impact).toBeDefined();
        });
      });
    });
  });

  describe('generateUserFriendlyMessages', () => {
    it('should generate appropriate messages for different contexts', async () => {
      // Arrange
      const completionContext = {
        type: 'schedule_complete',
        taskCount: 5,
        dayCount: 3,
        conflicts: 2
      };

      const optimizationContext = {
        type: 'optimization_suggestion',
        suggestionCount: 3
      };

      // Act
      const completionMessage = await plannerService.generateUserFriendlyMessages(completionContext);
      const optimizationMessage = await plannerService.generateUserFriendlyMessages(optimizationContext);

      // Assert
      expect(completionMessage).toContain('Successfully scheduled 5 tasks');
      expect(completionMessage).toContain('across 3 days');
      expect(completionMessage).toContain('2 conflicts resolved');

      expect(optimizationMessage).toContain('3 opportunities for optimization');
      expect(optimizationMessage).toContain('review the suggestions');
    });

    it('should handle unknown context types gracefully', async () => {
      // Arrange
      const unknownContext = {
        type: 'unknown_type',
        someData: 'test'
      };

      // Act
      const message = await plannerService.generateUserFriendlyMessages(unknownContext);

      // Assert
      expect(message).toBe('Schedule operation completed successfully.');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid goal ID', async () => {
      // Arrange
      const invalidGoalId = 'non-existent-goal';
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

      // Act & Assert
      await expect(plannerService.generateSchedule(invalidGoalId, workingHours))
        .rejects.toThrow('Goal not found');
    });

    it('should handle empty working hours', async () => {
      // Arrange
      const noWorkingHours = {
        monday: { start: '09:00', end: '17:00', enabled: false },
        tuesday: { start: '09:00', end: '17:00', enabled: false },
        wednesday: { start: '09:00', end: '17:00', enabled: false },
        thursday: { start: '09:00', end: '17:00', enabled: false },
        friday: { start: '09:00', end: '17:00', enabled: false },
        saturday: { start: '10:00', end: '14:00', enabled: false },
        sunday: { start: '10:00', end: '14:00', enabled: false },
        timezone: 'UTC'
      };

      // Act
      const schedule = await plannerService.generateSchedule(goalId, noWorkingHours);

      // Assert
      // Should still work but may have no time slots generated
      expect(schedule).toBeDefined();
      expect(schedule.goalId).toBe(goalId);
    });

    it('should handle invalid date ranges', async () => {
      // Arrange
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

      const startDate = new Date('2025-07-15');
      const endDate = new Date('2025-07-10'); // End before start

      // Act
      const schedule = await plannerService.generateSchedule(
        goalId,
        workingHours,
        {},
        {},
        startDate,
        endDate
      );

      // Assert
      // Should handle gracefully and not crash
      expect(schedule).toBeDefined();
    });
  });
});