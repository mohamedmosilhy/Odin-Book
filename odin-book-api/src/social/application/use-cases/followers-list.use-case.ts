import { Inject } from '@nestjs/common';
import { SOCIAL_REPOSITORY, type SocialRepositoryPort } from '../ports/social-repository.port.js';
import { VisibilityPolicy } from '@shared/domain/services/visibility-policy.service.js';

import { ResolveProfileByUsernameUseCase } from '@profiles/application/use-cases/resolve-profile-by-username.use-case.js';
import { OutgoingFollowResponse } from '../types/outgoing-follow-response.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';

export class FollowersListUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: SocialRepositoryPort,
    @Inject(VisibilityPolicy)
    private readonly visibilityPolicy: VisibilityPolicy,
    private readonly resolveProfileByUsernameUseCase: ResolveProfileByUsernameUseCase,
  ) {}

  async execute(
    userName: string,
    viewerId: string | null,
    query: { cursor: string | null; limit: number },
  ): Promise<OutgoingFollowResponse> {
    const userProfile = await this.resolveProfileByUsernameUseCase.execute(userName);

    const canView = await this.visibilityPolicy.canView(viewerId, userProfile.userId);

    if (!canView) {
      throw new ProfileNotFoundError('Profile not found for the given username');
    }

    return this.socialRepository.getActiveFollowersByUserId(userProfile.userId, query);
  }
}
