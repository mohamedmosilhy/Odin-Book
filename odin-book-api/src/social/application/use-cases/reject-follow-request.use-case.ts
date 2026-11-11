import { Inject } from '@nestjs/common';
import { SOCIAL_REPOSITORY, type SocialRepositoryPort } from '../ports/social-repository.port.js';
import { FollowRelationshipNotFoundError } from '@social/domain/errors/follow-relationship-not-found.error.js';

export class RejectFollowRequestUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: SocialRepositoryPort,
  ) {}

  async execute(actorId: string, requestId: string): Promise<void> {
    const request = await this.socialRepository.findByRelationshipId(requestId);

    if (!request) {
      throw new FollowRelationshipNotFoundError('Follow request not found');
    }

    request.reject(actorId);

    await this.socialRepository.deleteFollowRelationship(requestId);
  }
}
