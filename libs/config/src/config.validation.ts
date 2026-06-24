import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  APP_NAME: Joi.string().default('backend-platform'),
  APP_PORT: Joi.number().default(3000),
  APP_VERSION: Joi.number().default(1),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),

  // Throttler
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // CORS
  CORS_ORIGINS: Joi.string().required(),
});


