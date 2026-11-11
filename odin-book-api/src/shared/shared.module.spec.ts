import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { GetProfileVisibilityUseCase } from '@profiles/application/use-cases/get-profile-visibility.use-case.js';
import { IsActiveFollowerUseCase } from '@social/application/use-cases/is-active-follower.use-case.js';
import { VisibilityPolicy } from './domain/services/visibility-policy.service.js';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { SharedModule } from './shared.module.js';

describe('SharedModule', () => {
  it('constructs the visibility dependency graph and uses the exported profile and social lookups', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              jwt: {
                secret: 'test-secret-with-at-least-thirty-two-characters',
                accessTokenTtl: '15m',
                refreshTokenTtlDays: 30,
              },
              googleOauth: {
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                callbackUrl: 'http://localhost:3000/api/v1/auth/google/callback',
              },
            }),
          ],
        }),
        SharedModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    try {
      const policy = moduleRef.get(VisibilityPolicy);
      const visibility = vi
        .spyOn(moduleRef.get(GetProfileVisibilityUseCase), 'execute')
        .mockResolvedValue('PRIVATE');
      const activeFollower = vi
        .spyOn(moduleRef.get(IsActiveFollowerUseCase), 'execute')
        .mockResolvedValue(true);

      await expect(policy.canView('viewer-1', 'author-1')).resolves.toBe(true);
      expect(visibility).toHaveBeenCalledWith('author-1');
      expect(activeFollower).toHaveBeenCalledWith('viewer-1', 'author-1');
    } finally {
      vi.restoreAllMocks();
      await moduleRef.close();
    }
  });
});
