import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Calendar, Star } from 'lucide-react'
import { Goal, Milestone } from '../types'
import goalAPI from '../services/api'

interface MilestonesDisplayProps {
  goal: Goal
  onComplete: (milestones: Milestone[]) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function MilestonesDisplay({ 
  goal, 
  onComplete, 
  setIsLoading, 
  isLoading 
}: MilestonesDisplayProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')

  useEffect(() => {
    generateMilestones()
  }, [goal.id])

  const generateMilestones = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const generatedMilestones = await goalAPI.generateMilestones(goal.id)
      setMilestones(generatedMilestones)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate milestones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (milestones.length > 0) {
      onComplete(milestones)
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
            Generating Milestones...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Breaking down your SMART goal into achievable milestones with clear success criteria.
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
            Milestone Generation Failed
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={generateMilestones}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Milestones Generated
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Your goal has been broken down into {milestones.length} achievable milestones.
        </p>
      </div>

      {/* Goal Summary */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
          Goal: {goal.title}
        </h3>
        <p className="text-indigo-800 dark:text-indigo-200 text-sm">
          Target: {goal.targetValue} {goal.unit} by {new Date(goal.deadline).toLocaleDateString()}
        </p>
      </div>

      {/* Milestones List */}
      <div className="space-y-4 mb-8">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                    Milestone {index + 1}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Due: {new Date(milestone.targetDate).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {milestone.title}
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                  {milestone.description}
                </p>
                
                {/* Success Criteria */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Success Criteria:
                  </h5>
                  <ul className="list-disc list-inside space-y-1">
                    {milestone.successCriteria.map((criteria, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feedback Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Rate the Milestone Quality
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
          placeholder="How relevant and achievable are these milestones? (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={generateMilestones}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Regenerate Milestones
        </button>

        <button
          onClick={handleContinue}
          className="flex items-center px-6 py-2 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue to Work Breakdown
          <CheckCircle className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}