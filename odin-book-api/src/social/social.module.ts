import { Module } from '@nestjs/common';
import { ProfileFollowUseCase } from './application/use-cases/profile-follow.use-case.js';
import { ProfileUnfollowUseCase } from './application/use-cases/profile-unfollow.use-case.js';
import { ProfileFollowController } from './presentation/controllers/profile-follow.controller.js';
import { AuthModule } from '@auth/auth.module.js';
import { ProfilesModule } from '@profiles/profiles.module.js';
import { FollowRequestsController } from './presentation/controllers/follow-requests.controller.js';
import { GetIncomingFollowRequestsUseCase } from './application/use-cases/get-incoming-follow-requests.use-case.js';
import { AcceptFollowRequestUseCase } from './application/use-cases/accept-follow-request.use-case.js';
import { RejectFollowRequestUseCase } from './application/use-cases/reject-follow-request.use-case.js';

import { InfrastructureModule } from '@shared/infrastructure.module.js';
import { SocialGraphModule } from './social-graph.module.js';
import { SharedModule } from '@shared/shared.module.js';
import { FollowersListUseCase } from './application/use-cases/followers-list.use-case.js';
import { FollowingListUseCase } from './application/use-cases/following-list.use-case.js';

@Module({
  controllers: [ProfileFollowController, FollowRequestsController],
  imports: [AuthModule, ProfilesModule, InfrastructureModule, SocialGraphModule, SharedModule],
  providers: [
    ProfileFollowUseCase,
    ProfileUnfollowUseCase,
    GetIncomingFollowRequestsUseCase,
    AcceptFollowRequestUseCase,
    RejectFollowRequestUseCase,
    FollowersListUseCase,
    FollowingListUseCase,
  ],
  exports: [],
})
export class SocialModule {}
