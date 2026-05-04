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

type RegisteredUserContext = {
  email: string;
  accessToken: string;
  userId: string;
  workspaceId: string;
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

  async function registerUserContext(
    label: string,
  ): Promise<RegisteredUserContext> {
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

    assert.equal(registerResponse.statusCode, 201, registerResponse.body);

    const registerBody = registerResponse.json() as AuthTokens;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        workspaceMembers: {
          select: {
            workspaceId: true,
          },
          take: 1,
        },
      },
    });

    const userId = user?.id;
    const workspaceId = user?.workspaceMembers[0]?.workspaceId;

    assert.ok(userId, "Expected registered user to exist");
    assert.ok(workspaceId, "Expected registered user to have workspace");

    return {
      email,
      accessToken: registerBody.accessToken,
      userId,
      workspaceId,
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
    const context = await createSiteAndPageContext(
      "product-grid-source-invalid",
    );

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
    assert.equal(
      getErrorMessage(response),
      "SECTION_PROPS_INVALID_SOURCE_MODE",
    );
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

    // Page must be set as home and published, and the site must be published (snapshot created)
    // before submitPublicLead validates pageId against the publish log snapshot.
    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: true,
        path: "/",
      },
    });

    await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: { title: "Lead test page", subtitle: "Lead form test" },
      },
    });

    const publishResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/publish`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(publishResponse.statusCode, 201, publishResponse.body);

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
    const context = await createSiteAndPageContext(
      "create-from-section-template",
    );

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
    const sectionId = (createSection.json() as { data: { id: string } }).data
      .id;

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

  it("applies template to existing site draft pages and keeps published snapshots unchanged", async () => {
    const context = await createSiteAndPageContext(
      "apply-template-existing-site",
    );

    const owner = await prisma.user.findUnique({
      where: {
        email: context.email,
      },
      select: {
        id: true,
      },
    });

    assert.ok(owner?.id, "Expected owner user for template creation");

    await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: {
          title: "Old draft title",
        },
      },
    });

    await prisma.publishLog.create({
      data: {
        siteId: context.siteId,
        version: 1,
        action: "PUBLISH",
        snapshot: {
          marker: "published-before-apply-template",
          pages: [
            {
              title: "Published home",
              path: "/",
            },
          ],
        },
      },
    });

    const template = await prisma.template.create({
      data: {
        name: "Apply Template IT",
        slug: `apply-template-it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdById: owner.id,
        tags: {
          theme: {
            accentColor: "#112233",
            textColor: "#ffffff",
          },
        },
        pages: {
          create: [
            {
              title: "{{businessName}} Home",
              slug: "home",
              path: "/",
              pageType: "LANDING",
              isHomePage: true,
              sortOrder: 0,
              sections: {
                create: [
                  {
                    type: "HERO",
                    name: "Hero {{businessName}}",
                    sortOrder: 0,
                    props: {
                      title: "{{businessName}}",
                      subtitle: "โทร {{phone}}",
                      buttonText: "แชท {{lineUrl}}",
                    },
                  },
                  {
                    type: "RICH_TEXT",
                    name: "About",
                    sortOrder: 1,
                    props: {
                      title: "สไตล์ {{style}}",
                      body: "ภาษา {{language}}",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/apply-template`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        templateId: template.id,
        businessName: "Finn Clinic",
        style: "modern",
        language: "th",
        phone: "0812345678",
        lineId: "@finnclinic",
      },
    });

    assert.equal(response.statusCode, 201, response.body);

    const body = response.json() as {
      data: {
        site: {
          id: string;
          themeConfig: Record<string, unknown> | null;
        };
        pagesCount: number;
        sectionsCount: number;
      };
    };

    assert.equal(body.data.site.id, context.siteId);
    assert.equal(body.data.pagesCount, 1);
    assert.equal(body.data.sectionsCount, 2);
    assert.equal((body.data.site.themeConfig ?? {})["accentColor"], "#112233");

    const replacedPage = await prisma.page.findFirst({
      where: {
        siteId: context.siteId,
        isPublished: false,
      },
      include: {
        sections: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    assert.ok(replacedPage, "Expected new draft page from template");
    assert.equal(replacedPage?.title, "Finn Clinic Home");
    assert.equal(replacedPage?.sections.length, 2);

    const heroSection = replacedPage?.sections[0];
    const heroProps = (heroSection?.props ?? {}) as Record<string, unknown>;

    assert.equal(heroProps.title, "Finn Clinic");
    assert.equal(heroProps.subtitle, "โทร 0812345678");
    assert.equal(
      heroProps.buttonText,
      "แชท https://line.me/R/ti/p/@finnclinic",
    );

    const oldPage = await prisma.page.findUnique({
      where: {
        id: context.pageId,
      },
      select: {
        id: true,
      },
    });

    assert.equal(oldPage, null, "Expected old draft page to be replaced");

    const publishLogs = await prisma.publishLog.findMany({
      where: {
        siteId: context.siteId,
      },
      orderBy: {
        version: "asc",
      },
      select: {
        version: true,
        snapshot: true,
      },
    });

    assert.equal(publishLogs.length, 1);
    const snapshot = publishLogs[0]?.snapshot as Record<string, unknown>;
    assert.equal(snapshot.marker, "published-before-apply-template");
  });

  it("blocks apply-template when user has no edit permission on site", async () => {
    const owner = await createSiteAndPageContext(
      "apply-template-permission-owner",
    );
    const anotherUser = await registerUserContext(
      "apply-template-permission-other",
    );

    const ownerUser = await prisma.user.findUnique({
      where: {
        email: owner.email,
      },
      select: {
        id: true,
      },
    });

    assert.ok(ownerUser?.id, "Expected owner user for template creation");

    const template = await prisma.template.create({
      data: {
        name: "Forbidden Apply Template",
        slug: `forbidden-apply-template-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdById: ownerUser.id,
        pages: {
          create: [
            {
              title: "Home",
              slug: "home",
              pageType: "LANDING",
              path: "/",
              isHomePage: true,
              sections: {
                create: [
                  {
                    type: "HERO",
                    props: {
                      title: "Hello",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${owner.siteId}/apply-template`,
      headers: {
        authorization: `Bearer ${anotherUser.accessToken}`,
      },
      payload: {
        templateId: template.id,
      },
    });

    assert.equal(response.statusCode, 403, response.body);
    assert.equal(getErrorMessage(response), "SITE_NOT_FOUND_OR_FORBIDDEN");
  });

  it("returns clear validation error when publishing has unresolved placeholders", async () => {
    const context = await createSiteAndPageContext(
      "publish-placeholder-invalid",
    );

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: true,
        path: "/",
      },
    });

    const section = await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: {
          title: "{{businessName}}",
          subtitle: "ข้อความ",
        },
      },
      select: {
        id: true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/publish`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(
      getErrorMessage(response),
      `PUBLISH_UNRESOLVED_PLACEHOLDERS_IN_SECTION:${section.id}`,
    );
  });

  it("publishes snapshot and keeps public page stable until republish", async () => {
    const context = await createSiteAndPageContext("publish-snapshot-stable");

    const siteRecord = await prisma.site.findUnique({
      where: {
        id: context.siteId,
      },
      select: {
        slug: true,
      },
    });

    assert.ok(siteRecord?.slug, "Expected site slug for public route test");

    const pageRecord = await prisma.page.findUnique({
      where: {
        id: context.pageId,
      },
      select: {
        slug: true,
      },
    });

    assert.ok(pageRecord?.slug, "Expected page slug for public route test");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: true,
        path: "/",
      },
    });

    const section = await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: {
          title: "First publish title",
          subtitle: "ข้อความเริ่มต้น",
        },
      },
      select: {
        id: true,
      },
    });

    const domainHost = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.example.com`;
    await prisma.domain.create({
      data: {
        siteId: context.siteId,
        host: domainHost,
        type: "SUBDOMAIN",
        isPrimary: true,
      },
    });

    const firstPublish = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/publish`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(firstPublish.statusCode, 201, firstPublish.body);
    const firstPublishBody = firstPublish.json() as {
      data: {
        version: number;
      };
    };
    assert.equal(firstPublishBody.data.version, 1);

    const firstPublic = await app.inject({
      method: "GET",
      url: `/api/public/sites/page?domain=${encodeURIComponent(domainHost)}&path=%2F`,
    });

    assert.equal(firstPublic.statusCode, 200, firstPublic.body);
    const firstPublicBody = firstPublic.json() as {
      data: {
        sections: Array<{ props: Record<string, unknown> }>;
      };
    };
    assert.equal(
      firstPublicBody.data.sections[0]?.props.title,
      "First publish title",
    );

    const firstPublicBySlug = await app.inject({
      method: "GET",
      url: `/api/public/sites/${siteRecord.slug}`,
    });

    assert.equal(firstPublicBySlug.statusCode, 200, firstPublicBySlug.body);
    const firstPublicBySlugBody = firstPublicBySlug.json() as {
      data: {
        sections: Array<{ props: Record<string, unknown> }>;
      };
    };
    assert.equal(
      firstPublicBySlugBody.data.sections[0]?.props.title,
      "First publish title",
    );

    const firstPublicSubPageBySlug = await app.inject({
      method: "GET",
      url: `/api/public/sites/${siteRecord.slug}/pages/${pageRecord.slug}`,
    });

    assert.equal(
      firstPublicSubPageBySlug.statusCode,
      200,
      firstPublicSubPageBySlug.body,
    );

    const draftUpdate = await app.inject({
      method: "PATCH",
      url: `/api/sites/${context.siteId}/pages/${context.pageId}/sections/${section.id}`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        props: {
          title: "Draft changed but not republished",
          subtitle: "ข้อความใหม่",
        },
      },
    });

    assert.equal(draftUpdate.statusCode, 200, draftUpdate.body);

    const publicAfterDraftEdit = await app.inject({
      method: "GET",
      url: `/api/public/sites/page?domain=${encodeURIComponent(domainHost)}&path=%2F`,
    });

    assert.equal(
      publicAfterDraftEdit.statusCode,
      200,
      publicAfterDraftEdit.body,
    );
    const publicAfterDraftEditBody = publicAfterDraftEdit.json() as {
      data: {
        sections: Array<{ props: Record<string, unknown> }>;
      };
    };
    assert.equal(
      publicAfterDraftEditBody.data.sections[0]?.props.title,
      "First publish title",
    );

    const publicAfterDraftEditBySlug = await app.inject({
      method: "GET",
      url: `/api/public/sites/${siteRecord.slug}`,
    });

    assert.equal(
      publicAfterDraftEditBySlug.statusCode,
      200,
      publicAfterDraftEditBySlug.body,
    );
    const publicAfterDraftEditBySlugBody =
      publicAfterDraftEditBySlug.json() as {
        data: {
          sections: Array<{ props: Record<string, unknown> }>;
        };
      };
    assert.equal(
      publicAfterDraftEditBySlugBody.data.sections[0]?.props.title,
      "First publish title",
    );

    const secondPublish = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/publish`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(secondPublish.statusCode, 201, secondPublish.body);
    const secondPublishBody = secondPublish.json() as {
      data: {
        version: number;
      };
    };
    assert.equal(secondPublishBody.data.version, 2);

    const publicAfterRepublish = await app.inject({
      method: "GET",
      url: `/api/public/sites/page?domain=${encodeURIComponent(domainHost)}&path=%2F`,
    });

    assert.equal(
      publicAfterRepublish.statusCode,
      200,
      publicAfterRepublish.body,
    );
    const publicAfterRepublishBody = publicAfterRepublish.json() as {
      data: {
        sections: Array<{ props: Record<string, unknown> }>;
      };
    };
    assert.equal(
      publicAfterRepublishBody.data.sections[0]?.props.title,
      "Draft changed but not republished",
    );

    const publicAfterRepublishBySlug = await app.inject({
      method: "GET",
      url: `/api/public/sites/${siteRecord.slug}`,
    });

    assert.equal(
      publicAfterRepublishBySlug.statusCode,
      200,
      publicAfterRepublishBySlug.body,
    );
    const publicAfterRepublishBySlugBody =
      publicAfterRepublishBySlug.json() as {
        data: {
          sections: Array<{ props: Record<string, unknown> }>;
        };
      };
    assert.equal(
      publicAfterRepublishBySlugBody.data.sections[0]?.props.title,
      "Draft changed but not republished",
    );
  });

  it("returns 404 for unpublished site on slug public routes", async () => {
    const context = await createSiteAndPageContext("public-slug-unpublished");

    const siteRecord = await prisma.site.findUnique({
      where: {
        id: context.siteId,
      },
      select: {
        slug: true,
      },
    });

    assert.ok(
      siteRecord?.slug,
      "Expected site slug for unpublished route test",
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/public/sites/${siteRecord.slug}`,
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(getErrorMessage(response), "PUBLIC_PAGE_NOT_FOUND");
  });

  it("returns 404 for unpublished site on domain public route", async () => {
    const context = await createSiteAndPageContext("public-domain-unpublished");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: true,
        path: "/",
      },
    });

    await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: {
          title: "Published before unpublish",
          subtitle: "ทดสอบ route แบบ domain",
        },
      },
    });

    const domainHost = `pub-unpublished-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.example.com`;
    await prisma.domain.create({
      data: {
        siteId: context.siteId,
        host: domainHost,
        type: "SUBDOMAIN",
        isPrimary: true,
      },
    });

    const publishResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/publish`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(publishResponse.statusCode, 201, publishResponse.body);

    await prisma.site.update({
      where: {
        id: context.siteId,
      },
      data: {
        status: "DRAFT",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/public/sites/page?domain=${encodeURIComponent(domainHost)}&path=%2F`,
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(getErrorMessage(response), "PUBLIC_PAGE_NOT_FOUND");
  });

  it("returns 404 for missing page on published slug sub-page route", async () => {
    const context = await createSiteAndPageContext("public-missing-subpage");

    const siteRecord = await prisma.site.findUnique({
      where: {
        id: context.siteId,
      },
      select: {
        slug: true,
      },
    });

    assert.ok(siteRecord?.slug, "Expected site slug for missing page test");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: true,
        path: "/",
      },
    });

    await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: {
          title: "Published home only",
          subtitle: "ไม่มีหน้าย่อย slug นี้",
        },
      },
    });

    const publishResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/publish`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(publishResponse.statusCode, 201, publishResponse.body);

    const response = await app.inject({
      method: "GET",
      url: `/api/public/sites/${siteRecord.slug}/pages/not-found-page-slug`,
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(getErrorMessage(response), "PUBLIC_PAGE_NOT_FOUND");
  });

  it("allows preview token to read draft page when token is valid", async () => {
    const context = await createSiteAndPageContext("preview-token-draft");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: false,
        path: "/",
      },
    });

    await prisma.section.create({
      data: {
        pageId: context.pageId,
        type: "HERO",
        sortOrder: 0,
        isVisible: true,
        props: {
          title: "Draft preview title",
          subtitle: "เห็นได้เฉพาะผ่าน preview token",
        },
      },
    });

    const previewTokenResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/preview-token`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        expiresInDays: 1,
      },
    });

    assert.equal(
      previewTokenResponse.statusCode,
      201,
      previewTokenResponse.body,
    );
    const previewTokenBody = previewTokenResponse.json() as {
      data: {
        token: string;
      };
    };

    const response = await app.inject({
      method: "GET",
      url: `/api/public/sites/preview/${previewTokenBody.data.token}?path=%2F`,
    });

    assert.equal(response.statusCode, 200, response.body);
    const responseBody = response.json() as {
      data: {
        sections: Array<{ props: Record<string, unknown> }>;
      };
    };
    assert.equal(
      responseBody.data.sections[0]?.props.title,
      "Draft preview title",
    );
  });

  it("returns PREVIEW_TOKEN_EXPIRED when preview token is expired", async () => {
    const context = await createSiteAndPageContext("preview-token-expired");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        path: "/",
      },
    });

    const previewTokenResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/preview-token`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        expiresInDays: 1,
      },
    });

    assert.equal(
      previewTokenResponse.statusCode,
      201,
      previewTokenResponse.body,
    );
    const previewTokenBody = previewTokenResponse.json() as {
      data: {
        token: string;
      };
    };

    await prisma.previewToken.updateMany({
      where: {
        token: previewTokenBody.data.token,
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/public/sites/preview/${previewTokenBody.data.token}?path=%2F`,
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(getErrorMessage(response), "PREVIEW_TOKEN_EXPIRED");
  });

  it("returns PREVIEW_TOKEN_INVALID when preview token is revoked", async () => {
    const context = await createSiteAndPageContext("preview-token-revoked");

    await prisma.page.update({
      where: {
        id: context.pageId,
      },
      data: {
        isHomePage: true,
        isPublished: false,
        path: "/",
      },
    });

    const previewTokenResponse = await app.inject({
      method: "POST",
      url: `/api/sites/${context.siteId}/preview-token`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
      payload: {
        expiresInDays: 1,
      },
    });

    assert.equal(
      previewTokenResponse.statusCode,
      201,
      previewTokenResponse.body,
    );

    const previewTokenBody = previewTokenResponse.json() as {
      data: {
        id: string;
        token: string;
      };
    };

    const revokeResponse = await app.inject({
      method: "DELETE",
      url: `/api/sites/${context.siteId}/preview-tokens/${previewTokenBody.data.id}`,
      headers: {
        authorization: `Bearer ${context.accessToken}`,
      },
    });

    assert.equal(revokeResponse.statusCode, 200, revokeResponse.body);

    const response = await app.inject({
      method: "GET",
      url: `/api/public/sites/preview/${previewTokenBody.data.token}?path=%2F`,
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(getErrorMessage(response), "PREVIEW_TOKEN_INVALID");
  });
});
