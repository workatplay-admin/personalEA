import { useState } from 'react'
import { Send, Lightbulb } from 'lucide-react'

interface GoalInputProps {
  onSubmit: (goal: string) => void
  isLoading: boolean
}

const exampleGoals = [
  "I want to get promoted to senior developer",
  "I want to lose weight and get fit",
  "Launch a successful online course",
  "Start a tech consulting business while maintaining work-life balance",
  "Learn machine learning and build an AI project",
  "Save money for a house down payment"
]

export default function GoalInput({ onSubmit, isLoading }: GoalInputProps) {
  const [goal, setGoal] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (goal.trim()) {
      onSubmit(goal.trim())
    }
  }

  const handleExampleClick = (exampleGoal: string) => {
    setGoal(exampleGoal)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What's your goal?
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Enter any goal - vague or specific. Our AI will help transform it into a SMART goal with actionable steps.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Goal
          </label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., I want to get better at programming..."
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            rows={4}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={!goal.trim() || isLoading}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Transform into SMART Goal
            </>
          )}
        </button>
      </form>

      {/* Example Goals */}
      <div className="mt-8">
        <div className="flex items-center mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Need inspiration? Try these examples:
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleGoals.map((exampleGoal, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(exampleGoal)}
              className="text-left p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                "{exampleGoal}"
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}