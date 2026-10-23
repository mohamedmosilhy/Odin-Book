import type { EditProfileUseCase } from '@profiles/application/use-cases/edit-profile.use-case.js';
import type { GetProfileByUsernameUseCase } from '@profiles/application/use-cases/get-profile-by-username.use-case.js';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { ProfileController } from './profile.controller.js';

describe('ProfileController', () => {
  function createController() {
    const editProfileUseCase = {
      execute: vi.fn<EditProfileUseCase['execute']>(),
    };
    const getProfileByUsernameUseCase = {
      execute: vi.fn<GetProfileByUsernameUseCase['execute']>(),
    };
    const controller = new ProfileController(
      editProfileUseCase as unknown as EditProfileUseCase,
      getProfileByUsernameUseCase as unknown as GetProfileByUsernameUseCase,
    );

    return { controller, editProfileUseCase, getProfileByUsernameUseCase };
  }

  it('exposes a public username route and returns the profile contract', async () => {
    const { controller, getProfileByUsernameUseCase } = createController();
    const response = {
      username: 'jane',
      displayName: 'Jane Doe',
      bio: null,
      profilePicture: null,
      visibility: 'PUBLIC' as const,
      followerCount: 0 as const,
      followingCount: 0 as const,
      followStatus: 'NONE' as const,
      posts: [] as [],
    };
    getProfileByUsernameUseCase.execute.mockResolvedValue(response);

    await expect(controller.getProfileByUsername('jane')).resolves.toEqual(response);
    expect(getProfileByUsernameUseCase.execute).toHaveBeenCalledWith('jane');
    expect(
      Reflect.getMetadata(PATH_METADATA, ProfileController.prototype.getProfileByUsername),
    ).toBe(':username');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ProfileController.prototype.getProfileByUsername),
    ).toBeUndefined();
  });

  it('protects PATCH /profiles/me and edits only the authenticated user profile', async () => {
    const { controller, editProfileUseCase } = createController();
    const update = { displayName: 'Jane Updated', bio: null, visibility: 'PRIVATE' as const };

    await controller.editProfile(update, { id: 'authenticated-user-id' });

    expect(editProfileUseCase.execute).toHaveBeenCalledWith(update, 'authenticated-user-id');
    expect(Reflect.getMetadata(PATH_METADATA, ProfileController.prototype.editProfile)).toBe('me');
    expect(Reflect.getMetadata(GUARDS_METADATA, ProfileController.prototype.editProfile)).toContain(
      AuthGuard,
    );
  });

  it('uses the profiles controller prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProfileController)).toBe('profiles');
  });
});
