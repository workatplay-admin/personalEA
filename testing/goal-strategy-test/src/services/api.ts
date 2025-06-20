import axios from 'axios'
import { Goal, Milestone, WBSTask, TaskEstimation, APIResponse, FeedbackData } from '../types'

const API_BASE_URL = 'http://localhost:3000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor for logging
api.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data)
  return config
})

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status}`, response.data)
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const goalAPI = {
  // SMART Goal Translation
  async translateToSmart(originalGoal: string): Promise<Goal> {
    try {
      const response = await api.post<APIResponse<Goal>>('/goals/translate', {
        originalGoal,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to translate goal')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error translating goal:', error)
      throw error
    }
  },

  // Clarify SMART Goal
  async clarifyGoal(goalId: string, clarifications: Record<string, string>): Promise<Goal> {
    try {
      const response = await api.post<APIResponse<Goal>>(`/goals/${goalId}/clarify`, {
        clarifications,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to clarify goal')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error clarifying goal:', error)
      throw error
    }
  },

  // Generate Milestones
  async generateMilestones(goalId: string): Promise<Milestone[]> {
    try {
      const response = await api.post<APIResponse<Milestone[]>>(`/milestones/generate`, {
        goalId,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to generate milestones')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error generating milestones:', error)
      throw error
    }
  },

  // Generate Work Breakdown Structure
  async generateWBS(milestoneId: string): Promise<WBSTask[]> {
    try {
      const response = await api.post<APIResponse<WBSTask[]>>('/wbs/generate', {
        milestoneId,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to generate WBS')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error generating WBS:', error)
      throw error
    }
  },

  // Generate WBS for all milestones
  async generateWBSForMilestones(milestoneIds: string[]): Promise<WBSTask[]> {
    try {
      const allTasks: WBSTask[] = []
      
      for (const milestoneId of milestoneIds) {
        const tasks = await this.generateWBS(milestoneId)
        allTasks.push(...tasks)
      }
      
      return allTasks
    } catch (error) {
      console.error('Error generating WBS for milestones:', error)
      throw error
    }
  },

  // Estimate Tasks
  async estimateTask(taskId: string): Promise<TaskEstimation> {
    try {
      const response = await api.post<APIResponse<TaskEstimation>>('/estimations/estimate', {
        taskId,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to estimate task')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error estimating task:', error)
      throw error
    }
  },

  // Estimate multiple tasks
  async estimateTasks(taskIds: string[]): Promise<TaskEstimation[]> {
    try {
      const response = await api.post<APIResponse<TaskEstimation[]>>('/estimations/batch', {
        taskIds,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to estimate tasks')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error estimating tasks:', error)
      throw error
    }
  },

  // Submit Feedback
  async submitFeedback(feedback: Partial<FeedbackData>): Promise<void> {
    try {
      const response = await api.post<APIResponse<void>>('/feedback', feedback)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  },
}

export default goalAPI