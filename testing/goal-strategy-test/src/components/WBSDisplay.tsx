import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, List, Star, ChevronRight, ChevronDown } from 'lucide-react'
import { Milestone, WBSTask } from '../types'
import goalAPI from '../services/api'

interface WBSDisplayProps {
  milestones: Milestone[]
  onComplete: (tasks: WBSTask[]) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function WBSDisplay({ 
  milestones, 
  onComplete, 
  setIsLoading, 
  isLoading 
}: WBSDisplayProps) {
  const [wbsTasks, setWbsTasks] = useState<WBSTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())

  useEffect(() => {
    generateWBS()
  }, [milestones])

  const generateWBS = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const milestoneIds = milestones.map(m => m.id)
      const tasks = await goalAPI.generateWBSForMilestones(milestoneIds)
      setWbsTasks(tasks)
      // Expand all milestones by default
      setExpandedMilestones(new Set(milestoneIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate work breakdown structure')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (wbsTasks.length > 0) {
      onComplete(wbsTasks)
    }
  }

  const handleRating = (value: number) => {
    setRating(value)
  }

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

  const getTasksByMilestone = (milestoneId: string) => {
    return wbsTasks.filter(task => task.milestoneId === milestoneId)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Creating Work Breakdown Structure...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Breaking down milestones into detailed, actionable tasks with clear completion criteria.
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
            WBS Generation Failed
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={generateWBS}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const totalTasks = wbsTasks.length
  const totalEstimatedHours = wbsTasks.reduce((sum, task) => sum + task.estimatedHours, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <List className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Work Breakdown Structure
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {totalTasks} tasks generated with {totalEstimatedHours.toFixed(1)} estimated hours total.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalTasks}</div>
          <div className="text-sm text-blue-800 dark:text-blue-200">Total Tasks</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalEstimatedHours.toFixed(1)}h
          </div>
          <div className="text-sm text-green-800 dark:text-green-200">Estimated Hours</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {milestones.length}
          </div>
          <div className="text-sm text-purple-800 dark:text-purple-200">Milestones</div>
        </div>
      </div>

      {/* WBS by Milestone */}
      <div className="space-y-4 mb-8">
        {milestones.map((milestone) => {
          const milestoneTasks = getTasksByMilestone(milestone.id)
          const isExpanded = expandedMilestones.has(milestone.id)
          const milestoneHours = milestoneTasks.reduce((sum, task) => sum + task.estimatedHours, 0)

          return (
            <div key={milestone.id} className="border border-gray-200 dark:border-gray-600 rounded-lg">
              {/* Milestone Header */}
              <button
                onClick={() => toggleMilestone(milestone.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
              >
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 mr-3" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 mr-3" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {milestoneTasks.length} tasks • {milestoneHours.toFixed(1)} hours
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Due: {new Date(milestone.targetDate).toLocaleDateString()}
                </div>
              </button>

              {/* Tasks List */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                  <div className="space-y-3">
                    {milestoneTasks.map((task) => (
                      <div key={task.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {task.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {task.estimatedHours}h
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {task.description}
                        </p>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>Completion Criteria:</strong> {task.completionCriteria}
                        </div>
                      </div>
                    ))}
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
          Rate the Task Breakdown Quality
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
          placeholder="Are the tasks well-defined and appropriately sized? (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={generateWBS}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Regenerate WBS
        </button>

        <button
          onClick={handleContinue}
          className="flex items-center px-6 py-2 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue to Estimation
          <CheckCircle className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}
