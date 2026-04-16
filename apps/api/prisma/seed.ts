import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  console.log("🌱 Seeding plans...");

  // FREE
  await prisma.plan.upsert({
    where: { code: "FREE" },
    update: {},
    create: {
      code: "FREE",
      name: "Free",
      description: "Starter plan for new users",
      priceMonthly: 0,
      priceYearly: 0,

      maxSites: 1,
      maxPagesPerSite: 1,
      maxSectionsPerPage: 10,
      maxProducts: 0,
      maxPosts: 0,

      allowCustomDomain: false,
      allowForms: false,
      allowAnalytics: false,
      allowCustomCode: false,
      allowEcommerce: false,
      allowBlog: false,
      allowNews: false,
      allowTemplates: true,

      trialDays: 0,
      isActive: true,
      sortOrder: 0,
    },
  });

  // BASIC (250 บาท)
  await prisma.plan.upsert({
    where: { code: "BASIC" },
    update: {},
    create: {
      code: "BASIC",
      name: "Basic",
      description: "For simple landing pages",
      priceMonthly: 250,
      priceYearly: 2500,

      maxSites: 1,
      maxPagesPerSite: 3,
      maxSectionsPerPage: 20,
      maxProducts: 0,
      maxPosts: 0,

      allowCustomDomain: true,
      allowForms: true,
      allowAnalytics: false,
      allowCustomCode: false,
      allowEcommerce: false,
      allowBlog: false,
      allowNews: false,
      allowTemplates: true,

      trialDays: 7,
      isActive: true,
      sortOrder: 1,
    },
  });

  // BUSINESS (490 บาท)
  await prisma.plan.upsert({
    where: { code: "BUSINESS" },
    update: {},
    create: {
      code: "BUSINESS",
      name: "Business",
      description: "For growing businesses",
      priceMonthly: 490,
      priceYearly: 4900,

      maxSites: 3,
      maxPagesPerSite: 10,
      maxSectionsPerPage: 50,
      maxProducts: 50,
      maxPosts: 50,

      allowCustomDomain: true,
      allowForms: true,
      allowAnalytics: true,
      allowCustomCode: false,
      allowEcommerce: true,
      allowBlog: true,
      allowNews: true,
      allowTemplates: true,

      trialDays: 7,
      isActive: true,
      sortOrder: 2,
    },
  });

  // PRO (990 บาท)
  await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {},
    create: {
      code: "PRO",
      name: "Pro",
      description: "Full features for serious users",
      priceMonthly: 990,
      priceYearly: 9900,

      maxSites: 10,
      maxPagesPerSite: 50,
      maxSectionsPerPage: 100,
      maxProducts: 1000,
      maxPosts: 1000,

      allowCustomDomain: true,
      allowForms: true,
      allowAnalytics: true,
      allowCustomCode: true,
      allowEcommerce: true,
      allowBlog: true,
      allowNews: true,
      allowTemplates: true,

      trialDays: 14,
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log("✅ Plans seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
