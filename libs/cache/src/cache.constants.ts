export const REDIS_CLIENT = 'REDIS_CLIENT';

export const CACHE_TTL = {
    ONE_MINUTE: 60,
    FIVE_MINUTES: 300,
    FIFTEEN_MINUTES: 900,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
    ONE_WEEK: 604800,
} as const;

export const CACHE_KEYS = {
    USER_BY_ID: (id: string) => `user:${id}`,
    USER_BY_EMAIL: (email: string) => `user:email:${email}`,
    USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
    USER_TOKEN: (userId: string) => `auth:refresh:${userId}`,
    BLACKLISTED_TOKEN: (jti: string) => `auth:blacklisted:${jti}`,
} as const;
