import { Module } from '@nestjs/common';
import { PrismaSocialRepository } from './infrastructure/persistence/prisma-social.repository.js';
import { SOCIAL_REPOSITORY } from './application/ports/social-repository.port.js';

import { ProfileFollowUseCase } from './application/use-cases/profile-follow.use-case.js';
import { ProfileUnfollowUseCase } from './application/use-cases/profile-unfollow.use-case.js';
import { ProfileFollowController } from './presentation/controllers/profile-follow.controller.js';
import { AuthModule } from '@auth/auth.module.js';
import { ProfilesModule } from '@profiles/profiles.module.js';
import { FollowRequestsController } from './presentation/controllers/follow-requests.controller.js';
import { GetIncomingFollowRequestsUseCase } from './application/use-cases/get-incoming-follow-requests.use-case.js';
import { AcceptFollowRequestUseCase } from './application/use-cases/accept-follow-request.use-case.js';
import { RejectFollowRequestUseCase } from './application/use-cases/reject-follow-request.use-case.js';
import { IsActiveFollowerUseCase } from './application/use-cases/is-active-follower.use-case.js';
import { InfrastructureModule } from '@shared/infrastructure.module.js';

@Module({
  controllers: [ProfileFollowController, FollowRequestsController],
  imports: [AuthModule, ProfilesModule, InfrastructureModule],
  providers: [
    ProfileFollowUseCase,
    ProfileUnfollowUseCase,
    GetIncomingFollowRequestsUseCase,
    AcceptFollowRequestUseCase,
    RejectFollowRequestUseCase,
    IsActiveFollowerUseCase,
    { provide: SOCIAL_REPOSITORY, useClass: PrismaSocialRepository },
  ],
  exports: [
    IsActiveFollowerUseCase,
    { provide: SOCIAL_REPOSITORY, useClass: PrismaSocialRepository },
  ],
})
export class SocialModule {}
