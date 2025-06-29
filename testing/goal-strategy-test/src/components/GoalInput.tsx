import { useState } from 'react'
import { Send, Lightbulb, MessageCircle, Target, TrendingUp } from 'lucide-react'

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

const smartBenefits = [
  { icon: Target, text: "Transform vague ideas into clear objectives" },
  { icon: MessageCircle, text: "Interactive guidance through each SMART component" },
  { icon: TrendingUp, text: "Get personalized examples and tips" }
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
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Let's Build Your SMART Goal Together
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
          Start with any idea, and I'll guide you through making it Specific, Measurable, Achievable, Relevant, and Time-bound.
        </p>
        
        {/* Benefits */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6 mb-8">
          {smartBenefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <benefit.icon className="w-5 h-5 text-indigo-600" />
              <span>{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What would you like to achieve?
          </label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Start simple! For example: 'I want to get better at programming' or 'I want to be healthier'..."
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            rows={4}
            disabled={isLoading}
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Don't worry about making it perfect - that's what the interactive process is for!
          </p>
        </div>

        <button
          type="submit"
          disabled={!goal.trim() || isLoading}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Starting Interactive Session...
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Building My SMART Goal
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
              className="text-left p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:border-indigo-400 dark:hover:border-indigo-600 group"
              disabled={isLoading}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                "{exampleGoal}"
              </span>
            </button>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 text-center">
            💡 <strong>Pro tip:</strong> The simpler your starting goal, the better! Our interactive process will help you add all the important details.
          </p>
        </div>
      </div>
    </div>
  )
}