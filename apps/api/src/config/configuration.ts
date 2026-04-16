export default () => ({
  app: {
    port: Number(process.env.PORT || 4000),
    nodeEnv: process.env.NODE_ENV || "development",
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "changeme",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  queue: {
    redisUrl: process.env.REDIS_URL,
    prefix: process.env.QUEUE_PREFIX || "finnweb",
    defaultAttempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS || 3),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS || 5000),
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  },
});
