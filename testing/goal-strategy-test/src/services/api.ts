import axios, { InternalAxiosRequestConfig } from 'axios'
import { Goal, Milestone, WBSTask, TaskEstimation, APIResponse, FeedbackData } from '../types'

// Detect if we're in Codespaces and use the correct API URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // We're in Codespaces - use the forwarded URL for backend port 8085 (Goal Strategy service)
    const hostname = window.location.hostname.replace('-5174.', '-8085.');
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
  backendPort: '8085',
  expectedBackendUrl: typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev') 
    ? `https://${window.location.hostname.replace('-5174.', '-8085.')}/api/v1`
    : '/api/v1 (proxied to http://localhost:8085/api/v1)'
});

// API Configuration interface
interface ApiConfig {
  jwtToken: string
  // SECURITY: OpenAI API key removed - server-side management only
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
    // SECURITY: API key handling removed - server manages all API keys
    console.log('🔧 Using secure server-side API key configuration')
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
        const error = new Error('API configuration not set')
        ;(error as any).userMessage = 'Please configure your OpenAI API key first. Click the "Reconfigure" button in the API Configuration section above.'
        throw error
      }

      // Skip API key validation if using environment configuration
      if (apiConfig.openaiApiKey !== 'ENVIRONMENT_CONFIGURED') {
        if (!apiConfig.openaiApiKey) {
          const error = new Error('OpenAI API key missing')
          ;(error as any).userMessage = 'Your API configuration is incomplete. Please enter your OpenAI API key in the configuration section.'
          throw error
        }

        if (!apiConfig.openaiApiKey.startsWith('sk-')) {
          const error = new Error('Invalid OpenAI API key format')
          ;(error as any).userMessage = 'The provided API key appears to be invalid. OpenAI API keys should start with "sk-". Please check your key and try again.'
          throw error
        }
      }

      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const cacheBuster = Math.random().toString(36).substring(7)
      
      console.log(`🚀 [${new Date().toISOString()}] Making API call with cache-buster: ${timestamp}-${cacheBuster}`)
      console.log('🔑 API key configuration:', apiConfig.openaiApiKey === 'ENVIRONMENT_CONFIGURED' ? 'Using backend environment' : apiConfig.openaiApiKey.substring(0, 8) + '...')

      const response = await api.post<APIResponse<Goal>>(`/goals/translate?t=${timestamp}&cb=${cacheBuster}`, {
        raw_goal: originalGoal,
        mode: 'interactive'
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
          const error = new Error('Authentication failed')
          ;(error as any).userMessage = 'Your OpenAI API key appears to be invalid or unauthorized. Please check your API key and reconfigure.'
          throw error
        } else if (status === 429) {
          const error = new Error('Rate limit exceeded')
          ;(error as any).userMessage = 'You\'ve exceeded the OpenAI rate limit. Please wait a moment and try again.'
          throw error
        } else if (status === 500) {
          const error = new Error('Server error')
          ;(error as any).userMessage = 'The server encountered an error. This is usually temporary - please try again in a moment.'
          throw error
        } else if (status === 502 || status === 503) {
          const error = new Error('Service unavailable')
          ;(error as any).userMessage = 'The Goal Strategy service is temporarily unavailable. Please try again in a few seconds.'
          throw error
        } else if (status === 504) {
          const error = new Error('Request timeout')
          ;(error as any).userMessage = 'The request timed out. The AI is taking longer than expected to process your goal. Please try again with a simpler goal description.'
          throw error
        } else {
          const error = new Error(`API Error (${status})`)
          ;(error as any).userMessage = data?.error || data?.message || `An unexpected error occurred (${status}). Please try again.`
          throw error
        }
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const err = new Error('Request timeout')
        ;(err as any).userMessage = 'The request timed out. Try simplifying your goal description or check your internet connection.'
        throw err
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        const err = new Error('Network error')
        ;(err as any).userMessage = 'Network connection failed. Please check your internet connection and ensure the Goal Strategy service is running on port 8085.'
        throw err
      } else if (error.code === 'ERR_NETWORK') {
        const err = new Error('Connection failed')
        ;(err as any).userMessage = 'Unable to connect to the Goal Strategy service. Please ensure the backend service is running on port 8085.'
        throw err
      } else {
        // If the error already has a userMessage, preserve it
        if ((error as any).userMessage) {
          throw error
        }
        // Otherwise, provide a generic message
        const err = new Error(error.message)
        ;(err as any).userMessage = `An unexpected error occurred: ${error.message}. Please try again or reconfigure your API settings.`
        throw err
      }
    }
  },

  // Clarify SMART Goal
  async clarifyGoal(goalId: string, clarifications: Record<string, string>, goalContext?: { title: string; description?: string; originalGoal?: string }, conversationHistory?: Array<{ role: string; content: string }>): Promise<Goal> {
    try {
      if (!apiConfig) {
        throw new Error('API configuration not set. Please configure authentication credentials.')
      }

      console.log('API: clarifyGoal called with:', {
        goalId,
        clarifications,
        goalContext,
        conversationHistoryLength: conversationHistory?.length || 0
      })

      // Call the backend endpoint with proper format
      // Filter out empty clarifications before sending
      const response = await api.post<APIResponse<Goal>>(`/goals/${goalId}/clarify`, {
        clarifications: Object.entries(clarifications)
          .filter(([_, value]) => value && value.trim().length > 0)  // Only send non-empty answers
          .map(([key, value]) => ({
            question: `What is the ${key} aspect of your goal?`,
            answer: value.trim(),
            smartCriterion: key
          })),
        goalContext,
        conversationHistory
      })
      
      console.log('API: clarifyGoal response:', response.data)
      
      if (!response.data.success) {
        // Check if AI needs follow-up
        if ((response.data as any).data?.needsFollowUp) {
          // Return the response as-is for follow-up handling
          return response.data as any
        }
        throw new Error(response.data.error || 'Failed to clarify goal')
      }
      
      // Transform the response to match Goal interface
      const goalData = response.data.data
      if (!goalData) {
        throw new Error('No goal data in response')
      }
      
      // Ensure the response has the expected Goal structure
      const transformedGoal: Goal = {
        id: goalData.id || goalId,
        title: goalData.title,
        description: goalData.description || '',
        criteria: {
          specific: goalData.smart_criteria?.specific || goalData.smartCriteria?.specific || { value: '', confidence: 0 },
          measurable: goalData.smart_criteria?.measurable || goalData.smartCriteria?.measurable || { value: '', confidence: 0, metrics: [] },
          achievable: goalData.smart_criteria?.achievable || goalData.smartCriteria?.achievable || { value: '', confidence: 0 },
          relevant: goalData.smart_criteria?.relevant || goalData.smartCriteria?.relevant || { value: '', confidence: 0 },
          timeBound: goalData.smart_criteria?.timeBound || goalData.smartCriteria?.timeBound || { value: '', confidence: 0 }
        },
        confidence: goalData.confidence || 0.5,
        status: goalData.status || 'active',
        correlation_id: goalData.correlation_id || (response.data as any).correlation_id,
        created_at: goalData.created_at || new Date().toISOString(),
        updated_at: goalData.updated_at || new Date().toISOString(),
        aiFeedback: (response.data as any).message || (response.data as any).aiFeedback,
        clarification_questions: goalData.clarification_questions || goalData.additional_questions || goalData.remaining_questions || []
      }
      
      return transformedGoal
    } catch (error: any) {
      console.error('Error clarifying goal:', error)
      console.error('Error response:', error.response?.data)
      
      // Enhance error messages
      if (error.response?.status === 404) {
        const err = new Error('Goal not found')
        ;(err as any).userMessage = 'The goal could not be found. It may have been deleted or you may not have access to it.'
        throw err
      } else if (error.response?.status === 400) {
        const err = new Error('Invalid request')
        ;(err as any).userMessage = error.response.data?.error || 'The clarification request was invalid. Please try again.'
        throw err
      }
      
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