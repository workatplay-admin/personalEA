// FIX 2: goals.ts endpoint modifications to implement consent mechanisms

// This file shows the necessary changes to goals.ts API endpoints
// to implement user consent before automatic transformation

// CHANGES TO IMPLEMENT:

// 1. Add consent schema
// Add after line 31:

const consentSchema = z.object({
  transform_automatically: z.boolean().default(false),
  remember_preference: z.boolean().default(false)
});

// 2. Update translateGoalSchema to include consent
// Replace lines 13-22 with:

const translateGoalSchema = z.object({
  raw_goal: z.string().min(1, 'Goal cannot be empty'),
  context: z.object({
    timeframe: z.string().optional(),
    resources: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
  }).optional(),
  mode: z.enum(['automatic', 'interactive']).optional().default('interactive'), // DEFAULT TO INTERACTIVE
  consent: consentSchema.optional()
});

// 3. Create new endpoint for consent check
// Add after line 93:

/**
 * POST /api/v1/goals/check-consent
 * Check if user has previously consented to automatic transformation
 */
router.post('/check-consent', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // Check user preferences in database
    const userPreference = await prisma.userPreference.findFirst({
      where: {
        userId,
        key: 'goal_auto_transform_consent'
      }
    });
    
    res.json({
      success: true,
      data: {
        has_consent: userPreference?.value === 'true',
        consent_date: userPreference?.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// 4. Update translate endpoint to respect consent
// Replace lines 99-175 with:

router.post('/translate', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const { raw_goal, context, mode, consent } = translateGoalSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string;
    const userId = req.user!.id;

    logger.info('Goal translation request', {
      correlationId,
      userId,
      rawGoal: raw_goal,
      mode,
      hasConsent: consent?.transform_automatically,
      hasUserApiKey: !!userApiKey
    });

    // Validate API key if provided
    if (userApiKey && !userApiKey.startsWith('sk-')) {
      res.status(400).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid OpenAI API key format',
          correlationId
        }
      });
      return;
    }

    // Check consent for automatic transformation
    let effectiveMode = mode;
    if (mode === 'automatic' && !consent?.transform_automatically) {
      // Check stored preference
      const userPreference = await prisma.userPreference.findFirst({
        where: {
          userId,
          key: 'goal_auto_transform_consent'
        }
      });
      
      if (userPreference?.value !== 'true') {
        // No consent, force interactive mode
        effectiveMode = 'interactive';
        logger.info('No consent for automatic transformation, using interactive mode', {
          correlationId,
          userId
        });
      }
    }

    // Store consent preference if requested
    if (consent?.remember_preference && consent.transform_automatically !== undefined) {
      await prisma.userPreference.upsert({
        where: {
          userId_key: {
            userId,
            key: 'goal_auto_transform_consent'
          }
        },
        update: {
          value: consent.transform_automatically.toString(),
          updatedAt: new Date()
        },
        create: {
          userId,
          key: 'goal_auto_transform_consent',
          value: consent.transform_automatically.toString()
        }
      });
    }

    const input: RawGoalInput = {
      goal: raw_goal,
      context: context ? Object.fromEntries(
        Object.entries({
          timeframe: context.timeframe,
          resources: context.resources,
          constraints: context.constraints,
          priority: context.priority
        }).filter(([_, value]) => value !== undefined)
      ) as any : undefined,
      mode: effectiveMode
    };

    const result = await smartGoalProcessor.translateGoal(input, userApiKey);

    // Save the goal to database so clarify endpoint can find it
    const savedGoal = await prisma.goal.create({
      data: {
        id: correlationId, // Use correlation ID as goal ID
        userId,
        title: result.smartGoal,
        rawGoal: raw_goal,
        smartCriteria: result.smartCriteria as any,
        status: 'DRAFT', // Start as DRAFT in interactive mode
        mode: effectiveMode
      }
    });

    res.json({
      success: true,
      data: {
        id: savedGoal.id,
        title: result.smartGoal,
        description: result.smartGoal,
        criteria: result.smartCriteria,
        missingCriteria: result.missingCriteria,
        clarificationQuestions: result.clarificationQuestions,
        confidence: result.confidence,
        correlation_id: correlationId,
        status: 'DRAFT',
        priority: 'MEDIUM',
        mode: result.mode,
        needsRefinement: result.needsRefinement,
        consentRequired: mode === 'automatic' && effectiveMode === 'interactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

// 5. Add new endpoint for analyzing without transformation
// Add after line 978:

/**
 * POST /api/v1/goals/analyze
 * Analyze a goal without any transformation - pure analysis only
 */
router.post('/analyze', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const { raw_goal, context } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string;

    logger.info('Goal analysis (no transformation) request', {
      correlationId,
      userId: req.user?.id,
      rawGoal: raw_goal
    });

    const input: RawGoalInput = {
      goal: raw_goal,
      context,
      mode: 'interactive' // Always interactive for analysis
    };

    const analysis = await smartGoalProcessor.analyzeGoalInteractive(input, userApiKey);

    res.json({
      success: true,
      data: {
        rawGoal: analysis.rawGoal,
        analysis: analysis.analysis,
        smartComponents: analysis.smartComponents,
        confidence: analysis.confidence,
        recommendedQuestions: analysis.recommendedQuestions,
        requiresUserInput: true,
        message: 'This is an analysis of your goal. No automatic transformation has been applied.'
      },
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});