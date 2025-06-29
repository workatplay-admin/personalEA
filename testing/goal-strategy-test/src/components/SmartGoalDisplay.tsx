/**
 * Smart Goal Display Component
 * 
 * Interactive React component for displaying and managing SMART goal transformation results,
 * including confidence scoring, clarification workflows, and goal refinement interfaces.
 * 
 * @see {@link file://../../../../docs/USER_TESTING_GUIDE.md User Testing Guide}
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#smart-goals SMART Goals Specification}
 * @see {@link file://../../../../docs/reference/troubleshooting/common-issues.md#frontend-issues Frontend Troubleshooting}
 */

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Edit3, Star, MessageSquare, Target, Sparkles } from 'lucide-react'
import { Goal } from '../types'
import goalAPI from '../services/api'
import ChatClarification from './ChatClarification'
import SmartGoalViewer from './SmartGoalViewer'

// Function to clear any cached goal data
const clearCachedGoalData = () => {
  console.log('🧹 Clearing any cached goal data...');
  
  // Clear localStorage goal-related data (but NOT API keys!)
  const localStorageKeys = Object.keys(localStorage);
  localStorageKeys.forEach(key => {
    // Skip API key storage - never remove user's configuration
    if (key === 'goal-strategy-openai-key' || key === 'goal-strategy-jwt-token') {
      console.log(`🔐 Preserving API configuration: ${key}`);
      return; // Don't remove API configuration
    }
    
    if (key.includes('goal') || key.includes('smart') || key.includes('gs-') || key.includes('translate')) {
      console.log(`Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage goal-related data
  const sessionStorageKeys = Object.keys(sessionStorage);
  sessionStorageKeys.forEach(key => {
    if (key.includes('goal') || key.includes('smart') || key.includes('gs-') || key.includes('translate')) {
      console.log(`Removing sessionStorage key: ${key}`);
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('✅ Cache clearing complete');
};

interface SmartGoalDisplayProps {
  originalGoal: string
  onComplete: (goal: Goal) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function SmartGoalDisplay({ 
  originalGoal, 
  onComplete, 
  setIsLoading, 
  isLoading
}: SmartGoalDisplayProps) {
  const [smartGoal, setSmartGoal] = useState<Goal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [showChat, setShowChat] = useState(true)
  const [originalSmartGoal, setOriginalSmartGoal] = useState<Goal | null>(null)
  const [chatCompleted, setChatCompleted] = useState(false)

  // Track smartGoal state changes
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔄 smartGoal state changed:`, smartGoal);
    console.log(`[${timestamp}] 🆔 smartGoal correlation_id:`, smartGoal?.correlation_id);
    console.log(`[${timestamp}] 📝 smartGoal title:`, smartGoal?.title);
  }, [smartGoal])


  useEffect(() => {
  console.log('SmartGoalDisplay useEffect triggered. originalGoal:', originalGoal);
  
  // Check for any cached goal data in browser storage
  console.log('Checking browser storage for cached goal data...');
  console.log('localStorage keys:', Object.keys(localStorage));
  console.log('sessionStorage keys:', Object.keys(sessionStorage));
  
  // Check for any goal-related cached data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('goal') || key.includes('smart') || key.includes('gs-'))) {
      console.log(`Found potential cached goal data in localStorage[${key}]:`, localStorage.getItem(key));
    }
  }
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('goal') || key.includes('smart') || key.includes('gs-'))) {
      console.log(`Found potential cached goal data in sessionStorage[${key}]:`, sessionStorage.getItem(key));
    }
  }
  
  // Clear any cached goal data before making new API calls
  clearCachedGoalData();
  
  if (originalGoal && originalGoal.trim()) {
    translateGoal()
  }
}, [originalGoal])

  const translateGoal = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🚀 translateGoal called with originalGoal:`, originalGoal);
    console.log(`[${timestamp}] 📊 Current smartGoal state before API call:`, smartGoal);
    console.log(`[${timestamp}] 🔍 Current smartGoal correlation_id before API call:`, smartGoal?.correlation_id);
    
    // Validate originalGoal before proceeding
    if (!originalGoal || originalGoal.trim() === '') {
      console.log(`[${timestamp}] ⚠️ Empty or invalid originalGoal detected:`, originalGoal);
      setError('No goal provided for translation');
      return;
    }
    
    try {
      // CRITICAL: Clear the current smartGoal state before making API call
      console.log(`[${timestamp}] 🧹 Clearing smartGoal state before API call`);
      setSmartGoal(null);
      
      // Add a small delay to ensure state clearing takes effect before API call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setIsLoading(true)
      setError(null)
      console.log(`[${timestamp}] 📡 About to call goalAPI.translateToSmart for goal: "${originalGoal}"`);
      const goal = await goalAPI.translateToSmart(originalGoal)
      console.log(`[${timestamp}] ✅ Received goal from API:`, goal);
      console.log(`[${timestamp}] 🆔 Goal correlation_id:`, goal?.correlation_id);
      console.log(`[${timestamp}] 📝 Goal title:`, goal?.title);
      
      // Verify the response is valid before setting state
      if (goal && goal.correlation_id) {
        console.log(`[${timestamp}] ✅ Valid response received, setting smartGoal state`);
        setSmartGoal(goal)
        setOriginalSmartGoal(goal) // Store original for comparison
        console.log(`[${timestamp}] 💾 setSmartGoal called with:`, goal);
        console.log(`[${timestamp}] 🔍 setSmartGoal correlation_id:`, goal?.correlation_id);
      } else {
        console.log(`[${timestamp}] ❌ Invalid response received, missing correlation_id`);
        setError('Invalid response received from server');
      }
    } catch (err) {
      console.error(`[${timestamp}] ❌ Error translating goal:`, err);
      setError(err instanceof Error ? err.message : 'Failed to translate goal')
    } finally {
      setIsLoading(false)
      console.log(`[${timestamp}] 🏁 translateGoal completed`);
    }
  }

  const handleContinue = () => {
    if (smartGoal) {
      console.log('Calling onComplete with smartGoal:', smartGoal);
      onComplete(smartGoal)
    }
  }

  const shouldShowChatOption = () => {
    if (!smartGoal) return false
    
    // Don't show chat if all criteria are at 90% or higher
    const allCriteriaHighConfidence = Object.values(smartGoal.criteria).every(criterion => 
      criterion.confidence >= 0.9
    )
    if (allCriteriaHighConfidence) return false
    
    // Show chat if overall confidence is low
    if (smartGoal.confidence < 0.7) return true
    
    // Show chat if any individual criteria has low confidence (less than 90%)
    const hasLowConfidence = Object.values(smartGoal.criteria).some(criterion => 
      criterion.confidence < 0.9
    )
    if (hasLowConfidence) return true
    
    // Show chat if there are clarification questions
    if (smartGoal.clarificationQuestions && smartGoal.clarificationQuestions.length > 0) return true
    
    // Show chat if there are missing criteria
    if (smartGoal.missingCriteria && smartGoal.missingCriteria.length > 0) return true
    
    return false
  }

  const shouldAutoAdvanceToMilestones = () => {
    if (!smartGoal) return false
    
    // Auto-advance if all criteria are at 90% or higher
    return Object.values(smartGoal.criteria).every(criterion => 
      criterion.confidence >= 0.9
    )
  }

  const handleStartChat = () => {
    setShowChat(true)
  }

  const handleGoalUpdate = (updatedGoal: Goal) => {
    setSmartGoal(updatedGoal)
  }

  const handleChatComplete = () => {
    setShowChat(false)
    setChatCompleted(true)
  }

  const handleRating = (value: number) => {
    setRating(value)
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Transforming Your Goal...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Our AI is analyzing your goal and converting it into a SMART format with specific, measurable criteria.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Translation Failed
          </h2>
          <p data-testid="error-message" className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={translateGoal}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }


  if (!smartGoal) {
    return null
  }

  // Always use side-by-side layout for chat-based refinement
  const useSideBySideLayout = true

  if (useSideBySideLayout) {
    return (
      <div data-testid="smart-goal-display" className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              SMART Goal Generated
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {shouldAutoAdvanceToMilestones()
              ? "🎯 Excellent! All SMART criteria are at 90% or higher. Your goal is ready for milestone planning."
              : showChat && !chatCompleted 
              ? "Working with AI to refine your SMART goal. The goal will update in real-time as we chat."
              : chatCompleted
              ? "Your SMART goal has been refined through our conversation. You can continue or restart the chat."
              : "Your SMART goal is ready for milestone planning."
            }
          </p>
        </div>

        {/* Layout - Full width when auto-advancing, side-by-side otherwise */}
        <div className={shouldAutoAdvanceToMilestones() ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
          {/* SMART Goal Display */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 data-testid="smart-goal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                Your SMART Goal
              </h3>
              {shouldAutoAdvanceToMilestones() && (
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>All criteria at 90%+</span>
                </div>
              )}
              {showChat && !shouldAutoAdvanceToMilestones() && (
                <div className="flex items-center space-x-1 text-sm text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                  <span>Updating in real-time</span>
                </div>
              )}
            </div>
            <SmartGoalViewer goal={smartGoal} />
            
            {/* High Confidence Success Message */}
            {shouldAutoAdvanceToMilestones() && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    🎉 Perfect SMART Goal!
                  </h4>
                  <p className="text-green-700 dark:text-green-300 mb-4">
                    All SMART criteria have achieved 90% or higher confidence. Your goal is well-defined and ready for milestone planning.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {smartGoal.criteria && Object.entries(smartGoal.criteria).map(([key, criterion]) => (
                      <div key={key} className="text-center">
                        <div className="text-xs font-medium text-green-700 dark:text-green-300 capitalize mb-1">
                          {key === 'timeBound' ? 'Time-bound' : key}
                        </div>
                        <div className="text-sm font-bold text-green-800 dark:text-green-200">
                          {Math.round(criterion.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress Summary - only show for chat sessions */}
            {(showChat || chatCompleted) && originalSmartGoal && !shouldAutoAdvanceToMilestones() && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
                  📊 Improvement Progress
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {smartGoal.criteria && Object.entries(smartGoal.criteria).map(([key, criterion]) => {
                    const originalCriterion = originalSmartGoal.criteria[key as keyof typeof originalSmartGoal.criteria]
                    const improvement = originalCriterion ? criterion.confidence - originalCriterion.confidence : 0
                    
                    return (
                      <div key={key} className="text-center">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300 capitalize mb-1">
                          {key === 'timeBound' ? 'Time-bound' : key}
                        </div>
                        <div className="text-sm font-bold text-blue-800 dark:text-blue-200">
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

          {/* Chat Interface - only show if not auto-advancing */}
          {!shouldAutoAdvanceToMilestones() && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI Clarification Assistant
                </h3>
              </div>
              
              {!chatCompleted ? (
                <ChatClarification
                  goal={smartGoal}
                  onGoalUpdate={handleGoalUpdate}
                  onComplete={handleChatComplete}
                  isVisible={true}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-96 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Chat Completed!
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                        Your SMART goal has been refined through our conversation. You can continue to milestones or restart the refinement chat.
                      </p>
                    </div>
                    {originalSmartGoal && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          🎯 <strong>Goal Improved!</strong> Confidence increased from {Math.round(originalSmartGoal.confidence * 100)}% to {Math.round(smartGoal.confidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <div className="flex space-x-2">
            <button
              onClick={translateGoal}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Regenerate Goal
            </button>
            
            {!shouldAutoAdvanceToMilestones() && !showChat && shouldShowChatOption() && (
              <button
                data-testid="refine-button"
                onClick={handleStartChat}
                className="flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Improve with AI Chat
              </button>
            )}
            
            {!shouldAutoAdvanceToMilestones() && chatCompleted && (
              <button
                onClick={handleStartChat}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Start New Chat Session
              </button>
            )}
            
            <button
              onClick={clearCachedGoalData}
              className="flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              🧹 Clear Cache
            </button>
          </div>

          <button
            data-testid="continue-button"
            onClick={handleContinue}
            className={`flex items-center px-6 py-2 text-base font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              shouldAutoAdvanceToMilestones() 
                ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Continue to Milestones
            <CheckCircle className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    )
  }

  // Original compact layout for high-confidence goals
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          SMART Goal Generated
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Your goal has been transformed into a SMART format with clear criteria.
        </p>
      </div>

      {/* Original vs SMART Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Original Goal
          </h3>
          <p className="text-gray-700 dark:text-gray-300 italic">
            "{originalGoal}"
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
            SMART Goal
          </h3>
          <p className="text-indigo-800 dark:text-indigo-200 font-medium">
            {smartGoal.title}
          </p>
          <p className="text-indigo-700 dark:text-indigo-300 mt-2 text-sm">
            {smartGoal.criteria.specific.value}
          </p>
        </div>
      </div>

      {/* SMART Criteria Breakdown */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          SMART Criteria Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Specific
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              {smartGoal.criteria.specific.value}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Measurable
            </h4>
            <p className="text-green-800 dark:text-green-200 text-sm">
              {smartGoal.criteria.measurable.value}
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Achievable
            </h4>
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              {smartGoal.criteria.achievable.value}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Relevant
            </h4>
            <p className="text-purple-800 dark:text-purple-200 text-sm">
              {smartGoal.criteria.relevant.value}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Time-bound
            </h4>
            <p className="text-red-800 dark:text-red-200 text-sm">
              {smartGoal.criteria.timeBound.value}
            </p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
              Missing Criteria
            </h4>
            <ul className="list-disc list-inside text-indigo-800 dark:text-indigo-200 text-sm">
              {smartGoal.missingCriteria.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Clarification Questions */}
      {smartGoal.clarificationQuestions.length > 0 && (
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
            Clarification Needed
          </h3>
          <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-200">
            {smartGoal.clarificationQuestions.map((question, index) => (
              <li key={index} className="mb-2">
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence Score */}
      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
          Overall Confidence
        </h4>
        <p className="text-green-800 dark:text-green-200 text-2xl font-bold">
          {(smartGoal.confidence * 100).toFixed(0)}%
        </p>
      </div>

      {/* Feedback Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Rate the SMART Goal Quality
        </h4>
        <div className="flex items-center space-x-2 mb-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRating(value)}
              className={`p-1 rounded ${
                rating >= value
                  ? 'text-yellow-500'
                  : 'text-gray-300 hover:text-yellow-400'
              }`}
            >
              <Star className="w-6 h-6 fill-current" />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
            {rating > 0 ? `${rating}/5` : 'Click to rate'}
          </span>
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Any feedback on the SMART goal translation? (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <button
            onClick={translateGoal}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Regenerate
          </button>
          
          <button
            onClick={clearCachedGoalData}
            className="flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            🧹 Clear Cache
          </button>
        </div>

        <button
          onClick={handleContinue}
          className="flex items-center px-6 py-2 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue to Milestones
          <CheckCircle className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}