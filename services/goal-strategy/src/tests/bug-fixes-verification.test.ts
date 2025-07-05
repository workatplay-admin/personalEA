/**
 * Bug Fixes Verification Test
 * 
 * Tests that verify the chat interface bugs have been fixed:
 * 1. "todday" input normalization
 * 2. Score calculation doesn't drop to 0%
 * 3. Conversation loop detection
 * 4. Time-bound scoring improvements
 */

import { enhancedLLMChatCoordinator } from '../services/enhanced-llm-chat-coordinator';

describe('Enhanced Chat Bug Fixes', () => {
  let sessionId: string;

  beforeEach(() => {
    sessionId = `test-session-${Date.now()}`;
  });

  test('BUG FIX 1: Input normalization handles "todday" correctly', async () => {
    // Initialize session
    const memory = await enhancedLLMChatCoordinator.initializeSession(
      sessionId,
      'I want to complete my project today',
      'test-user'
    );

    expect(memory).toBeDefined();
    expect(memory.sessionId).toBe(sessionId);
    
    // Test that the normalization would work
    const coordinator = enhancedLLMChatCoordinator as any;
    const normalized = coordinator.normalizeUserInput('todday');
    expect(normalized).toBe('today');
    
    const normalized2 = coordinator.normalizeUserInput('I need to finish todday');
    expect(normalized2).toBe('i need to finish today');
  });

  test('BUG FIX 2: Score calculation does not drop to 0% incorrectly', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    // Test the score calculation function
    const mockArgs = {
      timeBound: 85,
      rationale: 'User provided specific date'
    };
    
    const updates = coordinator.calculateUpdatedScores(mockArgs);
    
    expect(updates.timeBound).toBe(85);
    expect(updates.overall).toBeUndefined(); // Should not calculate overall in this function
  });

  test('BUG FIX 3: Conversation loop detection works', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    // Create mock memory with repetitive assistant messages
    const mockMemory = {
      sessionId: 'test',
      messages: [
        { role: 'assistant', content: 'What is your target completion date for this goal?' },
        { role: 'user', content: 'today' },
        { role: 'assistant', content: 'What is your target completion date for this goal?' },
        { role: 'user', content: 'today' },
        { role: 'assistant', content: 'What is your target completion date for this goal?' }
      ]
    };
    
    const isLoop = coordinator.detectConversationLoop(mockMemory, 'today');
    expect(isLoop).toBe(true); // Should detect the loop
  });

  test('BUG FIX 4: Message similarity calculation works correctly', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    const msg1 = 'What is your target completion date for this goal?';
    const msg2 = 'What is your target completion date for this goal?';
    const msg3 = 'How can I help you today?';
    
    const similarity1 = coordinator.calculateMessageSimilarity(msg1, msg2);
    const similarity2 = coordinator.calculateMessageSimilarity(msg1, msg3);
    
    expect(similarity1).toBe(1.0); // Identical messages
    expect(similarity2).toBeLessThan(0.5); // Different messages
  });

  test('BUG FIX 5: Loop breaking response generation', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    const mockMemory = {
      currentGoal: {
        scores: {
          specific: 70,
          measurable: 60,
          achievable: 80,
          relevant: 75,
          timeBound: 40, // Lowest score
          overall: 65
        }
      }
    };
    
    const response = coordinator.generateLoopBreakingResponse(mockMemory);
    
    expect(response.content).toContain('going in circles');
    expect(response.content).toContain('timebound'); // Should focus on lowest score
    expect(response.uiUpdates.highlightComponents).toContain('timeBound');
  });

  test('BUG FIX 6: Time normalization variants work', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    const testCases = [
      { input: 'todday', expected: 'today' },
      { input: 'toady', expected: 'today' },
      { input: 'tooday', expected: 'today' },
      { input: 'tommorrow', expected: 'tomorrow' },
      { input: 'nexxt week', expected: 'next week' },
      { input: 'asap', expected: 'as soon as possible' }
    ];
    
    testCases.forEach(({ input, expected }) => {
      const result = coordinator.normalizeUserInput(input);
      expect(result).toBe(expected);
    });
  });

  test('BUG FIX 7: System prompt contains time-bound scoring rules', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    const mockMemory = {
      currentGoal: {
        rawInput: 'Test goal',
        scores: { specific: 80, measurable: 70, achievable: 90, relevant: 85, timeBound: 60, overall: 77 },
        targetThreshold: 80
      },
      conversationPhase: 'refinement',
      contextData: {
        userProfile: {
          expertiseLevel: 'intermediate',
          communicationStyle: 'casual',
          domain: 'technology'
        }
      }
    };
    
    const prompt = coordinator.buildEnhancedSystemPrompt(mockMemory);
    
    expect(prompt).toContain('TIME-BOUND SCORING RULES');
    expect(prompt).toContain('"today" = 90% score');
    expect(prompt).toContain('"tomorrow" = 85% score');
    expect(prompt).toContain('MANDATORY');
    expect(prompt).toContain('update_smart_scores function');
  });

  test('BUG FIX 8: Score validation prevents invalid values', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    // Test extreme values
    const mockArgs1 = { timeBound: 150 }; // Too high
    const mockArgs2 = { timeBound: -10 }; // Too low
    const mockArgs3 = { timeBound: 85 };  // Valid
    
    const updates1 = coordinator.calculateUpdatedScores(mockArgs1);
    const updates2 = coordinator.calculateUpdatedScores(mockArgs2);
    const updates3 = coordinator.calculateUpdatedScores(mockArgs3);
    
    expect(updates1.timeBound).toBe(100); // Clamped to max
    expect(updates2.timeBound).toBe(0);   // Clamped to min
    expect(updates3.timeBound).toBe(85);  // Valid value preserved
  });

  test('BUG FIX 9: Memory retrieval works correctly', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    // Test getting non-existent memory
    const memory1 = coordinator.getConversationMemory('non-existent');
    expect(memory1).toBeUndefined();
  });

  test('BUG FIX 10: Goal completion detection works', () => {
    const coordinator = enhancedLLMChatCoordinator as any;
    
    // Mock a conversation in the coordinator's memory
    const mockMemory = {
      currentGoal: {
        scores: {
          specific: 85,
          measurable: 90,
          achievable: 88,
          relevant: 92,
          timeBound: 87,
          overall: 88.4
        },
        targetThreshold: 80
      }
    };
    
    coordinator.conversations.set('complete-session', mockMemory);
    
    const isComplete = coordinator.isGoalComplete('complete-session');
    expect(isComplete).toBe(true);
    
    // Test incomplete goal
    const incompleteMemory = {
      currentGoal: {
        scores: {
          specific: 85,
          measurable: 70, // Below threshold
          achievable: 88,
          relevant: 92,
          timeBound: 87,
          overall: 84.4
        },
        targetThreshold: 80
      }
    };
    
    coordinator.conversations.set('incomplete-session', incompleteMemory);
    
    const isIncomplete = coordinator.isGoalComplete('incomplete-session');
    expect(isIncomplete).toBe(false);
  });
});

export {};