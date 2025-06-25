import axios, { InternalAxiosRequestConfig } from 'axios'
import { Goal, Milestone, WBSTask, TaskEstimation, APIResponse, FeedbackData } from '../types'

// Detect if we're in Codespaces and use the correct API URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // We're in Codespaces - use the forwarded URL for backend port 8086 (OpenAI API server)
    const hostname = window.location.hostname.replace('-5174.', '-8086.');
    return `https://${hostname}/api/v1`;
  }
  // Local development - use relative URL to leverage Vite proxy
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('🔧 API Configuration:', {
  detectedUrl: API_BASE_URL,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
  isCodespaces: typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev'),
  frontendPort: typeof window !== 'undefined' ? window.location.port : 'unknown',
  backendPort: '8086',
  expectedBackendUrl: typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev') 
    ? `https://${window.location.hostname.replace('-5174.', '-8086.')}/api/v1`
    : '/api/v1 (proxied to http://localhost:8086/api/v1)'
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
  timeout: 30000, // 30s for complex goal processing with better buffer
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
    
    // Only add API key header if not using environment configuration
    if (apiConfig.openaiApiKey !== 'ENVIRONMENT_CONFIGURED') {
      config.headers['X-OpenAI-API-Key'] = apiConfig.openaiApiKey
    } else {
      console.log('🔧 Using backend environment API key configuration')
    }
  }
  
  return config
})

// Add response interceptor for logging and error handling
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
  async (error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] API Error:`, error.response?.data || error.message)
    
    // Handle timeout errors with retry logic
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      const config = error.config;
      const maxRetries = 3;
      const retryCount = config.__retryCount || 0;
      
      if (retryCount < maxRetries) {
        config.__retryCount = retryCount + 1;
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        
        console.log(`[${timestamp}] Timeout error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return api(config);
      }
    }
    
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

      if (apiConfig.openaiApiKey !== 'ENVIRONMENT_CONFIGURED' && !apiConfig.openaiApiKey.startsWith('sk-')) {
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
      
      // Better error messages with specific handling
      if (error.response) {
        const status = error.response.status
        const data = error.response.data
        
        if (status === 401) {
          throw new Error('❌ Invalid or unauthorized API key. Please check your OpenAI API key.')
        } else if (status === 429) {
          throw new Error('❌ Rate limit exceeded. Please wait a moment and try again.')
        } else if (status === 500) {
          throw new Error('❌ Server error. Please try again in a moment.')
        } else if (status === 502 || status === 503) {
          throw new Error('❌ Service temporarily unavailable. Please try again in a few seconds.')
        } else if (status === 504) {
          throw new Error('❌ Request timed out. The service is taking longer than expected. Please try again.')
        } else {
          throw new Error(`❌ API Error (${status}): ${data?.error || data?.message || error.message}`)
        }
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('❌ Request timed out. The operation is taking longer than expected. Please try again.')
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('❌ Network connection failed. Please check your internet connection and try again.')
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('❌ Unable to connect to the server. Please check if the backend service is running.')
      } else {
        throw error
      }
    }
  },

  // Clarify SMART Goal
  async clarifyGoal(goalId: string, clarifications: Record<string, string>, goalContext?: { title: string; description?: string; originalGoal?: string }, conversationHistory?: Array<{ role: string; content: string }>): Promise<Goal> {
    try {
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

      const response = await api.post<APIResponse<Goal>>(`/goals/${goalId}/clarify`, {
        clarifications,
        goalContext,
        conversationHistory,
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

  // Generate Contextual Help with Conversation History
  async generateContextualHelp(
    goalTitle: string,
    componentKey: string,
    conversationHistory: Array<{ role: string; content: string }>,
    goal: Goal
  ): Promise<{ helpMessage: string }> {
    try {
      console.log('API: generateContextualHelp called with:', {
        goalTitle,
        componentKey,
        conversationHistoryLength: conversationHistory.length
      })
      
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

      if (!apiConfig.openaiApiKey) {
        throw new Error('OpenAI API key missing. Please enter your API key in the configuration section.')
      }

      const requestData = {
        goalTitle,
        componentKey,
        conversationHistory,
        goalContext: goal
      }
      
      console.log('API: Making request to /goals/contextual-help with conversation history')

      const response = await api.post<APIResponse<{ helpMessage: string }>>('/goals/contextual-help', requestData)
      
      console.log('API: Received contextual help response:', response.data)
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to generate contextual help')
      }
      
      return response.data.data
    } catch (error: any) {
      console.error('Error in generateContextualHelp:', error)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
      throw error
    }
  },

  // Generate Component Question
  async generateComponentQuestion(
    goalTitle: string,
    componentKey: string,
    currentValue: string,
    confidence: number,
    isHighConfidence: boolean,
    goal: Goal
  ): Promise<{ question: string }> {
    try {
      console.log('API: generateComponentQuestion called with:', {
        goalTitle,
        componentKey,
        currentValue,
        confidence,
        isHighConfidence
      })
      
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

      if (!apiConfig.openaiApiKey) {
        throw new Error('OpenAI API key missing. Please enter your API key in the configuration section.')
      }

      const requestData = {
        goalTitle,
        componentKey,
        currentValue,
        confidence,
        isHighConfidence,
        goalContext: goal
      }
      
      console.log('API: Making request to /goals/component-question with:', requestData)

      const response = await api.post<APIResponse<{ question: string }>>('/goals/component-question', requestData)
      
      console.log('API: Received response from component-question:', response.data)
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to generate component question')
      }
      
      return response.data.data
    } catch (error: any) {
      console.error('Error in generateComponentQuestion:', error)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
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