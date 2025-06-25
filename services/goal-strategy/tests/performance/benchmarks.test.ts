import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  MilestoneGenerator,
  MilestoneGenerationInput
} from '../../src/services/milestone-generator';
import { WBSEngine } from '../../src/services/wbs-engine';
import { DependencyMapper } from '../../src/services/dependency-mapper';
import { TaskEstimationEngine } from '../../src/services/task-estimation-engine';
import { PlannerService } from '../../src/services/planner-service';
import { testPrisma } from '../setup';

// Mock OpenAI module for consistent performance testing
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

describe('Phase 2-3 Performance Benchmarks and Optimization', () => {
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
    
    // Setup consistent mock responses for performance testing
    const { OpenAI } = require('openai');
    mockOpenAI = new OpenAI();
    
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            estimate: 4,
            confidence: 0.8,
            rationale: 'Performance test response'
          })
        }
      }]
    };
    
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
    jest.clearAllMocks();
  });

  describe('Individual Service Performance Benchmarks', () => {
    it('should generate milestones within performance targets', async () => {
      // Arrange
      const performanceTargets = {
        maxExecutionTime: 5000, // 5 seconds
        maxMemoryIncrease: 50 * 1024 * 1024, // 50MB
        minThroughput: 10 // milestones per minute
      };

      const testInput: MilestoneGenerationInput = {
        goalId: 'perf-goal-001',
        goalTitle: 'Performance Test Goal',
        smartCriteria: {
          specific: 'Build a comprehensive software application',
          measurable: 'Complete with authentication, data management, and user interface',
          achievable: 'Using known technologies and established patterns',
          relevant: 'Addresses business requirements and user needs',
          timeBound: 'Complete within 12 weeks'
        },
        preferences: {
          milestoneCount: 5,
          distributionStrategy: 'EVEN',
          includeBufferTime: true
        }
      };

      // Mock milestone response
      const mockMilestoneResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              milestones: Array.from({ length: 5 }, (_, i) => ({
                title: `Performance Milestone ${i + 1}`,
                description: `Milestone ${i + 1} for performance testing`,
                targetDate: new Date(Date.now() + (i + 1) * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                completionCriteria: `Milestone ${i + 1} completion criteria`,
                orderIndex: i,
                estimatedEffort: 40,
                dependencies: i > 0 ? [`Performance Milestone ${i}`] : []
              })),
              rationale: 'Performance test milestone generation',
              timeline: {
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                totalDuration: 70
              },
              confidence: 0.85
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockMilestoneResponse);

      // Act - Performance measurement
      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await milestoneGenerator.generateMilestones(testInput);

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const executionTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert - Performance targets
      expect(executionTime).toBeLessThan(performanceTargets.maxExecutionTime);
      expect(memoryIncrease).toBeLessThan(performanceTargets.maxMemoryIncrease);
      expect(result.milestones).toHaveLength(5);

      console.log(`📊 Milestone Generation Performance:
        ⏱️  Execution Time: ${executionTime}ms (target: <${performanceTargets.maxExecutionTime}ms)
        🧠 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (target: <${performanceTargets.maxMemoryIncrease / 1024 / 1024}MB)
        🎯 Milestones Created: ${result.milestones.length}
        ✅ Performance: ${executionTime < performanceTargets.maxExecutionTime ? 'PASS' : 'FAIL'}`);
    }, 10000);

    it('should handle WBS generation efficiently for large milestones', async () => {
      // Arrange - Create a milestone with large scope
      const goalId = 'perf-goal-002';
      const milestoneId = 'perf-milestone-002';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Large Scale Performance Goal',
          description: 'Goal with complex milestone for WBS performance testing',
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
          title: 'Complex Development Milestone',
          description: 'Large milestone requiring extensive task breakdown',
          targetDate: new Date('2025-09-15'),
          successCriteria: ['Complex system complete with high task count'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mock large WBS response
      const mockWBSResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tasks: Array.from({ length: 20 }, (_, i) => ({
                title: `Performance Task ${i + 1}`,
                description: `Task ${i + 1} for WBS performance testing`,
                estimatedHours: Math.floor(Math.random() * 6) + 2, // 2-8 hours
                priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
                complexity: ['SIMPLE', 'MODERATE', 'COMPLEX'][Math.floor(Math.random() * 3)],
                skills: [`Skill_${(i % 5) + 1}`, 'General'],
                dependencies: i > 0 && Math.random() > 0.7 ? [`Performance Task ${Math.floor(Math.random() * i) + 1}`] : [],
                completionCriteria: [`Task ${i + 1} completion criteria`],
                subtasks: Math.random() > 0.8 ? [
                  {
                    title: `Subtask ${i + 1}.1`,
                    description: `Subtask for task ${i + 1}`,
                    estimatedHours: 2,
                    priority: 'MEDIUM',
                    complexity: 'SIMPLE',
                    skills: ['General'],
                    dependencies: [],
                    completionCriteria: ['Subtask complete']
                  }
                ] : []
              }))
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockWBSResponse);

      const performanceTargets = {
        maxExecutionTime: 8000, // 8 seconds for complex WBS
        maxMemoryIncrease: 100 * 1024 * 1024, // 100MB
        minTasksPerSecond: 5
      };

      // Act - Performance measurement
      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await wbsEngine.generateWBS({
        milestoneId: milestoneId,
        maxDepth: 3,
        maxTasksPerLevel: 8,
        targetTaskSize: 4,
        includeTemplates: false
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const executionTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;
      const tasksPerSecond = (result.totalTasks / executionTime) * 1000;

      // Assert - Performance targets
      expect(executionTime).toBeLessThan(performanceTargets.maxExecutionTime);
      expect(memoryIncrease).toBeLessThan(performanceTargets.maxMemoryIncrease);
      expect(tasksPerSecond).toBeGreaterThan(performanceTargets.minTasksPerSecond);

      console.log(`📊 WBS Generation Performance:
        ⏱️  Execution Time: ${executionTime}ms (target: <${performanceTargets.maxExecutionTime}ms)
        🧠 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (target: <${performanceTargets.maxMemoryIncrease / 1024 / 1024}MB)
        📋 Total Tasks: ${result.totalTasks}
        ⚡ Tasks/Second: ${tasksPerSecond.toFixed(2)} (target: >${performanceTargets.minTasksPerSecond})
        ✅ Performance: ${executionTime < performanceTargets.maxExecutionTime ? 'PASS' : 'FAIL'}`);
    }, 15000);

    it('should perform dependency analysis efficiently on complex task networks', async () => {
      // Arrange - Create complex task network
      const goalId = 'perf-goal-003';
      const milestoneId = 'perf-milestone-003';
      const taskCount = 30;

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Dependency Performance Goal',
          description: 'Goal for testing dependency analysis performance',
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
          title: 'Complex Dependency Milestone',
          description: 'Milestone with complex task dependencies',
          targetDate: new Date('2025-09-15'),
          successCriteria: ['Complex dependency network complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create complex task network
      const tasks = [];
      for (let i = 0; i < taskCount; i++) {
        const task = await testPrisma.task.create({
          data: {
            milestoneId: milestoneId,
            title: `Dependency Task ${i + 1}`,
            description: `Task ${i + 1} for dependency performance testing`,
            estimatedHours: Math.floor(Math.random() * 6) + 2,
            priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
            complexity: ['SIMPLE', 'MODERATE', 'COMPLEX'][Math.floor(Math.random() * 3)],
            skills: [`Skill_${(i % 7) + 1}`, 'General'], // 7 different skills
            completionCriteria: [`Task ${i + 1} complete`],
            status: 'NOT_STARTED',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        tasks.push(task);
      }

      // Create complex dependency network (30% of possible dependencies)
      const dependencyCount = Math.floor((taskCount * (taskCount - 1)) * 0.3 / 2);
      for (let d = 0; d < dependencyCount; d++) {
        const predecessorIndex = Math.floor(Math.random() * (taskCount - 1));
        const successorIndex = Math.floor(Math.random() * (taskCount - predecessorIndex - 1)) + predecessorIndex + 1;
        
        try {
          await testPrisma.taskDependency.create({
            data: {
              predecessorId: tasks[predecessorIndex].id,
              successorId: tasks[successorIndex].id,
              dependencyType: ['FINISH_TO_START', 'START_TO_START'][Math.floor(Math.random() * 2)],
              lag: Math.floor(Math.random() * 3), // 0-2 hours lag
              isHard: Math.random() > 0.2, // 80% hard dependencies
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        } catch (error) {
          // Skip duplicate dependencies
          continue;
        }
      }

      const performanceTargets = {
        maxExecutionTime: 10000, // 10 seconds for complex dependency analysis
        maxMemoryIncrease: 150 * 1024 * 1024, // 150MB
        minTasksPerSecond: 3
      };

      // Act - Performance measurement
      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      const result = await dependencyMapper.analyzeDependencies({
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH',
        includeBuffers: true,
        bufferPercentage: 20
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const executionTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;
      const tasksPerSecond = (taskCount / executionTime) * 1000;

      // Assert - Performance targets
      expect(executionTime).toBeLessThan(performanceTargets.maxExecutionTime);
      expect(memoryIncrease).toBeLessThan(performanceTargets.maxMemoryIncrease);
      expect(tasksPerSecond).toBeGreaterThan(performanceTargets.minTasksPerSecond);
      expect(result.scheduleMetrics.totalTasks).toBe(taskCount);

      console.log(`📊 Dependency Analysis Performance:
        ⏱️  Execution Time: ${executionTime}ms (target: <${performanceTargets.maxExecutionTime}ms)
        🧠 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (target: <${performanceTargets.maxMemoryIncrease / 1024 / 1024}MB)
        📋 Tasks Analyzed: ${taskCount}
        🔗 Critical Path Length: ${result.criticalPath.length}
        🔄 Parallel Tracks: ${result.parallelTracks.length}
        ⚡ Tasks/Second: ${tasksPerSecond.toFixed(2)} (target: >${performanceTargets.minTasksPerSecond})
        ✅ Performance: ${executionTime < performanceTargets.maxExecutionTime ? 'PASS' : 'FAIL'}`);
    }, 20000);
  });

  describe('Algorithm Optimization Benchmarks', () => {
    it('should demonstrate O(n²) or better complexity for critical path calculation', async () => {
      // Test with increasing task counts to verify algorithmic complexity
      const testSizes = [10, 20, 30, 40];
      const results = [];

      for (const size of testSizes) {
        const goalId = `complexity-goal-${size}`;
        const milestoneId = `complexity-milestone-${size}`;

        await testPrisma.goal.create({
          data: {
            id: goalId,
            title: `Complexity Test Goal ${size}`,
            description: `Goal for testing algorithmic complexity with ${size} tasks`,
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
            title: `Complexity Test Milestone ${size}`,
            description: `Milestone with ${size} tasks for complexity testing`,
            targetDate: new Date('2025-09-15'),
            successCriteria: [`${size} tasks complexity test complete`],
            status: 'NOT_STARTED',
            orderIndex: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Create linear dependency chain for worst-case scenario
        const tasks = [];
        for (let i = 0; i < size; i++) {
          const task = await testPrisma.task.create({
            data: {
              milestoneId: milestoneId,
              title: `Complexity Task ${i + 1}`,
              description: `Task ${i + 1} for complexity testing`,
              estimatedHours: 4,
              priority: 'MEDIUM',
              complexity: 'MODERATE',
              skills: ['General'],
              completionCriteria: [`Task ${i + 1} complete`],
              status: 'NOT_STARTED',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          tasks.push(task);

          // Create linear dependency chain
          if (i > 0) {
            await testPrisma.taskDependency.create({
              data: {
                predecessorId: tasks[i - 1].id,
                successorId: task.id,
                dependencyType: 'FINISH_TO_START',
                lag: 0,
                isHard: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
        }

        // Measure critical path calculation time
        const startTime = Date.now();
        
        const result = await dependencyMapper.analyzeDependencies({
          milestoneId: milestoneId,
          analysisType: 'CRITICAL_PATH'
        });

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        results.push({
          taskCount: size,
          executionTime: executionTime,
          timePerTask: executionTime / size,
          criticalPathLength: result.criticalPath.length
        });

        console.log(`📊 Complexity Test (n=${size}): ${executionTime}ms (${(executionTime/size).toFixed(2)}ms/task)`);
      }

      // Analyze complexity trend
      const complexityAnalysis = results.map((result, index) => {
        if (index === 0) return { ...result, complexityRatio: 1 };
        
        const prevResult = results[index - 1];
        const theoreticalLinear = (result.taskCount / prevResult.taskCount) * prevResult.executionTime;
        const theoreticalQuadratic = Math.pow(result.taskCount / prevResult.taskCount, 2) * prevResult.executionTime;
        
        return {
          ...result,
          complexityRatio: result.executionTime / prevResult.executionTime,
          linearExpected: theoreticalLinear,
          quadraticExpected: theoreticalQuadratic,
          isLinearish: result.executionTime <= theoreticalLinear * 1.5,
          isBetterThanQuadratic: result.executionTime <= theoreticalQuadratic * 0.8
        };
      });

      console.log('\n📈 Algorithmic Complexity Analysis:');
      complexityAnalysis.forEach(analysis => {
        console.log(`n=${analysis.taskCount}: ${analysis.executionTime}ms, ratio=${analysis.complexityRatio?.toFixed(2)}, linear-ish=${analysis.isLinearish}, better-than-O(n²)=${analysis.isBetterThanQuadratic}`);
      });

      // Assert reasonable algorithmic complexity
      const avgComplexityRatio = complexityAnalysis
        .filter(a => a.complexityRatio)
        .reduce((sum, a) => sum + a.complexityRatio!, 0) / (complexityAnalysis.length - 1);

      expect(avgComplexityRatio).toBeLessThan(4); // Should not be worse than O(n²)
      console.log(`✅ Average complexity ratio: ${avgComplexityRatio.toFixed(2)} (target: <4 for reasonable performance)`);
    }, 30000);

    it('should optimize memory usage for large datasets', async () => {
      // Test memory efficiency with large dataset
      const taskCount = 100;
      const goalId = 'memory-goal-001';
      const milestoneId = 'memory-milestone-001';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Memory Optimization Goal',
          description: 'Goal for testing memory optimization',
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
          title: 'Memory Optimization Milestone',
          description: 'Milestone for testing memory optimization',
          targetDate: new Date('2025-09-15'),
          successCriteria: ['Memory optimization test complete'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create large dataset
      const tasks = [];
      for (let i = 0; i < taskCount; i++) {
        const task = await testPrisma.task.create({
          data: {
            milestoneId: milestoneId,
            title: `Memory Task ${i + 1}`,
            description: `Task ${i + 1} for memory optimization testing with longer description to test memory usage patterns`,
            estimatedHours: Math.floor(Math.random() * 8) + 1,
            priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
            complexity: ['SIMPLE', 'MODERATE', 'COMPLEX'][Math.floor(Math.random() * 3)],
            skills: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `Skill_${j + 1}`),
            completionCriteria: [`Task ${i + 1} completion criteria with detailed requirements`],
            status: 'NOT_STARTED',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        tasks.push(task);
      }

      const memoryTargets = {
        maxMemoryIncrease: 200 * 1024 * 1024, // 200MB for 100 tasks
        maxMemoryPerTask: 2 * 1024 * 1024, // 2MB per task
        maxExecutionTime: 15000 // 15 seconds
      };

      // Measure memory usage
      global.gc && global.gc(); // Force garbage collection if available
      const initialMemory = process.memoryUsage();
      const startTime = Date.now();

      const result = await dependencyMapper.analyzeDependencies({
        milestoneId: milestoneId,
        analysisType: 'CRITICAL_PATH',
        includeBuffers: true
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      
      const executionTime = endTime - startTime;
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerTask = memoryIncrease / taskCount;

      // Assert memory efficiency
      expect(memoryIncrease).toBeLessThan(memoryTargets.maxMemoryIncrease);
      expect(memoryPerTask).toBeLessThan(memoryTargets.maxMemoryPerTask);
      expect(executionTime).toBeLessThan(memoryTargets.maxExecutionTime);

      console.log(`📊 Memory Optimization Results:
        🧠 Total Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (target: <${memoryTargets.maxMemoryIncrease / 1024 / 1024}MB)
        📋 Memory per Task: ${(memoryPerTask / 1024).toFixed(2)}KB (target: <${memoryTargets.maxMemoryPerTask / 1024}KB)
        ⏱️  Execution Time: ${executionTime}ms (target: <${memoryTargets.maxExecutionTime}ms)
        📊 Tasks Processed: ${taskCount}
        🔗 Critical Path: ${result.criticalPath.length} tasks
        ✅ Memory Efficiency: ${memoryIncrease < memoryTargets.maxMemoryIncrease ? 'PASS' : 'FAIL'}`);

      // Memory leak detection
      global.gc && global.gc();
      const postGCMemory = process.memoryUsage();
      const memoryLeak = postGCMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`🔍 Memory Leak Check: ${(memoryLeak / 1024 / 1024).toFixed(2)}MB retained after GC`);
      expect(memoryLeak).toBeLessThan(50 * 1024 * 1024); // <50MB retained memory
    }, 25000);
  });

  describe('Concurrent Processing Benchmarks', () => {
    it('should handle multiple simultaneous requests efficiently', async () => {
      // Test concurrent request handling
      const concurrentRequests = 5;
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              estimate: 4,
              confidence: 0.8,
              rationale: 'Concurrent test response'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const estimationRequests = Array.from({ length: concurrentRequests }, (_, i) => ({
        taskDescription: `Concurrent estimation task ${i + 1}`,
        complexity: 'MODERATE' as const,
        skills: ['JavaScript', 'Testing'],
        methods: ['EXPERT_JUDGMENT' as const]
      }));

      // Measure concurrent processing
      const startTime = Date.now();
      
      const results = await Promise.all(
        estimationRequests.map(request => estimationEngine.estimateTask(request))
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrentRequests;

      // Assert concurrent performance
      expect(results).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 5 concurrent requests
      expect(avgTimePerRequest).toBeLessThan(3000); // 3 seconds average per request

      results.forEach(result => {
        expect(result.finalEstimate.expected).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
      });

      console.log(`📊 Concurrent Processing Performance:
        🔄 Concurrent Requests: ${concurrentRequests}
        ⏱️  Total Time: ${totalTime}ms
        ⚡ Average per Request: ${avgTimePerRequest.toFixed(0)}ms
        ✅ All Requests Successful: ${results.length === concurrentRequests}
        🎯 Throughput: ${((concurrentRequests / totalTime) * 1000 * 60).toFixed(1)} requests/minute`);
    }, 15000);
  });

  describe('Performance Regression Prevention', () => {
    it('should maintain baseline performance metrics', async () => {
      // Define baseline performance expectations
      const baselineMetrics = {
        milestoneGeneration: { maxTime: 5000, maxMemory: 50 * 1024 * 1024 },
        wbsCreation: { maxTime: 8000, maxMemory: 100 * 1024 * 1024 },
        dependencyAnalysis: { maxTime: 10000, maxMemory: 150 * 1024 * 1024 },
        taskEstimation: { maxTime: 3000, maxMemory: 25 * 1024 * 1024 },
        scheduling: { maxTime: 12000, maxMemory: 200 * 1024 * 1024 }
      };

      console.log('📊 Performance Baseline Verification:');
      console.log('=' .repeat(50));

      // Create test data
      const goalId = 'baseline-goal-001';
      const milestoneId = 'baseline-milestone-001';

      await testPrisma.goal.create({
        data: {
          id: goalId,
          title: 'Baseline Performance Goal',
          description: 'Goal for baseline performance verification',
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
          title: 'Baseline Performance Milestone',
          description: 'Milestone for baseline performance verification',
          targetDate: new Date('2025-09-15'),
          successCriteria: ['Baseline performance verified'],
          status: 'NOT_STARTED',
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Test each service against baseline
      const performanceResults: Record<string, { time: number; memory: number; pass: boolean }> = {};

      // Test milestone generation
      let initialMemory = process.memoryUsage().heapUsed;
      let startTime = Date.now();
      
      const milestoneResult = await milestoneGenerator.generateMilestones({
        goalId: goalId,
        goalTitle: 'Baseline Test Goal',
        smartCriteria: {
          specific: 'Test baseline performance',
          measurable: 'Complete within baseline metrics',
          achievable: 'Using optimized algorithms',
          relevant: 'Ensures performance standards',
          timeBound: 'Immediate verification'
        }
      });

      let endTime = Date.now();
      let finalMemory = process.memoryUsage().heapUsed;
      
      performanceResults.milestoneGeneration = {
        time: endTime - startTime,
        memory: finalMemory - initialMemory,
        pass: (endTime - startTime) < baselineMetrics.milestoneGeneration.maxTime &&
              (finalMemory - initialMemory) < baselineMetrics.milestoneGeneration.maxMemory
      };

      // Test task estimation
      initialMemory = process.memoryUsage().heapUsed;
      startTime = Date.now();
      
      const estimationResult = await estimationEngine.estimateTask({
        taskDescription: 'Baseline performance estimation test',
        complexity: 'MODERATE',
        skills: ['Testing', 'Performance'],
        methods: ['EXPERT_JUDGMENT']
      });

      endTime = Date.now();
      finalMemory = process.memoryUsage().heapUsed;
      
      performanceResults.taskEstimation = {
        time: endTime - startTime,
        memory: finalMemory - initialMemory,
        pass: (endTime - startTime) < baselineMetrics.taskEstimation.maxTime &&
              (finalMemory - initialMemory) < baselineMetrics.taskEstimation.maxMemory
      };

      // Report results
      Object.entries(performanceResults).forEach(([service, result]) => {
        const baseline = baselineMetrics[service as keyof typeof baselineMetrics];
        console.log(`${service}:
          ⏱️  Time: ${result.time}ms (baseline: <${baseline.maxTime}ms) ${result.time < baseline.maxTime ? '✅' : '❌'}
          🧠 Memory: ${(result.memory / 1024 / 1024).toFixed(2)}MB (baseline: <${baseline.maxMemory / 1024 / 1024}MB) ${result.memory < baseline.maxMemory ? '✅' : '❌'}
          🎯 Overall: ${result.pass ? 'PASS' : 'FAIL'}`);
      });

      // Assert all services meet baseline
      const allServicesPassed = Object.values(performanceResults).every(result => result.pass);
      expect(allServicesPassed).toBe(true);

      console.log(`\n🏆 Baseline Performance Summary: ${allServicesPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    }, 30000);
  });
});