import { useState, useEffect } from 'react'
import { MessageCircle, ArrowRight, ArrowLeft, CheckCircle, X } from 'lucide-react'
import { ClarificationQuestion, ClarificationResponse, Goal } from '../types'
import QuestionCard from './QuestionCard'

interface ClarificationDialogProps {
  goal: Goal
  questions: ClarificationQuestion[]
  onComplete: (responses: ClarificationResponse[], updatedGoal: Goal) => void
  onSkip: () => void
  isVisible: boolean
}

export default function ClarificationDialog({
  goal,
  questions,
  onComplete,
  onSkip,
  isVisible
}: ClarificationDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<ClarificationResponse[]>([])
  const [isAnimating, setIsAnimating] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  useEffect(() => {
    if (isVisible) {
      setCurrentQuestionIndex(0)
      setResponses([])
    }
  }, [isVisible])

  const handleAnswer = (answer: string | number | Date, confidence: number = 0.8) => {
    const response: ClarificationResponse = {
      questionId: currentQuestion.id,
      answer,
      confidence
    }

    const updatedResponses = [...responses, response]
    setResponses(updatedResponses)

    if (isLastQuestion) {
      // Complete the clarification process
      const updatedGoal = applyResponsesToGoal(goal, updatedResponses)
      onComplete(updatedResponses, updatedGoal)
    } else {
      // Move to next question with animation
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1)
        setIsAnimating(false)
      }, 300)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev - 1)
        // Remove the last response
        setResponses(prev => prev.slice(0, -1))
        setIsAnimating(false)
      }, 300)
    }
  }

  const applyResponsesToGoal = (originalGoal: Goal, responses: ClarificationResponse[]): Goal => {
    // This is a simplified implementation - in a real app, this would be more sophisticated
    const updatedGoal = { ...originalGoal }
    
    responses.forEach(response => {
      const question = questions.find(q => q.id === response.questionId)
      if (!question) return

      const answerStr = String(response.answer)
      
      switch (question.smartCriterion) {
        case 'specific':
          updatedGoal.criteria.specific.value = `${updatedGoal.criteria.specific.value} - ${answerStr}`
          updatedGoal.criteria.specific.confidence = Math.min(1, updatedGoal.criteria.specific.confidence + 0.1)
          break
        case 'measurable':
          if (question.type === 'number') {
            updatedGoal.targetValue = Number(response.answer)
          }
          updatedGoal.criteria.measurable.value = `${updatedGoal.criteria.measurable.value} - Target: ${answerStr}`
          updatedGoal.criteria.measurable.confidence = Math.min(1, updatedGoal.criteria.measurable.confidence + 0.1)
          break
        case 'timeBound':
          if (question.type === 'date') {
            updatedGoal.deadline = String(response.answer)
          }
          updatedGoal.criteria.timeBound.value = `Complete by ${answerStr}`
          updatedGoal.criteria.timeBound.confidence = Math.min(1, updatedGoal.criteria.timeBound.confidence + 0.1)
          break
        case 'achievable':
          updatedGoal.criteria.achievable.value = `${updatedGoal.criteria.achievable.value} - ${answerStr}`
          updatedGoal.criteria.achievable.confidence = Math.min(1, updatedGoal.criteria.achievable.confidence + 0.1)
          break
        case 'relevant':
          updatedGoal.criteria.relevant.value = `${updatedGoal.criteria.relevant.value} - ${answerStr}`
          updatedGoal.criteria.relevant.confidence = Math.min(1, updatedGoal.criteria.relevant.confidence + 0.1)
          break
      }
    })

    // Update overall confidence
    const avgConfidence = Object.values(updatedGoal.criteria).reduce((sum, criterion) => sum + criterion.confidence, 0) / 5
    updatedGoal.confidence = avgConfidence

    return updatedGoal
  }

  if (!isVisible || questions.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Let's Improve Your SMART Goal</h2>
            </div>
            <button
              onClick={onSkip}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-2 opacity-90">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Question Content */}
        <div className="p-6">
          <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                onAnswer={handleAnswer}
                existingAnswer={responses.find(r => r.questionId === currentQuestion.id)?.answer}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index < currentQuestionIndex
                    ? 'bg-green-500'
                    : index === currentQuestionIndex
                    ? 'bg-indigo-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={onSkip}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <span>Skip All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}