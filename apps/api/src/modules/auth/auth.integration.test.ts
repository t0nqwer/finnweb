import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AllExceptionsFilter } from "../../common/filters/all-exceptions.filter";
import { validationExceptionFactory } from "../../common/validation/validation-exception.factory";
import configuration from "../../config/configuration";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailService } from "../email/email.service";
import { AuthModule } from "./auth.module";

type SentEmail = {
  to: string;
  verifyUrl?: string;
  resetUrl?: string;
  userName?: string | null;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const sentEmails: SentEmail[] = [];

const emailServiceMock = {
  async sendVerificationEmail(input: SentEmail) {
    sentEmails.push(input);
  },
  async sendPasswordResetEmail(input: SentEmail) {
    sentEmails.push(input);
  },
};

function uniqueEmail(label: string) {
  return `auth-it+${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe("Auth API integration", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  before(async () => {
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL ??= "http://localhost:3000";
    process.env.JWT_ACCESS_SECRET ??= "super-access-secret";
    process.env.JWT_REFRESH_SECRET ??= "super-refresh-secret";

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env",
          load: [configuration],
        }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(EmailService)
      .useValue(emailServiceMock)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.setGlobalPrefix("api");
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    const freePlan = await prisma.plan.findUnique({
      where: { code: "FREE" },
    });

    assert.ok(
      freePlan,
      "Expected FREE plan to exist for auth registration tests",
    );
  });

  after(async () => {
    if (prisma && createdEmails.length > 0) {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: createdEmails,
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("registers a user and returns auth tokens", async () => {
    const email = uniqueEmail("register");
    createdEmails.push(email);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: {
        "content-type": "application/json",
        "user-agent": "auth-integration-test",
      },
      payload: {
        email,
        password: "Password123!",
        name: "Auth Test Register",
      },
    });

    assert.equal(response.statusCode, 201);

    const body = response.json();
    assert.equal(body.user.email, email);
    assert.equal(typeof body.accessToken, "string");
    assert.equal(typeof body.refreshToken, "string");
    assert.ok(body.workspace?.id);
  });

  it("sends verification email and verifies the user email with the token", async () => {
    const email = uniqueEmail("verify");
    createdEmails.push(email);
    sentEmails.length = 0;

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email,
        password: "Password123!",
        name: "Auth Test Verify",
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const registerBody = registerResponse.json() as AuthTokens & {
      user: { id: string; email: string; emailVerified: boolean };
    };

    assert.equal(registerBody.user.emailVerified, false);

    const sendResponse = await app.inject({
      method: "POST",
      url: "/api/auth/send-verification-email",
      headers: {
        authorization: `Bearer ${registerBody.accessToken}`,
      },
    });

    assert.equal(sendResponse.statusCode, 200);
    assert.equal(sendResponse.json().success, true);

    const verificationEmail = sentEmails.find(
      (item) => item.to === email && item.verifyUrl,
    );
    assert.ok(
      verificationEmail?.verifyUrl,
      "Expected verification email to be captured",
    );

    const verifyUrl = new URL(verificationEmail.verifyUrl);
    const token = verifyUrl.searchParams.get("token");
    assert.ok(token, "Expected verification token in verify URL");

    const verifyResponse = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        token,
      },
    });

    assert.equal(verifyResponse.statusCode, 200);
    assert.equal(verifyResponse.json().success, true);

    const meResponse = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${registerBody.accessToken}`,
      },
    });

    assert.equal(meResponse.statusCode, 200);
    assert.equal(meResponse.json().emailVerified, true);

    const reusedTokenResponse = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        token,
      },
    });

    assert.equal(reusedTokenResponse.statusCode, 400);
  });

  it("supports login, refresh rotation, and logout revocation", async () => {
    const email = uniqueEmail("login");
    createdEmails.push(email);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email,
        password: "Password123!",
        name: "Auth Test Login",
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email,
        password: "Password123!",
      },
    });

    assert.equal(loginResponse.statusCode, 201);
    const loginBody = loginResponse.json() as AuthTokens & {
      user: { id: string; email: string };
    };

    assert.equal(loginBody.user.email, email);
    assert.ok(loginBody.accessToken);
    assert.ok(loginBody.refreshToken);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken: loginBody.refreshToken,
      },
    });

    assert.equal(refreshResponse.statusCode, 201);
    const refreshBody = refreshResponse.json() as AuthTokens;
    assert.ok(refreshBody.accessToken);
    assert.ok(refreshBody.refreshToken);
    assert.notEqual(refreshBody.refreshToken, loginBody.refreshToken);

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      payload: {
        refreshToken: refreshBody.refreshToken,
      },
    });

    assert.equal(logoutResponse.statusCode, 201);
    assert.equal(logoutResponse.json().success, true);

    const refreshAfterLogout = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken: refreshBody.refreshToken,
      },
    });

    assert.equal(refreshAfterLogout.statusCode, 401);
  });

  it("sends forgot-password email, resets password, and invalidates old credentials", async () => {
    const email = uniqueEmail("reset");
    createdEmails.push(email);
    sentEmails.length = 0;

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email,
        password: "Password123!",
        name: "Auth Test Reset",
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const forgotResponse = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: {
        email,
      },
    });

    assert.equal(forgotResponse.statusCode, 200);
    assert.equal(forgotResponse.json().success, true);

    const resetEmail = sentEmails.find(
      (item) => item.to === email && item.resetUrl,
    );
    assert.ok(
      resetEmail?.resetUrl,
      "Expected password reset email to be captured",
    );

    const resetUrl = new URL(resetEmail.resetUrl);
    const token = resetUrl.searchParams.get("token");
    assert.ok(token, "Expected reset token in reset URL");

    const resetResponse = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: {
        token,
        newPassword: "NewPassword456!",
      },
    });

    assert.equal(resetResponse.statusCode, 200);
    assert.equal(resetResponse.json().success, true);

    const oldPasswordLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email,
        password: "Password123!",
      },
    });

    assert.equal(oldPasswordLogin.statusCode, 401);

    const newPasswordLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email,
        password: "NewPassword456!",
      },
    });

    assert.equal(newPasswordLogin.statusCode, 201);
    assert.ok(newPasswordLogin.json().accessToken);
  });
});
