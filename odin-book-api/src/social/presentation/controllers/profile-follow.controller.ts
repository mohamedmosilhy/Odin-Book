import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { OptionalAuthGuard } from '@shared/guards/optional-auth.guard.js';
import { ProfileFollowUseCase } from '@social/application/use-cases/profile-follow.use-case.js';
import { ProfileUnfollowUseCase } from '@social/application/use-cases/profile-unfollow.use-case.js';
import { SocialPaginationQueryDto } from '../dto/social.dto.js';
import { FollowersListUseCase } from '@social/application/use-cases/followers-list.use-case.js';
import { OutgoingFollowResponse } from '@social/application/types/outgoing-follow-response.js';
import { FollowingListUseCase } from '@social/application/use-cases/following-list.use-case.js';

@Controller('profiles')
export class ProfileFollowController {
  constructor(
    private readonly profileFollowUseCase: ProfileFollowUseCase,
    private readonly profileUnfollowUseCase: ProfileUnfollowUseCase,
    private readonly followersListUseCase: FollowersListUseCase,
    private readonly followingListUseCase: FollowingListUseCase,
  ) {}

  @Get(':username/followers')
  @UseGuards(OptionalAuthGuard)
  async getFollowers(
    @Param('username') username: string,
    @Query() socialPagination: SocialPaginationQueryDto,
    @CurrentUser() user: { id: string } | null,
  ): Promise<OutgoingFollowResponse> {
    return this.followersListUseCase.execute(username, user?.id ?? null, {
      cursor: socialPagination.cursor,
      limit: socialPagination.limit,
    });
  }

  @Get(':username/following')
  @UseGuards(OptionalAuthGuard)
  async getFollowed(
    @Param('username') username: string,
    @Query() socialPagination: SocialPaginationQueryDto,
    @CurrentUser() user: { id: string } | null,
  ): Promise<OutgoingFollowResponse> {
    return this.followingListUseCase.execute(username, user?.id ?? null, {
      cursor: socialPagination.cursor,
      limit: socialPagination.limit,
    });
  }

  @Post(':username/follow')
  @UseGuards(AuthGuard)
  async follow(
    @Param('username') username: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ status: 'ACTIVE' | 'PENDING' }> {
    const requesterId = user.id;
    const result = await this.profileFollowUseCase.execute(requesterId, username);

    return { status: result };
  }

  @Delete(':username/follow')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Param('username') username: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    const requesterId = user.id;
    await this.profileUnfollowUseCase.execute(requesterId, username);
  }
}
