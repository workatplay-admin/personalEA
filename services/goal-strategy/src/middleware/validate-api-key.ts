/**
 * API Key Validation Middleware
 * 
 * Validates API keys for external services like OpenAI
 */

import { Request, Response, NextFunction } from 'express';

export const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-openai-api-key'] as string;
  
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key is required'
      }
    });
  }
  
  next();
};

export default validateAPIKey;