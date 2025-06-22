import axios, { InternalAxiosRequestConfig } from 'axios'
import { Goal, Milestone, WBSTask, TaskEstimation, APIResponse, FeedbackData } from '../types'

// Detect if we're in Codespaces and use the correct API URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // We're in Codespaces - use the forwarded URL
    const hostname = window.location.hostname.replace('-5174.', '-3000.');
    return `https://${hostname}/api/v1`;
  }
  // Local development
  return 'http://localhost:3000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('🔧 API Configuration:', {
  detectedUrl: API_BASE_URL,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
  isCodespaces: typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')
});

// API Configuration interface
interface ApiConfig {
  jwtToken: string
  openaiApiKey: string
}

// Global API configuration
let apiConfig: ApiConfig | null = null

// Function to set API configuration
export const setApiConfig = (config: ApiConfig) => {
  apiConfig = config
}

// Function to get current API configuration
export const getApiConfig = (): ApiConfig | null => {
  return apiConfig
}

// Function to clear API configuration
export const clearApiConfig = () => {
  apiConfig = null
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Reduced from 30s to 15s to work with backend 10s timeout + buffer
  headers: {
    'Content-Type': 'application/json',
    // Prevent HTTP caching
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
})

// Add request interceptor for authentication and logging
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data)
  
  // Add authentication headers if config is available
  if (apiConfig && config.headers) {
    config.headers['Authorization'] = `Bearer ${apiConfig.jwtToken}`
    config.headers['X-OpenAI-API-Key'] = apiConfig.openaiApiKey
  }
  
  return config
})

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    
    // Special logging for goal translation responses
    if (response.config.url?.includes('/goals/translate')) {
      console.log(`[${timestamp}] Goal Translation Response Details:`, {
        success: response.data?.success,
        hasData: !!response.data?.data,
        correlationId: response.data?.data?.correlation_id,
        title: response.data?.data?.title,
        fullResponse: response.data
      });
    }
    
    return response
  },
  (error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] API Error:`, error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const goalAPI = {
  // SMART Goal Translation
  async translateToSmart(originalGoal: string): Promise<Goal> {
    try {
      console.log('🔍 Checking API configuration...')
      console.log('API Config exists:', !!apiConfig)
      console.log('API Config details:', apiConfig ? {
        hasJwt: !!apiConfig.jwtToken,
        hasApiKey: !!apiConfig.openaiApiKey,
        apiKeyFormat: apiConfig.openaiApiKey?.startsWith('sk-') ? 'Valid format' : 'Invalid format',
        apiKeyLength: apiConfig.openaiApiKey?.length || 0
      } : 'No config')

      if (!apiConfig) {
        throw new Error('❌ API configuration not set. Please enter your OpenAI API key in the configuration section.')
      }

      if (!apiConfig.openaiApiKey) {
        throw new Error('❌ OpenAI API key missing. Please enter your API key in the configuration section.')
      }

      if (!apiConfig.openaiApiKey.startsWith('sk-')) {
        throw new Error('❌ Invalid OpenAI API key format. API key should start with "sk-".')
      }

      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const cacheBuster = Math.random().toString(36).substring(7)
      
      console.log(`🚀 [${new Date().toISOString()}] Making API call with cache-buster: ${timestamp}-${cacheBuster}`)
      console.log('🔑 Using API key:', apiConfig.openaiApiKey.substring(0, 8) + '...')

      const response = await api.post<APIResponse<Goal>>(`/goals/translate?t=${timestamp}&cb=${cacheBuster}`, {
        raw_goal: originalGoal,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to translate goal')
      }
      
      return response.data.data
    } catch (error: any) {
      console.error('❌ Error translating goal:', error)
      
      // Better error messages
      if (error.response) {
        const status = error.response.status
        const data = error.response.data
        
        if (status === 401) {
          throw new Error('❌ Invalid or unauthorized API key. Please check your OpenAI API key.')
        } else if (status === 429) {
          throw new Error('❌ Rate limit exceeded. Please wait a moment and try again.')
        } else if (status === 500) {
          throw new Error('❌ Server error. Please try again in a moment.')
        } else {
          throw new Error(`❌ API Error (${status}): ${data?.error || error.message}`)
        }
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('❌ Network connection failed. Please check your internet connection and try again.')
      } else {
        throw error
      }
    }
  },

  // Clarify SMART Goal
  async clarifyGoal(goalId: string, clarifications: Record<string, string>, goalContext?: { title: string; description?: string; originalGoal?: string }): Promise<Goal> {
    try {
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

      const response = await api.post<APIResponse<Goal>>(`/goals/${goalId}/clarify`, {
        clarifications,
        goalContext,
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
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

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
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

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
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

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
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

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
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

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