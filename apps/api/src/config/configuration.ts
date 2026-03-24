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
});
