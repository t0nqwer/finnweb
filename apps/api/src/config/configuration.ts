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
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || "FinnWeb <no-reply@finnweb.site>",
  },
  ai: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    deepseekBaseUrl:
      process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/chat/completions",
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
  queue: {
    redisUrl: process.env.REDIS_URL,
    prefix: process.env.QUEUE_PREFIX || "finnweb",
    defaultAttempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS || 3),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS || 5000),
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  },
  lineOa: {
    baseUrl: process.env.LINE_OA_API_BASE_URL || "https://api.line.me",
    timeoutMs: Number(process.env.LINE_OA_TIMEOUT_MS || 5000),
  },
});
