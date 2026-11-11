import { Inject } from '@nestjs/common';
import { SOCIAL_REPOSITORY, type SocialRepositoryPort } from '../ports/social-repository.port.js';

export class IsActiveFollowerUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: SocialRepositoryPort,
  ) {}

  async execute(viewerId: string, authorId: string): Promise<boolean> {
    const res = await this.socialRepository.isFollowing(viewerId, authorId);

    return res;
  }
}
