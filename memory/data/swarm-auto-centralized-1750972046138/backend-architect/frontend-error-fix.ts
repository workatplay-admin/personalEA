// File: testing/goal-strategy-test/src/services/api.ts
// Update error handling in the clarifyGoal function to handle 502 differently from 503

// Add this helper function at the top of the file:
const isRetryableError = (status: number): boolean => {
  return status === 502 || status === 504 || status === 429;
};

// Update the error handling in clarifyGoal function (around line 237):
} catch (error: any) {
  console.error('❌ Error in goal clarification:', error)
  
  if (error.response) {
    const status = error.response.status
    const data = error.response.data
    
    // Handle 502 Bad Gateway (upstream service error) differently from 503
    if (status === 502) {
      const errorObj = new Error('AI service temporarily unavailable')
      ;(errorObj as any).userMessage = 'The AI service is temporarily unavailable. This is usually brief - please try again in a few seconds.'
      ;(errorObj as any).retryable = true
      ;(errorObj as any).suggestedRetryAfter = data?.error?.suggestedRetryAfter || 5
      throw errorObj
    } else if (status === 503) {
      const errorObj = new Error('Service unavailable')
      ;(errorObj as any).userMessage = 'The backend service is currently unavailable. Please check your connection and try again later.'
      ;(errorObj as any).retryable = false
      throw errorObj
    } else if (status === 500) {
      const errorObj = new Error('Server error')
      ;(errorObj as any).userMessage = 'An unexpected server error occurred. Please try again.'
      throw errorObj
    }
  }
  
  throw error
}

// Also update the ChatComponent to handle retryable errors:
// In testing/goal-strategy-test/src/components/ChatClarification.tsx
// Add auto-retry logic for 502 errors:

const handleSendMessage = async () => {
  if (!userInput.trim() || isProcessing) return

  const newMessage = userInput.trim()
  setUserInput('')
  setIsProcessing(true)

  // Add user message
  const userMessage: ChatMessage = {
    role: 'user',
    content: newMessage,
    timestamp: Date.now()
  }
  
  const updatedHistory = [...conversationHistory, userMessage]
  setConversationHistory(updatedHistory)

  try {
    // Auto-retry logic for transient errors
    let retries = 0;
    let lastError: any = null;
    
    while (retries < 3) {
      try {
        const response = await goalAPI.sendChatMessage(
          goalId,
          componentKey,
          updatedHistory,
          {
            title: goalData?.title || '',
            criteria: goalData?.criteria,
            confidence: goalData?.confidence
          }
        )
        
        // Success - add assistant message
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.helpMessage,
          timestamp: Date.now()
        }
        
        setConversationHistory([...updatedHistory, assistantMessage])
        break; // Success, exit retry loop
        
      } catch (error: any) {
        lastError = error;
        
        // Only retry on retryable errors
        if (error.retryable && retries < 2) {
          retries++;
          const delay = (error.suggestedRetryAfter || 5) * 1000;
          console.log(`Retrying in ${delay/1000} seconds... (attempt ${retries + 1}/3)`);
          
          // Show retry notification to user
          setError(`AI service temporarily unavailable. Retrying in ${delay/1000} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          setError(''); // Clear error before retry
          continue;
        }
        
        throw error;
      }
    }
    
    if (lastError) {
      throw lastError;
    }
    
  } catch (error: any) {
    console.error('Chat error after retries:', error)
    setError(error.userMessage || error.message || 'Failed to send message')
    
    // Remove the user message on complete failure
    setConversationHistory(conversationHistory)
  } finally {
    setIsProcessing(false)
  }
}