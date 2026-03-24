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
import { hashPassword, verifyPassword } from "./utils/auth-token.util";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { jwtConfig } from "./utils/jwtConfig";

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

  private getRefreshExpiryDate() {
    const now = new Date();
    const result = new Date(now);
    result.setDate(result.getDate() + 30);
    return result;
  }

  async register(
    dto: RegisterDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new BadRequestException("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const bootstrapSession = await this.authRepository.createSession({
      userId: user.id,
      refreshToken: "bootstrap",
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt: this.getRefreshExpiryDate(),
    });

    const refreshToken = await this.generateRefreshToken(
      user,
      bootstrapSession.id,
    );

    await this.authRepository.deleteSession(bootstrapSession.id);

    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshToken,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt: this.getRefreshExpiryDate(),
    });

    const finalRefreshToken = await this.generateRefreshToken(user, session.id);
    await this.authRepository.deleteSession(session.id);

    const finalSession = await this.authRepository.createSession({
      userId: user.id,
      refreshToken: finalRefreshToken,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt: this.getRefreshExpiryDate(),
    });

    const accessToken = await this.generateAccessToken(user);

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken: finalRefreshToken,
    };
  }

  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const user = await this.authRepository.findUserByEmail(dto.email);

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

    const tempSession = await this.authRepository.createSession({
      userId: user.id,
      refreshToken: "bootstrap",
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt: this.getRefreshExpiryDate(),
    });

    const refreshToken = await this.generateRefreshToken(user, tempSession.id);

    await this.authRepository.deleteSession(tempSession.id);

    const finalSession = await this.authRepository.createSession({
      userId: user.id,
      refreshToken,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt: this.getRefreshExpiryDate(),
    });

    await this.authRepository.updateLastLogin(user.id);

    const accessToken = await this.generateAccessToken(user);

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    const session =
      await this.authRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException("SESSION_NOT_FOUND");
    }

    if (session.revokedAt) {
      throw new UnauthorizedException("SESSION_REVOKED");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("SESSION_EXPIRED");
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("USER_NOT_FOUND_OR_DISABLED");
    }

    await this.authRepository.deleteSession(session.id);

    const newTempSession = await this.authRepository.createSession({
      userId: user.id,
      refreshToken: "bootstrap",
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt: this.getRefreshExpiryDate(),
    });

    const newRefreshToken = await this.generateRefreshToken(
      user,
      newTempSession.id,
    );

    await this.authRepository.deleteSession(newTempSession.id);

    await this.authRepository.createSession({
      userId: user.id,
      refreshToken: newRefreshToken,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt: this.getRefreshExpiryDate(),
    });

    const newAccessToken = await this.generateAccessToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const session =
      await this.authRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      return { success: true };
    }

    await this.authRepository.revokeSession(session.id);
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("USER_NOT_FOUND");
    }

    return this.toSafeUser(user);
  }
}
