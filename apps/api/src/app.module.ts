import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SitesModule } from "./modules/sites/sites.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { JobsModule } from "./jobs/jobs.module";
import { RedisModule } from "./modules/redis/redis.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { SectionTemplatesModule } from "./modules/section-templates/section-templates.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: [configuration],
    }),
    RedisModule,
    PrismaModule,
    JobsModule,
    HealthModule,
    SitesModule,
    TemplatesModule,
    SectionTemplatesModule,
    AdminModule,
    AuthModule,
    BillingModule,
  ],
})
export class AppModule {}
