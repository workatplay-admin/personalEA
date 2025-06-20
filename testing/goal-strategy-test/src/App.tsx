import { useState, useEffect } from 'react'
import { Target, CheckCircle, Clock, Users, Settings } from 'lucide-react'
import ApiConfig from './components/ApiConfig'
import GoalInput from './components/GoalInput'
import SmartGoalDisplay from './components/SmartGoalDisplay'
import MilestonesDisplay from './components/MilestonesDisplay'
import WBSDisplay from './components/WBSDisplay'
import EstimationDisplay from './components/EstimationDisplay'
import FeedbackForm from './components/FeedbackForm'
import { Goal, Milestone, WBSTask, TaskEstimation } from './types'
import { getApiConfig } from './services/api'

function App() {
  const [currentStep, setCurrentStep] = useState(0)
  const [originalGoal, setOriginalGoal] = useState('')
  const [smartGoal, setSmartGoal] = useState<Goal | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [wbsTasks, setWbsTasks] = useState<WBSTask[]>([])
  const [estimations, setEstimations] = useState<TaskEstimation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  console.log('App Component Rendered. Current Step:', currentStep);
  console.log('Original Goal:', originalGoal);
  console.log('Smart Goal:', smartGoal);

  const steps = [
    { id: 0, name: 'API Config', icon: Settings, description: 'Configure authentication' },
    { id: 1, name: 'Goal Input', icon: Target, description: 'Enter your goal' },
    { id: 2, name: 'SMART Translation', icon: CheckCircle, description: 'AI converts to SMART goal' },
    { id: 3, name: 'Milestones', icon: Clock, description: 'Break into milestones' },
    { id: 4, name: 'Work Breakdown', icon: Users, description: 'Create task structure' },
    { id: 5, name: 'Estimation', icon: Clock, description: 'Estimate time & effort' },
  ]

  // Check if API is configured on component mount
  useEffect(() => {
    console.log('App useEffect: Checking API config');
    const config = getApiConfig()
    if (config) {
      setCurrentStep(1) // Skip to goal input if already configured
      console.log('App useEffect: API config found, setting step to 1');
    }
  }, [])

  const handleApiConfigured = () => {
    console.log('handleApiConfigured: Setting step to 1');
    setCurrentStep(1)
  }

  const handleGoalSubmit = (goal: string) => {
    console.log('handleGoalSubmit: Setting originalGoal to', goal);
    setOriginalGoal(goal)
    setCurrentStep(2)
    console.log('handleGoalSubmit: Setting step to 2');
  }

  const handleSmartGoalComplete = (goal: Goal) => {
    console.log('handleSmartGoalComplete: Setting smartGoal to', goal);
    setSmartGoal(goal)
    setCurrentStep(3)
    console.log('handleSmartGoalComplete: Setting step to 3');
  }

  const handleMilestonesComplete = (milestoneList: Milestone[]) => {
    console.log('handleMilestonesComplete: Setting milestones to', milestoneList);
    setMilestones(milestoneList)
    setCurrentStep(4)
    console.log('handleMilestonesComplete: Setting step to 4');
  }

  const handleWBSComplete = (tasks: WBSTask[]) => {
    console.log('handleWBSComplete: Setting wbsTasks to', tasks);
    setWbsTasks(tasks)
    setCurrentStep(5)
    console.log('handleWBSComplete: Setting step to 5');
  }

  const handleEstimationComplete = (taskEstimations: TaskEstimation[]) => {
    console.log('handleEstimationComplete: Setting estimations to', taskEstimations);
    setEstimations(taskEstimations)
  }

  const resetWorkflow = () => {
    console.log('resetWorkflow: Resetting all states');
    const config = getApiConfig()
    setCurrentStep(config ? 1 : 0) // Go to config if not set, otherwise goal input
    setOriginalGoal('')
    setSmartGoal(null)
    setMilestones([])
    setWbsTasks([])
    setEstimations([])
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Goal & Strategy Service Testing
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Test the complete AI-powered goal breakdown workflow
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-center">
            <nav aria-label="Progress">
              <ol className="flex items-center space-x-4">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        currentStep >= step.id
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 text-gray-500'
                      }`}
                    >
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div className="ml-2 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-indigo-600' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                    {step.id < steps.length && (
                      <div className="ml-4 w-8 h-0.5 bg-gray-300"></div>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 0 && (
            <ApiConfig onConfigured={handleApiConfigured} />
          )}
          
          {currentStep === 1 && (
            <GoalInput onSubmit={handleGoalSubmit} isLoading={isLoading} />
          )}
          
          {currentStep === 2 && (
            <SmartGoalDisplay
              originalGoal={originalGoal}
              onComplete={handleSmartGoalComplete}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
          )}
          
          {currentStep === 3 && smartGoal && (
            <MilestonesDisplay
              goal={smartGoal}
              onComplete={handleMilestonesComplete}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
          )}
          
          {currentStep === 4 && milestones.length > 0 && (
            <WBSDisplay
              milestones={milestones}
              onComplete={handleWBSComplete}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
          )}
          
          {currentStep === 5 && wbsTasks.length > 0 && (
            <EstimationDisplay
              tasks={wbsTasks}
              onComplete={handleEstimationComplete}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Feedback Form - Show after completion */}
        {estimations.length > 0 && (
          <div className="mt-12 max-w-2xl mx-auto">
            <FeedbackForm
              originalGoal={originalGoal}
              smartGoal={smartGoal}
              milestones={milestones}
              wbsTasks={wbsTasks}
              estimations={estimations}
              onReset={resetWorkflow}
            />
          </div>
        )}

        {/* Reset Button */}
        {currentStep > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={resetWorkflow}
              className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App