import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ACCESS_TOKEN } from './application/ports/access-token.port.js';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token-repository.port.js';
import { REFRESH_TOKEN_SERVICE } from './application/ports/refresh-token-service.port.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { RefreshUseCase } from './application/use-cases/refresh.use-case.js';
import { AuthModule } from './auth.module.js';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository.js';
import { JwtAccessTokenService } from './infrastructure/token/jwt-access-token.service.js';
import { RefreshTokenService } from './infrastructure/token/refresh-token.service.js';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';

describe('AuthModule', () => {
  it('constructs the complete login dependency graph', async () => {
    const configService = {
      getOrThrow: vi.fn((key: string) => {
        const values: Record<string, string | number> = {
          'jwt.secret': 'test-secret-with-at-least-thirty-two-characters',
          'jwt.accessTokenTtl': '15m',
          'jwt.refreshTokenTtlDays': 30,
        };

        if (!(key in values)) {
          throw new Error(`Unexpected configuration key: ${key}`);
        }

        return values[key];
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), AuthModule],
    })
      .overrideProvider(ConfigService)
      .useValue(configService)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    try {
      expect(moduleRef.get(LoginUseCase)).toBeInstanceOf(LoginUseCase);
      expect(moduleRef.get(RefreshUseCase)).toBeInstanceOf(RefreshUseCase);
      expect(moduleRef.get(LogoutUseCase)).toBeInstanceOf(LogoutUseCase);
      expect(moduleRef.get(AuthGuard)).toBeInstanceOf(AuthGuard);
      expect(moduleRef.get(ACCESS_TOKEN)).toBeInstanceOf(JwtAccessTokenService);
      expect(moduleRef.get(REFRESH_TOKEN_SERVICE)).toBeInstanceOf(RefreshTokenService);
      expect(moduleRef.get(REFRESH_TOKEN_REPOSITORY)).toBeInstanceOf(
        PrismaRefreshTokenRepository,
      );
    } finally {
      await moduleRef.close();
    }
  });
});
