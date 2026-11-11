import { Inject } from '@nestjs/common';
import {
  FollowStatus,
  SOCIAL_REPOSITORY,
  type SocialRepositoryPort,
} from '../ports/social-repository.port.js';
import { ResolveProfileByUsernameUseCase } from '@profiles/application/use-cases/resolve-profile-by-username.use-case.js';
import { InvalidSameUserError } from '@social/domain/errors/same-user.error.js';

import { DuplicateRelationshipError } from '@social/domain/errors/duplicate-relationship.error.js';

export class ProfileFollowUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: SocialRepositoryPort,
    private readonly resolveProfileByUsernameUseCase: ResolveProfileByUsernameUseCase,
  ) {}

  async execute(requesterId: string, targetUsername: string): Promise<FollowStatus> {
    const { userId, visibility } =
      await this.resolveProfileByUsernameUseCase.execute(targetUsername);

    if (userId === requesterId) {
      throw new InvalidSameUserError();
    }

    const existingRelationship = await this.socialRepository.findByIds(requesterId, userId);

    if (existingRelationship) {
      if (existingRelationship.getStatus() === 'ACTIVE') {
        throw new DuplicateRelationshipError('You are already following this user.');
      } else if (existingRelationship.getStatus() === 'PENDING') {
        throw new DuplicateRelationshipError('Follow request is already pending.');
      }
    }

    const relationship = await this.socialRepository.createFollowRelationship({
      requesterId: requesterId,
      targetId: userId,
      status: visibility === 'PUBLIC' ? 'ACTIVE' : 'PENDING',
    });

    return relationship;
  }
}
