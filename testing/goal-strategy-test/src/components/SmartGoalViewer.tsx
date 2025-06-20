import { CheckCircle, AlertTriangle, Target } from 'lucide-react'
import { Goal } from '../types'

interface SmartGoalViewerProps {
  goal: Goal
}

export default function SmartGoalViewer({ goal }: SmartGoalViewerProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Goal Header */}
      <div className="flex items-start space-x-3 mb-6">
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
          <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {goal.title}
          </h2>
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm border ${getConfidenceColor(goal.confidence)}`}>
            {getConfidenceIcon(goal.confidence)}
            <span>
              {Math.round(goal.confidence * 100)}% Confidence
            </span>
          </div>
        </div>
      </div>

      {/* SMART Criteria Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              Specific
            </h4>
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(goal.criteria.specific.confidence)}`}>
              {Math.round(goal.criteria.specific.confidence * 100)}%
            </span>
          </div>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            {goal.criteria.specific.value}
          </p>
          {goal.criteria.specific.missing && goal.criteria.specific.missing.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">Needs clarification:</p>
              <ul className="text-xs text-blue-600 dark:text-blue-300 list-disc list-inside">
                {goal.criteria.specific.missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-green-900 dark:text-green-100">
              Measurable
            </h4>
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(goal.criteria.measurable.confidence)}`}>
              {Math.round(goal.criteria.measurable.confidence * 100)}%
            </span>
          </div>
          <p className="text-green-800 dark:text-green-200 text-sm">
            {goal.criteria.measurable.value}
          </p>
          {goal.criteria.measurable.missing && goal.criteria.measurable.missing.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-green-600 dark:text-green-300 font-medium">Needs clarification:</p>
              <ul className="text-xs text-green-600 dark:text-green-300 list-disc list-inside">
                {goal.criteria.measurable.missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
              Achievable
            </h4>
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(goal.criteria.achievable.confidence)}`}>
              {Math.round(goal.criteria.achievable.confidence * 100)}%
            </span>
          </div>
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            {goal.criteria.achievable.value}
          </p>
          {goal.criteria.achievable.missing && goal.criteria.achievable.missing.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-300 font-medium">Needs clarification:</p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-300 list-disc list-inside">
                {goal.criteria.achievable.missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100">
              Relevant
            </h4>
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(goal.criteria.relevant.confidence)}`}>
              {Math.round(goal.criteria.relevant.confidence * 100)}%
            </span>
          </div>
          <p className="text-purple-800 dark:text-purple-200 text-sm">
            {goal.criteria.relevant.value}
          </p>
          {goal.criteria.relevant.missing && goal.criteria.relevant.missing.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-purple-600 dark:text-purple-300 font-medium">Needs clarification:</p>
              <ul className="text-xs text-purple-600 dark:text-purple-300 list-disc list-inside">
                {goal.criteria.relevant.missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-red-900 dark:text-red-100">
              Time-bound
            </h4>
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(goal.criteria.timeBound.confidence)}`}>
              {Math.round(goal.criteria.timeBound.confidence * 100)}%
            </span>
          </div>
          <p className="text-red-800 dark:text-red-200 text-sm">
            {goal.criteria.timeBound.value}
          </p>
          {goal.criteria.timeBound.missing && goal.criteria.timeBound.missing.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-red-600 dark:text-red-300 font-medium">Needs clarification:</p>
              <ul className="text-xs text-red-600 dark:text-red-300 list-disc list-inside">
                {goal.criteria.timeBound.missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Overall Status */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Status
          </h4>
          <div className="space-y-2">
            {goal.missingCriteria.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Missing:</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {goal.missingCriteria.join(', ')}
                </p>
              </div>
            )}
            {goal.targetValue && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Target:</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {goal.targetValue} {goal.unit || ''}
                </p>
              </div>
            )}
            {goal.deadline && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Deadline:</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {goal.deadline}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clarification Questions */}
      {goal.clarificationQuestions.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Clarification Needed
          </h4>
          <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
            {goal.clarificationQuestions.map((question, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-600 dark:text-amber-400 mr-2">•</span>
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}