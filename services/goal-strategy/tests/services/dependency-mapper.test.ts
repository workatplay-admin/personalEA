import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  DependencyMapper, 
  TaskNode, 
  TaskDependency, 
  DependencyAnalysis,
  ParallelTrack,
  ResourceConflict,
  OptimizationSuggestion
} from '../../src/services/dependency-mapper';
import { testPrisma } from '../setup';

// Mock Prisma module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => testPrisma)
}));

describe('DependencyMapper - Phase 3 TDD Tests', () => {
  let dependencyMapper: DependencyMapper;
  let goalId: string;
  let milestoneId: string;

  beforeEach(async () => {
    dependencyMapper = new DependencyMapper();
    
    // Setup test data
    goalId = 'test-goal-001';
    milestoneId = 'test-milestone-001';

    await testPrisma.goal.create({
      data: {
        id: goalId,
        title: 'Dependency Test Goal',
        description: 'Goal for testing dependency mapping',
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
        title: 'Dependency Test Milestone',
        description: 'Milestone for testing dependency mapping',
        targetDate: new Date('2025-08-15'),
        successCriteria: ['Dependencies mapped correctly'],
        status: 'NOT_STARTED',
        orderIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  });

  describe('analyzeDependencies', () => {
    it('should analyze dependencies and calculate critical path', async () => {
      // Arrange - Create a task dependency chain
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Setup Environment',
          description: 'Setup development environment',
          estimatedHours: 4,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['DevOps'],
          completionCriteria: ['Environment ready'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Backend Development',
          description: 'Develop backend API',
          estimatedHours: 20,
          priority: 'HIGH',
          complexity: 'COMPLEX',
          skills: ['Node.js', 'Database'],
          completionCriteria: ['API complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Frontend Development',
          description: 'Develop frontend UI',
          estimatedHours: 16,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['React', 'CSS'],
          completionCriteria: ['UI complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskD = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Integration Testing',
          description: 'Test frontend-backend integration',
          estimatedHours: 8,
          priority: 'MEDIUM',
          complexity: 'MODERATE',
          skills: ['Testing', 'Node.js', 'React'],
          completionCriteria: ['Integration tests pass'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create dependencies: A -> B, A -> C, B -> D, C -> D
      await testPrisma.taskDependency.createMany({
        data: [
          {
            predecessorId: taskA.id,
            successorId: taskB.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskA.id,
            successorId: taskC.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskB.id,
            successorId: taskD.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskC.id,
            successorId: taskD.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH' as const,
        includeBuffers: true,
        bufferPercentage: 20
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.milestoneId).toBe(milestoneId);
      expect(result.totalDuration).toBe(32); // A(4) + B(20) + D(8) = 32 (critical path)
      expect(result.criticalPath).toContain(taskA.id);
      expect(result.criticalPath).toContain(taskB.id);
      expect(result.criticalPath).toContain(taskD.id);
      expect(result.criticalPathDuration).toBe(32);

      // Verify schedule metrics
      expect(result.scheduleMetrics.totalTasks).toBe(4);
      expect(result.scheduleMetrics.criticalTasks).toBeGreaterThan(0);
      expect(result.scheduleMetrics.bufferHours).toBe(32 * 0.2); // 20% buffer

      // Check parallel tracks - C should be able to run in parallel with B
      expect(result.parallelTracks.length).toBeGreaterThan(0);
      const parallelTrack = result.parallelTracks.find(track => 
        track.tasks.includes(taskC.id)
      );
      expect(parallelTrack).toBeDefined();
    });

    it('should identify resource conflicts', async () => {
      // Arrange - Create tasks with conflicting skills
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task A',
          description: 'First React task',
          estimatedHours: 8,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['React', 'JavaScript'],
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
          description: 'Second React task',
          estimatedHours: 6,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['React', 'TypeScript'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task C',
          description: 'Node.js task that can run in parallel',
          estimatedHours: 10,
          priority: 'MEDIUM',
          complexity: 'MODERATE',
          skills: ['Node.js', 'Database'],
          completionCriteria: ['Task C complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'RESOURCE_LEVELING' as const,
        includeBuffers: false
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result.resourceConflicts.length).toBeGreaterThan(0);
      
      const reactConflict = result.resourceConflicts.find(conflict => 
        conflict.skill === 'React'
      );
      expect(reactConflict).toBeDefined();
      expect(reactConflict?.conflictingTasks).toContain(taskA.id);
      expect(reactConflict?.conflictingTasks).toContain(taskB.id);
      expect(reactConflict?.suggestions.length).toBeGreaterThan(0);
    });

    it('should generate optimization suggestions', async () => {
      // Arrange - Create a scenario with optimization opportunities
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Large Task',
          description: 'A very large task that should be split',
          estimatedHours: 24, // Large task
          priority: 'HIGH',
          complexity: 'COMPLEX',
          skills: ['Full Stack'],
          completionCriteria: ['Large task complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Parallel Task 1',
          description: 'Task that can run in parallel',
          estimatedHours: 6,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['CSS'],
          completionCriteria: ['Parallel task 1 complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Parallel Task 2',
          description: 'Another task that can run in parallel',
          estimatedHours: 4,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['HTML'],
          completionCriteria: ['Parallel task 2 complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'PARALLEL_OPTIMIZATION' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result.optimizationSuggestions.length).toBeGreaterThan(0);
      
      // Should suggest splitting the large task
      const splitSuggestion = result.optimizationSuggestions.find(
        suggestion => suggestion.type === 'SPLIT_TASK'
      );
      expect(splitSuggestion).toBeDefined();
      expect(splitSuggestion?.affectedTasks).toContain(taskA.id);

      // Should suggest parallelizing compatible tasks
      const parallelSuggestion = result.optimizationSuggestions.find(
        suggestion => suggestion.type === 'PARALLELIZE'
      );
      expect(parallelSuggestion).toBeDefined();
    });

    it('should detect circular dependencies', async () => {
      // Arrange - Create circular dependency: A -> B -> C -> A
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task A',
          description: 'First task in cycle',
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
          description: 'Second task in cycle',
          estimatedHours: 6,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill B'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task C',
          description: 'Third task in cycle',
          estimatedHours: 8,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill C'],
          completionCriteria: ['Task C complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create circular dependencies
      await testPrisma.taskDependency.createMany({
        data: [
          {
            predecessorId: taskA.id,
            successorId: taskB.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskB.id,
            successorId: taskC.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskC.id,
            successorId: taskA.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH' as const
      };

      // Act & Assert
      await expect(dependencyMapper.analyzeDependencies(request)).rejects.toThrow('Circular dependency detected');
    });

    it('should handle different dependency types correctly', async () => {
      // Arrange - Test different dependency relationships
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task A',
          description: 'Predecessor task',
          estimatedHours: 8,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['Backend'],
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
          description: 'Successor task with START_TO_START dependency',
          estimatedHours: 12,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['Frontend'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task C',
          description: 'Task with FINISH_TO_FINISH dependency',
          estimatedHours: 6,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Testing'],
          completionCriteria: ['Task C complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create different dependency types
      await testPrisma.taskDependency.createMany({
        data: [
          {
            predecessorId: taskA.id,
            successorId: taskB.id,
            dependencyType: 'START_TO_START',
            lag: 2, // 2 hour lag
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskB.id,
            successorId: taskC.id,
            dependencyType: 'FINISH_TO_FINISH',
            lag: 0,
            isHard: false, // Soft dependency
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.totalDuration).toBeGreaterThan(0);
      
      // The critical path calculation should account for different dependency types
      expect(result.criticalPath.length).toBeGreaterThan(0);
    });
  });

  describe('addTaskDependency', () => {
    it('should add valid task dependency', async () => {
      // Arrange
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Predecessor Task',
          description: 'Task that comes first',
          estimatedHours: 4,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill A'],
          completionCriteria: ['Predecessor complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Successor Task',
          description: 'Task that comes after',
          estimatedHours: 6,
          priority: 'MEDIUM',
          complexity: 'MODERATE',
          skills: ['Skill B'],
          completionCriteria: ['Successor complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const dependency = {
        predecessorId: taskA.id,
        successorId: taskB.id,
        dependencyType: 'FINISH_TO_START' as const,
        lag: 1,
        isHard: true
      };

      // Act
      await dependencyMapper.addTaskDependency(dependency);

      // Assert
      const savedDependency = await testPrisma.taskDependency.findFirst({
        where: {
          predecessorId: taskA.id,
          successorId: taskB.id
        }
      });

      expect(savedDependency).toBeDefined();
      expect(savedDependency?.dependencyType).toBe('FINISH_TO_START');
      expect(savedDependency?.lag).toBe(1);
      expect(savedDependency?.isHard).toBe(true);
    });

    it('should prevent circular dependencies when adding new dependency', async () => {
      // Arrange - Create initial dependency A -> B
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
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill B'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create initial dependency A -> B
      await testPrisma.taskDependency.create({
        data: {
          predecessorId: taskA.id,
          successorId: taskB.id,
          dependencyType: 'FINISH_TO_START',
          lag: 0,
          isHard: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Try to create circular dependency B -> A
      const circularDependency = {
        predecessorId: taskB.id,
        successorId: taskA.id,
        dependencyType: 'FINISH_TO_START' as const,
        lag: 0,
        isHard: true
      };

      // Act & Assert
      await expect(dependencyMapper.addTaskDependency(circularDependency))
        .rejects.toThrow('Adding this dependency would create a circular dependency');
    });

    it('should validate dependency data before saving', async () => {
      // Arrange
      const invalidDependency = {
        predecessorId: 'invalid-task-id',
        successorId: 'another-invalid-id',
        dependencyType: 'INVALID_TYPE' as any,
        lag: -5, // Negative lag might be invalid in some contexts
        isHard: true
      };

      // Act & Assert
      await expect(dependencyMapper.addTaskDependency(invalidDependency))
        .rejects.toThrow();
    });
  });

  describe('removeTaskDependency', () => {
    it('should remove existing task dependency', async () => {
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
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Skill B'],
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
          lag: 0,
          isHard: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Act
      await dependencyMapper.removeTaskDependency(taskA.id, taskB.id);

      // Assert
      const removedDependency = await testPrisma.taskDependency.findFirst({
        where: {
          predecessorId: taskA.id,
          successorId: taskB.id
        }
      });

      expect(removedDependency).toBeNull();
    });
  });

  describe('Critical Path Method (CPM) Calculations', () => {
    it('should correctly calculate earliest start and finish times', async () => {
      // Arrange - Create a simple network: A -> B -> C
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task A',
          description: 'First task - 5 hours',
          estimatedHours: 5,
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
          description: 'Second task - 8 hours',
          estimatedHours: 8,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['Skill B'],
          completionCriteria: ['Task B complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task C',
          description: 'Third task - 3 hours',
          estimatedHours: 3,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Skill C'],
          completionCriteria: ['Task C complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create dependencies: A -> B -> C
      await testPrisma.taskDependency.createMany({
        data: [
          {
            predecessorId: taskA.id,
            successorId: taskB.id,
            dependencyType: 'FINISH_TO_START',
            lag: 2, // 2 hour lag
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            predecessorId: taskB.id,
            successorId: taskC.id,
            dependencyType: 'FINISH_TO_START',
            lag: 0,
            isHard: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      // Expected timeline:
      // A: 0-5 (5 hours)
      // Lag: 5-7 (2 hours)
      // B: 7-15 (8 hours)
      // C: 15-18 (3 hours)
      // Total: 18 hours
      expect(result.totalDuration).toBe(18);
      expect(result.criticalPath).toEqual([taskA.id, taskB.id, taskC.id]);
      expect(result.criticalPathDuration).toBe(18);
    });

    it('should identify tasks with slack time', async () => {
      // Arrange - Create a network with parallel paths of different lengths
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task A - Start',
          description: 'Starting task',
          estimatedHours: 2,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Start'],
          completionCriteria: ['Start complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task B - Long Path',
          description: 'Task on critical path',
          estimatedHours: 12,
          priority: 'HIGH',
          complexity: 'COMPLEX',
          skills: ['Critical'],
          completionCriteria: ['Critical work complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task C - Short Path',
          description: 'Task with slack time',
          estimatedHours: 4,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Non-Critical'],
          completionCriteria: ['Non-critical work complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskD = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Task D - End',
          description: 'Final task',
          estimatedHours: 3,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['End'],
          completionCriteria: ['Project complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create parallel paths: A -> B -> D and A -> C -> D
      await testPrisma.taskDependency.createMany({
        data: [
          { predecessorId: taskA.id, successorId: taskB.id, dependencyType: 'FINISH_TO_START', lag: 0, isHard: true, createdAt: new Date(), updatedAt: new Date() },
          { predecessorId: taskA.id, successorId: taskC.id, dependencyType: 'FINISH_TO_START', lag: 0, isHard: true, createdAt: new Date(), updatedAt: new Date() },
          { predecessorId: taskB.id, successorId: taskD.id, dependencyType: 'FINISH_TO_START', lag: 0, isHard: true, createdAt: new Date(), updatedAt: new Date() },
          { predecessorId: taskC.id, successorId: taskD.id, dependencyType: 'FINISH_TO_START', lag: 0, isHard: true, createdAt: new Date(), updatedAt: new Date() }
        ]
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      // Critical path: A(2) -> B(12) -> D(3) = 17 hours
      // Non-critical path: A(2) -> C(4) -> D(3) = 9 hours
      // Task C should have slack time
      expect(result.totalDuration).toBe(17);
      expect(result.criticalPath).toContain(taskA.id);
      expect(result.criticalPath).toContain(taskB.id);
      expect(result.criticalPath).toContain(taskD.id);
      expect(result.criticalPath).not.toContain(taskC.id);
    });
  });

  describe('Parallel Execution Analysis', () => {
    it('should identify tasks that can run in parallel', async () => {
      // Arrange - Create independent tasks
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Frontend Task',
          description: 'UI development',
          estimatedHours: 8,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['React'],
          completionCriteria: ['UI complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Backend Task',
          description: 'API development',
          estimatedHours: 10,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['Node.js'],
          completionCriteria: ['API complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskC = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'Database Task',
          description: 'Database setup',
          estimatedHours: 6,
          priority: 'MEDIUM',
          complexity: 'SIMPLE',
          skills: ['Database'],
          completionCriteria: ['Database ready'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'PARALLEL_OPTIMIZATION' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result.parallelTracks.length).toBeGreaterThan(0);
      
      // All tasks should be in parallel tracks since they don't conflict
      const allParallelTasks = result.parallelTracks.flatMap(track => track.tasks);
      expect(allParallelTasks).toContain(taskA.id);
      expect(allParallelTasks).toContain(taskB.id);
      expect(allParallelTasks).toContain(taskC.id);
    });

    it('should prevent parallel execution when skills conflict', async () => {
      // Arrange - Create tasks requiring the same skill
      const taskA = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'React Task 1',
          description: 'First React component',
          estimatedHours: 6,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['React', 'CSS'],
          completionCriteria: ['Component 1 complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const taskB = await testPrisma.task.create({
        data: {
          milestoneId: milestoneId,
          title: 'React Task 2',
          description: 'Second React component',
          estimatedHours: 8,
          priority: 'HIGH',
          complexity: 'MODERATE',
          skills: ['React', 'TypeScript'],
          completionCriteria: ['Component 2 complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        milestoneId: milestoneId,
        analysisType: 'RESOURCE_LEVELING' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result.resourceConflicts.length).toBeGreaterThan(0);
      
      const reactConflict = result.resourceConflicts.find(conflict => 
        conflict.skill === 'React'
      );
      expect(reactConflict).toBeDefined();
      expect(reactConflict?.conflictingTasks).toContain(taskA.id);
      expect(reactConflict?.conflictingTasks).toContain(taskB.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty milestone gracefully', async () => {
      // Arrange
      const emptyMilestoneId = 'empty-milestone-001';
      
      await testPrisma.milestone.create({
        data: {
          id: emptyMilestoneId,
          goalId: goalId,
          title: 'Empty Milestone',
          description: 'Milestone with no tasks',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Nothing to do'],
          status: 'NOT_STARTED',
          orderIndex: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        milestoneId: emptyMilestoneId,
        analysisType: 'CRITICAL_PATH' as const
      };

      // Act & Assert
      await expect(dependencyMapper.analyzeDependencies(request))
        .rejects.toThrow('No tasks found');
    });

    it('should handle single task milestone', async () => {
      // Arrange
      const singleTaskMilestoneId = 'single-task-milestone-001';
      
      await testPrisma.milestone.create({
        data: {
          id: singleTaskMilestoneId,
          goalId: goalId,
          title: 'Single Task Milestone',
          description: 'Milestone with one task',
          targetDate: new Date('2025-08-15'),
          successCriteria: ['Single task complete'],
          status: 'NOT_STARTED',
          orderIndex: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const singleTask = await testPrisma.task.create({
        data: {
          milestoneId: singleTaskMilestoneId,
          title: 'Only Task',
          description: 'The only task in milestone',
          estimatedHours: 5,
          priority: 'HIGH',
          complexity: 'SIMPLE',
          skills: ['Solo Work'],
          completionCriteria: ['Solo work complete'],
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const request = {
        milestoneId: singleTaskMilestoneId,
        analysisType: 'CRITICAL_PATH' as const
      };

      // Act
      const result = await dependencyMapper.analyzeDependencies(request);

      // Assert
      expect(result.totalDuration).toBe(5);
      expect(result.criticalPath).toEqual([singleTask.id]);
      expect(result.parallelTracks.length).toBe(0); // No parallel opportunities
      expect(result.resourceConflicts.length).toBe(0); // No conflicts with one task
    });

    it('should validate request parameters', async () => {
      // Arrange
      const invalidRequest = {
        milestoneId: 'non-existent-milestone',
        analysisType: 'INVALID_TYPE' as any,
        includeBuffers: true,
        bufferPercentage: 150 // Invalid percentage
      };

      // Act & Assert
      await expect(dependencyMapper.analyzeDependencies(invalidRequest))
        .rejects.toThrow();
    });
  });
});