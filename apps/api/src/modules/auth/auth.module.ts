import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { AccessJwtStrategy } from "./strategies/access-jwt.strategy";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AccessJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
