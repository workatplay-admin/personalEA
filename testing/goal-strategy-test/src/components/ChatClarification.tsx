/**
 * Chat Clarification Component
 * 
 * Interactive chat interface for conversational goal refinement and clarification,
 * supporting real-time SMART criteria improvement through AI-powered dialogue.
 * 
 * @see {@link file://../../../../docs/USER_TESTING_GUIDE.md User Testing Guide}
 * @see {@link file://../../../../docs/LLM_DRIVEN_REFACTORING.md LLM-Driven Refactoring Guide}
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#interactive-refinement Interactive Refinement Specification}
 */

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Target, BarChart, CheckCircle, Compass, Clock, HelpCircle, AlertCircle } from 'lucide-react'
import { Goal } from '../types'
import goalAPI from '../services/api'

interface ChatMessage {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  smartComponent?: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound'
  isExample?: boolean
  messageType?: 'intro' | 'question' | 'example' | 'feedback' | 'tip'
}

interface ChatClarificationProps {
  goal: Goal
  onGoalUpdate: (updatedGoal: Goal) => void
  onComplete: () => void
  isVisible: boolean
}

const SMART_COMPONENTS = [
  { 
    key: 'specific', 
    label: 'Specific', 
    color: 'blue',
    icon: Target,
    description: 'Clear, well-defined, and unambiguous',
    tips: [
      'What exactly do you want to accomplish?',
      'Who is involved?',
      'Where will it happen?',
      'Which resources are needed?'
    ]
  },
  { 
    key: 'measurable', 
    label: 'Measurable', 
    color: 'green',
    icon: BarChart,
    description: 'Quantifiable to track progress',
    tips: [
      'How much? How many?',
      'How will you know when it\'s accomplished?',
      'What metrics will you use?',
      'What are the milestones?'
    ]
  },
  { 
    key: 'achievable', 
    label: 'Achievable', 
    color: 'yellow',
    icon: CheckCircle,
    description: 'Realistic and attainable',
    tips: [
      'Is this goal realistic?',
      'Do you have the necessary resources?',
      'What obstacles might you face?',
      'Have others done this successfully?'
    ]
  },
  { 
    key: 'relevant', 
    label: 'Relevant', 
    color: 'purple',
    icon: Compass,
    description: 'Aligned with broader objectives',
    tips: [
      'Why is this goal important?',
      'How does it align with other goals?',
      'Is this the right time?',
      'Does it match your needs?'
    ]
  },
  { 
    key: 'timeBound', 
    label: 'Time-bound', 
    color: 'red',
    icon: Clock,
    description: 'Has a deadline or timeframe',
    tips: [
      'When will you achieve this?',
      'What are the key milestones?',
      'What can you do today?',
      'What\'s your deadline?'
    ]
  }
] as const

export default function ChatClarification({ goal, onGoalUpdate, onComplete, isVisible }: ChatClarificationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [currentComponent, setCurrentComponent] = useState<typeof SMART_COMPONENTS[number] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [componentIndex, setComponentIndex] = useState(0)
  const [collectedClarifications, setCollectedClarifications] = useState<Record<string, string>>({})
  const [showTips, setShowTips] = useState(false)
  const [isLearningMode, setIsLearningMode] = useState(true)
  const [completedComponents, setCompletedComponents] = useState<Set<string>>(new Set())
  const [currentGoal, setCurrentGoal] = useState<Goal>(goal)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Sync goal prop changes with currentGoal state
  useEffect(() => {
    setCurrentGoal(goal)
  }, [goal])

  // Find the next component to work on based on lowest confidence score
  const findNextComponent = (): typeof SMART_COMPONENTS[number] | null => {
    let lowestScore = 100
    let lowestComponent: typeof SMART_COMPONENTS[number] | null = null

    for (const component of SMART_COMPONENTS) {
      const criterion = currentGoal.criteria[component.key as keyof typeof currentGoal.criteria]
      const confidence = criterion.confidence

      // Skip components that are already above 90% or completed
      if (confidence >= 0.9 || completedComponents.has(component.key)) {
        continue
      }

      // Find the lowest scoring component
      if (confidence < lowestScore) {
        lowestScore = confidence
        lowestComponent = component
      }
    }

    return lowestComponent
  }

  // Check if the current component has reached 90%+ confidence
  const isComponentComplete = (componentKey: string): boolean => {
    const criterion = currentGoal.criteria[componentKey as keyof typeof currentGoal.criteria]
    return criterion.confidence >= 0.9
  }

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      initializeChat()
    }
  }, [isVisible])

  const initializeChat = () => {
    // Check if all components are already above 90%
    const allComponentsComplete = SMART_COMPONENTS.every(component => 
      currentGoal.criteria[component.key as keyof typeof currentGoal.criteria].confidence >= 0.9
    )

    if (allComponentsComplete) {
      // All components are already high confidence, show completion message
      completeChat()
      return
    }

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      content: `👋 Welcome to the SMART Goal Builder! 

I'm here to help you transform "${currentGoal.title}" into a powerful SMART goal that will set you up for success.

I've analyzed your goal and identified areas where we can make it stronger. Let's focus on the aspects that need the most improvement to get your goal to 90%+ confidence.

SMART goals are:
• **S**pecific - Clear and well-defined (${Math.round(currentGoal.criteria.specific.confidence * 100)}% confident)
• **M**easurable - With concrete criteria for tracking progress (${Math.round(currentGoal.criteria.measurable.confidence * 100)}% confident)  
• **A**chievable - Realistic and attainable (${Math.round(currentGoal.criteria.achievable.confidence * 100)}% confident)
• **R**elevant - Meaningful and aligned with your values (${Math.round(currentGoal.criteria.relevant.confidence * 100)}% confident)
• **T**ime-bound - With a clear deadline (${Math.round(currentGoal.criteria.timeBound.confidence * 100)}% confident)

Let's work together to strengthen the areas that need improvement. Ready to start?`,
      timestamp: new Date(),
      messageType: 'intro'
    }
    
    setMessages([welcomeMessage])
    
    // Start with the lowest scoring component after a brief delay
    setTimeout(() => {
      startNextComponent()
    }, 3000)
  }

  const startNextComponent = async () => {
    const nextComponent = findNextComponent()
    
    if (!nextComponent) {
      // No more components to work on
      completeChat()
      return
    }

    await startComponentWork(nextComponent)
  }

  const startComponentWork = async (component: typeof SMART_COMPONENTS[number]) => {
    setCurrentComponent(component)
    setShowTips(false)

    // Introduction to the component
    const currentConfidence = currentGoal.criteria[component.key as keyof typeof currentGoal.criteria].confidence
    const introMessage: ChatMessage = {
      id: `intro-${component.key}`,
      type: 'bot',
      content: `## ${component.label} Goals

${component.description}

Your current ${component.label.toLowerCase()} score is ${Math.round(currentConfidence * 100)}%. Let's work on improving it to 90% or higher.

${isLearningMode && currentConfidence < 0.5 ? `Let me show you an example first, then we'll work on yours.` : `Let's refine the ${component.label.toLowerCase()} aspect of your goal.`}`,
      timestamp: new Date(),
      smartComponent: component.key as any,
      messageType: 'intro'
    }

    setMessages(prev => [...prev, introMessage])

    // Show example if in learning mode and confidence is low
    if (isLearningMode && currentConfidence < 0.5) {
      setTimeout(() => {
        showComponentExample(component)
      }, 2000)
    } else {
      setTimeout(() => {
        askComponentQuestion(component)
      }, 1500)
    }
  }

  const showComponentExample = (component: typeof SMART_COMPONENTS[number]) => {
    const examples = {
      specific: {
        poor: "I want to get better at coding",
        good: "I want to learn React.js by building a personal portfolio website with at least 3 interactive features"
      },
      measurable: {
        poor: "I want to lose weight",
        good: "I want to lose 15 pounds by tracking my weight weekly and maintaining a 500-calorie daily deficit"
      },
      achievable: {
        poor: "I want to become a millionaire next month",
        good: "I want to increase my income by 20% through freelance projects, dedicating 10 hours per week"
      },
      relevant: {
        poor: "I should learn quantum physics (but I'm a web developer)",
        good: "I want to learn TypeScript because it will improve my code quality and job prospects as a frontend developer"
      },
      timeBound: {
        poor: "I'll do it someday",
        good: "I will complete this by March 31st, with weekly milestones every Friday"
      }
    }

    const example = examples[component.key as keyof typeof examples]
    
    const exampleMessage: ChatMessage = {
      id: `example-${component.key}`,
      type: 'bot',
      content: `### Example: ${component.label}

❌ **Not ${component.label}:** "${example.poor}"

✅ **${component.label}:** "${example.good}"

See the difference? Now let's make your goal ${component.label.toLowerCase()}!`,
      timestamp: new Date(),
      isExample: true,
      messageType: 'example'
    }

    setMessages(prev => [...prev, exampleMessage])

    setTimeout(() => {
      askComponentQuestion(component)
    }, 2000)
  }

  const askComponentQuestion = async (component: typeof SMART_COMPONENTS[number]) => {
    try {
      console.log('ChatClarification: Asking question for component:', component.key)
      
      // Generate a personalized question based on the current goal state
      const criterion = currentGoal.criteria[component.key as keyof typeof currentGoal.criteria]
      
      const questionResponse = await goalAPI.generateComponentQuestion(
        currentGoal.title,
        component.key,
        criterion.value,
        criterion.confidence,
        false, // Not high confidence since we're building from scratch
        currentGoal
      )

      const message: ChatMessage = {
        id: `question-${component.key}`,
        type: 'bot',
        content: questionResponse.question,
        timestamp: new Date(),
        smartComponent: component.key as any,
        messageType: 'question'
      }

      setMessages(prev => [...prev, message])
    } catch (error: any) {
      console.error('Error generating component question:', error)
      
      // Fallback to a generic question
      const fallbackQuestions = {
        specific: `Let's make your goal more specific. Currently you have: "${currentGoal.title}"\n\nWhat exactly do you want to accomplish? Be as detailed as possible.`,
        measurable: `How will you measure success? What specific numbers, metrics, or milestones will tell you that you've achieved your goal?`,
        achievable: `Is this goal realistic given your current resources, skills, and constraints? What makes you confident you can achieve it?`,
        relevant: `Why is this goal important to you? How does it align with your larger objectives or values?`,
        timeBound: `When do you want to achieve this goal? What's your deadline, and what are the key milestones along the way?`
      }
      
      const message: ChatMessage = {
        id: `question-${component.key}`,
        type: 'bot',
        content: fallbackQuestions[component.key as keyof typeof fallbackQuestions],
        timestamp: new Date(),
        smartComponent: component.key as any,
        messageType: 'question'
      }

      setMessages(prev => [...prev, message])
    }
  }

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentInput.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = currentInput.trim()
    setCurrentInput('')
    setIsProcessing(true)

    // Check for help requests
    if (userInput.toLowerCase().includes('help') || 
        userInput.toLowerCase().includes('tips') ||
        userInput.toLowerCase().includes('example') ||
        userInput === '?') {
      await showHelp()
      setIsProcessing(false)
      return
    }

    // Check for navigation commands
    if (userInput.toLowerCase() === 'skip') {
      // Mark current component as completed (skipped) and move to next
      if (currentComponent) {
        setCompletedComponents(prev => new Set([...prev, currentComponent.key]))
      }
      await startNextComponent()
      setIsProcessing(false)
      return
    }

    if (!currentComponent) {
      setIsProcessing(false)
      return
    }

    // Store the clarification for this session
    const newClarifications = {
      ...collectedClarifications,
      [currentComponent.key]: userInput
    }
    setCollectedClarifications(newClarifications)

    try {
      console.log('ChatClarification: Processing user input for component:', currentComponent.key)
      
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
      
      conversationHistory.push({
        role: 'user',
        content: userInput
      })

      // Call the API to process the clarification
      const goalContext = {
        title: currentGoal.title,
        description: currentGoal.title,
        originalGoal: currentGoal.title
      }
      
      // Send only the current clarification, not all accumulated ones
      const response = await goalAPI.clarifyGoal(
        currentGoal.id, 
        { [currentComponent.key]: userInput },  // Only send current component's answer
        goalContext,
        conversationHistory
      )
      
      console.log('ChatClarification: Received response:', response)
      
      // Check if AI needs more clarification
      const needsFollowUp = (response as any).data?.needsFollowUp
      
      if (needsFollowUp) {
        const botResponse: ChatMessage = {
          id: `bot-followup-${Date.now()}`,
          type: 'bot',
          content: (response as any).message || (response as any).data?.feedback || 
                   "I need a bit more detail. Could you be more specific? For example, include numbers, deadlines, or concrete actions.",
          timestamp: new Date(),
          messageType: 'feedback'
        }

        setMessages(prev => [...prev, botResponse])
        setIsProcessing(false)
        setCollectedClarifications(collectedClarifications) // Revert
        return
      }

      // Update the goal
      const updatedGoal = response as Goal
      onGoalUpdate(updatedGoal)
      setCurrentGoal(updatedGoal)

      // Check if the component has reached 90%+ confidence
      const updatedConfidence = updatedGoal.criteria[currentComponent.key as keyof typeof updatedGoal.criteria].confidence

      if (updatedConfidence >= 0.9) {
        // Component is complete!
        const feedbackMessage: ChatMessage = {
          id: `feedback-${Date.now()}`,
          type: 'bot',
          content: `Excellent! You've successfully improved the ${currentComponent.label.toLowerCase()} aspect of your goal to ${Math.round(updatedConfidence * 100)}% confidence! 🎉\n\n${(response as any).aiFeedback || ''}`,
          timestamp: new Date(),
          messageType: 'feedback'
        }

        setMessages(prev => [...prev, feedbackMessage])
        
        // Mark component as completed and move to next
        setCompletedComponents(prev => new Set([...prev, currentComponent.key]))
        
        setTimeout(() => {
          startNextComponent()
        }, 2000)
      } else {
        // Component still needs work
        const feedbackMessage: ChatMessage = {
          id: `feedback-${Date.now()}`,
          type: 'bot',
          content: `Good progress! Your ${currentComponent.label.toLowerCase()} score improved to ${Math.round(updatedConfidence * 100)}%. Let's keep refining it to reach 90% or higher.\n\n${(response as any).aiFeedback || ''}`,
          timestamp: new Date(),
          messageType: 'feedback'
        }

        setMessages(prev => [...prev, feedbackMessage])
        
        // Continue working on the same component
        setTimeout(() => {
          askComponentQuestion(currentComponent)
        }, 2000)
      }
      
    } catch (error) {
      console.error('ChatClarification: Error during API call:', error)
      
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        type: 'bot',
        content: "I'm having trouble processing that. Could you try rephrasing? Type 'help' for tips.",
        timestamp: new Date(),
        messageType: 'feedback'
      }

      setMessages(prev => [...prev, errorMessage])
      setCollectedClarifications(collectedClarifications) // Revert
    } finally {
      setIsProcessing(false)
    }
  }

  const showHelp = async () => {
    if (!currentComponent) return

    const helpMessage: ChatMessage = {
      id: `help-${Date.now()}`,
      type: 'bot',
      content: `### Tips for ${currentComponent.label} Goals:

${currentComponent.tips.map(tip => `• ${tip}`).join('\n')}

Need an example? Here's how to make a goal ${currentComponent.label.toLowerCase()}:

**Original:** "${currentGoal.title}"
**${currentComponent.label}:** [Your improved version here]

Type your answer when ready, or say 'skip' to move to the next component.`,
      timestamp: new Date(),
      messageType: 'tip'
    }

    setMessages(prev => [...prev, helpMessage])
    setShowTips(true)
  }

  const completeChat = () => {
    // Calculate which components were improved
    const componentScores = SMART_COMPONENTS.map(component => ({
      key: component.key,
      label: component.label,
      confidence: currentGoal.criteria[component.key as keyof typeof currentGoal.criteria].confidence
    }))

    const highConfidenceComponents = componentScores.filter(c => c.confidence >= 0.9)
    const improvedComponents = componentScores.filter(c => completedComponents.has(c.key))

    const finalMessage: ChatMessage = {
      id: 'complete',
      type: 'bot',
      content: `🎉 **Congratulations!** You've successfully refined your SMART goal!

**Final Confidence Scores:**
${componentScores.map(c => 
  `${c.confidence >= 0.9 ? '✅' : '⚡'} **${c.label}** - ${Math.round(c.confidence * 100)}% confidence`
).join('\n')}

${highConfidenceComponents.length === 5 
  ? 'All components are now at 90%+ confidence! Your goal is crystal clear and ready for action.' 
  : `${highConfidenceComponents.length} out of 5 components are at 90%+ confidence.`}

Your enhanced goal is ready to guide you toward success. Remember:
• Break it down into smaller milestones
• Track your progress regularly
• Adjust as needed while staying focused on the outcome

Click "Complete" below to finalize your SMART goal!`,
      timestamp: new Date(),
      messageType: 'intro'
    }

    setMessages(prev => [...prev, finalMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isVisible) return null

  return (
    <div data-testid="chat-interface" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[500px] flex flex-col">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">SMART Goal Builder</h3>
              {currentComponent && (
                <p className="text-sm opacity-90 flex items-center gap-2">
                  <currentComponent.icon className="w-4 h-4" />
                  Building: <span className="font-medium">{currentComponent.label}</span>
                </p>
              )}
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex space-x-1">
            {SMART_COMPONENTS.map((comp) => {
              const confidence = currentGoal.criteria[comp.key as keyof typeof currentGoal.criteria].confidence
              const isComplete = confidence >= 0.9
              const isCurrent = currentComponent?.key === comp.key
              
              return (
                <div
                  key={comp.key}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isComplete ? 'bg-white' :
                    isCurrent ? 'bg-white animate-pulse' :
                    'bg-white/30'
                  }`}
                  title={`${comp.label} - ${Math.round(confidence * 100)}%`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              data-testid={message.type === 'user' ? 'user-message' : 'ai-message'}
              className={`max-w-md px-4 py-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : message.isExample
                  ? 'bg-amber-50 border border-amber-200 text-gray-800'
                  : message.messageType === 'tip'
                  ? 'bg-blue-50 border border-blue-200 text-gray-800'
                  : message.smartComponent
                  ? `bg-${SMART_COMPONENTS.find(c => c.key === message.smartComponent)?.color}-50 border border-${SMART_COMPONENTS.find(c => c.key === message.smartComponent)?.color}-200 text-gray-800`
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'bot' ? (
                  message.messageType === 'tip' ? (
                    <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  ) : message.isExample ? (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  ) : (
                    <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )
                ) : (
                  <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="text-sm whitespace-pre-wrap">
                  {formatMessage(message.content)}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div data-testid="chat-loading" className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-600 p-4">
        <div className="flex space-x-2">
          <input
            data-testid="chat-input"
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !currentComponent
                ? "Getting ready..."
                : `Describe the ${currentComponent.label.toLowerCase()} aspect... (type 'help' for tips)`
            }
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={isProcessing}
          />
          <button
            data-testid="chat-send-button"
            onClick={handleSendMessage}
            disabled={!currentInput.trim() || isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Quick Actions */}
        {currentComponent && !messages.some(m => m.id === 'complete') && (
          <div className="mt-2 flex gap-2 text-xs">
            <button
              onClick={() => setCurrentInput('help')}
              className="text-indigo-600 hover:text-indigo-800"
            >
              Need help?
            </button>
            <span className="text-gray-400">•</span>
            <button
              onClick={() => setCurrentInput('skip')}
              className="text-gray-600 hover:text-gray-800"
            >
              Skip this step
            </button>
          </div>
        )}
        
        {/* Complete button */}
        {messages.some(m => m.id === 'complete') && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Complete SMART Goal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to format messages with markdown-like syntax
function formatMessage(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*|##\s[^\n]+|###\s[^\n]+|•\s[^\n]+|\n)/g)
  
  return parts.map((part, index) => {
    if (part.startsWith('## ')) {
      return <h2 key={index} className="text-lg font-bold mb-2">{part.slice(3)}</h2>
    } else if (part.startsWith('### ')) {
      return <h3 key={index} className="text-base font-semibold mb-1">{part.slice(4)}</h3>
    } else if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    } else if (part.startsWith('• ')) {
      return <div key={index} className="ml-4">{part}</div>
    } else if (part === '\n') {
      return <br key={index} />
    } else {
      return part
    }
  })
}