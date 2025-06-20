import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Target, CheckCircle } from 'lucide-react'
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
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      content: `Hi! I'm here to help improve your SMART goal: "${goal.title}". I can see it needs some clarification. Let's work through each component together to make it more specific and actionable. Type "start" when you're ready to begin!`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const startNextComponent = () => {
    startNextComponentWithIndex(componentIndex)
  }

  const startNextComponentWithIndex = (index: number) => {
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
    // This prevents the issue where API updates change the messaging mid-flow
    const criterion = goal.criteria[component.key as keyof typeof goal.criteria]
    const confidence = Math.round(criterion.confidence * 100)
    
    // For the first component or when we haven't collected clarifications yet,
    // use the original confidence. For subsequent components, assume they need work.
    const hasBeenClarified = collectedClarifications[component.key]
    const isHighConfidence = hasBeenClarified ? false : criterion.confidence >= 0.7

    let componentMessage = ''
    switch (component.key) {
      case 'specific':
        if (isHighConfidence) {
          componentMessage = `Your goal appears to be quite **Specific** (${confidence}% confidence). It currently says: "${criterion.value}". This looks good, but let me verify - what specific aspect of programming do you want to focus on? Are you thinking about a particular language, framework, or skill area?`
        } else {
          componentMessage = `Let's start with making your goal more **Specific** (currently ${confidence}% confidence). Right now it says: "${criterion.value}". What specific aspect of programming do you want to focus on? For example, are you thinking about a particular language, framework, web development, algorithms, or something else?`
        }
        break
      case 'measurable':
        if (isHighConfidence) {
          componentMessage = `Your goal seems **Measurable** (${confidence}% confidence). Currently: "${criterion.value}". This is on the right track, but let's confirm - how will you track your progress? What specific metrics or milestones will show you're improving?`
        } else {
          componentMessage = `Now let's make it **Measurable** (currently ${confidence}% confidence). Currently: "${criterion.value}". How will you track your progress? What specific metrics or milestones will show you're improving?`
        }
        break
      case 'achievable':
        if (isHighConfidence) {
          componentMessage = `This goal appears to be very **Achievable** (${confidence}% confidence). Currently: "${criterion.value}". This looks realistic, but let me confirm - what resources do you have available? How much time can you realistically commit? Any constraints I should know about?`
        } else {
          componentMessage = `Let's ensure it's **Achievable** (currently ${confidence}% confidence). Currently: "${criterion.value}". What resources do you have available? How much time can you realistically commit? Any constraints I should know about?`
        }
        break
      case 'relevant':
        if (isHighConfidence) {
          componentMessage = `Your goal seems **Relevant** (${confidence}% confidence). Currently: "${criterion.value}". This appears well-aligned, but let's verify - why is this goal important to you right now? How does it fit with your other priorities?`
        } else {
          componentMessage = `Let's confirm it's **Relevant** (currently ${confidence}% confidence). Currently: "${criterion.value}". Why is this goal important to you right now? How does it fit with your other priorities?`
        }
        break
      case 'timeBound':
        if (isHighConfidence) {
          componentMessage = `Your goal has a good **Time-bound** aspect (${confidence}% confidence). Currently: "${criterion.value}". This is promising, but let's nail it down - when do you want to achieve this goal? What would be a realistic but motivating deadline?`
        } else {
          componentMessage = `Finally, let's make it **Time-bound** (currently ${confidence}% confidence). Currently: "${criterion.value}". When do you want to achieve this goal? What would be a realistic but motivating deadline?`
        }
        break
    }

    const message: ChatMessage = {
      id: `component-${component.key}`,
      type: 'bot',
      content: componentMessage,
      timestamp: new Date(),
      smartComponent: component.key
    }

    setMessages(prev => [...prev, message])
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

    // Check if user is starting the conversation
    if (!currentComponent && userInput.toLowerCase().includes('start')) {
      setIsProcessing(false)
      startNextComponent()
      return
    }

    // Handle navigation commands (next/done) - only when we have a current component
    if (currentComponent && (userInput.toLowerCase().includes('next') || userInput.toLowerCase().includes('done'))) {
      setIsProcessing(false)
      if (userInput.toLowerCase().includes('next')) {
        const nextIndex = componentIndex + 1
        setComponentIndex(nextIndex)
        startNextComponentWithIndex(nextIndex)
      } else if (userInput.toLowerCase().includes('done')) {
        completeChat()
      }
      return
    }

    // Check if user needs help or says "I don't know"
    if (userInput.toLowerCase().includes("don't know") ||
        userInput.toLowerCase().includes("not sure") ||
        userInput.toLowerCase().includes("help")) {
      setIsProcessing(false)
      provideSuggestions(currentComponent?.key || '')
      return
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
      
      // Call the API to clarify the goal with all collected clarifications and goal context
      const goalContext = {
        title: goal.title,
        description: goal.title, // Use title as description for now
        originalGoal: goal.title
      }
      
      // Backend now has proper timeout handling, so we don't need frontend timeout
      const response = await goalAPI.clarifyGoal(goal.id, newClarifications, goalContext) as Goal | any
      
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
      // Normal flow - good clarification received
      onGoalUpdate(response as Goal)

      // Use AI feedback if available, otherwise generate standard response
      const botResponseContent = (response as any).aiFeedback ||
                                (response as any).message ||
                                generateBotResponse(currentComponent.key, userInput, response as Goal)

      const botResponse: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: botResponseContent,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botResponse])
      setIsProcessing(false)

      // Ask if user wants to continue to next component
      setTimeout(() => {
        const continueMessage: ChatMessage = {
          id: `continue-${Date.now()}`,
          type: 'bot',
          content: `Great! Ready to move on to the next component? Type "next" to continue or "done" if you're satisfied with this goal.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, continueMessage])
      }, 1000)

    } catch (error) {
      console.error('ChatClarification: Error during API call:', error)
      
      let errorMessage = "I'm sorry, I encountered an error while processing your response."
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
          errorMessage = "The request timed out. This might be due to high server load. Please try again with a shorter response, or type 'next' to move to the next component."
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "There was a network error. Please check your connection and try again, or type 'next' to continue."
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


  const provideSuggestions = (component: string) => {
    // Get context-aware suggestions based on the goal type
    const goalTitle = goal.title.toLowerCase()
    let suggestions = ''
    
    switch (component) {
      case 'specific':
        if (goalTitle.includes('programming') || goalTitle.includes('coding') || goalTitle.includes('development')) {
          suggestions = `Here are some suggestions to make your programming goal more specific:
• Focus on a particular language (TypeScript, Python, JavaScript, etc.)
• Target a specific area (web development, mobile apps, data science, etc.)
• Choose a particular framework or technology (React, Node.js, Django, etc.)
• Define what "better" means (senior-level skills, specific certifications, etc.)
• Specify the type of projects you want to build`
        } else if (goalTitle.includes('fitness') || goalTitle.includes('exercise') || goalTitle.includes('health')) {
          suggestions = `Here are some suggestions to make your fitness goal more specific:
• Focus on a particular type of exercise (strength training, cardio, yoga)
• Target a specific body part or fitness aspect
• Choose a particular activity you enjoy
• Define what "getting fit" means to you personally`
        } else {
          suggestions = `Here are some suggestions to make your goal more specific:
• Define exactly what you want to achieve
• Identify the specific area or skill you want to improve
• Clarify what success looks like for you
• Choose a particular focus within your broader goal
• Be precise about the outcome you're seeking`
        }
        break
      case 'measurable':
        if (goalTitle.includes('programming') || goalTitle.includes('coding')) {
          suggestions = `Here are ways to make your programming goal measurable:
• Complete specific projects (e.g., "build 3 full-stack applications")
• Achieve certifications or pass technical interviews
• Contribute to open source projects (e.g., "make 20 meaningful contributions")
• Track learning hours or coding practice time
• Measure skill assessments or coding challenge scores`
        } else {
          suggestions = `Here are ways to make your goal measurable:
• Set specific numbers or quantities to achieve
• Define clear milestones or checkpoints
• Identify metrics you can track regularly
• Establish success criteria you can verify
• Create measurable outcomes or deliverables`
        }
        break
      case 'achievable':
        suggestions = `Consider these factors for an achievable goal:
• Your current skill level and experience
• Available time in your schedule (realistic commitment)
• Resources you have access to (tools, courses, mentors)
• Any constraints or limitations you need to work around
• Past experience with similar goals and what worked`
        break
      case 'relevant':
        suggestions = `Think about why this goal matters:
• How it aligns with your career or personal aspirations
• The benefits you'll gain from achieving it
• How it fits with your current priorities and responsibilities
• The impact it will have on your life or work
• Why this goal is important to you right now`
        break
      case 'timeBound':
        if (goalTitle.includes('programming') || goalTitle.includes('coding')) {
          suggestions = `Here are timeframe suggestions for programming goals:
• Short-term: 1-3 months for specific skills or small projects
• Medium-term: 3-6 months for significant skill development
• Long-term: 6-12 months for major career transitions
• Consider bootcamp timelines, course durations, or project deadlines
• Set intermediate milestones (weekly/monthly progress checks)`
        } else {
          suggestions = `Here are timeframe suggestions:
• Short-term: 4-8 weeks for habit formation
• Medium-term: 3-6 months for significant changes
• Long-term: 6-12 months for major transformations
• Consider seasonal factors or life events
• Set intermediate milestones along the way`
        }
        break
      default:
        suggestions = `I'm here to help! Try being more specific about what you're looking for.`
    }

    const suggestionMessage: ChatMessage = {
      id: `suggestions-${Date.now()}`,
      type: 'bot',
      content: suggestions,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, suggestionMessage])
  }

  const generateBotResponse = (component: string, userResponse: string, updatedGoal?: Goal): string => {
    const currentComp = SMART_COMPONENTS.find(c => c.key === component)
    const criterion = currentComp ? goal.criteria[currentComp.key as keyof typeof goal.criteria] : null
    const isHighConfidence = criterion ? criterion.confidence >= 0.7 : false
    
    // Check if we have an updated goal with new confidence scores
    const newCriterion = updatedGoal ? updatedGoal.criteria[currentComp?.key as keyof typeof updatedGoal.criteria] : null
    const confidenceImproved = newCriterion && criterion && newCriterion.confidence > criterion.confidence

    switch (component) {
      case 'specific':
        if (confidenceImproved) {
          return `Excellent! Your clarification about "${userResponse}" has significantly improved the specificity of your goal. The confidence has increased to ${Math.round((newCriterion?.confidence || 0) * 100)}%!`
        } else if (isHighConfidence) {
          return `Perfect! Your focus on "${userResponse}" confirms this goal is well-defined and specific. The specificity looks solid now.`
        } else {
          return `Great! Focusing on "${userResponse}" makes your goal much more specific. I've updated the goal to reflect this focus.`
        }
      case 'measurable':
        if (confidenceImproved) {
          return `Perfect! Those metrics "${userResponse}" provide excellent measurability. The confidence has jumped to ${Math.round((newCriterion?.confidence || 0) * 100)}%!`
        } else if (isHighConfidence) {
          return `Excellent! Those metrics "${userResponse}" will work well for tracking progress. The measurability aspect is now well-established.`
        } else {
          return `Perfect! Having clear metrics like "${userResponse}" will help you track your progress effectively. Goal updated!`
        }
      case 'achievable':
        if (confidenceImproved) {
          return `Great insight! Your assessment of resources and constraints shows this goal is realistic. Achievability confidence is now ${Math.round((newCriterion?.confidence || 0) * 100)}%!`
        } else if (isHighConfidence) {
          return `Great! Based on your resources and constraints, this goal remains realistic and achievable. The achievability is confirmed.`
        } else {
          return `Excellent! Understanding your resources and constraints helps ensure this goal is realistic. Updated accordingly.`
        }
      case 'relevant':
        if (confidenceImproved) {
          return `That's a compelling motivation! Your explanation shows strong alignment with your priorities. Relevance confidence is now ${Math.round((newCriterion?.confidence || 0) * 100)}%!`
        } else if (isHighConfidence) {
          return `Perfect! Your motivation confirms this goal is highly relevant to your priorities. The relevance is well-established.`
        } else {
          return `That's a strong motivation! Understanding why this matters to you will help maintain commitment. Goal updated.`
        }
      case 'timeBound':
        if (confidenceImproved) {
          return `Excellent timeline! That deadline creates the right urgency and structure. Time-bound confidence is now ${Math.round((newCriterion?.confidence || 0) * 100)}%!`
        } else if (isHighConfidence) {
          return `Excellent! That timeline works well and creates the right urgency. The time-bound aspect is now solid.`
        } else {
          return `Great timeline! Having a specific deadline creates urgency and helps with planning. Goal updated with your timeframe.`
        }
      default:
        return `Thanks for that information! I've updated your goal accordingly.`
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
                ? "Type 'start' to begin..."
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