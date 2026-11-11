import { Inject, Injectable } from '@nestjs/common';
import {
  SOCIAL_REPOSITORY,
  type SocialRepositoryPort,
  type ViewerFollowStatus,
} from '../ports/social-repository.port.js';

export type ProfileSocialSummary = {
  followerCount: number;
  followingCount: number;
  followStatus: ViewerFollowStatus;
};

@Injectable()
export class GetProfileSocialSummaryUseCase {
  constructor(
    @Inject(SOCIAL_REPOSITORY)
    private readonly repository: SocialRepositoryPort,
  ) {}

  async execute(targetId: string, viewerId: string | null): Promise<ProfileSocialSummary> {
    const [followerCount, followingCount, followStatus] = await Promise.all([
      this.repository.getFollowerCount(targetId),
      this.repository.getFollowingCount(targetId),
      viewerId === null
        ? Promise.resolve('NONE' as const)
        : this.repository.getViewerFollowStatus(viewerId, targetId),
    ]);

    return { followerCount, followingCount, followStatus };
  }
}
