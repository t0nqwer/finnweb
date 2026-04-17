import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Ip,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { Public } from "../../common/decorators/public.decorator";
import { AccessJwtGuard } from "../../common/guards/access-jwt.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { FastifyRequest } from "fastify/types/request";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @ApiOperation({ summary: "Register new user" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    schema: {
      example: {
        user: {
          id: "clx1234567890",
          email: "test@example.com",
          name: "Jirapat",
          avatarUrl: null,
          isActive: true,
          emailVerified: false,
          createdAt: "2026-03-22T04:00:00.000Z",
          updatedAt: "2026-03-22T04:00:00.000Z",
        },
        accessToken: "jwt-access-token",
        refreshToken: "jwt-refresh-token",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or email already exists",
  })
  @Public()
  @Post("register")
  register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Ip() ip?: string,
  ) {
    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : undefined;

    return this.authService.register(dto, {
      userAgent,
      ipAddress: ip,
    });
  }

  @ApiOperation({ summary: "Login user" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: "Login successful",
    schema: {
      example: {
        user: {
          id: "clx1234567890",
          email: "test@example.com",
          name: "Jirapat",
          avatarUrl: null,
          isActive: true,
          emailVerified: false,
          createdAt: "2026-03-22T04:00:00.000Z",
          updatedAt: "2026-03-22T04:00:00.000Z",
        },
        accessToken: "jwt-access-token",
        refreshToken: "jwt-refresh-token",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: FastifyRequest, @Ip() ip?: string) {
    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : undefined;

    return this.authService.login(dto, {
      userAgent,
      ipAddress: ip,
    });
  }

  @ApiOperation({ summary: "Refresh access token" })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 201,
    description: "Token refreshed successfully",
    schema: {
      example: {
        accessToken: "new-jwt-access-token",
        refreshToken: "new-jwt-refresh-token",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: "Logout current session by refresh token" })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 201,
    description: "Logout successful",
    schema: {
      example: {
        success: true,
        message: "Logout successful",
      },
    },
  })
  @Public()
  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Logout all sessions" })
  @ApiResponse({
    status: 200,
    description: "Logged out from all sessions",
    schema: {
      example: {
        success: true,
        message: "Logged out from all sessions",
      },
    },
  })
  @UseGuards(AccessJwtGuard)
  @Post("logout-all")
  logoutAll(@CurrentUser("sub") userId: string) {
    return this.authService.logoutAllSessions(userId);
  }

  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Change password" })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: "Password changed successfully",
    schema: {
      example: {
        success: true,
        message: "Password changed successfully",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid current password" })
  @UseGuards(AccessJwtGuard)
  @HttpCode(200)
  @Post("change-password")
  changePassword(
    @CurrentUser("sub") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @ApiOperation({ summary: "Send forgot password email" })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "If the email exists, a reset link has been sent",
    schema: {
      example: {
        success: true,
        message: "If the email exists, a reset link has been sent",
      },
    },
  })
  @Public()
  @HttpCode(200)
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({ summary: "Reset password with token" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Password reset successfully",
    schema: {
      example: {
        success: true,
        message: "Password reset successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired reset token",
  })
  @Public()
  @HttpCode(200)
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Send verification email" })
  @ApiResponse({
    status: 200,
    description: "Verification email sent",
    schema: {
      example: {
        success: true,
        message: "Verification email sent",
      },
    },
  })
  @UseGuards(AccessJwtGuard)
  @HttpCode(200)
  @Post("send-verification-email")
  sendVerificationEmail(@CurrentUser("sub") userId: string) {
    return this.authService.sendVerificationEmail(userId);
  }

  @ApiOperation({ summary: "Verify email with token" })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: "Email verified successfully",
    schema: {
      example: {
        success: true,
        message: "Email verified successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired verification token",
  })
  @Public()
  @HttpCode(200)
  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Current user profile",
    schema: {
      example: {
        id: "clx1234567890",
        email: "test@example.com",
        name: "Jirapat",
        avatarUrl: null,
        isActive: true,
        emailVerified: false,
        createdAt: "2026-03-22T04:00:00.000Z",
        updatedAt: "2026-03-22T04:00:00.000Z",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @UseGuards(AccessJwtGuard)
  @Get("me")
  me(@CurrentUser("sub") userId: string) {
    return this.authService.me(userId);
  }
}
