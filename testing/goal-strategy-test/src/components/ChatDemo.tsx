import { useState, useEffect } from 'react'
import { MessageSquare, Target, Sparkles, AlertCircle, Settings } from 'lucide-react'
import { Goal } from '../types'
import ChatClarification from './ChatClarification'
import SmartGoalViewer from './SmartGoalViewer'
import ApiConfig from './ApiConfig'
import goalAPI, { getApiConfig } from '../services/api'

export default function ChatDemo() {
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null)
  const [originalGoal, setOriginalGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isApiConfigured, setIsApiConfigured] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)

  useEffect(() => {
    // Check if API is configured first
    const config = getApiConfig()
    if (!config) {
      setIsApiConfigured(false)
      setShowApiConfig(true)
      setLoading(false)
      return
    }

    setIsApiConfigured(true)
    setShowApiConfig(false)

    const fetchGoal = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Use a sample goal text to get a real goal from the API
        const sampleGoalText = 'I want to get better at programming'
        const response = await goalAPI.translateToSmart(sampleGoalText)
        setCurrentGoal(response)
        setOriginalGoal(response) // Store original for comparison
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load goal')
        console.error('Error fetching goal:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGoal()
  }, [isApiConfigured])

  const handleApiConfigured = () => {
    setIsApiConfigured(true)
    setShowApiConfig(false)
    // Trigger goal fetch after API is configured
    const config = getApiConfig()
    if (config) {
      // Re-run the effect by toggling the dependency
      setIsApiConfigured(false)
      setTimeout(() => setIsApiConfigured(true), 100)
    }
  }

  const handleStartChat = () => {
    setShowChat(true)
  }

  const handleGoalUpdate = (updatedGoal: Goal) => {
    setCurrentGoal(updatedGoal)
  }

  const handleChatComplete = () => {
    setShowChat(false)
    setIsComplete(true)
  }

  const resetDemo = async () => {
    // Check if API is configured first
    const config = getApiConfig()
    if (!config) {
      setIsApiConfigured(false)
      setShowApiConfig(true)
      setShowChat(false)
      setIsComplete(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const sampleGoalText = 'I want to get better at programming'
      const response = await goalAPI.translateToSmart(sampleGoalText)
      setCurrentGoal(response)
      setOriginalGoal(response)
      setShowChat(false)
      setIsComplete(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset demo')
    } finally {
      setLoading(false)
    }
  }

  // Show API configuration if not configured
  if (showApiConfig) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Chat-Based SMART Goal Clarification
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            To use the chat-based clarification system, please configure your API credentials first.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <ApiConfig onConfigured={handleApiConfigured} />
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <MessageSquare className="w-8 h-8 text-indigo-600 animate-pulse" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Chat-Based SMART Goal Clarification
            </h1>
          </div>
          <div className="flex items-center justify-center space-x-2 text-lg text-gray-600 dark:text-gray-400">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>Loading goal from API...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Chat-Based SMART Goal Clarification
            </h1>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={resetDemo}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show main content only if goal is loaded
  if (!currentGoal) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Demo Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <MessageSquare className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Chat-Based SMART Goal Clarification
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Experience a conversational approach to improving SMART goals. The AI assistant will chat with you about each component,
          highlighting areas that need clarification and updating your goal in real-time.
        </p>
      </div>

      {/* Demo Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Demo Controls
            </h2>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isApiConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  API {isApiConfigured ? 'Connected' : 'Not Configured'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isComplete
                  ? "🎉 Chat completed! Your SMART goal has been improved."
                  : showChat
                  ? "💬 Chat in progress - the assistant is helping improve your goal."
                  : "This goal has low confidence scores and needs clarification through conversation."
                }
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isApiConfigured && (
              <button
                onClick={() => setShowApiConfig(true)}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Configure API</span>
              </button>
            )}
            {isApiConfigured && !showChat && !isComplete && (
              <button
                onClick={handleStartChat}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start Chat</span>
              </button>
            )}
            {isComplete && (
              <button
                onClick={resetDemo}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Target className="w-4 h-4" />
                <span>Try Another Goal</span>
              </button>
            )}
            {isApiConfigured && (
              <button
                onClick={() => setShowApiConfig(true)}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Reconfigure</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - SMART Goal Display */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your SMART Goal
            </h2>
            {showChat && (
              <div className="flex items-center space-x-1 text-sm text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <span>Updating in real-time</span>
              </div>
            )}
          </div>
          <SmartGoalViewer goal={currentGoal} />
        </div>

        {/* Right Side - Chat Interface */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Assistant
            </h2>
          </div>
          
          {showChat ? (
            <ChatClarification
              goal={currentGoal}
              onGoalUpdate={handleGoalUpdate}
              onComplete={handleChatComplete}
              isVisible={showChat}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-96 flex items-center justify-center">
              <div className="text-center space-y-4">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {isComplete ? "Chat Completed!" : "Ready to Chat"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                    {isComplete 
                      ? "Your SMART goal has been successfully improved through our conversation. You can reset to try again."
                      : "Click 'Start Chat' to begin a conversation with the AI assistant about improving your SMART goal."
                    }
                  </p>
                </div>
                {isComplete && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      🎯 <strong>Goal Improved!</strong> Confidence increased from {originalGoal ? Math.round(originalGoal.confidence * 100) : 0}% to {Math.round(currentGoal.confidence * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      {(showChat || isComplete) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
            📊 Progress Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(currentGoal.criteria).map(([key, criterion]) => {
              const originalCriterion = originalGoal?.criteria[key as keyof typeof originalGoal.criteria]
              const improvement = originalCriterion ? criterion.confidence - originalCriterion.confidence : 0
              
              return (
                <div key={key} className="text-center">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 capitalize mb-1">
                    {key === 'timeBound' ? 'Time-bound' : key}
                  </div>
                  <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {Math.round(criterion.confidence * 100)}%
                  </div>
                  {improvement > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      +{Math.round(improvement * 100)}%
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}