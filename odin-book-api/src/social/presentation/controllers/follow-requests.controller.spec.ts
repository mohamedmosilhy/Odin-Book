import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import type { AcceptFollowRequestUseCase } from '../../application/use-cases/accept-follow-request.use-case.js';
import type { GetIncomingFollowRequestsUseCase } from '../../application/use-cases/get-incoming-follow-requests.use-case.js';
import type { RejectFollowRequestUseCase } from '../../application/use-cases/reject-follow-request.use-case.js';
import { FollowRequestsController } from './follow-requests.controller.js';

describe('FollowRequestsController', () => {
  function createController() {
    const getIncomingUseCase = {
      execute: vi.fn<GetIncomingFollowRequestsUseCase['execute']>(),
    };
    const acceptUseCase = {
      execute: vi.fn<AcceptFollowRequestUseCase['execute']>(),
    };
    const rejectUseCase = {
      execute: vi.fn<RejectFollowRequestUseCase['execute']>(),
    };
    const controller = new FollowRequestsController(
      acceptUseCase as unknown as AcceptFollowRequestUseCase,
      rejectUseCase as unknown as RejectFollowRequestUseCase,
      getIncomingUseCase as unknown as GetIncomingFollowRequestsUseCase,
    );

    return { acceptUseCase, controller, getIncomingUseCase, rejectUseCase };
  }

  it('protects the incoming request list and passes the authenticated target and pagination query', async () => {
    const { controller, getIncomingUseCase } = createController();
    const query = { cursor: 'opaque-cursor', limit: 10 };
    const response = {
      items: [],
      pageInfo: { nextCursor: null, hasMore: false },
    };
    getIncomingUseCase.execute.mockResolvedValue(response);

    await expect(
      controller.getIncomingFollowRequests(query.cursor, query.limit, { id: 'target-user-id' }),
    ).resolves.toEqual(response);

    expect(getIncomingUseCase.execute).toHaveBeenCalledWith('target-user-id', query);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        FollowRequestsController.prototype.getIncomingFollowRequests,
      ),
    ).toBe('incoming');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        FollowRequestsController.prototype.getIncomingFollowRequests,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        FollowRequestsController.prototype.getIncomingFollowRequests,
      ),
    ).toContain(AuthGuard);
  });

  it('protects acceptance and passes the authenticated target and request ID', async () => {
    const { acceptUseCase, controller } = createController();
    acceptUseCase.execute.mockResolvedValue(undefined);

    await expect(
      controller.acceptFollowRequest('request-1', { id: 'target-user-id' }),
    ).resolves.toBeUndefined();

    expect(acceptUseCase.execute).toHaveBeenCalledWith('target-user-id', 'request-1');
    expect(
      Reflect.getMetadata(PATH_METADATA, FollowRequestsController.prototype.acceptFollowRequest),
    ).toBe(':requestId/accept');
    expect(
      Reflect.getMetadata(METHOD_METADATA, FollowRequestsController.prototype.acceptFollowRequest),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FollowRequestsController.prototype.acceptFollowRequest),
    ).toContain(AuthGuard);
  });

  it('protects rejection, passes the authenticated target, and responds with no content', async () => {
    const { controller, rejectUseCase } = createController();
    rejectUseCase.execute.mockResolvedValue(undefined);

    await expect(
      controller.rejectFollowRequest('request-1', { id: 'target-user-id' }),
    ).resolves.toBeUndefined();

    expect(rejectUseCase.execute).toHaveBeenCalledWith('target-user-id', 'request-1');
    expect(
      Reflect.getMetadata(PATH_METADATA, FollowRequestsController.prototype.rejectFollowRequest),
    ).toBe(':requestId/reject');
    expect(
      Reflect.getMetadata(METHOD_METADATA, FollowRequestsController.prototype.rejectFollowRequest),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        FollowRequestsController.prototype.rejectFollowRequest,
      ),
    ).toBe(HttpStatus.NO_CONTENT);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FollowRequestsController.prototype.rejectFollowRequest),
    ).toContain(AuthGuard);
  });

  it('uses the social requests route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FollowRequestsController)).toBe('social/requests');
  });
});
