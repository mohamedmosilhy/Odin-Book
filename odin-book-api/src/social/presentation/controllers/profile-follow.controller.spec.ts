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
import { ProfileFollowController } from './profile-follow.controller.js';

describe('ProfileFollowController', () => {
  function createController() {
    const followUseCase = {
      execute: vi.fn<ProfileFollowUseCase['execute']>(),
    };
    const unfollowUseCase = {
      execute: vi.fn<ProfileUnfollowUseCase['execute']>(),
    };
    const controller = new ProfileFollowController(
      followUseCase as unknown as ProfileFollowUseCase,
      unfollowUseCase as unknown as ProfileUnfollowUseCase,
    );

    return { controller, followUseCase, unfollowUseCase };
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

  it('uses the profiles route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProfileFollowController)).toBe('profiles');
  });
});
