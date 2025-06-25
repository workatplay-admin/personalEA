import { http, HttpResponse } from 'msw'
import { Goal, Milestone, WBSTask, TaskEstimation, APIResponse } from '../../types'
import { mockGoals, mockMilestones, mockWBSTasks, mockTaskEstimations } from './data'

const API_BASE_URL = 'http://localhost:3000/api/v1'

export const handlers = [
  // Phase 1: SMART Goal Translation
  http.post(`${API_BASE_URL}/goals/translate`, async ({ request }) => {
    const body = await request.json() as { raw_goal: string }
    
    // Simulate different scenarios based on input
    const rawGoal = body.raw_goal?.toLowerCase() || ''
    
    if (rawGoal.includes('invalid')) {
      return HttpResponse.json({
        success: false,
        error: 'Invalid goal format'
      } as APIResponse<Goal>, { status: 400 })
    }
    
    if (rawGoal.includes('timeout')) {
      // Simulate timeout
      await new Promise(resolve => setTimeout(resolve, 15000))
    }
    
    if (rawGoal.includes('error')) {
      return HttpResponse.json({
        success: false,
        error: 'Server error processing goal'
      } as APIResponse<Goal>, { status: 500 })
    }
    
    // Return appropriate mock goal based on input
    const mockGoal = mockGoals.find(goal => 
      goal.title.toLowerCase().includes(rawGoal.split(' ')[0]) ||
      rawGoal.includes('smart')
    ) || mockGoals[0]
    
    return HttpResponse.json({
      success: true,
      data: {
        ...mockGoal,
        correlation_id: `test-${Date.now()}`
      }
    } as APIResponse<Goal>)
  }),

  // Phase 1: Goal Clarification
  http.post(`${API_BASE_URL}/goals/:goalId/clarify`, async ({ params, request }) => {
    const { goalId } = params
    const body = await request.json() as { 
      clarifications: Record<string, string>,
      goalContext?: any,
      conversationHistory?: Array<{ role: string; content: string }>
    }
    
    if (!goalId) {
      return HttpResponse.json({
        success: false,
        error: 'Goal ID is required'
      } as APIResponse<Goal>, { status: 400 })
    }
    
    // Find the goal and update it with clarifications
    const baseGoal = mockGoals.find(g => g.id === goalId) || mockGoals[0]
    const clarifiedGoal: Goal = {
      ...baseGoal,
      confidence: Math.min(baseGoal.confidence + 0.2, 1.0),
      missingCriteria: baseGoal.missingCriteria.filter(criterion => 
        !Object.keys(body.clarifications).includes(criterion)
      ),
      clarificationQuestions: []
    }
    
    return HttpResponse.json({
      success: true,
      data: clarifiedGoal
    } as APIResponse<Goal>)
  }),

  // Phase 1: Contextual Help
  http.post(`${API_BASE_URL}/goals/contextual-help`, async ({ request }) => {
    const body = await request.json() as {
      goalTitle: string,
      componentKey: string,
      conversationHistory: Array<{ role: string; content: string }>,
      goalContext: Goal
    }
    
    const helpMessages = {
      specific: "Make your goal more specific by defining exactly what you want to achieve, who is involved, and what the scope includes.",
      measurable: "Add quantifiable metrics so you can track progress. Consider what numbers, percentages, or concrete outcomes you can measure.",
      achievable: "Ensure your goal is realistic based on available resources, time, and constraints. Consider what would make this goal attainable.",
      relevant: "Confirm this goal aligns with your broader objectives and priorities. Why is this goal important to you or your organization?",
      timeBound: "Set a clear deadline or timeframe. When do you want to achieve this goal? Consider milestones along the way."
    }
    
    return HttpResponse.json({
      success: true,
      data: {
        helpMessage: helpMessages[body.componentKey as keyof typeof helpMessages] || 
                    "Focus on making your goal clear, measurable, and actionable."
      }
    } as APIResponse<{ helpMessage: string }>)
  }),

  // Phase 1: Component Question
  http.post(`${API_BASE_URL}/goals/component-question`, async ({ request }) => {
    const body = await request.json() as {
      goalTitle: string,
      componentKey: string,
      currentValue: string,
      confidence: number,
      isHighConfidence: boolean,
      goalContext: Goal
    }
    
    const questions = {
      specific: `What specific outcome do you want to achieve with "${body.goalTitle}"? Can you define the exact scope and deliverables?`,
      measurable: `How will you measure success for "${body.goalTitle}"? What metrics or indicators will show you've achieved this goal?`,
      achievable: `What resources and constraints should we consider for "${body.goalTitle}"? Is this goal realistic given your current situation?`,
      relevant: `How does "${body.goalTitle}" align with your broader objectives? Why is this goal important to you?`,
      timeBound: `When do you want to achieve "${body.goalTitle}"? What would be a realistic timeline with key milestones?`
    }
    
    return HttpResponse.json({
      success: true,
      data: {
        question: questions[body.componentKey as keyof typeof questions] || 
                 `Can you provide more details about "${body.goalTitle}"?`
      }
    } as APIResponse<{ question: string }>)
  }),

  // Phase 2: Milestone Generation
  http.post(`${API_BASE_URL}/milestones/generate`, async ({ request }) => {
    const body = await request.json() as { goalId: string }
    
    if (!body.goalId) {
      return HttpResponse.json({
        success: false,
        error: 'Goal ID is required'
      } as APIResponse<Milestone[]>, { status: 400 })
    }
    
    const goalMilestones = mockMilestones.filter(m => m.goalId === body.goalId)
    
    if (goalMilestones.length === 0) {
      // Generate default milestones for unknown goals
      const defaultMilestones = [
        {
          id: `milestone-${Date.now()}-1`,
          goalId: body.goalId,
          title: "Initial Planning and Setup",
          description: "Establish foundation and initial requirements",
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          successCriteria: ["Requirements documented", "Initial setup complete"],
          dependencies: [],
          progress: 0,
          status: 'not_started' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      
      return HttpResponse.json({
        success: true,
        data: defaultMilestones
      } as APIResponse<Milestone[]>)
    }
    
    return HttpResponse.json({
      success: true,
      data: goalMilestones
    } as APIResponse<Milestone[]>)
  }),

  // Phase 2: WBS Generation
  http.post(`${API_BASE_URL}/wbs/generate`, async ({ request }) => {
    const body = await request.json() as { milestoneId: string }
    
    if (!body.milestoneId) {
      return HttpResponse.json({
        success: false,
        error: 'Milestone ID is required'
      } as APIResponse<WBSTask[]>, { status: 400 })
    }
    
    const milestoneTasks = mockWBSTasks.filter(t => t.milestoneId === body.milestoneId)
    
    if (milestoneTasks.length === 0) {
      // Generate default tasks for unknown milestones
      const defaultTasks = [
        {
          id: `task-${Date.now()}-1`,
          milestoneId: body.milestoneId,
          title: "Research and Analysis",
          description: "Conduct initial research and analysis for the milestone",
          completionCriteria: "Research documented and analysis complete",
          estimatedHours: 8,
          priority: 'medium' as const,
          dependencies: [],
          status: 'not_started' as const,
          level: 1,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      
      return HttpResponse.json({
        success: true,
        data: defaultTasks
      } as APIResponse<WBSTask[]>)
    }
    
    return HttpResponse.json({
      success: true,
      data: milestoneTasks
    } as APIResponse<WBSTask[]>)
  }),

  // Phase 3: Task Estimation
  http.post(`${API_BASE_URL}/estimations/estimate`, async ({ request }) => {
    const body = await request.json() as { taskId: string }
    
    if (!body.taskId) {
      return HttpResponse.json({
        success: false,
        error: 'Task ID is required'
      } as APIResponse<TaskEstimation>, { status: 400 })
    }
    
    const taskEstimation = mockTaskEstimations.find(e => e.taskId === body.taskId)
    
    if (!taskEstimation) {
      // Generate default estimation for unknown tasks
      const defaultEstimation: TaskEstimation = {
        taskId: body.taskId,
        expertJudgment: {
          estimate: 8,
          confidence: 0.7,
          reasoning: "Based on similar tasks and general complexity assessment"
        },
        analogyBased: {
          estimate: 10,
          confidence: 0.6,
          similarTask: "Similar research task",
          adjustmentFactor: 1.2
        },
        threePoint: {
          optimistic: 4,
          mostLikely: 8,
          pessimistic: 16,
          expected: 8.7,
          standardDeviation: 2.0
        },
        parametric: {
          estimate: 9,
          confidence: 0.5,
          parameters: { complexity: 3, size: 2 },
          formula: "complexity * size * 1.5"
        },
        bottomUp: {
          estimate: 8.5,
          confidence: 0.8,
          subTasks: [
            { name: "Research", estimate: 4 },
            { name: "Analysis", estimate: 3 },
            { name: "Documentation", estimate: 1.5 }
          ]
        },
        finalEstimate: {
          hours: 8.5,
          confidence: 0.75,
          method: "Weighted average of all methods",
          uncertaintyRange: {
            min: 6,
            max: 12
          }
        }
      }
      
      return HttpResponse.json({
        success: true,
        data: defaultEstimation
      } as APIResponse<TaskEstimation>)
    }
    
    return HttpResponse.json({
      success: true,
      data: taskEstimation
    } as APIResponse<TaskEstimation>)
  }),

  // Phase 3: Batch Task Estimation
  http.post(`${API_BASE_URL}/estimations/batch`, async ({ request }) => {
    const body = await request.json() as { taskIds: string[] }
    
    if (!body.taskIds || !Array.isArray(body.taskIds)) {
      return HttpResponse.json({
        success: false,
        error: 'Task IDs array is required'
      } as APIResponse<TaskEstimation[]>, { status: 400 })
    }
    
    const estimations = body.taskIds.map(taskId => {
      const existing = mockTaskEstimations.find(e => e.taskId === taskId)
      if (existing) return existing
      
      // Generate basic estimation for unknown tasks
      return {
        taskId,
        expertJudgment: { estimate: 6, confidence: 0.7, reasoning: "Default estimation" },
        analogyBased: { estimate: 8, confidence: 0.6, similarTask: "Similar task", adjustmentFactor: 1.0 },
        threePoint: { optimistic: 3, mostLikely: 6, pessimistic: 12, expected: 6.5, standardDeviation: 1.5 },
        parametric: { estimate: 7, confidence: 0.5, parameters: { complexity: 2 }, formula: "complexity * 3.5" },
        bottomUp: { estimate: 6.5, confidence: 0.8, subTasks: [{ name: "Implementation", estimate: 6.5 }] },
        finalEstimate: { hours: 6.5, confidence: 0.7, method: "Average", uncertaintyRange: { min: 4, max: 10 } }
      } as TaskEstimation
    })
    
    return HttpResponse.json({
      success: true,
      data: estimations
    } as APIResponse<TaskEstimation[]>)
  }),

  // Feedback submission
  http.post(`${API_BASE_URL}/feedback`, async ({ request }) => {
    const body = await request.json()
    
    // Simulate successful feedback submission
    return HttpResponse.json({
      success: true,
      data: null,
      message: "Feedback submitted successfully"
    } as APIResponse<void>)
  }),

  // Health check endpoint
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      success: true,
      data: { status: 'healthy', timestamp: new Date().toISOString() }
    })
  })
]