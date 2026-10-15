import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ACCESS_TOKEN } from './application/ports/access-token.port.js';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token-repository.port.js';
import { REFRESH_TOKEN_SERVICE } from './application/ports/refresh-token-service.port.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { RefreshUseCase } from './application/use-cases/refresh.use-case.js';
import { GoogleOAuthCallbackUseCase } from './application/use-cases/google-oauth-callback.use-case.js';
import { AuthModule } from './auth.module.js';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository.js';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy.js';
import { JwtAccessTokenService } from './infrastructure/token/jwt-access-token.service.js';
import { RefreshTokenService } from './infrastructure/token/refresh-token.service.js';
import { GooglePassportGuard } from './presentation/guards/google-passport.guard.js';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { EXTERNAL_IDENTITY_PORT } from '@users/application/ports/external-identity.port.js';
import { ACCOUNT_PROVISIONING_PORT } from '@users/application/ports/account-provisioning.port.js';
import { PrismaAccountProvisioningRepository } from '@users/infrastructure/persistence/prisma-account-provisioning.repository.js';
import { PrismaExternalIdentityRepository } from '@users/infrastructure/persistence/prisma-external-identity.repository.js';

describe('AuthModule', () => {
  it('constructs the complete login dependency graph', async () => {
    const configService = {
      getOrThrow: vi.fn((key: string) => {
        const values: Record<string, string | number> = {
          'jwt.secret': 'test-secret-with-at-least-thirty-two-characters',
          'jwt.accessTokenTtl': '15m',
          'jwt.refreshTokenTtlDays': 30,
          'googleOauth.clientId': 'test-google-client-id',
          'googleOauth.clientSecret': 'test-google-client-secret',
          'googleOauth.callbackUrl': 'http://localhost:3000/api/v1/auth/google/callback',
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
      expect(moduleRef.get(GoogleOAuthCallbackUseCase)).toBeInstanceOf(GoogleOAuthCallbackUseCase);
      expect(moduleRef.get(AuthGuard)).toBeInstanceOf(AuthGuard);
      expect(moduleRef.get(GoogleStrategy)).toBeInstanceOf(GoogleStrategy);
      expect(moduleRef.get(GooglePassportGuard)).toBeInstanceOf(GooglePassportGuard);
      expect(moduleRef.get(ACCESS_TOKEN)).toBeInstanceOf(JwtAccessTokenService);
      expect(moduleRef.get(REFRESH_TOKEN_SERVICE)).toBeInstanceOf(RefreshTokenService);
      expect(moduleRef.get(REFRESH_TOKEN_REPOSITORY)).toBeInstanceOf(PrismaRefreshTokenRepository);
      expect(moduleRef.get(EXTERNAL_IDENTITY_PORT)).toBeInstanceOf(
        PrismaExternalIdentityRepository,
      );
      expect(moduleRef.get(ACCOUNT_PROVISIONING_PORT)).toBeInstanceOf(
        PrismaAccountProvisioningRepository,
      );
    } finally {
      await moduleRef.close();
    }
  });
});
