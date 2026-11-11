import { Module } from '@nestjs/common';
import { PrismaSocialRepository } from './infrastructure/persistence/prisma-social.repository.js';
import { SOCIAL_REPOSITORY } from './application/ports/social-repository.port.js';

import { IsActiveFollowerUseCase } from './application/use-cases/is-active-follower.use-case.js';
import { InfrastructureModule } from '@shared/infrastructure.module.js';

@Module({
  imports: [InfrastructureModule],
  providers: [
    { provide: SOCIAL_REPOSITORY, useClass: PrismaSocialRepository },
    IsActiveFollowerUseCase,
  ],
  exports: [
    IsActiveFollowerUseCase,
    { provide: SOCIAL_REPOSITORY, useClass: PrismaSocialRepository },
  ],
})
export class SocialGraphModule {}
