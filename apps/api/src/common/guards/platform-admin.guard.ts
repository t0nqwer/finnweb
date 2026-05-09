import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("USER_NOT_FOUND_OR_DISABLED");
    }

    if (user.role !== "ADMIN") {
      throw new ForbiddenException("ADMIN_ACCESS_REQUIRED");
    }

    request.user = {
      ...request.user,
      role: user.role,
    };

    return true;
  }
}
