import { Module } from '@nestjs/common';
import { RegisterUseCase } from './application/use-cases/register.use-case.js';
import { UsersModule } from '@users/users.module.js';
import { SharedModule } from '@shared/shared.module.js';
import { AuthController } from './presentation/controllers/auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAccessTokenService } from './infrastructure/token/jwt-access-token.service.js';
import { ACCESS_TOKEN } from './application/ports/access-token.port.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { REFRESH_TOKEN_SERVICE } from './application/ports/refresh-token-service.port.js';
import { RefreshTokenService } from './infrastructure/token/refresh-token.service.js';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token-repository.port.js';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository.js';
import { RefreshUseCase } from './application/use-cases/refresh.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';

@Module({
  controllers: [AuthController],
  imports: [
    UsersModule,
    SharedModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow('jwt.accessTokenTtl'),
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    AuthGuard,
    {
      provide: ACCESS_TOKEN,
      useClass: JwtAccessTokenService,
    },
    {
      provide: REFRESH_TOKEN_SERVICE,
      useClass: RefreshTokenService,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
  ],
})
export class AuthModule {}
