import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SitesService } from "./sites.service";

type WorkspaceContext = {
  userId: string;
  workspaceId: string;
};

function uniqueSuffix(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function assertRejectsWithMessage(
  action: () => Promise<unknown>,
  message: string,
) {
  await assert.rejects(
    action,
    (error) =>
      error instanceof BadRequestException && error.message === message,
  );
}

describe("SitesService plan gating", () => {
  let prisma: PrismaService;
  let sitesService: SitesService;
  const createdUserIds: string[] = [];

  before(async () => {
    process.env.NODE_ENV = "test";

    prisma = new PrismaService();
    await prisma.$connect();

    await prisma.plan.update({
      where: { code: "FREE" },
      data: {
        maxSites: 1,
        maxPagesPerSite: 1,
        maxSectionsPerPage: 10,
      },
    });

    sitesService = new SitesService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }

    await prisma.$disconnect();
  });

  async function createWorkspaceContext(
    label: string,
  ): Promise<WorkspaceContext> {
    const suffix = uniqueSuffix(label);
    const freePlan = await prisma.plan.findUniqueOrThrow({
      where: { code: "FREE" },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        email: `sites-gating+${suffix}@example.com`,
        name: `Sites Gating ${suffix}`,
      },
      select: {
        id: true,
      },
    });
    createdUserIds.push(user.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: `Workspace ${suffix}`,
        slug: `workspace-${suffix}`,
        ownerId: user.id,
      },
      select: {
        id: true,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    await prisma.subscription.create({
      data: {
        workspaceId: workspace.id,
        planId: freePlan.id,
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        isCurrent: true,
      },
    });

    return {
      userId: user.id,
      workspaceId: workspace.id,
    };
  }

  it("blocks site creation when workspace reaches plan site limit", async () => {
    const context = await createWorkspaceContext("site-limit");

    await sitesService.create(context.userId, {
      workspaceId: context.workspaceId,
      name: "First Free Plan Site",
      slug: uniqueSuffix("first-free-site"),
    });

    await assertRejectsWithMessage(
      () =>
        sitesService.create(context.userId, {
          workspaceId: context.workspaceId,
          name: "Second Free Plan Site",
          slug: uniqueSuffix("second-free-site"),
        }),
      "SITE_LIMIT_REACHED",
    );
  });

  it("blocks page creation when site reaches plan page limit", async () => {
    const context = await createWorkspaceContext("page-limit");
    const site = await sitesService.create(context.userId, {
      workspaceId: context.workspaceId,
      name: "Page Limit Site",
      slug: uniqueSuffix("page-limit-site"),
    });

    await assertRejectsWithMessage(
      () =>
        sitesService.createPage(context.userId, site.id, {
          title: "Second Page",
          slug: "second-page",
        }),
      "PAGE_LIMIT_REACHED",
    );
  });

  it("blocks section creation when page reaches plan section limit", async () => {
    const context = await createWorkspaceContext("section-limit");
    const site = await prisma.site.create({
      data: {
        workspaceId: context.workspaceId,
        name: "Section Limit Site",
        slug: uniqueSuffix("section-limit-site"),
      },
      select: {
        id: true,
      },
    });
    const page = await prisma.page.create({
      data: {
        siteId: site.id,
        title: "Home",
        slug: "home",
        path: "/",
        pageType: "LANDING",
        isHomePage: true,
        sortOrder: 0,
      },
      select: {
        id: true,
      },
    });

    await prisma.section.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        pageId: page.id,
        type: "FEATURE",
        name: `Existing Section ${index + 1}`,
        sortOrder: index,
        props: {
          title: `Feature ${index + 1}`,
        },
      })),
    });

    await assertRejectsWithMessage(
      () =>
        sitesService.createSection(context.userId, site.id, page.id, {
          type: "FEATURE",
          name: "Blocked Section",
          props: {
            title: "Blocked",
          },
        }),
      "SECTION_LIMIT_REACHED",
    );
  });
});
