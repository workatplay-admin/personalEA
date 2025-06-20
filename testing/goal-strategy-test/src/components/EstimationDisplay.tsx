import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Star, BarChart3 } from 'lucide-react'
import { WBSTask, TaskEstimation } from '../types'
import goalAPI from '../services/api'

interface EstimationDisplayProps {
  tasks: WBSTask[]
  onComplete: (estimations: TaskEstimation[]) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function EstimationDisplay({ 
  tasks, 
  onComplete, 
  setIsLoading, 
  isLoading 
}: EstimationDisplayProps) {
  const [estimations, setEstimations] = useState<TaskEstimation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    generateEstimations()
  }, [tasks])

  const generateEstimations = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const taskIds = tasks.map(t => t.id)
      const taskEstimations = await goalAPI.estimateTasks(taskIds)
      setEstimations(taskEstimations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate task estimations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    if (estimations.length > 0) {
      onComplete(estimations)
    }
  }

  const handleRating = (value: number) => {
    setRating(value)
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const getTaskById = (taskId: string) => {
    return tasks.find(task => task.id === taskId)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400'
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Generating Task Estimations...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Using multiple estimation methods to provide accurate time and effort predictions.
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
            Estimation Failed
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={generateEstimations}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const totalEstimatedHours = estimations.reduce((sum, est) => sum + est.finalEstimate.hours, 0)
  const averageConfidence = estimations.reduce((sum, est) => sum + est.finalEstimate.confidence, 0) / estimations.length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <BarChart3 className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Task Estimations Complete
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Multi-method estimation analysis for {estimations.length} tasks.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalEstimatedHours.toFixed(1)}h
          </div>
          <div className="text-sm text-purple-800 dark:text-purple-200">Total Estimated</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <div className={`text-2xl font-bold ${getConfidenceColor(averageConfidence)}`}>
            {averageConfidence.toFixed(0)}%
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200">Avg Confidence</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {Math.ceil(totalEstimatedHours / 8)}
          </div>
          <div className="text-sm text-green-800 dark:text-green-200">Working Days</div>
        </div>
      </div>

      {/* Estimations List */}
      <div className="space-y-4 mb-8">
        {estimations.map((estimation) => {
          const task = getTaskById(estimation.taskId)
          const isExpanded = expandedTasks.has(estimation.taskId)

          if (!task) return null

          return (
            <div key={estimation.taskId} className="border border-gray-200 dark:border-gray-600 rounded-lg">
              <button
                onClick={() => toggleTask(estimation.taskId)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {estimation.finalEstimate.hours.toFixed(1)}h
                  </div>
                  <div className={`text-sm ${getConfidenceColor(estimation.finalEstimate.confidence)}`}>
                    {estimation.finalEstimate.confidence.toFixed(0)}% confidence
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Expert Judgment */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Expert Judgment
                      </h4>
                      <div className="text-blue-800 dark:text-blue-200">
                        <div className="text-lg font-bold">{estimation.expertJudgment.estimate}h</div>
                        <div className="text-sm">{estimation.expertJudgment.confidence}% confidence</div>
                        <div className="text-xs mt-1">{estimation.expertJudgment.reasoning}</div>
                      </div>
                    </div>

                    {/* Three-Point PERT */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        Three-Point PERT
                      </h4>
                      <div className="text-green-800 dark:text-green-200">
                        <div className="text-lg font-bold">{estimation.threePoint.expected.toFixed(1)}h</div>
                        <div className="text-xs">
                          O: {estimation.threePoint.optimistic}h |
                          M: {estimation.threePoint.mostLikely}h |
                          P: {estimation.threePoint.pessimistic}h
                        </div>
                      </div>
                    </div>

                    {/* Analogy Based */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                        Analogy Based
                      </h4>
                      <div className="text-yellow-800 dark:text-yellow-200">
                        <div className="text-lg font-bold">{estimation.analogyBased.estimate}h</div>
                        <div className="text-sm">{estimation.analogyBased.confidence}% confidence</div>
                        <div className="text-xs mt-1">Similar: {estimation.analogyBased.similarTask}</div>
                      </div>
                    </div>
                  </div>

                  {/* Uncertainty Range */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Uncertainty Range
                    </h4>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Min: {estimation.finalEstimate.uncertaintyRange.min.toFixed(1)}h
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(estimation.finalEstimate.confidence)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Max: {estimation.finalEstimate.uncertaintyRange.max.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Feedback Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Rate the Estimation Quality
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
          placeholder="How accurate do these time estimates seem? (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={generateEstimations}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Regenerate Estimations
        </button>

        <button
          onClick={handleComplete}
          className="flex items-center px-6 py-2 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Complete Workflow
          <CheckCircle className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}