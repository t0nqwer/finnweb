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
import { AuthModule } from "../auth/auth.module";
import { EmailService } from "../email/email.service";
import { SitesModule } from "../sites/sites.module";
import { TemplatesModule } from "./templates.module";

type AuthTokens = {
  accessToken: string;
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
  return `templates-it+${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe("Templates API integration", () => {
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
        TemplatesModule,
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

  async function registerUser(label: string) {
    const email = uniqueEmail(label);
    createdEmails.push(email);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email,
        password: "Password123!",
        name: `Template User ${label}`,
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

    const workspaceId = user?.workspaceMembers[0]?.workspaceId;
    assert.ok(workspaceId);

    return {
      userId: user?.id ?? "",
      workspaceId,
      accessToken: registerBody.accessToken,
    };
  }

  it("creates personal template and limits my scope to owner", async () => {
    const userA = await registerUser("scope-a");
    const userB = await registerUser("scope-b");

    const createTemplateResponse = await app.inject({
      method: "POST",
      url: "/api/templates",
      headers: {
        authorization: `Bearer ${userA.accessToken}`,
      },
      payload: {
        name: "Template ของฉัน",
        category: "custom",
        pages: [
          {
            title: "หน้าแรก",
            slug: "home",
            pageType: "LANDING",
            isHomePage: true,
            sections: [
              {
                type: "HERO",
                name: "Hero",
                props: {
                  title: "หัวข้อ",
                  subtitle: "คำอธิบาย",
                  buttonText: "เริ่ม",
                },
              },
            ],
          },
        ],
      },
    });

    assert.equal(createTemplateResponse.statusCode, 201, createTemplateResponse.body);

    const myListA = await app.inject({
      method: "GET",
      url: "/api/templates?scope=my",
      headers: {
        authorization: `Bearer ${userA.accessToken}`,
      },
    });

    assert.equal(myListA.statusCode, 200, myListA.body);
    const myListABody = myListA.json() as { data: Array<{ name: string }> };
    assert.equal(
      myListABody.data.some((template) => template.name === "Template ของฉัน"),
      true,
    );

    const myListB = await app.inject({
      method: "GET",
      url: "/api/templates?scope=my",
      headers: {
        authorization: `Bearer ${userB.accessToken}`,
      },
    });

    assert.equal(myListB.statusCode, 200, myListB.body);
    const myListBBody = myListB.json() as { data: Array<{ name: string }> };
    assert.equal(
      myListBBody.data.some((template) => template.name === "Template ของฉัน"),
      false,
    );
  });

  it("applies official template via /templates/:id/apply", async () => {
    const user = await registerUser("apply-official");

    const category = await prisma.templateCategory.upsert({
      where: { slug: "integration-official" },
      update: { name: "Integration Official", isActive: true },
      create: {
        name: "Integration Official",
        slug: "integration-official",
        isActive: true,
      },
    });

    const officialTemplate = await prisma.template.create({
      data: {
        code: `IT-${Date.now()}`,
        name: "Official Integration Template",
        slug: `official-integration-${Math.random().toString(36).slice(2, 7)}`,
        categoryId: category.id,
        status: "PUBLISHED",
        visibility: "OFFICIAL",
        sortOrder: 1,
      },
    });

    const homePage = await prisma.templatePage.create({
      data: {
        templateId: officialTemplate.id,
        title: "หน้าแรก",
        slug: "home",
        pageType: "LANDING",
        path: "/",
        isHomePage: true,
        sortOrder: 0,
      },
    });

    const aboutPage = await prisma.templatePage.create({
      data: {
        templateId: officialTemplate.id,
        title: "เกี่ยวกับ",
        slug: "about",
        pageType: "NORMAL",
        path: "/about",
        isHomePage: false,
        sortOrder: 1,
      },
    });

    await prisma.templateSection.createMany({
      data: [
        {
          templatePageId: homePage.id,
          type: "HERO",
          sortOrder: 0,
          props: {
            title: "หัวข้อ",
            subtitle: "คำอธิบาย",
            buttonText: "เริ่ม",
          },
        },
        {
          templatePageId: aboutPage.id,
          type: "CONTENT",
          sortOrder: 0,
          props: {
            title: "เกี่ยวกับ",
            body: "รายละเอียด",
          },
        },
      ],
    });

    await prisma.templateVersion.create({
      data: {
        templateId: officialTemplate.id,
        version: 1,
        isActive: true,
        snapshot: {
          pages: [
            {
              title: "หน้าแรก",
              slug: "home",
              pageType: "LANDING",
              path: "/",
              isHomePage: true,
              sections: [
                {
                  type: "HERO",
                  props: {
                    title: "หัวข้อ",
                    subtitle: "คำอธิบาย",
                    buttonText: "เริ่ม",
                  },
                },
              ],
            },
            {
              title: "เกี่ยวกับ",
              slug: "about",
              pageType: "NORMAL",
              path: "/about",
              sections: [
                {
                  type: "CONTENT",
                  props: {
                    title: "เกี่ยวกับ",
                    body: "รายละเอียด",
                  },
                },
              ],
            },
          ],
        },
      },
    });

    const applyResponse = await app.inject({
      method: "POST",
      url: `/api/templates/${officialTemplate.id}/apply`,
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
      payload: {
        siteName: "เว็บไซต์จากเทมเพลต official",
        workspaceId: user.workspaceId,
      },
    });

    assert.equal(applyResponse.statusCode, 201, applyResponse.body);

    const applyBody = applyResponse.json() as {
      data: {
        id: string;
      };
    };

    const pageCount = await prisma.page.count({
      where: {
        siteId: applyBody.data.id,
      },
    });

    assert.equal(pageCount >= 2, true);
  });

  it("creates site with templateId via POST /sites", async () => {
    const user = await registerUser("site-create-template-id");

    const userTemplateCreate = await app.inject({
      method: "POST",
      url: "/api/templates",
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
      payload: {
        name: "Template สำหรับสร้างไซต์",
        pages: [
          {
            title: "หน้าแรก",
            slug: "home",
            pageType: "LANDING",
            isHomePage: true,
            sections: [
              {
                type: "NAVBAR",
                props: {
                  menuItems: [
                    {
                      label: "หน้าแรก",
                      href: "/",
                    },
                  ],
                },
              },
              {
                type: "HERO",
                props: {
                  title: "เปิดตัวธุรกิจออนไลน์",
                  subtitle: "เริ่มได้ทันที",
                  buttonText: "เริ่มใช้งาน",
                },
              },
            ],
          },
          {
            title: "ติดต่อ",
            slug: "contact",
            pageType: "NORMAL",
            path: "/contact",
            sections: [
              {
                type: "FORM",
                props: {
                  title: "ฝากข้อมูล",
                  subtitle: "ทีมงานติดต่อกลับ",
                  buttonText: "ส่ง",
                },
              },
            ],
          },
        ],
      },
    });

    assert.equal(userTemplateCreate.statusCode, 201, userTemplateCreate.body);

    const templateId = (userTemplateCreate.json() as { data: { id: string } }).data
      .id;

    const createSiteResponse = await app.inject({
      method: "POST",
      url: "/api/sites",
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
      payload: {
        name: "Site from templateId",
        workspaceId: user.workspaceId,
        templateId,
      },
    });

    assert.equal(createSiteResponse.statusCode, 201, createSiteResponse.body);

    const siteId = (createSiteResponse.json() as { data: { id: string } }).data
      .id;

    const pages = await prisma.page.findMany({
      where: {
        siteId,
      },
      include: {
        sections: true,
      },
    });

    assert.equal(pages.length >= 2, true);
    assert.equal(
      pages.some((page) => page.sections.some((section) => section.type === "NAVBAR")),
      true,
    );
  });
});
