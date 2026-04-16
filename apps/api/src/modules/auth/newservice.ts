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
import {
  hashPassword,
  hashRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "./utils/auth-token.util";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  private toSafeUser(user: any) {
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
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: "15m",
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
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: "30d",
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
  ) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.authRepository.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.authRepository.createUser({
      email,
      passwordHash,
      name: dto.name,
    });

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

    const accessToken = await this.generateAccessToken(user);

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }
}
