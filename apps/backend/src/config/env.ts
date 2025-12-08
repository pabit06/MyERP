import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS Configuration
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),

  // API Configuration
  API_PREFIX: z.string().default('/api'),

  // Email Configuration (SMTP via Nodemailer) - Optional
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // SMS Configuration (Twilio) - Optional
  SMS_PROVIDER: z.enum(['twilio', 'console']).optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Push Notifications (FCM) - Optional
  FCM_PROJECT_ID: z.string().optional(),
  FCM_PRIVATE_KEY_PATH: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().email().optional(),

  // File Upload Configuration - Optional
  UPLOAD_MAX_SIZE: z.string().regex(/^\d+$/).transform(Number).optional().default('10485760'),
  UPLOAD_DIR: z.string().optional().default('./uploads'),

  // Error Tracking & Monitoring (Sentry) - Optional
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .regex(/^\d*\.?\d+$/)
    .transform(Number)
    .optional()
    .default('1.0'),
});

// Validate and parse environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}

// Export validated and typed environment configuration
export const env = validateEnv();

// Export type for use in other files
export type Env = typeof env;
