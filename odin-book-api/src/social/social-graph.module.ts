import { Module } from '@nestjs/common';
import { PrismaSocialRepository } from './infrastructure/persistence/prisma-social.repository.js';
import { SOCIAL_REPOSITORY } from './application/ports/social-repository.port.js';

import { IsActiveFollowerUseCase } from './application/use-cases/is-active-follower.use-case.js';
import { InfrastructureModule } from '@shared/infrastructure.module.js';
import { GetProfileSocialSummaryUseCase } from './application/use-cases/get-profile-social-summary.use-case.js';

@Module({
  imports: [InfrastructureModule],
  providers: [
    { provide: SOCIAL_REPOSITORY, useClass: PrismaSocialRepository },
    IsActiveFollowerUseCase,
    GetProfileSocialSummaryUseCase,
  ],
  exports: [IsActiveFollowerUseCase, GetProfileSocialSummaryUseCase, SOCIAL_REPOSITORY],
})
export class SocialGraphModule {}
