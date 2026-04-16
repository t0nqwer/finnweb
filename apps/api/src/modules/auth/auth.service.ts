import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthRepository } from "./auth.repository";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResponse, SafeUser } from "@finnweb/shared";
import {
  hashPassword,
  hashRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "./utils/auth-token.util";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { jwtConfig } from "./utils/jwtConfig";

import * as crypto from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  private toSafeUser(user: any): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async generateAccessToken(user: { id: string; email: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: "access",
    };

    return this.jwtService.signAsync(payload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessExpiresIn,
    });
  }

  private async generateRefreshToken(
    user: { id: string; email: string },
    sessionId: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      type: "refresh",
    };

    return this.jwtService.signAsync(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn,
    });
  }
  private slugify(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50);
  }

  private async generateWorkspaceSlug(base: string) {
    const raw = this.slugify(base) || "workspace";
    return `${raw}-${Math.random().toString(36).slice(2, 8)}`;
  }
  private getRefreshExpiryDate() {
    const now = new Date();
    const result = new Date(now);
    result.setDate(result.getDate() + 30);
    return result;
  }

  async register(
    dto: RegisterDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.authRepository.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(dto.password);

    const displayName =
      dto.name?.trim() || email.split("@")[0] || "My Workspace";

    const workspaceName = `${displayName}'s Workspace`;
    const workspaceSlug = await this.generateWorkspaceSlug(displayName);

    const bootstrap = await this.authRepository.registerWithWorkspaceBootstrap({
      email,
      passwordHash,
      name: dto.name,
      workspaceName,
      workspaceSlug,
      createInitialSite: true,
    });

    const expiresAt = this.getRefreshExpiryDate();

    const session = await this.authRepository.createSession({
      userId: bootstrap.user.id,
      refreshTokenHash: "PENDING",
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt,
    });

    const refreshToken = await this.generateRefreshToken(
      bootstrap.user,
      session.id,
    );

    const refreshTokenHash = await hashRefreshToken(refreshToken);

    await this.authRepository.updateSessionRefreshTokenHash(
      session.id,
      refreshTokenHash,
      expiresAt,
    );

    const accessToken = await this.generateAccessToken(bootstrap.user);

    return {
      user: this.toSafeUser(bootstrap.user),
      workspace: {
        id: bootstrap.workspace.id,
        name: bootstrap.workspace.name,
        slug: bootstrap.workspace.slug,
      },
      subscription: {
        id: bootstrap.subscription.id,
      },
      site: bootstrap.site
        ? {
            id: bootstrap.site.id,
            name: bootstrap.site.name,
            slug: bootstrap.site.slug,
          }
        : null,
      accessToken,
      refreshToken,
    };
  }

  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.authRepository.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new ForbiddenException("USER_DISABLED");
    }

    const isValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    const expiresAt = this.getRefreshExpiryDate();

    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: "PENDING",
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt,
    });

    const refreshToken = await this.generateRefreshToken(user, session.id);
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    await this.authRepository.updateSessionRefreshTokenHash(
      session.id,
      refreshTokenHash,
      expiresAt,
    );

    await this.authRepository.updateLastLogin(user.id);

    const accessToken = await this.generateAccessToken(user);

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    }

    if (payload.type !== "refresh" || !payload.sessionId) {
      throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    }

    const session = await this.authRepository.findSessionById(
      payload.sessionId,
    );
    if (!session) {
      throw new UnauthorizedException("SESSION_NOT_FOUND");
    }

    if (session.revokedAt) {
      throw new UnauthorizedException("SESSION_REVOKED");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("SESSION_EXPIRED");
    }

    const isTokenMatch = await verifyRefreshToken(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isTokenMatch) {
      throw new UnauthorizedException("INVALID_REFRESH_TOKEN");
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("USER_NOT_FOUND_OR_DISABLED");
    }

    const newExpiresAt = this.getRefreshExpiryDate();
    const newRefreshToken = await this.generateRefreshToken(user, session.id);
    const newRefreshTokenHash = await hashRefreshToken(newRefreshToken);

    await this.authRepository.updateSessionRefreshTokenHash(
      session.id,
      newRefreshTokenHash,
      newExpiresAt,
    );

    const newAccessToken = await this.generateAccessToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      if (payload.type !== "refresh" || !payload.sessionId) {
        return { success: true };
      }

      const session = await this.authRepository.findSessionById(
        payload.sessionId,
      );
      if (!session) {
        return { success: true };
      }

      await this.authRepository.revokeSession(session.id);
      return { success: true };
    } catch {
      return { success: true };
    }
  }

  async me(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("USER_NOT_FOUND");
    }

    return this.toSafeUser(user);
  }

  async logoutAllSessions(userId: string) {
    await this.authRepository.revokeAllSessions(userId);

    return {
      success: true,
      message: "Logged out from all sessions",
    };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.authRepository.findUserById(userId);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("USER_NOT_FOUND");
    }

    const isValid = await verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException("INVALID_CURRENT_PASSWORD");
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await this.authRepository.updateUserPassword(userId, newPasswordHash);

    // revoke ทุก session เพื่อ security
    await this.authRepository.revokeAllSessions(userId);

    return {
      success: true,
      message: "Password changed successfully",
    };
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new BadRequestException("USER_NOT_FOUND");
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: "Email already verified",
      };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await this.authRepository.createEmailVerificationToken({
      userId,
      tokenHash,
      expiresAt,
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    // TODO: send email
    console.log("VERIFY URL:", verifyUrl);

    return {
      success: true,
      message: "Verification email sent",
    };
  }

  async verifyEmail(dto: { token: string }) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(dto.token)
      .digest("hex");

    const record =
      await this.authRepository.findValidEmailVerificationToken(tokenHash);

    if (!record) {
      throw new BadRequestException("INVALID_OR_EXPIRED_VERIFICATION_TOKEN");
    }

    await this.authRepository.verifyUserEmail(record.userId);

    await this.authRepository.markEmailVerificationUsed(record.id);

    return {
      success: true,
      message: "Email verified successfully",
    };
  }

  async forgotPassword(dto: { email: string }) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.authRepository.findUserByEmail(email);

    // กัน email enumeration
    if (!user) {
      return {
        success: true,
        message: "If the email exists, a reset link has been sent",
      };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 นาที

    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    // TODO: เปลี่ยนเป็น mail service จริง
    console.log("PASSWORD_RESET_URL:", resetUrl);

    return {
      success: true,
      message: "If the email exists, a reset link has been sent",
    };
  }

  async resetPassword(dto: { token: string; newPassword: string }) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(dto.token)
      .digest("hex");

    const record =
      await this.authRepository.findValidPasswordResetToken(tokenHash);

    if (!record) {
      throw new BadRequestException({
        code: "INVALID_OR_EXPIRED_RESET_TOKEN",
        message: "Reset token is invalid or expired",
      });
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await this.authRepository.updateUserPassword(
      record.userId,
      newPasswordHash,
    );
    await this.authRepository.markPasswordResetUsed(record.id);
    await this.authRepository.revokeAllSessions(record.userId);

    return {
      success: true,
      message: "Password reset successfully",
    };
  }
}
