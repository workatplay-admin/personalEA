// CRITICAL FIX: Modify error handler to differentiate between service unavailable and upstream errors
// File: services/goal-strategy/src/middleware/error-handler.ts
// Replace lines 137-147 with:

if (error.message.includes('OpenAI') || error.message.includes('AI')) {
  // Return 502 Bad Gateway for upstream API failures instead of 503
  // This indicates the backend is working but the upstream service failed
  res.status(502).json({
    error: {
      code: 'AI_SERVICE_ERROR',
      message: 'AI service temporarily unavailable. Please try again.',
      correlationId,
      // Add retry hint for frontend
      retryable: true,
      suggestedRetryAfter: 5 // seconds
    }
  });
  return;
}