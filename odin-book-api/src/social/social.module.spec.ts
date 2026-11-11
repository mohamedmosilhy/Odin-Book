import { AuthModule } from '@auth/auth.module.js';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { ProfilesModule } from '@profiles/profiles.module.js';
import { SharedModule } from '@shared/shared.module.js';
import { SOCIAL_REPOSITORY } from './application/ports/social-repository.port.js';
import { ProfileFollowUseCase } from './application/use-cases/profile-follow.use-case.js';
import { ProfileUnfollowUseCase } from './application/use-cases/profile-unfollow.use-case.js';
import { AcceptFollowRequestUseCase } from './application/use-cases/accept-follow-request.use-case.js';
import { GetIncomingFollowRequestsUseCase } from './application/use-cases/get-incoming-follow-requests.use-case.js';
import { RejectFollowRequestUseCase } from './application/use-cases/reject-follow-request.use-case.js';
import { PrismaSocialRepository } from './infrastructure/persistence/prisma-social.repository.js';
import { FollowRequestsController } from './presentation/controllers/follow-requests.controller.js';
import { ProfileFollowController } from './presentation/controllers/profile-follow.controller.js';
import { SocialModule } from './social.module.js';

describe('SocialModule', () => {
  it('imports authentication, profiles, and shared infrastructure dependencies', () => {
    const imports = (Reflect.getOwnMetadata(MODULE_METADATA.IMPORTS, SocialModule) ??
      []) as unknown[];

    expect(imports).toEqual(expect.arrayContaining([AuthModule, ProfilesModule, SharedModule]));
  });

  it('registers the profile follow controller', () => {
    const controllers = (Reflect.getOwnMetadata(MODULE_METADATA.CONTROLLERS, SocialModule) ??
      []) as unknown[];

    expect(controllers).toContain(ProfileFollowController);
  });

  it('registers the incoming follow requests controller', () => {
    const controllers = (Reflect.getOwnMetadata(MODULE_METADATA.CONTROLLERS, SocialModule) ??
      []) as unknown[];

    expect(controllers).toContain(FollowRequestsController);
  });

  it('provides follow and unfollow use cases through the Prisma repository port', () => {
    const providers = (Reflect.getOwnMetadata(MODULE_METADATA.PROVIDERS, SocialModule) ??
      []) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
        ProfileFollowUseCase,
        ProfileUnfollowUseCase,
        GetIncomingFollowRequestsUseCase,
        AcceptFollowRequestUseCase,
        RejectFollowRequestUseCase,
        { provide: SOCIAL_REPOSITORY, useClass: PrismaSocialRepository },
      ]),
    );
  });
});
