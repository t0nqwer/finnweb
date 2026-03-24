import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  UnauthorizedException,
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
import { Public } from "../../common/decorators/public.decorator";
import { AccessJwtGuard } from "../../common/guards/access-jwt.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {
    console.log("authService =", authService);
  }

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
    description: "Invalid input or email already exists",
  })
  @Public()
  @Post("register")
  register(
    @Body() dto: RegisterDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ip?: string,
  ) {
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
  login(
    @Body() dto: LoginDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ip?: string,
  ) {
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

  @ApiOperation({ summary: "Logout user session" })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 201,
    description: "Logout successful",
    schema: {
      example: {
        success: true,
      },
    },
  })
  @Public()
  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
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
  me(@CurrentUser() user: any) {
    if (!user?.sub) {
      throw new UnauthorizedException();
    }

    return this.authService.me(user.sub);
  }
}
