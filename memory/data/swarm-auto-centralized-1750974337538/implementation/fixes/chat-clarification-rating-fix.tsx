// FIX 3: ChatClarification.tsx modifications to add verification prompts before ratings

// This file shows the necessary changes to ChatClarification.tsx
// to implement verification prompts before showing confidence ratings

// CHANGES TO IMPLEMENT:

// 1. Add rating consent state
// Add after line 98:

const [showRatingPrompt, setShowRatingPrompt] = useState(false)
const [hasRatingConsent, setHasRatingConsent] = useState(false)
const [currentRatingComponent, setCurrentRatingComponent] = useState<string | null>(null)

// 2. Add rating prompt interface
// Add after line 14:

interface RatingPrompt {
  component: string
  message: string
  showRating: boolean
}

// 3. Add rating consent message component
// Add this function after line 650:

const RatingConsentMessage = ({ component, onAccept, onDecline }: { 
  component: string; 
  onAccept: () => void; 
  onDecline: () => void;
}) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Would you like to see a confidence rating?
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            I can show you how confident the system is about the {component} aspect of your goal. 
            This is optional and won't affect your goal creation.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onAccept}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Show Rating
            </button>
            <button
              onClick={onDecline}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Skip Rating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Update handleSendMessage to check for rating consent
// Add this check after line 329 (after storing clarifications):

// Check if we should prompt for rating consent
if (!hasRatingConsent && currentComponent) {
  const confidence = goal.criteria[currentComponent.key as keyof typeof goal.criteria].confidence;
  
  // Only show rating prompt for components with meaningful analysis
  if (confidence > 0 && confidence < 1) {
    setShowRatingPrompt(true);
    setCurrentRatingComponent(currentComponent.key);
    
    // Add consent message
    const consentMessage: ChatMessage = {
      id: `rating-consent-${Date.now()}`,
      type: 'bot',
      content: 'rating-consent-prompt', // Special marker for rendering consent UI
      timestamp: new Date(),
      messageType: 'feedback'
    };
    
    setMessages(prev => [...prev, consentMessage]);
    setIsProcessing(false);
    return;
  }
}

// 5. Update the feedback message to conditionally show ratings
// Replace lines 384-391 with:

// Provide feedback based on rating consent
const feedbackContent = hasRatingConsent 
  ? `Great! You've defined the ${currentComponent.label.toLowerCase()} aspect of your goal. 
     
     **Confidence Rating:** ${Math.round((goal.criteria[currentComponent.key as keyof typeof goal.criteria].confidence || 0) * 100)}%
     
     ${(response as any).aiFeedback || ''}`
  : `Great! You've defined the ${currentComponent.label.toLowerCase()} aspect of your goal. ${(response as any).aiFeedback || ''}`;

const feedbackMessage: ChatMessage = {
  id: `feedback-${Date.now()}`,
  type: 'bot',
  content: feedbackContent,
  timestamp: new Date(),
  messageType: 'feedback'
};

// 6. Update message rendering to handle rating consent
// In the messages.map section (around line 515), add special handling:

{messages.map((message) => {
  // Special handling for rating consent prompt
  if (message.content === 'rating-consent-prompt' && showRatingPrompt) {
    return (
      <div key={message.id} className="flex justify-start">
        <div className="max-w-md">
          <RatingConsentMessage
            component={currentRatingComponent || 'this'}
            onAccept={() => {
              setHasRatingConsent(true);
              setShowRatingPrompt(false);
              // Remove the consent message and show rating
              setMessages(prev => prev.filter(m => m.id !== message.id));
              // Add rating message
              const ratingMessage: ChatMessage = {
                id: `rating-${Date.now()}`,
                type: 'bot',
                content: `The confidence rating for the ${currentRatingComponent} aspect is: **${Math.round((goal.criteria[currentRatingComponent as keyof typeof goal.criteria]?.confidence || 0) * 100)}%**\n\nThis indicates how well-defined this component is based on your input.`,
                timestamp: new Date(),
                messageType: 'feedback'
              };
              setMessages(prev => [...prev, ratingMessage]);
            }}
            onDecline={() => {
              setHasRatingConsent(false);
              setShowRatingPrompt(false);
              // Remove the consent message
              setMessages(prev => prev.filter(m => m.id !== message.id));
            }}
          />
        </div>
      </div>
    );
  }
  
  // Regular message rendering (existing code)
  return (
    <div
      key={message.id}
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {/* ... existing message rendering code ... */}
    </div>
  );
})}

// 7. Add user preference storage for rating consent
// Add this function after line 650:

const saveRatingPreference = async (showRatings: boolean) => {
  try {
    // This would save to backend/localStorage
    localStorage.setItem('goal_rating_preference', showRatings.toString());
    
    // If using backend storage:
    // await goalAPI.saveUserPreference('show_confidence_ratings', showRatings);
  } catch (error) {
    console.error('Failed to save rating preference:', error);
  }
};

const loadRatingPreference = (): boolean | null => {
  try {
    const saved = localStorage.getItem('goal_rating_preference');
    return saved ? saved === 'true' : null;
  } catch {
    return null;
  }
};

// 8. Update component initialization to check saved preference
// Add to useEffect at line 110:

useEffect(() => {
  if (isVisible && messages.length === 0) {
    // Check saved rating preference
    const savedPreference = loadRatingPreference();
    if (savedPreference !== null) {
      setHasRatingConsent(savedPreference);
    }
    
    initializeChat();
  }
}, [isVisible]);

// 9. Add option to remember rating preference
// Update RatingConsentMessage component:

const RatingConsentMessage = ({ component, onAccept, onDecline }: { 
  component: string; 
  onAccept: (remember: boolean) => void; 
  onDecline: (remember: boolean) => void;
}) => {
  const [rememberChoice, setRememberChoice] = useState(false);
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Would you like to see confidence ratings?
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            I can show you how confident the system is about each aspect of your goal. 
            This is optional and won't affect your goal creation.
          </p>
          
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="remember-rating-choice"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remember-rating-choice" className="ml-2 text-sm text-blue-700 dark:text-blue-300">
              Remember my choice for future goals
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => onAccept(rememberChoice)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Show Ratings
            </button>
            <button
              onClick={() => onDecline(rememberChoice)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Skip Ratings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};