import winston from 'winston';
import { env } from './env.js';

// Sensitive keys that should be redacted from logs
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'jwt',
  'secret',
  'apiKey',
  'api_key',
  'authToken',
  'accessToken',
  'refreshToken',
  'authorization',
  'jwt_secret',
  'jwtSecret',
  'twilioAuthToken',
  'twilio_account_sid',
  'twilio_auth_token',
  'smtpPass',
  'smtp_pass',
  'fcmPrivateKey',
  'fcm_private_key',
  'privateKey',
  'private_key',
];

/**
 * Redact sensitive data from objects before logging
 */
function redactSensitiveData(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
        lowerKey.includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = redactSensitiveData(value, depth + 1);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  // Handle strings - check if they look like sensitive data
  if (typeof obj === 'string') {
    // Redact JWT tokens (they start with eyJ)
    if (obj.startsWith('eyJ')) {
      return '[REDACTED JWT]';
    }
    // Redact long strings that might be keys
    if (obj.length > 50 && /^[A-Za-z0-9+/=]+$/.test(obj)) {
      return '[REDACTED KEY]';
    }
  }

  return obj;
}

// Custom format that redacts sensitive data
const redactFormat = winston.format((info) => {
  if (info.message && typeof info.message === 'object') {
    info.message = redactSensitiveData(info.message);
  }
  if (info.meta && typeof info.meta === 'object') {
    info.meta = redactSensitiveData(info.meta);
  }
  const splat = info[Symbol.for('splat')];
  if (splat && Array.isArray(splat)) {
    info[Symbol.for('splat')] = splat.map((arg: any) =>
      typeof arg === 'object' ? redactSensitiveData(arg) : arg
    );
  }
  return info;
})();

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  redactFormat,
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development (more readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  redactFormat,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Safely handle message - convert to string and escape format specifiers
    // This prevents format string injection attacks when using printf-style formatting
    let safeMessage: string;
    if (typeof message === 'string') {
      // Escape any printf-style format specifiers to prevent format string injection
      safeMessage = message.replace(/%/g, '%%');
    } else {
      safeMessage = JSON.stringify(message);
    }
    let msg = `${timestamp} [${level}]: ${safeMessage}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(redactSensitiveData(meta))}`;
    }
    return msg;
  })
);

// Determine log level based on environment
const logLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'myerp-backend' },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
    // File transport for errors (production only)
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/exceptions.log',
          }),
        ]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/rejections.log',
          }),
        ]
      : []),
  ],
});

// Export a helper function for logging requests (with automatic redaction)
export const logRequest = (req: any) => {
  const { method, url, headers, body, query, params } = req;
  logger.info('Incoming request', {
    method,
    url,
    headers: redactSensitiveData(headers),
    body: redactSensitiveData(body),
    query: redactSensitiveData(query),
    params: redactSensitiveData(params),
  });
};
