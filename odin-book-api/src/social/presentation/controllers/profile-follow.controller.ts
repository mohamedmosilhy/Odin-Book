import { Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { ProfileFollowUseCase } from '@social/application/use-cases/profile-follow.use-case.js';
import { ProfileUnfollowUseCase } from '@social/application/use-cases/profile-unfollow.use-case.js';

@Controller('profiles')
export class ProfileFollowController {
  constructor(
    private readonly profileFollowUseCase: ProfileFollowUseCase,
    private readonly profileUnfollowUseCase: ProfileUnfollowUseCase,
  ) {}

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
