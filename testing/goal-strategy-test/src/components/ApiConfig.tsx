import React, { useState, useEffect } from 'react'
import { setApiConfig, getApiConfig } from '../services/api'

interface ApiConfigProps {
  onConfigured: () => void
}

const ApiConfig: React.FC<ApiConfigProps> = ({ onConfigured }) => {
  const [jwtToken, setJwtToken] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showTokens, setShowTokens] = useState(false)

  // Default test credentials
  const defaultJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci0xMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzY29wZXMiOlsiZ29hbHM6cmVhZCIsImdvYWxzOndyaXRlIiwibWlsZXN0b25lczpyZWFkIiwibWlsZXN0b25lczp3cml0ZSIsInRhc2tzOnJlYWQiLCJ0YXNrczp3cml0ZSJdLCJpYXQiOjE3NTAzODgxNTAsImV4cCI6MTc1MDQ3NDU1MH0.OIt7jE_A3EvuAZN2FnVbaagTfdtaPFaQk9YaZivTS_0'
  const defaultOpenaiApiKey = 'sk-test-key'

  useEffect(() => {
    // Check if configuration already exists
    const existingConfig = getApiConfig()
    if (existingConfig) {
      setJwtToken(existingConfig.jwtToken)
      setOpenaiApiKey(existingConfig.openaiApiKey)
      setIsConfigured(true)
    } else {
      // Try to load from localStorage
      const savedJwtToken = localStorage.getItem('goal-strategy-jwt-token')
      const savedOpenaiApiKey = localStorage.getItem('goal-strategy-openai-key')
      
      if (savedJwtToken && savedOpenaiApiKey) {
        setJwtToken(savedJwtToken)
        setOpenaiApiKey(savedOpenaiApiKey)
      }
    }
  }, [])

  const handleUseTestDefaults = () => {
    setJwtToken(defaultJwtToken)
    setOpenaiApiKey(defaultOpenaiApiKey)
  }

  const handleSaveConfiguration = () => {
    if (!jwtToken.trim() || !openaiApiKey.trim()) {
      alert('Please provide both JWT token and OpenAI API key')
      return
    }

    // Save to localStorage
    localStorage.setItem('goal-strategy-jwt-token', jwtToken)
    localStorage.setItem('goal-strategy-openai-key', openaiApiKey)

    // Set API configuration
    setApiConfig({
      jwtToken: jwtToken.trim(),
      openaiApiKey: openaiApiKey.trim()
    })

    setIsConfigured(true)
    onConfigured()
  }

  const handleReconfigure = () => {
    setIsConfigured(false)
  }

  const handleClearConfiguration = () => {
    localStorage.removeItem('goal-strategy-jwt-token')
    localStorage.removeItem('goal-strategy-openai-key')
    setJwtToken('')
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
        API Configuration Required
      </h2>
      <p className="text-blue-700 mb-4">
        Please provide your authentication credentials to access the Goal & Strategy Service.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="jwt-token" className="block text-sm font-medium text-blue-900 mb-1">
            JWT Token
          </label>
          <textarea
            id="jwt-token"
            value={jwtToken}
            onChange={(e) => setJwtToken(e.target.value)}
            placeholder="Enter your JWT token..."
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <div>
          <label htmlFor="openai-key" className="block text-sm font-medium text-blue-900 mb-1">
            OpenAI API Key
          </label>
          <input
            id="openai-key"
            type={showTokens ? 'text' : 'password'}
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="Enter your OpenAI API key..."
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <div className="flex items-center">
          <input
            id="show-tokens"
            type="checkbox"
            checked={showTokens}
            onChange={(e) => setShowTokens(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
          />
          <label htmlFor="show-tokens" className="ml-2 block text-sm text-blue-700">
            Show tokens in plain text
          </label>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleUseTestDefaults}
            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm font-medium"
          >
            Use Test Defaults
          </button>
          <button
            onClick={handleSaveConfiguration}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Save Configuration
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Test Environment
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                The "Use Test Defaults" button provides working credentials for testing purposes. 
                In production, you would use your own JWT token and OpenAI API key.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiConfig