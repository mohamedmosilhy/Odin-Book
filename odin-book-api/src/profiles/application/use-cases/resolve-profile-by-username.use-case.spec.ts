import { Profile } from '../../domain/entities/profile.entity.js';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error.js';
import type { ProfileRepositoryPort } from '../ports/profile-repository.port.js';
import { ResolveProfileByUsernameUseCase } from './resolve-profile-by-username.use-case.js';

describe('ResolveProfileByUsernameUseCase', () => {
  function createProfile(visibility: 'PUBLIC' | 'PRIVATE'): Profile {
    return new Profile(
      'target-user-id',
      'jane',
      'Jane Doe',
      null,
      null,
      visibility,
      new Date('2026-10-20T10:00:00.000Z'),
      new Date('2026-10-21T10:00:00.000Z'),
    );
  }

  function createRepository(foundProfile: Profile | null): ProfileRepositoryPort {
    return {
      findByUserId: vi.fn(),
      findByUsername: vi.fn().mockResolvedValue(foundProfile),
      updateProfile: vi.fn(),
      createProfile: vi.fn(),
      deleteProfile: vi.fn(),
    };
  }

  it.each(['PUBLIC', 'PRIVATE'] as const)(
    'resolves the target user ID and %s visibility by username',
    async (visibility) => {
      const repository = createRepository(createProfile(visibility));
      const useCase = new ResolveProfileByUsernameUseCase(repository);

      await expect(useCase.execute('jane')).resolves.toEqual({
        userId: 'target-user-id',
        visibility,
      });

      expect(repository.findByUsername).toHaveBeenCalledWith('jane');
      expect(repository.findByUserId).not.toHaveBeenCalled();
    },
  );

  it('raises the profile domain error when the username does not exist', async () => {
    const repository = createRepository(null);
    const useCase = new ResolveProfileByUsernameUseCase(repository);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(ProfileNotFoundError);

    expect(repository.findByUsername).toHaveBeenCalledWith('missing');
  });
});
