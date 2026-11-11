import type { ProfileRepositoryPort } from '../ports/profile-repository.port.js';
import { Profile } from '../../domain/entities/profile.entity.js';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error.js';
import type { GetProfileSocialSummaryUseCase } from '@social/application/use-cases/get-profile-social-summary.use-case.js';
import { GetProfileByUsernameUseCase } from './get-profile-by-username.use-case.js';

describe('GetProfileByUsernameUseCase', () => {
  const profile = new Profile(
    'user-1',
    'jane',
    'Jane Doe',
    'Hello there',
    'https://images.example.com/jane.jpg',
    'PUBLIC',
    new Date('2026-10-20T10:00:00.000Z'),
    new Date('2026-10-21T10:00:00.000Z'),
  );

  function createRepository(foundProfile: Profile | null): ProfileRepositoryPort {
    return {
      findByUserId: vi.fn(),
      findByUsername: vi.fn().mockResolvedValue(foundProfile),
      updateProfile: vi.fn(),
      createProfile: vi.fn(),
      deleteProfile: vi.fn(),
    };
  }

  const summary = {
    execute: vi
      .fn()
      .mockResolvedValue({ followerCount: 3, followingCount: 5, followStatus: 'PENDING' }),
  };

  beforeEach(() => vi.clearAllMocks());

  it('returns the profile with real social summary', async () => {
    const repository = createRepository(profile);
    const useCase = new GetProfileByUsernameUseCase(
      repository,
      summary as unknown as GetProfileSocialSummaryUseCase,
    );

    const result = await useCase.execute('jane', 'viewer-1');

    expect(summary.execute).toHaveBeenCalledWith('user-1', 'viewer-1');
    expect(repository.findByUsername).toHaveBeenCalledWith('jane');
    expect(result).toEqual({
      username: 'jane',
      displayName: 'Jane Doe',
      bio: 'Hello there',
      profilePicture: 'https://images.example.com/jane.jpg',
      visibility: 'PUBLIC',
      followerCount: 3,
      followingCount: 5,
      followStatus: 'PENDING',
      posts: [],
    });
  });

  it('raises the profile domain error when the username does not exist', async () => {
    const repository = createRepository(null);
    const useCase = new GetProfileByUsernameUseCase(
      repository,
      summary as unknown as GetProfileSocialSummaryUseCase,
    );

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(ProfileNotFoundError);
    expect(summary.execute).not.toHaveBeenCalled();
  });
});
