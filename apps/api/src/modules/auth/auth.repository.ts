import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  async registerWithWorkspaceBootstrap(data: {
    email: string;
    passwordHash: string;
    name?: string | null;
    workspaceName: string;
    workspaceSlug: string;
    createInitialSite?: boolean;
  }) {
    try {
      return this.prisma.$transaction(async (tx) => {
        const freePlan = await tx.plan.findUnique({
          where: { code: "FREE" },
        });

        if (!freePlan) {
          throw new Error("FREE_PLAN_NOT_FOUND");
        }

        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash: data.passwordHash,
            name: data.name ?? null,
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: data.workspaceName,
            slug: data.workspaceSlug,
            ownerId: user.id,
          },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "OWNER",
          },
        });

        const now = new Date();

        const subscription = await tx.subscription.create({
          data: {
            workspaceId: workspace.id,
            planId: freePlan.id,
            status: "ACTIVE",
            billingInterval: "MONTHLY",
            isCurrent: true,
            currentPeriodStart: now,
          },
        });

        let site: any = null;

        if (data.createInitialSite) {
          site = await tx.site.create({
            data: {
              workspaceId: workspace.id,
              name: "My First Site",
              slug: `${workspace.slug}-site`,
              defaultSeoTitle: "My First Site",
            },
          });

          await tx.page.create({
            data: {
              siteId: site.id,
              title: "Home",
              slug: "home",
              path: "/",
              pageType: "LANDING",
              isHomePage: true,
              isPublished: false,
            },
          });
        }

        return {
          user,
          workspace,
          subscription,
          site,
        };
      });
    } catch (error) {
      console.error("❌ BOOTSTRAP ERROR", error);

      // ถ้าเป็น Prisma error จะได้ detail เพิ่ม
      if (error instanceof Error) {
        console.error("message:", error.message);
        console.error("stack:", error.stack);
      }

      throw error;
    }
  }

  updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
      },
    });
  }

  verifyUserEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
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

  revokeAllSessions(userId: string) {
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

  deleteUserById(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.passwordResetToken.create({
      data,
    });
  }

  findValidPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  markPasswordResetUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.emailVerificationToken.create({
      data,
    });
  }

  findValidEmailVerificationToken(tokenHash: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  markEmailVerificationUsed(id: string) {
    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }
}
