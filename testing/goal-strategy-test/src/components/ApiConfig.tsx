import React, { useState, useEffect } from 'react'
import { setApiConfig, getApiConfig } from '../services/api'

interface ApiConfigProps {
  onConfigured: () => void
}

const ApiConfig: React.FC<ApiConfigProps> = ({ onConfigured }) => {
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Auto-generate JWT for testing (backend doesn't actually validate it)
  const generateTestJwt = () => {
    return 'testing-jwt-' + Date.now()
  }

  useEffect(() => {
    // Check if configuration already exists
    const existingConfig = getApiConfig()
    if (existingConfig) {
      setOpenaiApiKey(existingConfig.openaiApiKey)
      setIsConfigured(true)
    } else {
      // Try to load from localStorage
      const savedOpenaiApiKey = localStorage.getItem('goal-strategy-openai-key')
      
      if (savedOpenaiApiKey) {
        setOpenaiApiKey(savedOpenaiApiKey)
        // Auto-configure if we have the key
        setApiConfig({
          jwtToken: generateTestJwt(),
          openaiApiKey: savedOpenaiApiKey
        })
        setIsConfigured(true)
        onConfigured()
      }
    }
  }, [])

  const validateApiKey = (key: string): boolean => {
    const trimmedKey = key.trim()
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return trimmedKey.startsWith('sk-') && trimmedKey.length >= 20
  }

  const handleSaveConfiguration = () => {
    if (!openaiApiKey.trim()) {
      alert('Please provide your OpenAI API key')
      return
    }

    if (!validateApiKey(openaiApiKey)) {
      alert('Invalid OpenAI API key format. Keys should start with "sk-" and be at least 20 characters long.')
      return
    }

    console.log('🔧 Saving API configuration...')
    console.log('API Key format valid:', validateApiKey(openaiApiKey))

    // Save to localStorage
    localStorage.setItem('goal-strategy-openai-key', openaiApiKey.trim())

    // Set API configuration with auto-generated JWT
    const config = {
      jwtToken: generateTestJwt(),
      openaiApiKey: openaiApiKey.trim()
    }
    
    console.log('🔧 Setting API config:', { ...config, openaiApiKey: config.openaiApiKey.substring(0, 8) + '...' })
    setApiConfig(config)
    
    // Verify it was set
    const verifyConfig = getApiConfig()
    console.log('🔧 Verified API config:', verifyConfig ? 'Set successfully' : 'Failed to set')

    setIsConfigured(true)
    onConfigured()
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

        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleSaveConfiguration}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Configure API
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