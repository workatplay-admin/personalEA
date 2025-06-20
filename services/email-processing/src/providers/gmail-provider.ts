import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '@/utils/logger';
import { EmailProvider, Email } from '@/types/email';

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SyncOptions {
  labels?: string[];
  since?: Date;
  maxResults?: number;
  pageToken?: string;
}

export interface SyncResult {
  emails: Email[];
  nextPageToken?: string;
  totalCount: number;
}

export class GmailProvider implements EmailProvider {
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor(private config: GmailConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  async authenticate(accessToken: string, refreshToken?: string): Promise<void> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async getAuthUrl(scopes: string[]): Promise<string> {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
  }> {
    const { tokens } = await this.oauth2Client.getAccessToken(code);
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };
  }

  async refreshAccessToken(): Promise<{
    accessToken: string;
    expiryDate?: number;
  }> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    return {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date,
    };
  }

  async syncEmails(options: SyncOptions = {}): Promise<SyncResult> {
    try {
      const {
        labels = ['INBOX'],
        since,
        maxResults = 100,
        pageToken,
      } = options;

      // Build query string
      let query = '';
      if (labels.length > 0) {
        query += labels.map(label => `label:${label}`).join(' OR ');
      }
      if (since) {
        const sinceStr = Math.floor(since.getTime() / 1000);
        query += query ? ` after:${sinceStr}` : `after:${sinceStr}`;
      }

      logger.info('Syncing emails from Gmail', {
        query,
        maxResults,
        pageToken,
      });

      // List messages
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken,
      });

      const messageIds = listResponse.data.messages || [];
      const emails: Email[] = [];

      // Fetch full message details in batches
      const batchSize = 10;
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        const batchEmails = await this.fetchEmailBatch(batch.map((m: any) => m.id));
        emails.push(...batchEmails);
      }

      return {
        emails,
        nextPageToken: listResponse.data.nextPageToken,
        totalCount: listResponse.data.resultSizeEstimate || emails.length,
      };
    } catch (error) {
      logger.error('Failed to sync emails from Gmail', { error });
      throw new Error(`Gmail sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchEmailBatch(messageIds: string[]): Promise<Email[]> {
    const emails: Email[] = [];

    for (const messageId of messageIds) {
      try {
        const response = await this.gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const email = this.parseGmailMessage(response.data);
        if (email) {
          emails.push(email);
        }
      } catch (error) {
        logger.warn('Failed to fetch email', { messageId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return emails;
  }

  private parseGmailMessage(message: any): Email | null {
    try {
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

      // Extract basic metadata
      const messageId = message.id;
      const threadId = message.threadId;
      const subject = getHeader('Subject') || '(No Subject)';
      const sender = getHeader('From') || '';
      const to = getHeader('To') || '';
      const cc = getHeader('Cc') || '';
      const bcc = getHeader('Bcc') || '';
      const dateHeader = getHeader('Date');

      // Parse recipients
      const recipients = this.parseEmailAddresses(to);
      const ccRecipients = this.parseEmailAddresses(cc);
      const bccRecipients = this.parseEmailAddresses(bcc);

      // Extract content
      const { textContent, htmlContent } = this.extractContent(message.payload);
      const snippet = message.snippet || '';

      // Parse date
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date(message.internalDate ? parseInt(message.internalDate) : Date.now());

      // Extract labels
      const labels = message.labelIds || [];

      return {
        messageId,
        threadId,
        subject,
        sender,
        recipients,
        ccRecipients,
        bccRecipients,
        textContent,
        htmlContent,
        snippet,
        labels,
        receivedAt,
        sentAt: receivedAt, // For received emails, this is the same
      };
    } catch (error) {
      logger.error('Failed to parse Gmail message', { 
        messageId: message.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private parseEmailAddresses(addressString: string): string[] {
    if (!addressString) return [];
    
    // Simple email extraction - in production, use a proper email parser
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return addressString.match(emailRegex) || [];
  }

  private extractContent(payload: any): { textContent?: string; htmlContent?: string } {
    let textContent: string | undefined;
    let htmlContent: string | undefined;

    const extractFromPart = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        textContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload.parts) {
      payload.parts.forEach(extractFromPart);
    } else if (payload.body?.data) {
      // Single part message
      if (payload.mimeType === 'text/plain') {
        textContent = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload.mimeType === 'text/html') {
        htmlContent = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      ...(textContent && { textContent }),
      ...(htmlContent && { htmlContent })
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });
      
      logger.info('Gmail connection test successful', {
        emailAddress: response.data.emailAddress,
      });
      
      return true;
    } catch (error) {
      logger.error('Gmail connection test failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async getProfile(): Promise<{
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
  }> {
    const response = await this.gmail.users.getProfile({
      userId: 'me',
    });

    return {
      emailAddress: response.data.emailAddress,
      messagesTotal: response.data.messagesTotal,
      threadsTotal: response.data.threadsTotal,
    };
  }
}