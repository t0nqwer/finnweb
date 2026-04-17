import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { AccessJwtStrategy } from "./strategies/access-jwt.strategy";
import { EmailModule } from "../email/email.module";
import { AccessJwtGuard } from "../../common/guards/access-jwt.guard";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({}), EmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AccessJwtStrategy, AccessJwtGuard],
  exports: [AuthService],
})
export class AuthModule {}
