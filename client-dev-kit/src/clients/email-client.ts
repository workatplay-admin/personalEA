import { BaseApiClient, ApiClientConfig, PaginatedResponse } from './base-client';

export interface Email {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  from: {
    email: string;
    name: string;
  };
  to: Array<{
    email: string;
    name: string;
  }>;
  cc?: Array<{
    email: string;
    name: string;
  }>;
  receivedAt: string;
  body: {
    text: string;
    html?: string;
  };
  labels: string[];
  isRead: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
  aiAnalysis?: {
    sentiment: string;
    urgency: string;
    category: string;
    actionItems: ActionItem[];
    keyTopics: string[];
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  description: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

export interface EmailDigest {
  id: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEmails: number;
    unreadEmails: number;
    importantEmails: number;
    actionItemsCount: number;
    categories: Record<string, number>;
  };
  highlights: Array<{
    type: string;
    title: string;
    description: string;
    emailId: string;
    priority: string;
  }>;
  actionItems: ActionItem[];
  trends: {
    emailVolumeChange: string;
    responseTimeAvg: string;
    topSenders: Array<{
      email: string;
      name: string;
      count: number;
    }>;
  };
  generatedAt: string;
  version: string;
}

export interface SyncJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface EmailFilters {
  isRead?: boolean;
  isImportant?: boolean;
  hasAttachments?: boolean;
  labels?: string[];
  from?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  cursor?: string;
}

export class EmailClient extends BaseApiClient {
  constructor(config?: Partial<ApiClientConfig>) {
    super({
      baseURL: 'http://localhost:8083',
      timeout: 30000,
      token: 'dev-token-for-testing',
      ...config,
    });
  }

  // Get emails with optional filtering
  async getEmails(filters?: EmailFilters): Promise<PaginatedResponse<Email>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/v1/emails?${queryString}` : '/v1/emails';
    
    return this.get<PaginatedResponse<Email>>(url);
  }

  // Get a specific email by ID
  async getEmail(id: string): Promise<Email> {
    return this.get<Email>(`/v1/emails/${id}`);
  }

  // Sync emails from external providers
  async syncEmails(): Promise<SyncJob> {
    return this.post<SyncJob>('/v1/emails/sync');
  }

  // Get sync job status
  async getSyncStatus(jobId: string): Promise<SyncJob> {
    return this.get<SyncJob>(`/v1/emails/sync/${jobId}`);
  }

  // Generate email digest
  async getDigest(period?: { start: string; end: string }): Promise<EmailDigest> {
    if (period) {
      const params = new URLSearchParams({
        start: period.start,
        end: period.end,
      });
      return this.get<EmailDigest>(`/v1/emails/digest?${params.toString()}`);
    }
    return this.get<EmailDigest>('/v1/emails/digest');
  }

  // Generate email summary
  async generateSummary(emailId: string): Promise<{ summary: string; keyPoints: string[] }> {
    return this.post<{ summary: string; keyPoints: string[] }>(`/v1/emails/${emailId}/summary`);
  }

  // Extract action items from email
  async extractActionItems(emailId: string): Promise<{ actionItems: ActionItem[] }> {
    return this.post<{ actionItems: ActionItem[] }>(`/v1/emails/${emailId}/action-items`);
  }

  // Mark email as read/unread
  async markAsRead(emailId: string, isRead: boolean = true): Promise<Email> {
    return this.patch<Email>(`/v1/emails/${emailId}`, { isRead });
  }

  // Mark email as important/not important
  async markAsImportant(emailId: string, isImportant: boolean = true): Promise<Email> {
    return this.patch<Email>(`/v1/emails/${emailId}`, { isImportant });
  }

  // Add labels to email
  async addLabels(emailId: string, labels: string[]): Promise<Email> {
    return this.patch<Email>(`/v1/emails/${emailId}`, { 
      labels: { add: labels } 
    });
  }

  // Remove labels from email
  async removeLabels(emailId: string, labels: string[]): Promise<Email> {
    return this.patch<Email>(`/v1/emails/${emailId}`, { 
      labels: { remove: labels } 
    });
  }

  // Search emails
  async searchEmails(query: string, filters?: EmailFilters): Promise<PaginatedResponse<Email>> {
    const params = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return this.get<PaginatedResponse<Email>>(`/v1/emails/search?${params.toString()}`);
  }
}