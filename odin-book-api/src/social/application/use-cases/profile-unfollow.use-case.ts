import { Inject } from '@nestjs/common';
import { SOCIAL_REPOSITORY, type SocialRepositoryPort } from '../ports/social-repository.port.js';
import { ResolveProfileByUsernameUseCase } from '@profiles/application/use-cases/resolve-profile-by-username.use-case.js';
import { InvalidSameUserError } from '@social/domain/errors/same-user.error.js';

import { FollowRelationshipNotFoundError } from '@social/domain/errors/follow-relationship-not-found.error.js';

export class ProfileUnfollowUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: SocialRepositoryPort,
    private readonly resolveProfileByUsernameUseCase: ResolveProfileByUsernameUseCase,
  ) {}

  async execute(requesterId: string, targetUsername: string): Promise<void> {
    const { userId } = await this.resolveProfileByUsernameUseCase.execute(targetUsername);

    if (userId === requesterId) {
      throw new InvalidSameUserError();
    }

    const existingRelationship = await this.socialRepository.findByIds(requesterId, userId);

    if (!existingRelationship) {
      throw new FollowRelationshipNotFoundError();
    }

    if (existingRelationship.getStatus() === 'ACTIVE') {
      existingRelationship.unfollow(requesterId);
    }

    if (existingRelationship.getStatus() === 'PENDING') {
      existingRelationship.cancel(requesterId);
    }

    await this.socialRepository.deleteFollowRelationship(existingRelationship.id);
  }
}
