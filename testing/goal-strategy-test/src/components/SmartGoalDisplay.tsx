import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Edit3, Star } from 'lucide-react'
import { Goal } from '../types'
import goalAPI from '../services/api'

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

  useEffect(() => {
    translateGoal()
  }, [originalGoal])

  const translateGoal = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const goal = await goalAPI.translateToSmart(originalGoal)
      setSmartGoal(goal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate goal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (smartGoal) {
      onComplete(smartGoal)
    }
  }

  const handleRating = (value: number) => {
    setRating(value)
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
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
            {smartGoal.description}
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
              {smartGoal.specific}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Measurable
            </h4>
            <p className="text-green-800 dark:text-green-200 text-sm">
              {smartGoal.measurable}
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Achievable
            </h4>
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              {smartGoal.achievable}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Relevant
            </h4>
            <p className="text-purple-800 dark:text-purple-200 text-sm">
              {smartGoal.relevant}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Time-bound
            </h4>
            <p className="text-red-800 dark:text-red-200 text-sm">
              {smartGoal.timeBound}
            </p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
              Success Metric
            </h4>
            <p className="text-indigo-800 dark:text-indigo-200 text-sm">
              {smartGoal.successMetric}: {smartGoal.targetValue} {smartGoal.unit}
            </p>
          </div>
        </div>
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
        <button
          onClick={translateGoal}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Regenerate
        </button>

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