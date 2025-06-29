import { Goal } from '../types'
import { Target, BarChart, CheckCircle, Compass, Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface InteractiveGoalDisplayProps {
  goal: Goal
  currentComponent?: string
}

const SMART_COMPONENTS = [
  { key: 'specific', label: 'Specific', icon: Target, color: 'blue' },
  { key: 'measurable', label: 'Measurable', icon: BarChart, color: 'green' },
  { key: 'achievable', label: 'Achievable', icon: CheckCircle, color: 'yellow' },
  { key: 'relevant', label: 'Relevant', icon: Compass, color: 'purple' },
  { key: 'timeBound', label: 'Time-bound', icon: Clock, color: 'red' }
]

export default function InteractiveGoalDisplay({ goal, currentComponent }: InteractiveGoalDisplayProps) {
  const overallProgress = SMART_COMPONENTS.reduce((acc, comp) => {
    const criterion = goal.criteria[comp.key as keyof typeof goal.criteria]
    return acc + (criterion.confidence > 0.5 ? 1 : 0)
  }, 0) / SMART_COMPONENTS.length * 100

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Your SMART Goal Progress</h3>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-lg font-semibold">{Math.round(overallProgress)}%</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-white h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        {/* Current Goal Title */}
        <div className="mt-4">
          <p className="text-sm opacity-90 mb-1">Working on:</p>
          <h4 className="text-lg font-medium">{goal.title}</h4>
        </div>
      </div>

      {/* SMART Components Status */}
      <div className="p-6">
        <div className="space-y-4">
          {SMART_COMPONENTS.map((component) => {
            const criterion = goal.criteria[component.key as keyof typeof goal.criteria]
            const isComplete = criterion.confidence > 0.7
            const isInProgress = currentComponent === component.key
            const hasContent = criterion.value && criterion.value.length > 0
            
            return (
              <div 
                key={component.key}
                className={`border rounded-lg p-4 transition-all ${
                  isInProgress 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                    : isComplete
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isComplete 
                      ? 'bg-green-500 text-white'
                      : isInProgress
                      ? 'bg-indigo-500 text-white animate-pulse'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    <component.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-gray-900 dark:text-white">
                        {component.label}
                      </h5>
                      {isComplete && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {isInProgress && (
                        <div className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full">
                          In Progress
                        </div>
                      )}
                    </div>
                    
                    {hasContent ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {criterion.value}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {isInProgress ? 'Currently working on this...' : 'Not yet defined'}
                      </p>
                    )}
                    
                    {/* Special display for measurable metrics */}
                    {component.key === 'measurable' && 'metrics' in criterion && criterion.metrics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {criterion.metrics.map((metric, idx) => (
                          <span 
                            key={idx}
                            className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded"
                          >
                            {metric}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Confidence indicator */}
                    {hasContent && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              criterion.confidence > 0.7 
                                ? 'bg-green-500' 
                                : criterion.confidence > 0.4
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${criterion.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(criterion.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Tips Section */}
        {overallProgress < 100 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Next steps:</strong> Continue through the interactive chat to complete all SMART components. 
                  Each component you define makes your goal more actionable and achievable!
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Completion Message */}
        {overallProgress === 100 && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>Excellent!</strong> Your goal now has all SMART components defined. 
                  It's clear, measurable, and ready for action!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}