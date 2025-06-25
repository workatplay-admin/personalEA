import React, { useState, useEffect } from 'react'
import { setApiConfig, getApiConfig } from '../services/api'

interface ApiConfigProps {
  onConfigured: () => void
}

const ApiConfig: React.FC<ApiConfigProps> = ({ onConfigured }) => {
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Test backend connectivity
  const testBackendConnection = async (): Promise<boolean> => {
    try {
      // Always use the proxied endpoint to avoid CSP issues in Codespaces
      console.log('🔧 Testing backend connection via proxy...');
      
      const response = await fetch('/api/v1/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        console.error('🔧 Backend health check failed:', response.status);
        return false;
      }
      
      console.log('🔧 Backend connection successful');
      return true;
    } catch (error) {
      console.error('🔧 Backend connection test failed:', error);
      return false;
    }
  }

  // Generate proper JWT token via backend API call
  const generateTestJwt = async (): Promise<string> => {
    try {
      // Use proxied endpoint to avoid CSP issues
      const response = await fetch('/api/v1/auth/test-token');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate test token');
      }
      
      return data.data.token;
    } catch (error) {
      console.error('Failed to generate JWT token:', error);
      throw error;
    }
  }

  useEffect(() => {
    const checkConfiguration = async () => {
      // Check if configuration already exists
      const existingConfig = getApiConfig()
      if (existingConfig) {
        setOpenaiApiKey(existingConfig.openaiApiKey)
        setIsConfigured(true)
        return
      }

      // Check if backend has environment configuration
      try {
        console.log('🔧 Checking backend environment configuration...')
        
        // Use proxied endpoint to avoid CSP issues
        const response = await fetch('/api/v1/config/environment')
        const data = await response.json()
        
        if (data.success && data.data.environmentConfigured) {
          console.log('🔧 Backend environment configuration found:', data.data.message)
          
          try {
            // Auto-configure with backend environment
            const jwtToken = await generateTestJwt();
            const config = {
              jwtToken: jwtToken,
              openaiApiKey: 'ENVIRONMENT_CONFIGURED' // Placeholder since backend handles it
            }
            
            setApiConfig(config)
            setOpenaiApiKey('ENVIRONMENT_CONFIGURED')
            setIsConfigured(true)
            // Do not auto-advance - user must explicitly proceed
            return
          } catch (error) {
            console.error('🔧 Failed to generate JWT token during auto-config:', error)
            // Fall through to manual configuration
          }
        }
      } catch (error: any) {
        console.log('🔧 Could not check backend environment configuration:', error.message)
      }

      // Fall back to localStorage check
      const savedOpenaiApiKey = localStorage.getItem('goal-strategy-openai-key')
      
      if (savedOpenaiApiKey) {
        setOpenaiApiKey(savedOpenaiApiKey)
        try {
          // Auto-configure if we have the key
          const jwtToken = await generateTestJwt();
          setApiConfig({
            jwtToken: jwtToken,
            openaiApiKey: savedOpenaiApiKey
          })
          setIsConfigured(true)
          // Do not auto-advance - user must explicitly proceed
        } catch (error) {
          console.error('🔧 Failed to generate JWT token for saved API key:', error)
          // Still show the saved key but don't auto-configure
          setIsConfigured(false)
        }
      }
    }
    
    checkConfiguration()
  }, [])

  const validateApiKey = (key: string): boolean => {
    const trimmedKey = key.trim()
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return trimmedKey.startsWith('sk-') && trimmedKey.length >= 20
  }

  const handleSaveConfiguration = async () => {
    if (!openaiApiKey.trim()) {
      setErrorMessage('Please provide your OpenAI API key')
      return
    }

    if (!validateApiKey(openaiApiKey)) {
      setErrorMessage('Invalid OpenAI API key format. Keys should start with "sk-" and be at least 20 characters long.')
      return
    }

    try {
      setIsChecking(true)
      setErrorMessage(null)
      console.log('🔧 Saving API configuration...')
      console.log('API Key format valid:', validateApiKey(openaiApiKey))

      // First test backend connection
      const isBackendAvailable = await testBackendConnection()
      if (!isBackendAvailable) {
        throw new Error('Cannot connect to backend service. Please ensure the Goal Strategy service is running on port 8085.')
      }

      // Save to localStorage
      localStorage.setItem('goal-strategy-openai-key', openaiApiKey.trim())

      // Set API configuration with auto-generated JWT
      const jwtToken = await generateTestJwt();
      const config = {
        jwtToken: jwtToken,
        openaiApiKey: openaiApiKey.trim()
      }
      
      console.log('🔧 Setting API config:', { ...config, openaiApiKey: config.openaiApiKey.substring(0, 8) + '...' })
      setApiConfig(config)
      
      // Verify it was set
      const verifyConfig = getApiConfig()
      console.log('🔧 Verified API config:', verifyConfig ? 'Set successfully' : 'Failed to set')

      setIsConfigured(true)
      onConfigured()
    } catch (error: any) {
      console.error('🔧 Failed to save API configuration:', error)
      setErrorMessage(error.message || 'Failed to configure API. Please ensure the backend service is running and try again.')
    } finally {
      setIsChecking(false)
    }
  }

  const handleReconfigure = () => {
    setIsConfigured(false)
  }

  const handleClearConfiguration = () => {
    localStorage.removeItem('goal-strategy-openai-key')
    setOpenaiApiKey('')
    setIsConfigured(false)
  }

  if (isConfigured) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                API Configuration Set
              </h3>
              <div className="mt-1 text-sm text-green-700">
                Authentication credentials are configured and ready for use.
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onConfigured}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
            >
              Continue
            </button>
            <button
              onClick={handleReconfigure}
              className="bg-green-100 hover:bg-green-200 text-green-800 text-sm px-3 py-1 rounded"
            >
              Reconfigure
            </button>
            <button
              onClick={handleClearConfiguration}
              className="bg-red-100 hover:bg-red-200 text-red-800 text-sm px-3 py-1 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-blue-900 mb-4">
        OpenAI API Key Required
      </h2>
      <p className="text-blue-700 mb-4">
        Please provide your OpenAI API key to access the Goal & Strategy Service.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="openai-key" className="block text-sm font-medium text-blue-900 mb-1">
            OpenAI API Key
          </label>
          <input
            id="openai-key"
            type={showKey ? 'text' : 'password'}
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="Enter your OpenAI API key (sk-...)..."
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <div className="flex items-center">
          <input
            id="show-key"
            type="checkbox"
            checked={showKey}
            onChange={(e) => setShowKey(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
          />
          <label htmlFor="show-key" className="ml-2 block text-sm text-blue-700">
            Show API key in plain text
          </label>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleSaveConfiguration}
            disabled={isChecking}
            className={`${
              isChecking
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-4 py-2 rounded-md text-sm font-medium`}
          >
            {isChecking ? 'Configuring...' : 'Configure API'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Simplified Configuration
              </h3>
              <div className="mt-1 text-sm text-green-700">
                Only your OpenAI API key is required. Authentication tokens are auto-generated for testing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiConfig