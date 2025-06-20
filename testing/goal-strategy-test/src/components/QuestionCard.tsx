import { useState } from 'react'
import { Calendar, Hash, Type, List, Sliders, HelpCircle } from 'lucide-react'
import { ClarificationQuestion } from '../types'

interface QuestionCardProps {
  question: ClarificationQuestion
  onAnswer: (answer: string | number | Date, confidence?: number) => void
  existingAnswer?: string | number | Date
}

export default function QuestionCard({ question, onAnswer, existingAnswer }: QuestionCardProps) {
  const [currentAnswer, setCurrentAnswer] = useState<string | number | Date>(existingAnswer || '')
  const [confidence, setConfidence] = useState(0.8)

  const getQuestionIcon = () => {
    switch (question.type) {
      case 'text': return <Type className="w-5 h-5" />
      case 'number': return <Hash className="w-5 h-5" />
      case 'date': return <Calendar className="w-5 h-5" />
      case 'choice': return <List className="w-5 h-5" />
      case 'range': return <Sliders className="w-5 h-5" />
      default: return <HelpCircle className="w-5 h-5" />
    }
  }

  const handleSubmit = () => {
    if (currentAnswer !== '' && currentAnswer !== null && currentAnswer !== undefined) {
      onAnswer(currentAnswer, confidence)
    }
  }

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <textarea
              value={String(currentAnswer)}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={question.placeholder || 'Enter your answer...'}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
            />
          </div>
        )

      case 'number':
        return (
          <div className="space-y-4">
            <input
              type="number"
              value={Number(currentAnswer) || ''}
              onChange={(e) => setCurrentAnswer(Number(e.target.value))}
              placeholder={question.placeholder || 'Enter a number...'}
              min={question.validation?.min}
              max={question.validation?.max}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {question.validation && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {question.validation.min !== undefined && question.validation.max !== undefined
                  ? `Range: ${question.validation.min} - ${question.validation.max}`
                  : question.validation.min !== undefined
                  ? `Minimum: ${question.validation.min}`
                  : question.validation.max !== undefined
                  ? `Maximum: ${question.validation.max}`
                  : ''
                }
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <div className="space-y-4">
            <input
              type="date"
              value={currentAnswer instanceof Date ? currentAnswer.toISOString().split('T')[0] : String(currentAnswer)}
              onChange={(e) => setCurrentAnswer(new Date(e.target.value))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        )

      case 'choice':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 'range':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="range"
                min={question.validation?.min || 0}
                max={question.validation?.max || 100}
                value={Number(currentAnswer) || question.validation?.min || 0}
                onChange={(e) => setCurrentAnswer(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{question.validation?.min || 0}</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {Number(currentAnswer) || question.validation?.min || 0}
                </span>
                <span>{question.validation?.max || 100}</span>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-gray-500 dark:text-gray-400">
            Unsupported question type: {question.type}
          </div>
        )
    }
  }

  const isAnswerValid = () => {
    if (currentAnswer === '' || currentAnswer === null || currentAnswer === undefined) {
      return false
    }

    if (question.type === 'number' && question.validation) {
      const num = Number(currentAnswer)
      if (question.validation.min !== undefined && num < question.validation.min) return false
      if (question.validation.max !== undefined && num > question.validation.max) return false
    }

    return true
  }

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          {getQuestionIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {question.question}
          </h3>
          {question.advice && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> {question.advice}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Question Input */}
      <div className="ml-13">
        {renderInput()}
      </div>

      {/* Confidence Slider */}
      <div className="ml-13 space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          How confident are you in this answer?
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Not sure</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {Math.round(confidence * 100)}% confident
            </span>
            <span>Very sure</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="ml-13">
        <button
          onClick={handleSubmit}
          disabled={!isAnswerValid()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {question.type === 'choice' ? 'Select This Option' : 'Continue'}
        </button>
      </div>
    </div>
  )
}