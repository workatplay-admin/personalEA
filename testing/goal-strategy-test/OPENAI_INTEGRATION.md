# OpenAI Integration for SMART Goal Clarification

This document explains how to use the new OpenAI-powered API server for intelligent goal clarification.

## Overview

The OpenAI integration replaces the mock API with real AI-powered goal analysis and clarification. It provides:

- **Intelligent Goal Analysis**: Uses GPT-4 to analyze goals and identify missing SMART criteria
- **Context-Aware Clarification**: Provides personalized suggestions based on user input
- **Dynamic Confidence Scoring**: Real-time assessment of goal quality
- **Fallback Support**: Graceful degradation if OpenAI API is unavailable

## Setup Instructions

### 1. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### 2. Start the OpenAI-Powered Server

```bash
# Option 1: Run OpenAI server only
npm run openai-api

# Option 2: Run both OpenAI server and frontend
npm run test-env-openai
```

### 3. Configure API Key in Frontend

When you open the application, you'll see an API configuration dialog. Enter:
- **JWT Token**: Any test token (e.g., `test-token-123`)
- **OpenAI API Key**: Your actual OpenAI API key

## API Endpoints

### POST `/api/v1/goals/translate`

Analyzes a raw goal and converts it to SMART format.

**Headers Required:**
```
X-OpenAI-API-Key: your-openai-api-key
Authorization: Bearer your-jwt-token
```

**Request:**
```json
{
  "raw_goal": "I want to get better at programming"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "goal-1234567890",
    "title": "Become proficient in TypeScript development",
    "criteria": {
      "specific": {
        "value": "Focus on TypeScript programming skills",
        "confidence": 0.7,
        "missing": ["Specific learning areas"]
      },
      "measurable": {
        "value": "No clear metrics defined",
        "confidence": 0.2,
        "missing": ["Success metrics", "Progress indicators"]
      },
      // ... other criteria
    },
    "confidence": 0.45
  }
}
```

### POST `/api/v1/goals/:goalId/clarify`

Improves a specific SMART component based on user clarification.

**Request:**
```json
{
  "clarifications": {
    "specific": "I want to become a senior TypeScript developer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "goal-1234567890",
    "criteria": {
      "specific": {
        "value": "Advance to senior-level TypeScript development expertise",
        "confidence": 0.9,
        "missing": []
      }
      // ... updated criteria
    }
  },
  "message": "Great! Your goal is now much more specific and focused."
}
```

## Features

### 1. Intelligent Analysis

The AI analyzes goals for:
- **Specificity**: Identifies vague language and suggests concrete focus areas
- **Measurability**: Detects missing metrics and suggests tracking methods
- **Achievability**: Assesses realistic scope based on context
- **Relevance**: Evaluates alignment with implied priorities
- **Time-bound**: Identifies missing deadlines and suggests timelines

### 2. Context-Aware Responses

- Remembers previous clarifications in the conversation
- Provides personalized suggestions based on user's domain (programming, fitness, etc.)
- Adapts language and examples to match user's goal type

### 3. Progressive Enhancement

- Each clarification improves the overall goal quality
- Confidence scores increase as components are refined
- AI provides encouraging feedback to maintain user engagement

### 4. Error Handling

- Graceful fallback if OpenAI API is unavailable
- Rate limiting protection
- Clear error messages for debugging

## Switching Between Mock and OpenAI

### Use Mock API (for development/testing):
```bash
npm run test-env
```

### Use OpenAI API (for real AI):
```bash
npm run test-env-openai
```

## Cost Considerations

- Uses GPT-4 for high-quality responses
- Typical cost: ~$0.01-0.03 per goal clarification session
- Implements token limits to control costs
- Fallback prevents failures from affecting user experience

## Troubleshooting

### Common Issues:

1. **"OpenAI API key required" error**
   - Ensure you've entered a valid API key in the frontend
   - Check that the key starts with `sk-`

2. **"Rate limit exceeded" error**
   - Wait a few minutes and try again
   - Consider upgrading your OpenAI plan

3. **"Model not found" error**
   - Ensure your OpenAI account has access to GPT-4
   - Fallback will use basic analysis

### Debug Mode:

Check the browser console and server logs for detailed error information.

## Next Steps

1. **Enhanced Prompts**: Improve AI prompts for better responses
2. **Conversation Memory**: Add context retention across sessions
3. **Custom Models**: Fine-tune models for specific goal types
4. **Batch Processing**: Optimize for multiple goals
5. **Analytics**: Track goal improvement metrics

## Security Notes

- API keys are only sent to OpenAI, never stored on our servers
- All communication uses HTTPS
- No personal data is retained after session ends