import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { FollowRelationship } from '../../domain/entities/follow-relationship.entity.js';
import { FollowRelationshipNotFoundError } from '../../domain/errors/follow-relationship-not-found.error.js';
import { InvalidStatusError } from '../../domain/errors/invalid-status.error.js';
import { InvalidTargetError } from '../../domain/errors/invalid-target.error.js';
import { AcceptFollowRequestUseCase } from './accept-follow-request.use-case.js';

describe('AcceptFollowRequestUseCase', () => {
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
    const useCase = new AcceptFollowRequestUseCase(socialRepository);

    return { socialRepository, useCase };
  }

  function relationship(status: 'PENDING' | 'ACTIVE'): FollowRelationship {
    return new FollowRelationship(
      'request-1',
      'requester-1',
      'target-1',
      status,
      new Date('2026-10-25T10:00:00.000Z'),
      new Date('2026-10-25T10:00:00.000Z'),
    );
  }

  it('allows the target to activate and save a pending request', async () => {
    const { socialRepository, useCase } = createDependencies();
    const pendingRequest = relationship('PENDING');
    socialRepository.findByRelationshipId.mockResolvedValue(pendingRequest);

    await expect(useCase.execute('target-1', 'request-1')).resolves.toBeUndefined();

    expect(socialRepository.findByRelationshipId).toHaveBeenCalledWith('request-1');
    expect(pendingRequest.getStatus()).toBe('ACTIVE');
    expect(socialRepository.saveRelationship).toHaveBeenCalledWith(pendingRequest);
    expect(socialRepository.deleteFollowRelationship).not.toHaveBeenCalled();
  });

  it('rejects a missing request without attempting persistence', async () => {
    const { socialRepository, useCase } = createDependencies();
    socialRepository.findByRelationshipId.mockResolvedValue(null);

    await expect(useCase.execute('target-1', 'missing-request')).rejects.toBeInstanceOf(
      FollowRelationshipNotFoundError,
    );

    expect(socialRepository.saveRelationship).not.toHaveBeenCalled();
  });

  it('prevents a user other than the target from accepting the request', async () => {
    const { socialRepository, useCase } = createDependencies();
    const pendingRequest = relationship('PENDING');
    socialRepository.findByRelationshipId.mockResolvedValue(pendingRequest);

    await expect(useCase.execute('unrelated-user', 'request-1')).rejects.toBeInstanceOf(
      InvalidTargetError,
    );

    expect(pendingRequest.getStatus()).toBe('PENDING');
    expect(socialRepository.saveRelationship).not.toHaveBeenCalled();
  });

  it('prevents accepting a relationship that is already active', async () => {
    const { socialRepository, useCase } = createDependencies();
    const activeRelationship = relationship('ACTIVE');
    socialRepository.findByRelationshipId.mockResolvedValue(activeRelationship);

    await expect(useCase.execute('target-1', 'request-1')).rejects.toBeInstanceOf(
      InvalidStatusError,
    );

    expect(socialRepository.saveRelationship).not.toHaveBeenCalled();
  });
});
