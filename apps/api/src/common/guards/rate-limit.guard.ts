import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../constants/redis.constant";
import { AUTH_ERROR_CODES } from "../constants/auth-errors.constant";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // in milliseconds
  keyGenerator?: (request: FastifyRequest) => string;
  errorCode?: string;
}

/**
 * Rate limit guard for protecting endpoints against brute-force attacks.
 * Uses Redis for distributed rate limiting across multiple instances.
 *
 * Usage:
 * @UseGuards(RateLimitGuard(config))
 * POST('login')
 * login(@Body() dto: LoginDto) { ... }
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: RateLimitConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Generate rate limit key (ip:endpoint or email:endpoint)
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(request)
      : this.getDefaultKey(request);

    const current = await this.redis.incr(key);

    if (current === 1) {
      // Set expiration on first request in this window
      await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000));
    }

    if (current > this.config.maxRequests) {
      // Return cached error response that doesn't leak rate limit details
      throw new HttpException(
        {
          error: this.config.errorCode || "RATE_LIMIT_EXCEEDED",
          message:
            this.config.errorCode === "RATE_LIMIT_LOGIN"
              ? "Too many login attempts. Please try again after 15 minutes."
              : this.config.errorCode === "RATE_LIMIT_PASSWORD_RESET"
                ? "Too many password reset attempts. Please try again after 40 minutes."
                : "Too many attempts. Please try again later.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Store remaining requests in request object for potential response header
    (request as any)["rateLimit"] = {
      remaining: Math.max(0, this.config.maxRequests - current),
      limit: this.config.maxRequests,
      resetTime: Date.now() + this.config.windowMs,
    };

    return true;
  }

  private getDefaultKey(request: FastifyRequest): string {
    const ip = request.ip || "unknown";
    const endpoint = request.url;
    return `rate-limit:${ip}:${endpoint}`;
  }
}

/**
 * Factory function to create rate limit guard with custom config
 */
export function createRateLimitGuard(
  config: RateLimitConfig,
): (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => any {
  @Injectable()
  class ConfiguredRateLimitGuard implements CanActivate {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<FastifyRequest>();
      const key = config.keyGenerator
        ? config.keyGenerator(request)
        : this.getDefaultKey(request);

      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
      }

      if (current > config.maxRequests) {
        throw new HttpException(
          {
            error: config.errorCode || "RATE_LIMIT_EXCEEDED",
            message:
              config.errorCode === "RATE_LIMIT_LOGIN"
                ? "Too many login attempts. Please try again after 15 minutes."
                : config.errorCode === "RATE_LIMIT_PASSWORD_RESET"
                  ? "Too many password reset attempts. Please try again after 40 minutes."
                  : "Too many attempts. Please try again later.",
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      (request as any)["rateLimit"] = {
        remaining: Math.max(0, config.maxRequests - current),
        limit: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      };

      return true;
    }

    private getDefaultKey(request: FastifyRequest): string {
      const ip = request.ip || "unknown";
      const endpoint = request.url;
      return `rate-limit:${ip}:${endpoint}`;
    }
  }

  return ConfiguredRateLimitGuard as any;
}
