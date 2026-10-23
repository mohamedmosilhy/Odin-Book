import type { ProfileRepositoryPort } from '../ports/profile-repository.port.js';
import { Profile } from '../../domain/entities/profile.entity.js';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error.js';
import { EditProfileUseCase } from './edit-profile.use-case.js';

describe('EditProfileUseCase', () => {
  const storedProfile = new Profile(
    'owner-user-id',
    'jane',
    'Jane Doe',
    'Original bio',
    'https://images.example.com/jane.jpg',
    'PUBLIC',
    new Date('2026-10-20T10:00:00.000Z'),
    new Date('2026-10-21T10:00:00.000Z'),
  );

  function createRepository(foundProfile: Profile | null) {
    const repository: ProfileRepositoryPort = {
      findByUserId: vi.fn().mockResolvedValue(foundProfile),
      findByUsername: vi.fn(),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      createProfile: vi.fn(),
      deleteProfile: vi.fn(),
    };

    return repository;
  }

  it('edits the profile owned by the authenticated user and preserves omitted fields', async () => {
    const repository = createRepository(storedProfile);
    const useCase = new EditProfileUseCase(repository);

    const update = {
      displayName: 'Jane Updated',
      visibility: 'PRIVATE' as const,
    };

    await useCase.execute(update, 'owner-user-id');

    expect(repository.findByUserId).toHaveBeenCalledWith('owner-user-id');
    expect(repository.findByUsername).not.toHaveBeenCalled();
    expect(repository.updateProfile).toHaveBeenCalledWith(update, 'owner-user-id');
  });

  it('allows null to clear the biography', async () => {
    const repository = createRepository(storedProfile);
    const useCase = new EditProfileUseCase(repository);

    await useCase.execute({ bio: null }, 'owner-user-id');

    expect(repository.updateProfile).toHaveBeenCalledWith({ bio: null }, 'owner-user-id');
  });

  it('raises the profile domain error when the caller has no profile', async () => {
    const repository = createRepository(null);
    const useCase = new EditProfileUseCase(repository);

    await expect(
      useCase.execute({ displayName: 'Nobody' }, 'missing-user-id'),
    ).rejects.toBeInstanceOf(ProfileNotFoundError);

    expect(repository.updateProfile).not.toHaveBeenCalled();
  });
});
