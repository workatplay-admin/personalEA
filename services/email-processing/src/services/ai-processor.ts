import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import { Email, EmailSummary, ActionItem, EmailCategory, ActionPriority } from '@/types/email';

export interface AIProcessorConfig {
  openaiApiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ProcessingResult {
  summary: EmailSummary;
  actionItems: ActionItem[];
  processingTime: number;
}

export class AIProcessor {
  private openai: OpenAI;
  private config: AIProcessorConfig;

  constructor(config: AIProcessorConfig) {
    this.config = {
      model: 'gpt-4-turbo-preview',
      maxTokens: 1000,
      temperature: 0.1,
      ...config,
    };

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  async processEmail(email: Email): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      logger.info('Processing email with AI', {
        emailId: email.messageId,
        subject: email.subject,
        sender: email.sender,
      });

      // Prepare email content for processing
      const emailContent = this.prepareEmailContent(email);

      // Process summary and categorization
      const summaryResult = await this.generateSummary(emailContent, email);

      // Extract action items
      const actionItems = await this.extractActionItems(emailContent, email);

      const processingTime = Date.now() - startTime;

      logger.info('Email processing completed', {
        emailId: email.messageId,
        processingTime,
        category: summaryResult.category,
        actionItemsCount: actionItems.length,
      });

      return {
        summary: summaryResult,
        actionItems,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to process email with AI', {
        emailId: email.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });
      throw error;
    }
  }

  private prepareEmailContent(email: Email): string {
    const parts = [
      `Subject: ${email.subject}`,
      `From: ${email.sender}`,
      `To: ${email.recipients.join(', ')}`,
    ];

    if (email.ccRecipients.length > 0) {
      parts.push(`CC: ${email.ccRecipients.join(', ')}`);
    }

    parts.push(`Received: ${email.receivedAt.toISOString()}`);
    parts.push('---');

    // Prefer text content, fall back to HTML or snippet
    if (email.textContent) {
      parts.push(email.textContent);
    } else if (email.htmlContent) {
      // Simple HTML to text conversion (in production, use a proper library)
      const textFromHtml = email.htmlContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(textFromHtml);
    } else if (email.snippet) {
      parts.push(email.snippet);
    }

    return parts.join('\n');
  }

  private async generateSummary(emailContent: string, email: Email): Promise<EmailSummary> {
    const prompt = `
Analyze the following email and provide a structured response:

${emailContent}

Please provide:
1. A concise summary (1-2 sentences)
2. Category classification (urgent, important, informational, actionable, follow-up, spam, promotional)
3. Key points (3-5 bullet points maximum)
4. Confidence score (0.0 to 1.0) for the categorization

Respond in JSON format:
{
  "summary": "Brief summary here",
  "category": "category_name",
  "confidence_score": 0.95,
  "key_points": ["point 1", "point 2", "point 3"]
}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are an expert email analyst. Analyze emails and provide structured summaries with accurate categorization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        emailId: email.messageId,
        summary: result.summary || 'Unable to generate summary',
        category: this.mapCategory(result.category),
        confidenceScore: Math.min(Math.max(result.confidence_score || 0.5, 0), 1),
        keyPoints: Array.isArray(result.key_points) ? result.key_points : [],
      };
    } catch (error) {
      logger.error('Failed to generate email summary', {
        emailId: email.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return fallback summary
      return {
        emailId: email.messageId,
        summary: `Email from ${email.sender} regarding: ${email.subject}`,
        category: EmailCategory.INFORMATIONAL,
        confidenceScore: 0.1,
        keyPoints: [email.subject],
      };
    }
  }

  private async extractActionItems(emailContent: string, email: Email): Promise<ActionItem[]> {
    const prompt = `
Analyze the following email and extract any actionable items:

${emailContent}

Look for:
- Tasks that need to be completed
- Deadlines or time-sensitive items
- Requests for information or responses
- Meeting scheduling or calendar updates
- Follow-up actions required

For each action item, provide:
1. Clear description of the action
2. Priority level (low, medium, high, urgent)
3. Confidence score (0.0 to 1.0) that this is actually an action item
4. Estimated deadline (if mentioned or can be inferred)

Respond in JSON format:
{
  "action_items": [
    {
      "text": "Action description",
      "priority": "high",
      "confidence_score": 0.9,
      "deadline": "2025-06-20T14:00:00Z"
    }
  ]
}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying actionable items in emails. Extract clear, specific actions that require follow-up.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      const actionItems: ActionItem[] = [];

      if (Array.isArray(result.action_items)) {
        for (const item of result.action_items) {
          if (item.text && item.confidence_score > 0.3) {
            const actionItem: ActionItem = {
              text: item.text,
              priority: this.mapPriority(item.priority),
              confidenceScore: Math.min(Math.max(item.confidence_score || 0.5, 0), 1),
            };
            
            if (item.deadline) {
              actionItem.deadline = new Date(item.deadline);
            }
            
            actionItems.push(actionItem);
          }
        }
      }

      return actionItems;
    } catch (error) {
      logger.error('Failed to extract action items', {
        emailId: email.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return [];
    }
  }

  private mapCategory(category: string): EmailCategory {
    const categoryMap: Record<string, EmailCategory> = {
      urgent: EmailCategory.URGENT,
      important: EmailCategory.IMPORTANT,
      informational: EmailCategory.INFORMATIONAL,
      actionable: EmailCategory.ACTIONABLE,
      'follow-up': EmailCategory.FOLLOW_UP,
      followup: EmailCategory.FOLLOW_UP,
      spam: EmailCategory.SPAM,
      promotional: EmailCategory.PROMOTIONAL,
    };

    return categoryMap[category?.toLowerCase()] || EmailCategory.INFORMATIONAL;
  }

  private mapPriority(priority: string): ActionPriority {
    const priorityMap: Record<string, ActionPriority> = {
      low: ActionPriority.LOW,
      medium: ActionPriority.MEDIUM,
      high: ActionPriority.HIGH,
      urgent: ActionPriority.URGENT,
    };

    return priorityMap[priority?.toLowerCase()] || ActionPriority.MEDIUM;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test. Please respond with "OK".',
          },
        ],
        max_tokens: 10,
      });

      const content = response.choices[0].message.content?.toLowerCase();
      return content?.includes('ok') || false;
    } catch (error) {
      logger.error('AI processor connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}