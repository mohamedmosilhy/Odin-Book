import { ResolveProfileByUsernameUseCase } from '@profiles/application/use-cases/resolve-profile-by-username.use-case.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';
import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { FollowRelationship } from '../../domain/entities/follow-relationship.entity.js';
import { DuplicateRelationshipError } from '../../domain/errors/duplicate-relationship.error.js';
import { InvalidSameUserError } from '../../domain/errors/same-user.error.js';
import { ProfileFollowUseCase } from './profile-follow.use-case.js';

describe('ProfileFollowUseCase', () => {
  function createDependencies() {
    const socialRepository = {
      findByIds: vi.fn<SocialRepositoryPort['findByIds']>(),
      findByRelationshipId: vi.fn<SocialRepositoryPort['findByRelationshipId']>(),
      createFollowRelationship: vi.fn<SocialRepositoryPort['createFollowRelationship']>(),
      saveRelationship: vi.fn<SocialRepositoryPort['saveRelationship']>(),
      deleteFollowRelationship: vi.fn<SocialRepositoryPort['deleteFollowRelationship']>(),
      getPendingFollowRequestsForUser:
        vi.fn<SocialRepositoryPort['getPendingFollowRequestsForUser']>(),
      getFollowedUsersByUserId: vi.fn<SocialRepositoryPort['getFollowedUsersByUserId']>(),
      getActiveFollowersByUserId: vi.fn<SocialRepositoryPort['getActiveFollowersByUserId']>(),
      isFollowing: vi.fn<SocialRepositoryPort['isFollowing']>(),
      getFollowingCount: vi.fn<SocialRepositoryPort['getFollowingCount']>(),
      getFollowerCount: vi.fn<SocialRepositoryPort['getFollowerCount']>(),
      getViewerFollowStatus: vi.fn<SocialRepositoryPort['getViewerFollowStatus']>(),
    } satisfies SocialRepositoryPort;
    const profileResolver = {
      execute: vi.fn<ResolveProfileByUsernameUseCase['execute']>(),
    };
    const useCase = new ProfileFollowUseCase(
      socialRepository,
      profileResolver as unknown as ResolveProfileByUsernameUseCase,
    );

    return { profileResolver, socialRepository, useCase };
  }

  function existingRelationship(status: 'PENDING' | 'ACTIVE'): FollowRelationship {
    return new FollowRelationship(
      'relationship-1',
      'requester-1',
      'target-1',
      status,
      new Date('2026-10-25T10:00:00.000Z'),
      new Date('2026-10-25T10:00:00.000Z'),
    );
  }

  it('creates an active relationship for a public target', async () => {
    const dependencies = createDependencies();
    dependencies.profileResolver.execute.mockResolvedValue({
      userId: 'target-1',
      visibility: 'PUBLIC',
    });
    dependencies.socialRepository.findByIds.mockResolvedValue(null);
    dependencies.socialRepository.createFollowRelationship.mockResolvedValue('ACTIVE');

    await expect(dependencies.useCase.execute('requester-1', 'jane')).resolves.toBe('ACTIVE');

    expect(dependencies.profileResolver.execute).toHaveBeenCalledWith('jane');
    expect(dependencies.socialRepository.findByIds).toHaveBeenCalledWith('requester-1', 'target-1');
    expect(dependencies.socialRepository.createFollowRelationship).toHaveBeenCalledWith({
      requesterId: 'requester-1',
      targetId: 'target-1',
      status: 'ACTIVE',
    });
    expect(dependencies.socialRepository.saveRelationship).not.toHaveBeenCalled();
  });

  it('creates a pending relationship for a private target', async () => {
    const dependencies = createDependencies();
    dependencies.profileResolver.execute.mockResolvedValue({
      userId: 'target-1',
      visibility: 'PRIVATE',
    });
    dependencies.socialRepository.findByIds.mockResolvedValue(null);
    dependencies.socialRepository.createFollowRelationship.mockResolvedValue('PENDING');

    await expect(dependencies.useCase.execute('requester-1', 'jane')).resolves.toBe('PENDING');

    expect(dependencies.socialRepository.createFollowRelationship).toHaveBeenCalledWith({
      requesterId: 'requester-1',
      targetId: 'target-1',
      status: 'PENDING',
    });
  });

  it('rejects self-follow before reading or creating a relationship', async () => {
    const dependencies = createDependencies();
    dependencies.profileResolver.execute.mockResolvedValue({
      userId: 'requester-1',
      visibility: 'PUBLIC',
    });

    await expect(dependencies.useCase.execute('requester-1', 'self')).rejects.toBeInstanceOf(
      InvalidSameUserError,
    );

    expect(dependencies.socialRepository.findByIds).not.toHaveBeenCalled();
    expect(dependencies.socialRepository.createFollowRelationship).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'PENDING'] as const)(
    'rejects an existing %s relationship without creating another row',
    async (status) => {
      const dependencies = createDependencies();
      dependencies.profileResolver.execute.mockResolvedValue({
        userId: 'target-1',
        visibility: 'PUBLIC',
      });
      dependencies.socialRepository.findByIds.mockResolvedValue(existingRelationship(status));

      await expect(dependencies.useCase.execute('requester-1', 'jane')).rejects.toBeInstanceOf(
        DuplicateRelationshipError,
      );

      expect(dependencies.socialRepository.createFollowRelationship).not.toHaveBeenCalled();
    },
  );

  it('propagates a missing-profile error without accessing social persistence', async () => {
    const dependencies = createDependencies();
    const error = new ProfileNotFoundError('Profile not found for the given username');
    dependencies.profileResolver.execute.mockRejectedValue(error);

    await expect(dependencies.useCase.execute('requester-1', 'missing')).rejects.toBe(error);

    expect(dependencies.socialRepository.findByIds).not.toHaveBeenCalled();
    expect(dependencies.socialRepository.createFollowRelationship).not.toHaveBeenCalled();
  });
});
