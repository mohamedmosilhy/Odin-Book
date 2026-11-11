import { AuthModule } from '@auth/auth.module.js';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { ProfilesModule } from '@profiles/profiles.module.js';
import { InfrastructureModule } from '@shared/infrastructure.module.js';
import { ProfileFollowUseCase } from './application/use-cases/profile-follow.use-case.js';
import { ProfileUnfollowUseCase } from './application/use-cases/profile-unfollow.use-case.js';
import { AcceptFollowRequestUseCase } from './application/use-cases/accept-follow-request.use-case.js';
import { GetIncomingFollowRequestsUseCase } from './application/use-cases/get-incoming-follow-requests.use-case.js';
import { RejectFollowRequestUseCase } from './application/use-cases/reject-follow-request.use-case.js';
import { FollowRequestsController } from './presentation/controllers/follow-requests.controller.js';
import { ProfileFollowController } from './presentation/controllers/profile-follow.controller.js';
import { FollowersListUseCase } from './application/use-cases/followers-list.use-case.js';
import { FollowingListUseCase } from './application/use-cases/following-list.use-case.js';
import { SharedModule } from '@shared/shared.module.js';
import { SocialModule } from './social.module.js';
import { SocialGraphModule } from './social-graph.module.js';

describe('SocialModule', () => {
  it('imports authentication, profiles, infrastructure, and social graph dependencies', () => {
    const imports = (Reflect.getOwnMetadata(MODULE_METADATA.IMPORTS, SocialModule) ??
      []) as unknown[];

    expect(imports).toEqual(
      expect.arrayContaining([
        AuthModule,
        ProfilesModule,
        InfrastructureModule,
        SocialGraphModule,
        SharedModule,
      ]),
    );
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

  it('provides the follow and request lifecycle use cases', () => {
    const providers = (Reflect.getOwnMetadata(MODULE_METADATA.PROVIDERS, SocialModule) ??
      []) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
        ProfileFollowUseCase,
        ProfileUnfollowUseCase,
        GetIncomingFollowRequestsUseCase,
        AcceptFollowRequestUseCase,
        RejectFollowRequestUseCase,
        FollowersListUseCase,
        FollowingListUseCase,
      ]),
    );
  });
});
