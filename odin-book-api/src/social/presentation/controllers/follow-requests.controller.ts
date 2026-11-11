import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { IncomingFollowResponse } from '@social/application/types/incoming-follow-response.js';
import { AcceptFollowRequestUseCase } from '@social/application/use-cases/accept-follow-request.use-case.js';
import { GetIncomingFollowRequestsUseCase } from '@social/application/use-cases/get-incoming-follow-requests.use-case.js';
import { RejectFollowRequestUseCase } from '@social/application/use-cases/reject-follow-request.use-case.js';
import { SocialPaginationQueryDto } from '../dto/social.dto.js';

@Controller('social/requests')
export class FollowRequestsController {
  constructor(
    private readonly acceptFollowRequestUseCase: AcceptFollowRequestUseCase,
    private readonly rejectFollowRequestUseCase: RejectFollowRequestUseCase,
    private readonly getIncomingFollowRequestsUseCase: GetIncomingFollowRequestsUseCase,
  ) {}

  @Get('incoming')
  @UseGuards(AuthGuard)
  async getIncomingFollowRequests(
    @Query() socialPagination: SocialPaginationQueryDto,
    @CurrentUser() user: { id: string },
  ): Promise<IncomingFollowResponse> {
    const requesterId = user.id;
    const result = await this.getIncomingFollowRequestsUseCase.execute(requesterId, {
      cursor: socialPagination.cursor,
      limit: socialPagination.limit,
    });
    return result;
  }

  @Post(':requestId/accept')
  @UseGuards(AuthGuard)
  async acceptFollowRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    const requesterId = user.id;
    await this.acceptFollowRequestUseCase.execute(requesterId, requestId);
  }

  @Post(':requestId/reject')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async rejectFollowRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    const requesterId = user.id;
    await this.rejectFollowRequestUseCase.execute(requesterId, requestId);
  }
}
