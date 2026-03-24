import { Controller, Get } from "@nestjs/common";
import { APP_NAME } from "@finnweb/shared/constants";

@Controller()
export class AppController {
  @Get("/health")
  getHealth() {
    return {
      ok: true,
      service: "api",
      app: APP_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
