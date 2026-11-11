import type { ProfileRepositoryPort } from '../ports/profile-repository.port.js';
import { Profile } from '../../domain/entities/profile.entity.js';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error.js';
import { GetProfileVisibilityUseCase } from './get-profile-visibility.use-case.js';

describe('GetProfileVisibilityUseCase', () => {
  function createProfile(visibility: 'PUBLIC' | 'PRIVATE'): Profile {
    return new Profile(
      'user-1',
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
      findByUserId: vi.fn().mockResolvedValue(foundProfile),
      findByUsername: vi.fn(),
      updateProfile: vi.fn(),
      createProfile: vi.fn(),
      deleteProfile: vi.fn(),
    };
  }

  it('returns PUBLIC when the user owns a public profile', async () => {
    const repository = createRepository(createProfile('PUBLIC'));
    const useCase = new GetProfileVisibilityUseCase(repository);

    await expect(useCase.execute('user-1')).resolves.toBe('PUBLIC');

    expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
    expect(repository.findByUsername).not.toHaveBeenCalled();
  });

  it('returns PRIVATE when the user owns a private profile', async () => {
    const repository = createRepository(createProfile('PRIVATE'));
    const useCase = new GetProfileVisibilityUseCase(repository);

    await expect(useCase.execute('user-1')).resolves.toBe('PRIVATE');

    expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('raises the profile domain error when the user has no profile', async () => {
    const repository = createRepository(null);
    const useCase = new GetProfileVisibilityUseCase(repository);

    await expect(useCase.execute('missing-user-id')).rejects.toBeInstanceOf(ProfileNotFoundError);

    expect(repository.findByUserId).toHaveBeenCalledWith('missing-user-id');
  });
});
