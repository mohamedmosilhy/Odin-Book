import { Injectable } from '@nestjs/common/decorators/core/index.js';
import { GetProfileVisibilityUseCase } from '@profiles/application/use-cases/get-profile-visibility.use-case.js';
import { IsActiveFollowerUseCase } from '@social/application/use-cases/is-active-follower.use-case.js';

@Injectable()
export class VisibilityPolicy {
  constructor(
    private getProfileVisibility: GetProfileVisibilityUseCase,
    private isActiveFollower: IsActiveFollowerUseCase,
  ) {}

  async canView(viewerId: string, authorId: string): Promise<boolean> {
    if (viewerId === authorId) return true;

    const visibility = await this.getProfileVisibility.execute(authorId);

    if (visibility === 'PUBLIC') return true;

    return this.isActiveFollower.execute(viewerId, authorId);
  }
}
