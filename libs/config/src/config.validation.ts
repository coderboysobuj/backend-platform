import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
    // Application
    NODE_ENV: Joi.string()
        .valid('development', 'staging', 'production', 'test')
        .default('development'),
    APP_NAME: Joi.string().default('backend-platform'),
    APP_PORT: Joi.number().default(3000),
    APP_VERSION: Joi.number().default(1),
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'debug', 'verbose')
        .default('info'),
    ENCRYPTION_KEY: Joi.string().min(32).required(),

    // Database
    DATABASE_URL: Joi.string().uri().optional(),
    DB_HOST: Joi.when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.string().required(),
    }),
    DB_USERNAME: Joi.when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.string().required(),
    }),
    DB_PASSWORD: Joi.when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.string().required(),
    }),
    DB_DATABASE: Joi.when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.string().required(),
    }),

    // Redis
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().default(6379),

    // auth
    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),

    MAILER_FROM: Joi.string().email().required(),
    FRONTEND_URL: Joi.string().uri().required(),

    // Throttler
    THROTTLE_TTL: Joi.number().default(60000),
    THROTTLE_LIMIT: Joi.number().default(100),

    // CORS
    CORS_ORIGINS: Joi.string().required(),
});
