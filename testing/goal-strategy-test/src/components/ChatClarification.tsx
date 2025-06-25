import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { Goal } from '../types'
import goalAPI from '../services/api'

interface ChatMessage {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  smartComponent?: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound'
}

interface ChatClarificationProps {
  goal: Goal
  onGoalUpdate: (updatedGoal: Goal) => void
  onComplete: () => void
  isVisible: boolean
}

const SMART_COMPONENTS = [
  { key: 'specific', label: 'Specific', color: 'blue' },
  { key: 'measurable', label: 'Measurable', color: 'green' },
  { key: 'achievable', label: 'Achievable', color: 'yellow' },
  { key: 'relevant', label: 'Relevant', color: 'purple' },
  { key: 'timeBound', label: 'Time-bound', color: 'red' }
] as const

export default function ChatClarification({ goal, onGoalUpdate, onComplete, isVisible }: ChatClarificationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [currentComponent, setCurrentComponent] = useState<typeof SMART_COMPONENTS[number] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [componentIndex, setComponentIndex] = useState(0)
  const [collectedClarifications, setCollectedClarifications] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      initializeChat()
    }
  }, [isVisible])

  const initializeChat = () => {
    const confidenceScore = Math.round(goal.confidence * 100)
    const needsWork = goal.confidence < 0.7 || Object.values(goal.criteria).some(c => c.confidence < 0.7)
    
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      content: `Hello! I'm your SMART Goal Refinement Assistant. 🎯

I've analyzed your goal "${goal.title}" and it currently has a ${confidenceScore}% confidence score. ${needsWork ? 'There are several areas where we can make it more specific, measurable, and actionable.' : 'It looks pretty good, but we can still polish it further!'}

I'll guide you through each SMART component systematically:
• **Specific** - Making it clear and focused
• **Measurable** - Adding concrete metrics  
• **Achievable** - Ensuring it's realistic
• **Relevant** - Confirming it aligns with your priorities
• **Time-bound** - Setting clear deadlines

As we chat, your goal will update in real-time on the left. Ready to begin? Let's start with the first component!`,
      timestamp: new Date()
    }
    
    setMessages([welcomeMessage])
    
    // Automatically start with the first component after a brief delay
    setTimeout(() => {
      startNextComponent()
    }, 2000)
  }

  const startNextComponent = async () => {
    await startNextComponentWithIndex(componentIndex)
  }

  const startNextComponentWithIndex = async (index: number) => {
    // Include ALL components, not just those needing work
    const allComponents = SMART_COMPONENTS

    if (index >= allComponents.length) {
      // All components are done
      completeChat()
      return
    }

    const component = allComponents[index]
    setCurrentComponent(component)

    // Use the original goal criteria to determine initial confidence, not the updated goal
    const criterion = goal.criteria[component.key as keyof typeof goal.criteria]
    const confidence = Math.round(criterion.confidence * 100)
    const hasBeenClarified = collectedClarifications[component.key]
    const isHighConfidence = hasBeenClarified ? false : criterion.confidence >= 0.7

    try {
      console.log('ChatClarification: Component question generation disabled - endpoint not implemented')
      
      // TODO: Re-enable when /goals/component-question endpoint is implemented
      // For now, use a default question based on the component
      const defaultQuestions: Record<string, string> = {
        specific: `Let's make your goal more specific. ${criterion.value} - What specific aspects would you like to clarify?`,
        measurable: `How would you measure progress? ${criterion.value} - What metrics would work best for you?`,
        achievable: `Let's ensure this is achievable. ${criterion.value} - What resources or support do you have?`,
        relevant: `Why is this goal important to you? ${criterion.value} - How does it align with your priorities?`,
        timeBound: `Let's refine the timeline. ${criterion.value} - What milestones would help track progress?`
      }

      const message: ChatMessage = {
        id: `component-${component.key}`,
        type: 'bot',
        content: defaultQuestions[component.key] || `How can we improve the ${component.name} aspect of your goal?`,
        timestamp: new Date(),
        smartComponent: component.key
      }

      setMessages(prev => [...prev, message])
    } catch (error: any) {
      console.error('Error in chat component:', error)
      console.error('Error details:', error.message)
      
      // System should fail cleanly - no fake responses
      const errorMessage: ChatMessage = {
        id: `component-error-${component.key}`,
        type: 'bot',
        content: "🚫 System not responsive. The AI service is currently unavailable. Please check your API configuration and try again.",
        timestamp: new Date(),
        smartComponent: component.key
      }

      setMessages(prev => [...prev, errorMessage])
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

    // Check if user is starting the conversation (auto-start is now handled in initializeChat)
    if (!currentComponent && (userInput.toLowerCase().includes('start') || userInput.toLowerCase().includes('begin') || userInput.toLowerCase().includes('ready'))) {
      await startNextComponent()
      setIsProcessing(false)
      return
    }

    // Handle navigation commands (next/done) - only when we have a current component
    if (currentComponent && (userInput.toLowerCase().includes('next') || userInput.toLowerCase().includes('done'))) {
      if (userInput.toLowerCase().includes('next')) {
        const nextIndex = componentIndex + 1
        setComponentIndex(nextIndex)
        await startNextComponentWithIndex(nextIndex)
      } else if (userInput.toLowerCase().includes('done')) {
        completeChat()
      }
      setIsProcessing(false)
      return
    }

    // Check if user needs help or says "I don't know" - use OpenAI instead of fallbacks
    if (userInput.toLowerCase().includes("don't know") ||
        userInput.toLowerCase().includes("not sure") ||
        userInput.toLowerCase().includes("help")) {
      
      try {
        // Build conversation history for context
        const conversationHistory = messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
        
        // Add current user message
        conversationHistory.push({
          role: 'user',
          content: userInput
        })

        console.log('ChatClarification: Requesting OpenAI help with conversation history:', conversationHistory)
        
        // Use OpenAI to provide contextual help based on conversation history
        const response = await goalAPI.generateContextualHelp(
          goal.title,
          currentComponent?.key || '',
          conversationHistory,
          goal
        )

        const helpMessage: ChatMessage = {
          id: `help-${Date.now()}`,
          type: 'bot',
          content: response.helpMessage,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, helpMessage])
        setIsProcessing(false)
        return
        
      } catch (error) {
        console.error('Error getting contextual help:', error)
        
        const errorMessage: ChatMessage = {
          id: `help-error-${Date.now()}`,
          type: 'bot',
          content: "🚫 System not responsive. Unable to provide assistance at this time.",
          timestamp: new Date()
        }

        setMessages(prev => [...prev, errorMessage])
        setIsProcessing(false)
        return
      }
    }

    if (!currentComponent) {
      setIsProcessing(false)
      return
    }

    // Store the clarification for this component
    const newClarifications = {
      ...collectedClarifications,
      [currentComponent.key]: userInput
    }
    setCollectedClarifications(newClarifications)

    try {
      console.log('ChatClarification: Starting API call for component:', currentComponent.key, 'with input:', userInput)
      console.log('ChatClarification: Goal ID:', goal.id)
      console.log('ChatClarification: Goal context:', goal)
      console.log('ChatClarification: New clarifications:', newClarifications)
      
      // Ensure we have a valid goal ID
      if (!goal.id) {
        console.error('ChatClarification: No goal ID available')
        throw new Error('No goal ID available for clarification')
      }
      
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      // Call the API to clarify the goal with all collected clarifications and goal context
      const goalContext = {
        title: goal.title,
        description: goal.title, // Use title as description for now
        originalGoal: goal.title
      }
      
      // Backend now has proper timeout handling, so we don't need frontend timeout
      const response = await goalAPI.clarifyGoal(
        goal.id, 
        newClarifications, 
        goalContext,
        conversationHistory
      ) as Goal | any
      
      console.log('ChatClarification: Received API response:', response)
      
      // Check if the AI needs follow-up before proceeding
      const needsFollowUp = (response as any).data?.needsFollowUp
      
      if (needsFollowUp) {
        console.log('ChatClarification: AI detected need for follow-up')
        // AI detected vague response and wants more clarification
        const botResponse: ChatMessage = {
          id: `bot-followup-${Date.now()}`,
          type: 'bot',
          content: (response as any).message || (response as any).data?.feedback,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, botResponse])
        setIsProcessing(false)

        // Don't update the goal or advance - wait for better clarification
        // Don't add the clarification to collected clarifications yet
        setCollectedClarifications(collectedClarifications) // Keep previous state
        return
      }

      console.log('ChatClarification: Processing successful response')
      
      // No fallback responses anymore - API returns errors properly
      // Success response should have proper goal structure
      if (!response || !(response as Goal).criteria) {
        console.log('ChatClarification: Invalid response structure')
        const errorResponse: ChatMessage = {
          id: `bot-error-${Date.now()}`,
          type: 'bot',
          content: "🚫 System error. The AI service is currently unavailable. Please check your connection and try again.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorResponse])
        setIsProcessing(false)
        return
      }

      // Normal flow - good clarification received  
      onGoalUpdate(response as Goal)

      // All responses must come from OpenAI - no more fallbacks
      let botResponseContent = (response as any).aiFeedback || (response as any).message
      
      // If no AI response, generate one using OpenAI with conversation context
      if (!botResponseContent) {
        try {
          const conversationHistory = messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
          
          conversationHistory.push({
            role: 'user', 
            content: userInput
          })
          
          const contextualResponse = await goalAPI.generateContextualHelp(
            goal.title,
            currentComponent?.key || '',
            conversationHistory,
            goal
          )
          
          botResponseContent = contextualResponse.helpMessage
        } catch (error) {
          console.error('Failed to generate AI response:', error)
          botResponseContent = "🚫 System not responsive. Unable to process your response at this time."
        }
      }

      const botResponse: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: botResponseContent,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botResponse])
      setIsProcessing(false)

    } catch (error) {
      console.error('ChatClarification: Error during API call:', error)
      
      let errorMessage = "🚫 System error. The AI service is currently unavailable."
      
      if (error instanceof Error) {
        console.error('Error details:', error.message)
        if (error.message.includes('timeout')) {
          errorMessage = "🚫 Request timed out. The AI service is taking too long to respond."
        } else if (error.message.includes('API key')) {
          errorMessage = "🚫 API configuration error. Please check your OpenAI API key."
        }
      }
      
      const errorResponse: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        type: 'bot',
        content: errorMessage + " You can also type 'help' for suggestions.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorResponse])
      setIsProcessing(false)
      
      // Don't add the failed clarification to collected clarifications
      setCollectedClarifications(collectedClarifications) // Keep previous state
    }
  }




  const completeChat = () => {
    const finalMessage: ChatMessage = {
      id: 'complete',
      type: 'bot',
      content: `🎉 Excellent work! We've improved all the key components of your SMART goal. Your goal is now much more specific, measurable, and actionable. The confidence score has increased significantly. Click the "Complete Chat" button below when you're ready to finish.`,
      timestamp: new Date()
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-96 flex flex-col">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">SMART Goal Assistant</h3>
            {currentComponent && (
              <p className="text-sm opacity-90">
                Working on: <span className="font-medium">{currentComponent.label}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : message.smartComponent
                  ? `bg-${SMART_COMPONENTS.find(c => c.key === message.smartComponent)?.color}-50 border border-${SMART_COMPONENTS.find(c => c.key === message.smartComponent)?.color}-200 text-gray-800`
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'bot' ? (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="text-sm">
                  {message.content.split('**').map((part, index) => 
                    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
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
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !currentComponent
                ? "The conversation will begin automatically..."
                : `Tell me about ${currentComponent.label.toLowerCase()}... (or say "I don't know" for suggestions)`
            }
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentInput.trim() || isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Show complete button when chat is done */}
        {messages.some(m => m.id === 'complete') && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Complete Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}