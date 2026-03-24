import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    name?: string | null;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name ?? null,
      },
    });
  }

  updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  createSession(data: {
    userId: string;
    refreshTokenHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }) {
    return this.prisma.session.create({
      data,
    });
  }

  findSessionById(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  updateSessionRefreshTokenHash(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ) {
    return this.prisma.session.update({
      where: { id },
      data: {
        refreshTokenHash,
        expiresAt,
        revokedAt: null,
      },
    });
  }

  revokeSession(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  revokeAllUserSessions(userId: string) {
    return this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  deleteSession(id: string) {
    return this.prisma.session.delete({
      where: { id },
    });
  }
}
