import { UseGuards } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { createRateLimitGuard } from "../guards/rate-limit.guard";

/**
 * Rate limit decorator for protecting auth endpoints.
 * Login: max 10 attempts per 15 minutes per IP
 * Forgot Password: max 5 attempts per 40 minutes per email
 * Reset Password: max 5 attempts per 40 minutes per email
 */

/**
 * Decorator for rate limiting login attempts - 10 attempts per 15 minutes per IP
 */
export const RateLimitLogin = () => {
  const guard = createRateLimitGuard({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    errorCode: "RATE_LIMIT_LOGIN",
    keyGenerator: (request: FastifyRequest) => {
      const ip = request.ip || "unknown";
      return `rate-limit:login:${ip}`;
    },
  });
  return UseGuards(guard);
};

/**
 * Decorator for rate limiting forgot password attempts - 5 attempts per 40 minutes per email
 */
export const RateLimitForgotPassword = () => {
  const guard = createRateLimitGuard({
    maxRequests: 5,
    windowMs: 40 * 60 * 1000, // 40 minutes
    errorCode: "RATE_LIMIT_PASSWORD_RESET",
    keyGenerator: (request: FastifyRequest) => {
      const body: any = request.body;
      const email = body?.email?.toLowerCase().trim() || "unknown";
      return `rate-limit:forgot-password:${email}`;
    },
  });
  return UseGuards(guard);
};

/**
 * Decorator for rate limiting reset password attempts - 5 attempts per 40 minutes per email
 */
export const RateLimitResetPassword = () => {
  const guard = createRateLimitGuard({
    maxRequests: 5,
    windowMs: 40 * 60 * 1000, // 40 minutes
    errorCode: "RATE_LIMIT_PASSWORD_RESET",
    keyGenerator: (request: FastifyRequest) => {
      const body: any = request.body;
      const email = body?.email?.toLowerCase().trim() || "unknown";
      return `rate-limit:reset-password:${email}`;
    },
  });
  return UseGuards(guard);
};
