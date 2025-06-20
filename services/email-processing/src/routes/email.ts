import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { EmailSyncService } from '@/services/email-sync';
import { config } from '@/config/environment';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Initialize email sync service
const emailSyncService = new EmailSyncService({
  gmail: {
    clientId: config.email.gmail.clientId!,
    clientSecret: config.email.gmail.clientSecret!,
    redirectUri: config.email.gmail.redirectUri!,
  },
  ai: {
    openaiApiKey: config.ai.openai.apiKey!,
    model: config.ai.openai.model,
  },
  database: {
    url: config.database.url,
  },
});

// POST /api/v1/emails/sync
router.post('/sync', async (req, res) => {
  try {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    const { user_id, access_token, sync_options = {} } = req.body;

    if (!user_id || !access_token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'user_id and access_token are required',
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Starting email sync', {
      correlationId,
      userId: user_id,
      syncOptions: sync_options,
    });

    // Store or update email provider configuration
    await prisma.emailProvider.upsert({
      where: {
        userId_providerType: {
          userId: user_id,
          providerType: 'GMAIL',
        },
      },
      update: {
        accessToken: access_token,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user_id,
        providerType: 'GMAIL',
        accessToken: access_token,
        isActive: true,
      },
    });

    // Create sync job
    const syncOptions: any = {
      labels: sync_options.labels || ['INBOX'],
      maxResults: sync_options.max_results || 100,
    };
    
    if (sync_options.since) {
      syncOptions.since = new Date(sync_options.since);
    }
    
    const job = await emailSyncService.createSyncJob(user_id, syncOptions);

    res.status(202).json({
      job_id: job.jobId,
      state: job.status,
      percent_complete: job.progress,
      created_at: job.createdAt.toISOString(),
      correlation_id: correlationId,
    });
  } catch (error) {
    logger.error('Email sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.headers['x-correlation-id'],
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to start email sync',
      correlation_id: req.headers['x-correlation-id'],
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/v1/emails/digest
router.post('/digest', async (req, res) => {
  try {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    const { user_id, time_window, labels = [], categories = [] } = req.body;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const cursor = req.query['cursor'] as string;

    if (!user_id || !time_window) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'user_id and time_window are required',
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Generating email digest', {
      correlationId,
      userId: user_id,
      timeWindow: time_window,
      labels,
      categories,
    });

    // Build query filters
    const whereClause: any = {
      userId: user_id,
      receivedAt: {
        gte: new Date(time_window.start),
        lte: new Date(time_window.end),
      },
    };

    if (labels.length > 0) {
      whereClause.labels = {
        hasSome: labels,
      };
    }

    if (categories.length > 0) {
      whereClause.summary = {
        category: {
          in: categories.map((c: string) => c.toUpperCase()),
        },
      };
    }

    // Get emails with summaries
    const emails = await prisma.email.findMany({
      where: whereClause,
      include: {
        summary: true,
        actionItems: true,
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: limit + 1, // Take one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = emails.length > limit;
    const emailsToReturn = hasMore ? emails.slice(0, -1) : emails;

    // Generate digest summary
    const totalEmails = emailsToReturn.length;
    const urgentCount = emailsToReturn.filter((e: any) => e.summary?.category === 'URGENT').length;
    const actionableCount = emailsToReturn.filter((e: any) => e.actionItems.length > 0).length;

    const digestSummary = `You have ${totalEmails} emails in this time window. ${urgentCount} require urgent attention and ${actionableCount} contain actionable items.`;

    // Format response
    const digestItems = emailsToReturn.map((email: any) => ({
      email_id: email.id,
      subject: email.subject,
      sender: email.sender,
      category: email.summary?.category?.toLowerCase() || 'informational',
      summary: email.summary?.summary || email.snippet || '',
      action_items: email.actionItems.map((item: any) => item.text),
      received_at: email.receivedAt.toISOString(),
    }));

    const digestId = uuidv4();

    res.json({
      digest_id: digestId,
      generated_at: new Date().toISOString(),
      summary: digestSummary,
      emails: digestItems,
      pagination: {
        limit,
        cursor: hasMore ? emailsToReturn[emailsToReturn.length - 1].id : undefined,
        has_more: hasMore,
        total_count: totalEmails,
      },
    });
  } catch (error) {
    logger.error('Email digest generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.headers['x-correlation-id'],
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate email digest',
      correlation_id: req.headers['x-correlation-id'],
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/v1/emails/:email_id/summary
router.get('/:email_id/summary', async (req, res) => {
  try {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    const { email_id } = req.params;

    const email = await prisma.email.findUnique({
      where: { id: email_id },
      include: { summary: true },
    });

    if (!email) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email not found',
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    if (!email.summary) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email summary not available',
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      email_id: email.id,
      subject: email.subject,
      sender: email.sender,
      summary: email.summary.summary,
      category: email.summary.category.toLowerCase(),
      confidence_score: email.summary.confidenceScore,
      key_points: email.summary.keyPoints,
      received_at: email.receivedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get email summary', {
      error: error instanceof Error ? error.message : 'Unknown error',
      emailId: req.params.email_id,
      correlationId: req.headers['x-correlation-id'],
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve email summary',
      correlation_id: req.headers['x-correlation-id'],
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/v1/emails/:email_id/action-items
router.get('/:email_id/action-items', async (req, res) => {
  try {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    const { email_id } = req.params;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const email = await prisma.email.findUnique({
      where: { id: email_id },
    });

    if (!email) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email not found',
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    const actionItems = await prisma.actionItem.findMany({
      where: { emailId: email_id },
      orderBy: { extractedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.actionItem.count({
      where: { emailId: email_id },
    });

    res.json({
      email_id,
      action_items: actionItems.map((item: any) => ({
        text: item.text,
        confidence_score: item.confidenceScore,
        priority: item.priority.toLowerCase(),
        deadline: item.deadline?.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        has_more: offset + actionItems.length < totalCount,
        total_count: totalCount,
      },
    });
  } catch (error) {
    logger.error('Failed to get action items', {
      error: error instanceof Error ? error.message : 'Unknown error',
      emailId: req.params.email_id,
      correlationId: req.headers['x-correlation-id'],
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve action items',
      correlation_id: req.headers['x-correlation-id'],
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/v1/jobs/:job_id
router.get('/jobs/:job_id', async (req, res) => {
  try {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    const { job_id } = req.params;

    const job = await emailSyncService.getSyncJob(job_id);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found',
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      job_id: job.jobId,
      state: job.status,
      percent_complete: job.progress,
      result_location: job.status === 'completed' ? `/api/v1/emails/sync/results/${job_id}` : undefined,
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString(),
      metadata: {
        user_id: job.userId,
        operation: 'email_sync',
        emails_processed: job.emailsSynced || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get job status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId: req.params.job_id,
      correlationId: req.headers['x-correlation-id'],
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve job status',
      correlation_id: req.headers['x-correlation-id'],
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as emailRoutes };