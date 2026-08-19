import { Module } from "@nestjs/common";
import { DeepSeekClient } from "./deepseek.client";

@Module({
  providers: [DeepSeekClient],
  exports: [DeepSeekClient],
})
export class AiModule {}
