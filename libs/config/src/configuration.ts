export default () => ({
  app: {
    name: process.env.APP_NAME || 'backend-platform',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    version: parseInt(process.env.APP_VERSION || '1', 10),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()),
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  }
});
