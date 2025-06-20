export interface Email {
  messageId: string;
  threadId?: string;
  subject: string;
  sender: string;
  recipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  textContent?: string;
  htmlContent?: string;
  snippet?: string;
  labels: string[];
  receivedAt: Date;
  sentAt?: Date;
}

export interface EmailProvider {
  authenticate(accessToken: string, refreshToken?: string): Promise<void>;
  syncEmails(options?: SyncOptions): Promise<SyncResult>;
  testConnection(): Promise<boolean>;
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

export interface EmailSummary {
  emailId: string;
  summary: string;
  category: EmailCategory;
  confidenceScore: number;
  keyPoints: string[];
}

export interface ActionItem {
  text: string;
  priority: ActionPriority;
  confidenceScore: number;
  deadline?: Date;
}

export interface EmailDigest {
  digestId: string;
  generatedAt: Date;
  summary: string;
  emails: EmailDigestItem[];
  pagination: {
    limit: number;
    cursor?: string;
    hasMore: boolean;
    totalCount: number;
  };
}

export interface EmailDigestItem {
  emailId: string;
  subject: string;
  sender: string;
  category: EmailCategory;
  summary: string;
  actionItems: string[];
  receivedAt: Date;
}

export enum EmailCategory {
  URGENT = 'urgent',
  IMPORTANT = 'important',
  INFORMATIONAL = 'informational',
  ACTIONABLE = 'actionable',
  FOLLOW_UP = 'follow-up',
  SPAM = 'spam',
  PROMOTIONAL = 'promotional',
}

export enum ActionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface EmailSyncJob {
  jobId: string;
  userId: string;
  status: JobStatus;
  progress: number;
  syncOptions: SyncOptions;
  emailsFound?: number;
  emailsSynced?: number;
  errors?: string[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailProviderConfig {
  type: 'gmail' | 'outlook' | 'imap';
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
}