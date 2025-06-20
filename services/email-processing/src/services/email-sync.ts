import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { GmailProvider } from '@/providers/gmail-provider';
import { AIProcessor } from '@/services/ai-processor';
import { Email, EmailSyncJob, JobStatus, SyncOptions } from '@/types/email';
import { v4 as uuidv4 } from 'uuid';

export interface EmailSyncConfig {
  gmail: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  ai: {
    openaiApiKey: string;
    model?: string;
  };
  database: {
    url: string;
  };
}

export class EmailSyncService {
  private prisma: PrismaClient;
  private gmailProvider: GmailProvider;
  private aiProcessor: AIProcessor;

  constructor(private config: EmailSyncConfig) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
    });

    this.gmailProvider = new GmailProvider(config.gmail);
    this.aiProcessor = new AIProcessor(config.ai);
  }

  async createSyncJob(userId: string, syncOptions: SyncOptions): Promise<EmailSyncJob> {
    const jobId = uuidv4();

    logger.info('Creating email sync job', {
      jobId,
      userId,
      syncOptions,
    });

    const job = await this.prisma.emailSyncJob.create({
      data: {
        id: jobId,
        userId,
        syncOptions: syncOptions as any,
        status: 'PENDING',
        progress: 0,
      },
    });

    // Start the sync process asynchronously
    this.processSyncJob(jobId).catch((error) => {
      logger.error('Sync job failed', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return {
      jobId: job.id,
      userId: job.userId,
      status: job.status as JobStatus,
      progress: job.progress,
      syncOptions: job.syncOptions as SyncOptions,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async getSyncJob(jobId: string): Promise<EmailSyncJob | null> {
    const job = await this.prisma.emailSyncJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    return {
      jobId: job.id,
      userId: job.userId,
      status: job.status as JobStatus,
      progress: job.progress,
      syncOptions: job.syncOptions as SyncOptions,
      emailsFound: job.emailsFound || undefined,
      emailsSynced: job.emailsSynced || undefined,
      errors: job.errors as string[] || undefined,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private async processSyncJob(jobId: string): Promise<void> {
    const job = await this.prisma.emailSyncJob.findUnique({
      where: { id: jobId },
      include: { user: true },
    });

    if (!job) {
      throw new Error(`Sync job ${jobId} not found`);
    }

    try {
      // Update job status to running
      await this.updateJobStatus(jobId, JobStatus.RUNNING, 0);

      // Get user's email provider configuration
      const emailProvider = await this.prisma.emailProvider.findFirst({
        where: {
          userId: job.userId,
          providerType: 'GMAIL',
          isActive: true,
        },
      });

      if (!emailProvider || !emailProvider.accessToken) {
        throw new Error('No active Gmail provider found for user');
      }

      // Authenticate with Gmail
      await this.gmailProvider.authenticate(
        emailProvider.accessToken,
        emailProvider.refreshToken || undefined
      );

      // Test connection
      const connectionOk = await this.gmailProvider.testConnection();
      if (!connectionOk) {
        throw new Error('Failed to connect to Gmail');
      }

      const syncOptions = job.syncOptions as SyncOptions;
      let totalEmails = 0;
      let syncedEmails = 0;
      let pageToken: string | undefined;
      const errors: string[] = [];

      logger.info('Starting email sync', {
        jobId,
        userId: job.userId,
        syncOptions,
      });

      // Sync emails in batches
      do {
        try {
          const syncOptionsWithToken: SyncOptions = {
            ...syncOptions,
          };
          
          if (pageToken) {
            syncOptionsWithToken.pageToken = pageToken;
          }
          
          const result = await this.gmailProvider.syncEmails(syncOptionsWithToken);

          totalEmails += result.emails.length;

          // Process each email
          for (const email of result.emails) {
            try {
              await this.processAndStoreEmail(job.userId, email);
              syncedEmails++;

              // Update progress
              const progress = Math.min(
                Math.round((syncedEmails / Math.max(totalEmails, 1)) * 100),
                100
              );
              await this.updateJobProgress(jobId, progress, totalEmails, syncedEmails);
            } catch (error) {
              const errorMsg = `Failed to process email ${email.messageId}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`;
              errors.push(errorMsg);
              logger.warn('Email processing failed', {
                jobId,
                emailId: email.messageId,
                error: errorMsg,
              });
            }
          }

          pageToken = result.nextPageToken;
        } catch (error) {
          const errorMsg = `Batch sync failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          errors.push(errorMsg);
          logger.error('Batch sync failed', {
            jobId,
            error: errorMsg,
          });
          break;
        }
      } while (pageToken);

      // Complete the job
      await this.completeJob(jobId, totalEmails, syncedEmails, errors);

      logger.info('Email sync completed', {
        jobId,
        totalEmails,
        syncedEmails,
        errorsCount: errors.length,
      });
    } catch (error) {
      await this.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async processAndStoreEmail(userId: string, email: Email): Promise<void> {
    // Check if email already exists
    const existingEmail = await this.prisma.email.findUnique({
      where: { messageId: email.messageId },
    });

    if (existingEmail) {
      logger.debug('Email already exists, skipping', {
        messageId: email.messageId,
      });
      return;
    }

    // Store email in database
    const storedEmail = await this.prisma.email.create({
      data: {
        userId,
        messageId: email.messageId,
        threadId: email.threadId,
        subject: email.subject,
        sender: email.sender,
        recipients: email.recipients,
        ccRecipients: email.ccRecipients,
        bccRecipients: email.bccRecipients,
        textContent: email.textContent,
        htmlContent: email.htmlContent,
        snippet: email.snippet,
        labels: email.labels,
        receivedAt: email.receivedAt,
        sentAt: email.sentAt,
        isProcessed: false,
      },
    });

    // Process with AI
    try {
      const aiResult = await this.aiProcessor.processEmail(email);

      // Store summary
      await this.prisma.emailSummary.create({
        data: {
          emailId: storedEmail.id,
          summary: aiResult.summary.summary,
          category: aiResult.summary.category.toUpperCase(),
          confidenceScore: aiResult.summary.confidenceScore,
          keyPoints: aiResult.summary.keyPoints,
          model: 'gpt-4-turbo-preview',
          processingTime: aiResult.processingTime,
        },
      });

      // Store action items
      for (const actionItem of aiResult.actionItems) {
        await this.prisma.actionItem.create({
          data: {
            emailId: storedEmail.id,
            text: actionItem.text,
            priority: actionItem.priority.toUpperCase(),
            confidenceScore: actionItem.confidenceScore,
            deadline: actionItem.deadline,
          },
        });
      }

      // Mark email as processed
      await this.prisma.email.update({
        where: { id: storedEmail.id },
        data: { isProcessed: true },
      });
    } catch (error) {
      // Mark email with processing error
      await this.prisma.email.update({
        where: { id: storedEmail.id },
        data: {
          isProcessed: false,
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  private async updateJobStatus(jobId: string, status: JobStatus, progress: number): Promise<void> {
    await this.prisma.emailSyncJob.update({
      where: { id: jobId },
      data: {
        status: status.toUpperCase(),
        progress,
        startedAt: status === JobStatus.RUNNING ? new Date() : undefined,
      },
    });
  }

  private async updateJobProgress(
    jobId: string,
    progress: number,
    emailsFound: number,
    emailsSynced: number
  ): Promise<void> {
    await this.prisma.emailSyncJob.update({
      where: { id: jobId },
      data: {
        progress,
        emailsFound,
        emailsSynced,
      },
    });
  }

  private async completeJob(
    jobId: string,
    emailsFound: number,
    emailsSynced: number,
    errors: string[]
  ): Promise<void> {
    await this.prisma.emailSyncJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        emailsFound,
        emailsSynced,
        errors: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      },
    });
  }

  private async failJob(jobId: string, error: string): Promise<void> {
    await this.prisma.emailSyncJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errors: [error],
        completedAt: new Date(),
      },
    });
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}