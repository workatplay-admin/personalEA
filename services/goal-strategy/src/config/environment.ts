import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const environmentSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().default('postgresql://localhost:5432/goal_strategy_dev'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1).default('sk-test-placeholder-key'),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(4000),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),

  // JWT Configuration
  JWT_SECRET: z.string().min(32).default('development-secret-key-please-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Server Configuration
  PORT: z.coerce.number().default(8085),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_VERSION: z.string().default('v1'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:8080,http://localhost:5173,http://localhost:5174,https://*.app.github.dev'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Redis Configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(1),

  // External Service URLs
  EMAIL_SERVICE_URL: z.string().url().default('http://localhost:8084'),
  CALENDAR_SERVICE_URL: z.string().url().default('http://localhost:8086'),

  // AI Processing Configuration
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  AI_MAX_RETRIES: z.coerce.number().default(3),
  AI_TIMEOUT_MS: z.coerce.number().default(30000),

  // Estimation Engine Configuration
  ESTIMATION_LEARNING_ENABLED: z.coerce.boolean().default(true),
  ESTIMATION_MIN_SAMPLES: z.coerce.number().default(5),
  ESTIMATION_CONFIDENCE_INTERVAL: z.coerce.number().min(0).max(1).default(0.95),

  // Capacity Management
  DEFAULT_WORK_HOURS_PER_DAY: z.coerce.number().default(8),
  DEFAULT_WORK_DAYS_PER_WEEK: z.coerce.number().default(5),
  CAPACITY_BUFFER_PERCENTAGE: z.coerce.number().default(20),

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  LOG_FILE_ENABLED: z.coerce.boolean().default(false),
  LOG_FILE_PATH: z.string().default('./logs/goal-strategy.log'),

  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(5000),
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000),

  // Feature Flags
  FEATURE_AI_GOAL_TRANSLATION: z.coerce.boolean().default(true),
  FEATURE_MILESTONE_GENERATION: z.coerce.boolean().default(true),
  FEATURE_WBS_AUTOMATION: z.coerce.boolean().default(true),
  FEATURE_DEPENDENCY_MAPPING: z.coerce.boolean().default(true),
  FEATURE_ESTIMATION_ENGINE: z.coerce.boolean().default(true),
  FEATURE_CALENDAR_INTEGRATION: z.coerce.boolean().default(true),
  FEATURE_CAPACITY_MANAGEMENT: z.coerce.boolean().default(true),
});

export type Environment = z.infer<typeof environmentSchema>;

let env: Environment;

try {
  env = environmentSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment configuration:', error);
  process.exit(1);
}

export { env };

// Helper functions for feature flags
export const isFeatureEnabled = (feature: keyof Pick<Environment, 
  | 'FEATURE_AI_GOAL_TRANSLATION'
  | 'FEATURE_MILESTONE_GENERATION'
  | 'FEATURE_WBS_AUTOMATION'
  | 'FEATURE_DEPENDENCY_MAPPING'
  | 'FEATURE_ESTIMATION_ENGINE'
  | 'FEATURE_CALENDAR_INTEGRATION'
  | 'FEATURE_CAPACITY_MANAGEMENT'
>): boolean => {
  return env[feature];
};

export const getCorsOrigins = (): (string | RegExp)[] | boolean => {
  const origins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  
  // If any origin contains a wildcard, convert to regex
  const processedOrigins = origins.map(origin => {
    if (origin === '*') {
      return true; // Allow all origins (for development only)
    }
    if (origin.includes('*')) {
      // Convert wildcard pattern to regex
      const regexPattern = origin
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`);
    }
    return origin;
  });
  
  // If array contains true, return true (allow all)
  if (processedOrigins.includes(true)) {
    return true;
  }
  
  return processedOrigins as (string | RegExp)[];
};

export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isTest = (): boolean => env.NODE_ENV === 'test';