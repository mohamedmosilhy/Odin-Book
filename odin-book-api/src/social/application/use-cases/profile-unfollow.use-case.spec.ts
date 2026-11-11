import { ResolveProfileByUsernameUseCase } from '@profiles/application/use-cases/resolve-profile-by-username.use-case.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';
import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { FollowRelationship } from '../../domain/entities/follow-relationship.entity.js';
import { FollowRelationshipNotFoundError } from '../../domain/errors/follow-relationship-not-found.error.js';
import { InvalidRequesterError } from '../../domain/errors/invalid-requester.error.js';
import { InvalidSameUserError } from '../../domain/errors/same-user.error.js';
import { ProfileUnfollowUseCase } from './profile-unfollow.use-case.js';

describe('ProfileUnfollowUseCase', () => {
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
    const useCase = new ProfileUnfollowUseCase(
      socialRepository,
      profileResolver as unknown as ResolveProfileByUsernameUseCase,
    );

    return { profileResolver, socialRepository, useCase };
  }

  function relationship(
    status: 'PENDING' | 'ACTIVE',
    requesterId = 'requester-1',
  ): FollowRelationship {
    return new FollowRelationship(
      'relationship-1',
      requesterId,
      'target-1',
      status,
      new Date('2026-10-25T10:00:00.000Z'),
      new Date('2026-10-25T10:00:00.000Z'),
    );
  }

  function resolveTarget(dependencies: ReturnType<typeof createDependencies>): void {
    dependencies.profileResolver.execute.mockResolvedValue({
      userId: 'target-1',
      visibility: 'PRIVATE',
    });
  }

  it('deletes an active relationship after the requester authorizes unfollowing', async () => {
    const dependencies = createDependencies();
    const activeRelationship = relationship('ACTIVE');
    resolveTarget(dependencies);
    dependencies.socialRepository.findByIds.mockResolvedValue(activeRelationship);

    await expect(dependencies.useCase.execute('requester-1', 'jane')).resolves.toBeUndefined();

    expect(dependencies.profileResolver.execute).toHaveBeenCalledWith('jane');
    expect(dependencies.socialRepository.findByIds).toHaveBeenCalledWith('requester-1', 'target-1');
    expect(dependencies.socialRepository.deleteFollowRelationship).toHaveBeenCalledWith(
      'relationship-1',
    );
    expect(dependencies.socialRepository.saveRelationship).not.toHaveBeenCalled();
  });

  it('deletes a pending relationship after the requester authorizes cancellation', async () => {
    const dependencies = createDependencies();
    const pendingRelationship = relationship('PENDING');
    resolveTarget(dependencies);
    dependencies.socialRepository.findByIds.mockResolvedValue(pendingRelationship);

    await expect(dependencies.useCase.execute('requester-1', 'jane')).resolves.toBeUndefined();

    expect(dependencies.socialRepository.deleteFollowRelationship).toHaveBeenCalledWith(
      'relationship-1',
    );
  });

  it('rejects a missing relationship without attempting deletion', async () => {
    const dependencies = createDependencies();
    resolveTarget(dependencies);
    dependencies.socialRepository.findByIds.mockResolvedValue(null);

    await expect(dependencies.useCase.execute('requester-1', 'jane')).rejects.toBeInstanceOf(
      FollowRelationshipNotFoundError,
    );

    expect(dependencies.socialRepository.deleteFollowRelationship).not.toHaveBeenCalled();
  });

  it('rejects targeting the requester before reading social persistence', async () => {
    const dependencies = createDependencies();
    dependencies.profileResolver.execute.mockResolvedValue({
      userId: 'requester-1',
      visibility: 'PUBLIC',
    });

    await expect(dependencies.useCase.execute('requester-1', 'self')).rejects.toBeInstanceOf(
      InvalidSameUserError,
    );

    expect(dependencies.socialRepository.findByIds).not.toHaveBeenCalled();
    expect(dependencies.socialRepository.deleteFollowRelationship).not.toHaveBeenCalled();
  });

  it('propagates a missing-profile error without accessing social persistence', async () => {
    const dependencies = createDependencies();
    const error = new ProfileNotFoundError('Profile not found for the given username');
    dependencies.profileResolver.execute.mockRejectedValue(error);

    await expect(dependencies.useCase.execute('requester-1', 'missing')).rejects.toBe(error);

    expect(dependencies.socialRepository.findByIds).not.toHaveBeenCalled();
    expect(dependencies.socialRepository.deleteFollowRelationship).not.toHaveBeenCalled();
  });

  it('does not delete when the loaded relationship belongs to another requester', async () => {
    const dependencies = createDependencies();
    resolveTarget(dependencies);
    dependencies.socialRepository.findByIds.mockResolvedValue(
      relationship('ACTIVE', 'different-requester'),
    );

    await expect(dependencies.useCase.execute('requester-1', 'jane')).rejects.toBeInstanceOf(
      InvalidRequesterError,
    );

    expect(dependencies.socialRepository.deleteFollowRelationship).not.toHaveBeenCalled();
  });
});
