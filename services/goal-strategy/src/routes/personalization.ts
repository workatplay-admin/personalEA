/**
 * Personalization Routes
 * 
 * API endpoints for personalized user experiences in the goal-strategy service
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '@/middleware/auth';
import { personalizationOrchestrator } from '@/services/personalization-orchestrator';
import { userProfileDetector } from '@/services/user-profile-detector';
import { personalizedExampleGenerator } from '@/services/personalized-example-generator';
import { adaptiveUIManager } from '@/services/adaptive-ui-manager';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Initialize personalized session
 * POST /api/v1/personalization/session
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { initialInput, userId } = req.body;
    const sessionId = generateSessionId();

    const context = await personalizationOrchestrator.initializeSession(
      sessionId,
      initialInput,
      userId
    );

    res.json({
      success: true,
      data: {
        sessionId,
        profile: {
          expertiseLevel: context.profile.expertiseLevel,
          primaryDomain: context.profile.primaryDomain,
          communicationStyle: context.profile.communicationStyle,
          accessibilityNeeds: context.profile.accessibilityNeeds
        },
        uiConfiguration: context.uiConfig,
        onboarding: await personalizationOrchestrator.generateOnboarding(sessionId)
      }
    });
  } catch (error) {
    logger.error('Failed to initialize personalized session', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to initialize session'
    });
  }
});

/**
 * Process goal with personalization
 * POST /api/v1/personalization/goal
 */
router.post('/goal', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { sessionId, goal, context } = req.body;
    const userApiKey = req.headers['x-openai-api-key'] as string;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }

    const result = await personalizationOrchestrator.processPersonalizedGoal(
      sessionId,
      { goal, context },
      userApiKey
    );

    res.json({
      success: true,
      data: {
        goal: result.goalResult,
        personalization: result.personalization
      }
    });
  } catch (error) {
    logger.error('Failed to process personalized goal', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process goal'
    });
  }
});

/**
 * Get personalized examples
 * GET /api/v1/personalization/examples
 */
router.get('/examples', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { sessionId, domain, count = 3 } = req.query;
    
    // Get user profile from session or detect it
    let profile;
    if (sessionId) {
      // Get from session context
      const context = await personalizationOrchestrator.initializeSession(
        sessionId as string
      );
      profile = context.profile;
    } else {
      // Detect from request
      profile = await userProfileDetector.detectProfile('', []);
    }

    // Override domain if specified
    if (domain) {
      profile.primaryDomain = domain as string;
    }

    const examples = personalizedExampleGenerator.generateExamples(
      profile,
      parseInt(count as string)
    );

    res.json({
      success: true,
      data: {
        examples,
        profile: {
          domain: profile.primaryDomain,
          expertiseLevel: profile.expertiseLevel
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get personalized examples', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get examples'
    });
  }
});

/**
 * Get personalized help
 * POST /api/v1/personalization/help
 */
router.post('/help', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { sessionId, topic, context } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }

    const helpResponse = await personalizationOrchestrator.handleHelpRequest(
      sessionId,
      topic,
      context
    );

    res.json({
      success: true,
      data: helpResponse
    });
  } catch (error) {
    logger.error('Failed to get personalized help', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get help'
    });
  }
});

/**
 * Detect user profile
 * POST /api/v1/personalization/profile/detect
 */
router.post('/profile/detect', async (req: Request, res: Response) => {
  try {
    const { input, conversationHistory } = req.body;

    const profile = await userProfileDetector.detectProfile(
      input || '',
      conversationHistory || []
    );

    res.json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    logger.error('Failed to detect user profile', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to detect profile'
    });
  }
});

/**
 * Get UI configuration
 * POST /api/v1/personalization/ui/config
 */
router.post('/ui/config', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Profile required'
      });
    }

    const uiConfig = adaptiveUIManager.generateUIConfiguration(profile);

    res.json({
      success: true,
      data: {
        configuration: uiConfig
      }
    });
  } catch (error) {
    logger.error('Failed to generate UI configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate configuration'
    });
  }
});

/**
 * Get quick start templates
 * GET /api/v1/personalization/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { domain, expertiseLevel } = req.query;

    // Create a basic profile for template generation
    const profile = await userProfileDetector.detectProfile('', []);
    
    if (domain) {
      profile.primaryDomain = domain as string;
    }
    if (expertiseLevel) {
      profile.expertiseLevel = expertiseLevel as any;
    }

    const templates = personalizedExampleGenerator.generateQuickStartTemplates(profile);

    res.json({
      success: true,
      data: {
        templates,
        profile: {
          domain: profile.primaryDomain,
          expertiseLevel: profile.expertiseLevel
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get templates', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * Update user preferences
 * PUT /api/v1/personalization/preferences
 */
router.put('/preferences', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
      return res.status(400).json({
        success: false,
        error: 'User ID and preferences required'
      });
    }

    // In real implementation, save to database
    logger.info('Updating user preferences', { userId, preferences });

    res.json({
      success: true,
      data: {
        message: 'Preferences updated successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to update preferences', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * Get accessibility recommendations
 * POST /api/v1/personalization/accessibility
 */
router.post('/accessibility', async (req: Request, res: Response) => {
  try {
    const { userInput, currentSettings } = req.body;

    // Detect accessibility needs from input patterns
    const profile = await userProfileDetector.detectProfile(userInput || '', []);
    
    const recommendations = {
      fontSize: profile.accessibilityNeeds.preferSimpleLanguage ? 'large' : 'medium',
      contrast: profile.accessibilityNeeds.requiresHighContrast ? 'high' : 'normal',
      language: profile.languageComplexity,
      features: {
        showExamples: profile.accessibilityNeeds.needsVisualCues || false,
        simplifyLanguage: profile.accessibilityNeeds.preferSimpleLanguage || false,
        audioGuidance: profile.accessibilityNeeds.preferAudioGuidance || false
      }
    };

    res.json({
      success: true,
      data: {
        recommendations,
        profile: profile.accessibilityNeeds
      }
    });
  } catch (error) {
    logger.error('Failed to get accessibility recommendations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default router;