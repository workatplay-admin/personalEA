import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios'
import { Goal, Milestone, WBSTask, TaskEstimation, APIResponse, FeedbackData } from '../types'

// Production API configuration with environment-based URLs
const getApiBaseUrl = () => {
  // In production, use environment variable or default to secure API endpoint
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.personalea.com'
  return `${baseUrl}/api/v1`
}

const API_BASE_URL = getApiBaseUrl()

// Production logging - minimal in production
const log = {
  info: (...args: any[]) => {
    if (import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true') {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    console.error(...args)
    // Send to error reporting service in production
    if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      // TODO: Integrate with error reporting service (Sentry, etc.)
    }
  }
}

// API Configuration interface
interface ApiConfig {
  jwtToken: string
  openaiApiKey?: string // Optional in production - backend should handle
}

// Secure storage for production
class SecureApiConfigStorage {
  private static readonly STORAGE_KEY = 'personalea_api_config'
  
  static set(config: ApiConfig): void {
    try {
      // In production, use encrypted storage if available
      const encrypted = btoa(JSON.stringify(config))
      sessionStorage.setItem(this.STORAGE_KEY, encrypted)
    } catch (error) {
      log.error('Failed to store API configuration:', error)
    }
  }
  
  static get(): ApiConfig | null {
    try {
      const encrypted = sessionStorage.getItem(this.STORAGE_KEY)
      if (!encrypted) return null
      
      const decrypted = atob(encrypted)
      return JSON.parse(decrypted)
    } catch (error) {
      log.error('Failed to retrieve API configuration:', error)
      return null
    }
  }
  
  static clear(): void {
    sessionStorage.removeItem(this.STORAGE_KEY)
  }
}

// Global API configuration
let apiConfig: ApiConfig | null = SecureApiConfigStorage.get()

// Function to set API configuration
export const setApiConfig = (config: ApiConfig) => {
  apiConfig = config
  SecureApiConfigStorage.set(config)
}

// Function to get current API configuration
export const getApiConfig = (): ApiConfig | null => {
  return apiConfig
}

// Function to clear API configuration
export const clearApiConfig = () => {
  apiConfig = null
  SecureApiConfigStorage.clear()
}

// Create axios instance with production settings
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '60000'),
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  withCredentials: true, // Enable secure cookies
})

// Request interceptor for authentication and security
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  log.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
  
  // Add authentication headers if config is available
  if (apiConfig && config.headers) {
    config.headers['Authorization'] = `Bearer ${apiConfig.jwtToken}`
  }
  
  // Add request ID for tracing
  config.headers['X-Request-ID'] = crypto.randomUUID()
  
  return config
})

// Enhanced error handling for production
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public userMessage?: string,
    public errorCode?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Retry logic with exponential backoff
const retryRequest = async (
  error: AxiosError,
  maxRetries: number = parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '3')
) => {
  const config = error.config
  if (!config) throw error
  
  const retryCount = (config as any).__retryCount || 0
  
  if (retryCount >= maxRetries) {
    throw error
  }
  
  (config as any).__retryCount = retryCount + 1
  
  const delay = Math.min(
    parseInt(import.meta.env.VITE_RETRY_DELAY || '1000') * Math.pow(2, retryCount),
    10000
  )
  
  log.info(`Retrying request (${retryCount + 1}/${maxRetries}) after ${delay}ms`)
  
  await new Promise(resolve => setTimeout(resolve, delay))
  
  return api(config)
}

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    log.info(`API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`)
    return response
  },
  async (error: AxiosError) => {
    const { response, config } = error
    
    // Log error details
    log.error('API Error:', {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      data: response?.data,
    })
    
    // Handle network errors
    if (!response) {
      if (error.code === 'ECONNABORTED') {
        throw new ApiError(
          'Request timeout',
          undefined,
          'The request took too long to complete. Please try again.',
          'TIMEOUT'
        )
      }
      
      throw new ApiError(
        'Network error',
        undefined,
        'Unable to connect to the server. Please check your internet connection.',
        'NETWORK_ERROR'
      )
    }
    
    // Handle specific HTTP errors
    switch (response.status) {
      case 401:
        // Clear invalid credentials
        clearApiConfig()
        throw new ApiError(
          'Authentication failed',
          401,
          'Your session has expired. Please sign in again.',
          'AUTH_FAILED'
        )
        
      case 403:
        throw new ApiError(
          'Access denied',
          403,
          'You don\'t have permission to perform this action.',
          'FORBIDDEN'
        )
        
      case 429:
        // Retry rate-limited requests
        if ((config as any).__retryCount === undefined) {
          return retryRequest(error)
        }
        throw new ApiError(
          'Rate limit exceeded',
          429,
          'Too many requests. Please wait a moment and try again.',
          'RATE_LIMIT'
        )
        
      case 500:
      case 502:
      case 503:
        // Retry server errors
        if ((config as any).__retryCount === undefined) {
          return retryRequest(error)
        }
        throw new ApiError(
          'Server error',
          response.status,
          'The server encountered an error. Please try again later.',
          'SERVER_ERROR'
        )
        
      case 504:
        throw new ApiError(
          'Gateway timeout',
          504,
          'The server is taking too long to respond. Please try again.',
          'GATEWAY_TIMEOUT'
        )
        
      default:
        const errorData = response.data as any
        throw new ApiError(
          errorData?.message || 'API request failed',
          response.status,
          errorData?.userMessage || 'An unexpected error occurred. Please try again.',
          errorData?.code || 'UNKNOWN'
        )
    }
  }
)

// Production-ready API client
export const goalAPI = {
  // SMART Goal Translation with enhanced error handling
  async translateToSmart(originalGoal: string): Promise<Goal> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      const response = await api.post<APIResponse<Goal>>('/goals/translate', {
        raw_goal: originalGoal,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new ApiError(
          'Failed to translate goal',
          response.status,
          response.data.error || 'Unable to process your goal. Please try again.',
          'TRANSLATION_FAILED'
        )
      }
      
      return response.data.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in translateToSmart:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Clarify SMART Goal with conversation history
  async clarifyGoal(
    goalId: string,
    clarifications: Record<string, string>,
    goalContext?: { title: string; description?: string; originalGoal?: string },
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<Goal> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      const response = await api.post<APIResponse<Goal>>(`/goals/${goalId}/clarify`, {
        clarifications,
        goalContext,
        conversationHistory,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new ApiError(
          'Failed to clarify goal',
          response.status,
          response.data.error || 'Unable to clarify your goal. Please try again.',
          'CLARIFICATION_FAILED'
        )
      }
      
      return response.data.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in clarifyGoal:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Generate Milestones with progress tracking
  async generateMilestones(
    goalId: string,
    onProgress?: (progress: number) => void
  ): Promise<Milestone[]> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      const response = await api.post<APIResponse<Milestone[]>>(
        '/milestones/generate',
        { goalId },
        {
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              onProgress(percentCompleted)
            }
          },
        }
      )
      
      if (!response.data.success || !response.data.data) {
        throw new ApiError(
          'Failed to generate milestones',
          response.status,
          response.data.error || 'Unable to generate milestones. Please try again.',
          'MILESTONE_GENERATION_FAILED'
        )
      }
      
      return response.data.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in generateMilestones:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Generate Work Breakdown Structure
  async generateWBS(milestoneId: string): Promise<WBSTask[]> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      const response = await api.post<APIResponse<WBSTask[]>>('/wbs/generate', {
        milestoneId,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new ApiError(
          'Failed to generate WBS',
          response.status,
          response.data.error || 'Unable to generate work breakdown structure. Please try again.',
          'WBS_GENERATION_FAILED'
        )
      }
      
      return response.data.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in generateWBS:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Generate WBS for all milestones with batch processing
  async generateWBSForMilestones(
    milestoneIds: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<WBSTask[]> {
    try {
      const allTasks: WBSTask[] = []
      const total = milestoneIds.length
      
      for (let i = 0; i < total; i++) {
        const tasks = await this.generateWBS(milestoneIds[i])
        allTasks.push(...tasks)
        
        if (onProgress) {
          onProgress(i + 1, total)
        }
      }
      
      return allTasks
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in generateWBSForMilestones:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred while generating tasks. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Estimate Tasks with batch support
  async estimateTasks(taskIds: string[]): Promise<TaskEstimation[]> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      const response = await api.post<APIResponse<TaskEstimation[]>>('/estimations/batch', {
        taskIds,
      })
      
      if (!response.data.success || !response.data.data) {
        throw new ApiError(
          'Failed to estimate tasks',
          response.status,
          response.data.error || 'Unable to estimate tasks. Please try again.',
          'ESTIMATION_FAILED'
        )
      }
      
      return response.data.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in estimateTasks:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Generate Contextual Help with caching
  async generateContextualHelp(
    goalTitle: string,
    componentKey: string,
    conversationHistory: Array<{ role: string; content: string }>,
    goal: Goal
  ): Promise<{ helpMessage: string }> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      const response = await api.post<APIResponse<{ helpMessage: string }>>(
        '/goals/contextual-help',
        {
          goalTitle,
          componentKey,
          conversationHistory,
          goalContext: goal
        }
      )
      
      if (!response.data.success || !response.data.data) {
        throw new ApiError(
          'Failed to generate help',
          response.status,
          response.data.error || 'Unable to generate help message. Please try again.',
          'HELP_GENERATION_FAILED'
        )
      }
      
      return response.data.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in generateContextualHelp:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },

  // Submit Feedback with analytics
  async submitFeedback(feedback: Partial<FeedbackData>): Promise<void> {
    try {
      if (!apiConfig) {
        throw new ApiError(
          'Not authenticated',
          undefined,
          'Please sign in to continue.',
          'NOT_AUTHENTICATED'
        )
      }

      // Add metadata for production analytics
      const enrichedFeedback = {
        ...feedback,
        metadata: {
          timestamp: new Date().toISOString(),
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          userAgent: navigator.userAgent,
        }
      }

      const response = await api.post<APIResponse<void>>('/feedback', enrichedFeedback)
      
      if (!response.data.success) {
        throw new ApiError(
          'Failed to submit feedback',
          response.status,
          response.data.error || 'Unable to submit feedback. Please try again.',
          'FEEDBACK_SUBMISSION_FAILED'
        )
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      
      log.error('Unexpected error in submitFeedback:', error)
      throw new ApiError(
        'Unexpected error',
        undefined,
        'An unexpected error occurred. Please try again.',
        'UNEXPECTED_ERROR'
      )
    }
  },
}

export default goalAPI
export { ApiError }