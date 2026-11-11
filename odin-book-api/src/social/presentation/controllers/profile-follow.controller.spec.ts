import type { ProfileFollowUseCase } from '../../application/use-cases/profile-follow.use-case.js';
import type { ProfileUnfollowUseCase } from '../../application/use-cases/profile-unfollow.use-case.js';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import type { FollowersListUseCase } from '../../application/use-cases/followers-list.use-case.js';
import { OptionalAuthGuard } from '@shared/guards/optional-auth.guard.js';
import type { FollowingListUseCase } from '../../application/use-cases/following-list.use-case.js';
import { ProfileFollowController } from './profile-follow.controller.js';

describe('ProfileFollowController', () => {
  function createController() {
    const followUseCase = {
      execute: vi.fn<ProfileFollowUseCase['execute']>(),
    };
    const unfollowUseCase = {
      execute: vi.fn<ProfileUnfollowUseCase['execute']>(),
    };
    const followersUseCase = { execute: vi.fn<FollowersListUseCase['execute']>() };
    const followingUseCase = { execute: vi.fn<FollowingListUseCase['execute']>() };
    const controller = new ProfileFollowController(
      followUseCase as unknown as ProfileFollowUseCase,
      unfollowUseCase as unknown as ProfileUnfollowUseCase,
      followersUseCase as unknown as FollowersListUseCase,
      followingUseCase as unknown as FollowingListUseCase,
    );

    return { controller, followUseCase, unfollowUseCase, followersUseCase, followingUseCase };
  }

  it.each(['ACTIVE', 'PENDING'] as const)(
    'protects POST /profiles/:username/follow and returns %s status',
    async (status) => {
      const { controller, followUseCase } = createController();
      followUseCase.execute.mockResolvedValue(status);

      await expect(controller.follow('jane', { id: 'authenticated-user-id' })).resolves.toEqual({
        status,
      });

      expect(followUseCase.execute).toHaveBeenCalledWith('authenticated-user-id', 'jane');
      expect(Reflect.getMetadata(PATH_METADATA, ProfileFollowController.prototype.follow)).toBe(
        ':username/follow',
      );
      expect(Reflect.getMetadata(METHOD_METADATA, ProfileFollowController.prototype.follow)).toBe(
        RequestMethod.POST,
      );
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ProfileFollowController.prototype.follow),
      ).toContain(AuthGuard);
    },
  );

  it('protects DELETE /profiles/:username/follow and returns no content', async () => {
    const { controller, unfollowUseCase } = createController();
    unfollowUseCase.execute.mockResolvedValue(undefined);

    await expect(
      controller.unfollow('jane', { id: 'authenticated-user-id' }),
    ).resolves.toBeUndefined();

    expect(unfollowUseCase.execute).toHaveBeenCalledWith('authenticated-user-id', 'jane');
    expect(Reflect.getMetadata(PATH_METADATA, ProfileFollowController.prototype.unfollow)).toBe(
      ':username/follow',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, ProfileFollowController.prototype.unfollow)).toBe(
      RequestMethod.DELETE,
    );
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, ProfileFollowController.prototype.unfollow),
    ).toBe(HttpStatus.NO_CONTENT);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ProfileFollowController.prototype.unfollow),
    ).toContain(AuthGuard);
  });

  it.each([{ id: 'viewer-1' }, null, undefined])(
    'passes the target, pagination, and optional viewer %j to the followers use case',
    async (user) => {
      const { controller, followersUseCase } = createController();
      const query = { limit: 20, cursor: null };
      const result = { items: [], pageInfo: { nextCursor: null, hasMore: false } };
      followersUseCase.execute.mockResolvedValue(result);

      await expect(controller.getFollowers('alice', query, user)).resolves.toEqual(result);
      expect(followersUseCase.execute).toHaveBeenCalledWith('alice', user?.id ?? null, query);
    },
  );

  it('exposes the followers GET route with optional authentication', () => {
    const handler = ProfileFollowController.prototype.getFollowers;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':username/followers');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([OptionalAuthGuard]);
  });

  it.each([{ id: 'viewer-1' }, null, undefined])(
    'passes the target, pagination, and optional viewer %j to the following use case',
    async (user) => {
      const { controller, followingUseCase } = createController();
      const query = { limit: 20, cursor: null };
      const result = { items: [], pageInfo: { nextCursor: null, hasMore: false } };
      followingUseCase.execute.mockResolvedValue(result);

      await expect(controller.getFollowed('alice', query, user)).resolves.toEqual(result);
      expect(followingUseCase.execute).toHaveBeenCalledWith('alice', user?.id ?? null, query);
    },
  );

  it('exposes the following GET route with optional authentication', () => {
    const handler = ProfileFollowController.prototype.getFollowed;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':username/following');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([OptionalAuthGuard]);
  });

  it('uses the profiles route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProfileFollowController)).toBe('profiles');
  });
});
