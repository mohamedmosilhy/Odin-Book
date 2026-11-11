import { Inject } from '@nestjs/common';
import { SOCIAL_REPOSITORY, type SocialRepositoryPort } from '../ports/social-repository.port.js';
import { IncomingFollowResponse } from '../types/incoming-follow-response.js';

export class GetIncomingFollowRequestsUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: SocialRepositoryPort,
  ) {}

  async execute(
    targetId: string,
    query: { cursor: string | null; limit: number },
  ): Promise<IncomingFollowResponse> {
    const res = await this.socialRepository.getPendingFollowRequestsForUser(targetId, query);

    return res;
  }
}
