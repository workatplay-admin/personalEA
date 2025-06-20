import winston from 'winston';
import { env } from '@/config/environment';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  env.LOG_FORMAT === 'json' 
    ? winston.format.json()
    : winston.format.simple()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  })
];

// Add file transport if enabled
if (env.LOG_FILE_ENABLED) {
  transports.push(
    new winston.transports.File({
      filename: env.LOG_FILE_PATH,
      format: logFormat
    })
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
  defaultMeta: {
    service: 'goal-strategy-service'
  }
});

// Create correlation ID for request tracking
export const createCorrelationId = (): string => {
  return `gs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Enhanced logger with correlation ID support
export const createContextLogger = (correlationId: string) => {
  return logger.child({ correlationId });
};

export { logger };
export default logger;