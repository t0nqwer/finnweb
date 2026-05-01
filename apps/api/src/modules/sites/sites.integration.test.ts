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
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { AuthModule } from "../auth/auth.module";
import { SitesModule } from "./sites.module";

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type CreatedContext = {
  email: string;
  accessToken: string;
  siteId: string;
  pageId: string;
};

const emailServiceMock = {
  async sendVerificationEmail() {
    return;
  },
  async sendPasswordResetEmail() {
    return;
  },
};

function uniqueEmail(label: string) {
  return `sites-it+${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function getErrorMessage(response: { json: () => any }) {
  const body = response.json();
  return body?.message ?? body?.error?.message;
}

describe("Sites API integration - section props validation", () => {
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
        SitesModule,
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
      "Expected FREE plan to exist before sites integration tests",
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

  async function createSiteAndPageContext(
    label: string,
  ): Promise<CreatedContext> {
    const email = uniqueEmail(label);
    createdEmails.push(email);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email,
        password: "Password123!",
        name: `Sites Integration ${label}`,
      },
    });

    assert.equal(registerResponse.statusCode, 201);
    const registerBody = registerResponse.json() as AuthTokens;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        workspaceMembers: {
          select: {
            workspaceId: true,
          },
          take: 1,
        },
      },
    });

    const workspaceId = user?.workspaceMembers[0]?.workspaceId;
    assert.ok(
      workspaceId,
      "Expected registered user to have a workspace membership",
    );

    const site = await prisma.site.create({
      data: {
        workspaceId,
        name: `Integration Site ${label}`,
        slug: `site-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
      select: {
        id: true,
      },
    });

    const page = await prisma.page.create({
      data: {
        siteId: site.id,
        title: "Home",
        slug: `home-${Math.random().toString(36).slice(2, 8)}`,
        path: `/${Math.random().toString(36).slice(2, 8)}`,
        pageType: "LANDING",
        isHomePage: false,
        isPublished: false,
        sortOrder: 0,
      },
      select: {
        id: true,
      },
    });

    return {
      email,
      accessToken: registerBody.accessToken,
      siteId: site.id,
      pageId: page.id,
    };
  }

  it("returns SECTION_PROPS_INVALID_TITLE when HERO title has invalid type", async () => {
    const context = await createSiteAndPageContext("hero-title-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "HERO",
        props: {
          title: 42,
          subtitle: "ข้อความทดสอบ",
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_TITLE");
  });

  it("returns SECTION_PROPS_INVALID_SUBTITLE when HERO subtitle has invalid type", async () => {
    const context = await createSiteAndPageContext("hero-subtitle-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "HERO",
        props: {
          title: "หัวข้อปกติ",
          subtitle: {
            text: "invalid",
          },
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_SUBTITLE");
  });

  it("returns SECTION_PROPS_INVALID_BUTTON_TEXT when CTA button text has invalid type", async () => {
    const context = await createSiteAndPageContext("cta-button-text-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "CTA",
        props: {
          title: "พร้อมเริ่มเลยไหม",
          subtitle: "ข้อความปกติ",
          buttonText: false,
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(
      getErrorMessage(response),
      "SECTION_PROPS_INVALID_BUTTON_TEXT",
    );
  });

  it("returns SECTION_PROPS_INVALID_BODY when RICH_TEXT body has invalid type", async () => {
    const context = await createSiteAndPageContext("rich-text-body-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "RICH_TEXT",
        props: {
          title: "หัวข้อปกติ",
          body: 123,
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_BODY");
  });

  it("returns SECTION_PROPS_INVALID_DESCRIPTION when FEATURE description has invalid type", async () => {
    const context = await createSiteAndPageContext(
      "feature-description-invalid",
    );

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "FEATURE",
        props: {
          title: "หัวข้อปกติ",
          description: {
            text: "invalid",
          },
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(
      getErrorMessage(response),
      "SECTION_PROPS_INVALID_DESCRIPTION",
    );
  });

  it("returns SECTION_PROPS_INVALID_MENU_ITEMS when NAVBAR menuItems has invalid shape", async () => {
    const context = await createSiteAndPageContext("navbar-menu-items-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "NAVBAR",
        props: {
          menuItems: [
            {
              label: "หน้าแรก",
              href: 123,
            },
          ],
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_MENU_ITEMS");
  });

  it("returns SECTION_PROPS_INVALID_SOURCE_MODE when PRODUCT_GRID sourceMode is invalid", async () => {
    const context = await createSiteAndPageContext("product-grid-source-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "PRODUCT_GRID",
        props: {
          sourceMode: "auto",
          itemLimit: 10,
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_SOURCE_MODE");
  });

  it("returns SECTION_PROPS_INVALID_IMAGE_URL when IMAGE url is not http or root-relative", async () => {
    const context = await createSiteAndPageContext("image-url-invalid");

    const createSectionResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "IMAGE",
        props: {
          imageUrl: "https://example.com/ok.jpg",
        },
      },
    });

    assert.equal(
      createSectionResponse.statusCode,
      201,
      createSectionResponse.body,
    );

    const sectionId = createSectionResponse.json().data.id as string;

    const updateSectionResponse = await app.inject({
      method: "PATCH",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections/${sectionId}`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        props: {
          imageUrl: "ftp://example.com/not-allowed.jpg",
        },
      },
    });

    assert.equal(
      updateSectionResponse.statusCode,
      400,
      updateSectionResponse.body,
    );
    assert.equal(
      getErrorMessage(updateSectionResponse),
      "SECTION_PROPS_INVALID_IMAGE_URL",
    );
  });

  it("returns SECTION_PROPS_INVALID_ALT_TEXT when IMAGE alt text has invalid type", async () => {
    const context = await createSiteAndPageContext("image-alt-text-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "IMAGE",
        props: {
          imageUrl: "https://example.com/ok.jpg",
          altText: 999,
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_ALT_TEXT");
  });

  it("returns field-specific schema error for default branch when nested props exceed allowed depth", async () => {
    const context = await createSiteAndPageContext("default-depth-invalid");

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "BLOG_LIST",
        props: {
          config: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    level5: {
                      level6: {
                        level7: "too-deep",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(
      getErrorMessage(response),
      "SECTION_PROPS_INVALID_LEVEL6_DEPTH",
    );
  });

  it("returns field-specific schema error for default branch when array exceeds max size", async () => {
    const context = await createSiteAndPageContext(
      "default-array-size-invalid",
    );

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        type: "BLOG_LIST",
        props: {
          items: Array.from({ length: 201 }, (_, index) => ({
            title: `item-${index}`,
          })),
        },
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(getErrorMessage(response), "SECTION_PROPS_INVALID_ITEMS_SIZE");
  });

  it("accepts public lead submission and persists form submission with site/page context", async () => {
    const context = await createSiteAndPageContext("public-submit-success");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isPublished: true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/public/sites/${context.siteId}/forms/submit`,
      payload: {
        name: "Somchai",
        email: "somchai@example.com",
        phone: "0812345678",
        message: "ขอรายละเอียดเพิ่มเติม",
        pageId: context.pageId,
      },
      headers: {
        "user-agent": "integration-test-agent",
        referer:
          "https://example.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=sale",
      },
    });

    assert.equal(response.statusCode, 201, response.body);

    const payload = response.json() as {
      success: boolean;
      data: {
        submissionId: string;
      };
    };

    assert.equal(payload.success, true);
    assert.ok(payload.data.submissionId);

    const submission = await prisma.formSubmission.findUnique({
      where: {
        id: payload.data.submissionId,
      },
      include: {
        form: {
          select: {
            siteId: true,
            pageId: true,
          },
        },
      },
    });

    assert.ok(submission);
    assert.equal(submission.form.siteId, context.siteId);
    assert.equal(submission.form.pageId, context.pageId);
  });

  it("returns validation error when public lead payload is invalid", async () => {
    const context = await createSiteAndPageContext("public-submit-invalid");

    const beforeCount = await prisma.formSubmission.count({
      where: {
        form: {
          siteId: context.siteId,
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/public/sites/${context.siteId}/forms/submit`,
      payload: {
        name: "",
        email: "not-an-email",
      },
    });

    assert.equal(response.statusCode >= 400, true, response.body);

    const afterCount = await prisma.formSubmission.count({
      where: {
        form: {
          siteId: context.siteId,
        },
      },
    });

    assert.equal(afterCount, beforeCount, response.body);
  });

  it("returns PUBLIC_PAGE_NOT_FOUND when page is not published", async () => {
    const context = await createSiteAndPageContext("public-submit-page-check");

    const response = await app.inject({
      method: "POST",
      url: `/api/public/sites/${context.siteId}/forms/submit`,
      payload: {
        name: "Somchai",
        email: "somchai@example.com",
        pageId: context.pageId,
      },
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(getErrorMessage(response), "PUBLIC_PAGE_NOT_FOUND");
  });

  it("creates section from sectionTemplateId and returns sectionTemplate summary", async () => {
    const context = await createSiteAndPageContext("create-from-section-template");

    const template = await prisma.sectionTemplate.create({
      data: {
        code: `it-hero-${Date.now()}`,
        name: "IT Hero Template",
        sectionType: "HERO",
        isOfficial: true,
        isPublished: true,
        sortOrder: 1,
        layoutJson: {
          defaultProps: {
            title: "Default Hero",
            subtitle: "Default subtitle",
            buttonText: "Default CTA",
          },
        },
      },
    });

    await prisma.sectionTemplateVersion.create({
      data: {
        sectionTemplateId: template.id,
        version: 1,
        name: "v1",
        snapshot: {
          props: {
            title: "Default Hero",
            subtitle: "Default subtitle",
            buttonText: "Default CTA",
          },
        },
        isActive: true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        sectionTemplateId: template.id,
        props: {
          title: "Custom Hero",
        },
      },
    });

    assert.equal(response.statusCode, 201, response.body);
    const body = response.json() as {
      data: {
        type: string;
        props: Record<string, unknown>;
        sectionTemplate?: { id: string; name: string } | null;
      };
    };

    assert.equal(body.data.type, "HERO");
    assert.equal(body.data.sectionTemplate?.id, template.id);
    assert.equal(body.data.props.title, "Custom Hero");
  });

  it("switches section template with same type and preserves canonical fields", async () => {
    const context = await createSiteAndPageContext("switch-section-template");

    const templateA = await prisma.sectionTemplate.create({
      data: {
        code: `it-cta-a-${Date.now()}`,
        name: "CTA A",
        sectionType: "CTA",
        isOfficial: true,
        isPublished: true,
        sortOrder: 1,
        layoutJson: {
          defaultProps: {
            title: "A title",
            subtitle: "A subtitle",
            buttonText: "Primary A",
          },
        },
      },
    });

    const templateB = await prisma.sectionTemplate.create({
      data: {
        code: `it-cta-b-${Date.now()}`,
        name: "CTA B",
        sectionType: "CTA",
        isOfficial: true,
        isPublished: true,
        sortOrder: 2,
        layoutJson: {
          defaultProps: {
            title: "B title",
            subtitle: "B subtitle",
            buttonText: "Primary B",
            ctaTemplate: "double",
          },
        },
      },
    });

    await prisma.sectionTemplateVersion.createMany({
      data: [
        {
          sectionTemplateId: templateA.id,
          version: 1,
          name: "v1",
          snapshot: {
            props: {
              title: "A title",
              subtitle: "A subtitle",
              buttonText: "Primary A",
            },
          },
          isActive: true,
        },
        {
          sectionTemplateId: templateB.id,
          version: 1,
          name: "v1",
          snapshot: {
            props: {
              title: "B title",
              subtitle: "B subtitle",
              buttonText: "Primary B",
              ctaTemplate: "double",
            },
          },
          isActive: true,
        },
      ],
    });

    const createSection = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        sectionTemplateId: templateA.id,
        props: {
          title: "Preserved title",
          subtitle: "Preserved subtitle",
          buttonText: "Preserved CTA",
        },
      },
    });

    assert.equal(createSection.statusCode, 201, createSection.body);
    const sectionId = (createSection.json() as { data: { id: string } }).data.id;

    const switchResponse = await app.inject({
      method: "PATCH",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections/${sectionId}/template`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        sectionTemplateId: templateB.id,
      },
    });

    assert.equal(switchResponse.statusCode, 200, switchResponse.body);
    const switched = switchResponse.json() as {
      data: {
        sectionTemplate?: { id: string; name: string } | null;
        props: Record<string, unknown>;
      };
    };

    assert.equal(switched.data.sectionTemplate?.id, templateB.id);
    assert.equal(switched.data.props.title, "Preserved title");
    assert.equal(switched.data.props.subtitle, "Preserved subtitle");
    assert.equal(switched.data.props.buttonText, "Preserved CTA");
  });
});
