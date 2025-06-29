// File: services/goal-strategy/src/routes/goals-chat-endpoints.ts
// Replace the callOpenAI function (lines 36-74) with this improved version:

// Helper function to call OpenAI API with retry logic
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 300,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorData = await response.text();
        const statusCode = response.status;
        
        // Don't retry on client errors (4xx)
        if (statusCode >= 400 && statusCode < 500) {
          logger.error('OpenAI API client error', {
            status: statusCode,
            error: errorData,
            attempt
          });
          throw new Error(`OpenAI API error: ${statusCode} - ${errorData}`);
        }
        
        // Retry on server errors (5xx) or rate limits
        if (statusCode === 429 || statusCode >= 500) {
          lastError = new Error(`OpenAI API error: ${statusCode}`);
          
          if (attempt < maxRetries) {
            // Exponential backoff with jitter
            const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000);
            logger.warn('OpenAI API error, retrying', {
              status: statusCode,
              attempt,
              nextAttemptIn: delay,
              maxRetries
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`OpenAI API call failed: ${statusCode}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };
      
      const content = data.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Success - log and return
      if (attempt > 1) {
        logger.info('OpenAI API call succeeded after retry', { attempt });
      }
      
      return content;
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on abort/timeout in last attempt
      if (error.name === 'AbortError' && attempt === maxRetries) {
        logger.error('OpenAI API timeout', { attempt, maxRetries });
        throw new Error('OpenAI API request timed out');
      }
      
      // Log and potentially retry
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.warn('OpenAI API error, retrying', {
          error: error.message,
          attempt,
          nextAttemptIn: delay,
          maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // All retries exhausted
  logger.error('OpenAI API call failed after all retries', {
    error: lastError?.message,
    maxRetries
  });
  
  throw lastError || new Error('OpenAI API call failed');
}