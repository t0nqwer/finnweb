import type { StringValue } from "ms";

export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as StringValue,
  refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ||
    "30d") as StringValue,
};
