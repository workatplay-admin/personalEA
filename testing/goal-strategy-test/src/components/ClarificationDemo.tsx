import { useState } from 'react'
import { MessageSquare, Target } from 'lucide-react'
import { Goal, ClarificationQuestion, ClarificationResponse } from '../types'
import ClarificationDialog from './ClarificationDialog'
import SmartGoalViewer from './SmartGoalViewer'

// Sample goal with low confidence scores to trigger clarification
const sampleGoal: Goal = {
  id: 'demo-goal-1',
  title: 'Improve my fitness',
  targetValue: undefined,
  unit: undefined,
  deadline: undefined,
  criteria: {
    specific: {
      value: 'Get in better shape',
      confidence: 0.4,
      missing: ['What specific fitness aspect?', 'What does "better shape" mean?']
    },
    measurable: {
      value: 'Feel healthier',
      confidence: 0.3,
      metrics: [],
      missing: ['How will you measure progress?', 'What specific metrics?']
    },
    achievable: {
      value: 'Should be doable',
      confidence: 0.5,
      missing: ['What resources do you have?', 'What constraints exist?']
    },
    relevant: {
      value: 'Important for my health',
      confidence: 0.6,
      missing: ['Why is this important now?', 'How does it align with other goals?']
    },
    timeBound: {
      value: 'Sometime this year',
      confidence: 0.2,
      deadline: undefined,
      missing: ['What is the specific deadline?', 'What are the milestones?']
    }
  },
  missingCriteria: ['specific', 'measurable', 'timeBound'],
  clarificationQuestions: [
    'What specific aspect of fitness do you want to improve?',
    'How will you measure your progress?',
    'When do you want to achieve this goal?'
  ],
  confidence: 0.4,
  correlation_id: 'demo-session'
}

// Sample clarification questions
const sampleQuestions: ClarificationQuestion[] = [
  {
    id: 'q1',
    type: 'choice',
    question: 'What specific aspect of fitness do you want to improve?',
    advice: 'Being specific helps create a focused plan. Choose the area that matters most to you right now.',
    options: [
      'Cardiovascular endurance (running, cycling)',
      'Strength training (muscle building)',
      'Weight loss',
      'Flexibility and mobility',
      'Overall general fitness'
    ],
    validation: { required: true },
    smartCriterion: 'specific'
  },
  {
    id: 'q2',
    type: 'number',
    question: 'How many days per week can you realistically commit to exercise?',
    advice: 'Start with what you can consistently maintain. It\'s better to do 3 days consistently than plan for 7 and only do 1.',
    placeholder: 'Enter number of days',
    validation: { required: true, min: 1, max: 7 },
    smartCriterion: 'achievable'
  },
  {
    id: 'q3',
    type: 'choice',
    question: 'How will you measure your progress?',
    advice: 'Choose metrics that you can easily track and that align with your specific fitness goal.',
    options: [
      'Weight on scale',
      'Body measurements (waist, arms, etc.)',
      'Performance metrics (distance, reps, time)',
      'How I feel (energy, strength)',
      'Photos/visual progress'
    ],
    validation: { required: true },
    smartCriterion: 'measurable'
  },
  {
    id: 'q4',
    type: 'date',
    question: 'When do you want to achieve this fitness goal?',
    advice: 'Set a realistic deadline that gives you enough time to see meaningful progress. Most fitness goals show results in 8-12 weeks.',
    validation: { required: true },
    smartCriterion: 'timeBound'
  },
  {
    id: 'q5',
    type: 'range',
    question: 'On a scale of 1-10, how important is this goal to you right now?',
    advice: 'Higher importance usually leads to better commitment. If it\'s below 7, consider what would make it more important or choose a different goal.',
    validation: { required: true, min: 1, max: 10 },
    smartCriterion: 'relevant'
  }
]

export default function ClarificationDemo() {
  const [currentGoal, setCurrentGoal] = useState<Goal>(sampleGoal)
  const [showDialog, setShowDialog] = useState(false)
  const [completedResponses, setCompletedResponses] = useState<ClarificationResponse[]>([])

  const handleStartClarification = () => {
    setShowDialog(true)
  }

  const handleClarificationComplete = (responses: ClarificationResponse[], updatedGoal: Goal) => {
    setCompletedResponses(responses)
    setCurrentGoal(updatedGoal)
    setShowDialog(false)
  }

  const handleSkipClarification = () => {
    setShowDialog(false)
  }

  const resetDemo = () => {
    setCurrentGoal(sampleGoal)
    setCompletedResponses([])
    setShowDialog(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Demo Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <MessageSquare className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Interactive Clarification Demo
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Experience how the clarification dialog helps improve SMART goals through friendly, guided questions.
        </p>
      </div>

      {/* Demo Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Demo Controls
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This goal has low confidence scores and needs clarification.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleStartClarification}
              disabled={showDialog}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Start Clarification</span>
            </button>
            <button
              onClick={resetDemo}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Target className="w-4 h-4" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Goal Display */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Current SMART Goal
        </h2>
        <SmartGoalViewer goal={currentGoal} />
      </div>

      {/* Responses Summary */}
      {completedResponses.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
            ✅ Clarification Complete!
          </h3>
          <div className="space-y-2">
            {completedResponses.map((response, index) => {
              const question = sampleQuestions.find(q => q.id === response.questionId)
              return (
                <div key={response.questionId} className="text-sm">
                  <span className="font-medium text-green-700 dark:text-green-300">
                    Q{index + 1}:
                  </span>
                  <span className="text-green-600 dark:text-green-400 ml-2">
                    {String(response.answer)} ({Math.round(response.confidence * 100)}% confident)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Clarification Dialog */}
      <ClarificationDialog
        goal={currentGoal}
        questions={sampleQuestions}
        onComplete={handleClarificationComplete}
        onSkip={handleSkipClarification}
        isVisible={showDialog}
      />
    </div>
  )
}