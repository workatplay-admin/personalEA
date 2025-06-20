import { useState } from 'react'
import { Star, Send, RotateCcw } from 'lucide-react'
import { Goal, Milestone, WBSTask, TaskEstimation, FeedbackData } from '../types'

interface FeedbackFormProps {
  originalGoal: string
  smartGoal: Goal | null
  milestones: Milestone[]
  wbsTasks: WBSTask[]
  estimations: TaskEstimation[]
  onReset: () => void
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  originalGoal,
  smartGoal,
  milestones,
  wbsTasks,
  estimations,
  onReset
}) => {
  const [feedback, setFeedback] = useState<Partial<FeedbackData>>({
    sessionId: `session-${Date.now()}`,
    originalGoal,
    smartGoalRating: 0,
    smartGoalFeedback: '',
    milestonesRating: 0,
    milestonesFeedback: '',
    wbsRating: 0,
    wbsFeedback: '',
    estimationRating: 0,
    estimationFeedback: '',
    overallRating: 0,
    overallFeedback: '',
    wouldUseAgain: false,
    improvements: '',
    timestamp: new Date().toISOString()
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const StarRating = ({ rating, onRatingChange, label }: {
    rating: number
    onRatingChange: (rating: number) => void
    label: string
  }) => (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`p-1 rounded ${
              star <= rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
      </div>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Feedback submitted:', feedback)
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setFeedback({
      sessionId: `session-${Date.now()}`,
      originalGoal,
      smartGoalRating: 0,
      smartGoalFeedback: '',
      milestonesRating: 0,
      milestonesFeedback: '',
      wbsRating: 0,
      wbsFeedback: '',
      estimationRating: 0,
      estimationFeedback: '',
      overallRating: 0,
      overallFeedback: '',
      wouldUseAgain: false,
      improvements: '',
      timestamp: new Date().toISOString()
    })
    onReset()
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <Send className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Thank you for your feedback!
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Your feedback helps us improve the Goal & Strategy Service.
          </p>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start New Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Workflow Complete! Please Share Your Feedback
        </h3>
        <p className="text-sm text-gray-500">
          Help us improve by rating each step of the goal breakdown process.
        </p>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Workflow Summary</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div><strong>Original Goal:</strong> {originalGoal}</div>
          <div><strong>SMART Goal:</strong> {smartGoal?.title || 'N/A'}</div>
          <div><strong>Milestones Generated:</strong> {milestones.length}</div>
          <div><strong>Tasks Created:</strong> {wbsTasks.length}</div>
          <div><strong>Tasks Estimated:</strong> {estimations.length}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <StarRating
            rating={feedback.smartGoalRating || 0}
            onRatingChange={(rating) => setFeedback(prev => ({ ...prev, smartGoalRating: rating }))}
            label="How well did the AI convert your goal to a SMART goal?"
          />
          <textarea
            value={feedback.smartGoalFeedback || ''}
            onChange={(e) => setFeedback(prev => ({ ...prev, smartGoalFeedback: e.target.value }))}
            placeholder="Any specific feedback about the SMART goal conversion?"
            className="mt-3 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows={2}
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FeedbackForm