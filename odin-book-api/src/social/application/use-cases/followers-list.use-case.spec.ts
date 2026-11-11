import type { ResolveProfileByUsernameUseCase } from '@profiles/application/use-cases/resolve-profile-by-username.use-case.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';
import type { VisibilityPolicy } from '@shared/domain/services/visibility-policy.service.js';
import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { FollowersListUseCase } from './followers-list.use-case.js';

describe('FollowersListUseCase', () => {
  function setup() {
    const repository = {
      getActiveFollowersByUserId: vi.fn<SocialRepositoryPort['getActiveFollowersByUserId']>(),
    };
    const policy = { canView: vi.fn<VisibilityPolicy['canView']>() };
    const resolver = { execute: vi.fn<ResolveProfileByUsernameUseCase['execute']>() };
    resolver.execute.mockResolvedValue({ userId: 'target-1', visibility: 'PRIVATE' });
    const useCase = new FollowersListUseCase(
      repository as unknown as SocialRepositoryPort,
      policy as unknown as VisibilityPolicy,
      resolver as unknown as ResolveProfileByUsernameUseCase,
    );
    return { repository, policy, resolver, useCase };
  }

  const query = { cursor: 'opaque-cursor', limit: 10 };

  it.each(['viewer-1', null])(
    'returns followers after authorizing viewer %j against the resolved user ID',
    async (viewerId) => {
      const { repository, policy, resolver, useCase } = setup();
      policy.canView.mockResolvedValue(true);
      const result = {
        items: [{ id: 'follower-1', username: 'bob', displayName: 'Bob', profilePicture: null }],
        pageInfo: { nextCursor: 'next-cursor', hasMore: true },
      };
      repository.getActiveFollowersByUserId.mockImplementation(async () => {
        expect(policy.canView).toHaveBeenCalledWith(viewerId, 'target-1');
        return result;
      });

      await expect(useCase.execute('alice', viewerId, query)).resolves.toEqual(result);
      expect(resolver.execute).toHaveBeenCalledWith('alice');
      expect(repository.getActiveFollowersByUserId).toHaveBeenCalledWith('target-1', query);
    },
  );

  it.each(['viewer-1', null])(
    'hides a denied graph from viewer %j without reading followers',
    async (viewerId) => {
      const { repository, policy, useCase } = setup();
      policy.canView.mockResolvedValue(false);

      await expect(useCase.execute('alice', viewerId, query)).rejects.toEqual(
        new ProfileNotFoundError('Profile not found for the given username'),
      );
      expect(repository.getActiveFollowersByUserId).not.toHaveBeenCalled();
    },
  );

  it('propagates a missing profile without authorizing or reading followers', async () => {
    const { repository, policy, resolver, useCase } = setup();
    const error = new ProfileNotFoundError('Profile not found for the given username');
    resolver.execute.mockRejectedValue(error);

    await expect(useCase.execute('missing', 'viewer-1', query)).rejects.toBe(error);
    expect(policy.canView).not.toHaveBeenCalled();
    expect(repository.getActiveFollowersByUserId).not.toHaveBeenCalled();
  });

  it('does not read followers when authorization fails unexpectedly', async () => {
    const { repository, policy, useCase } = setup();
    const error = new Error('visibility lookup failed');
    policy.canView.mockRejectedValue(error);

    await expect(useCase.execute('alice', 'viewer-1', query)).rejects.toBe(error);
    expect(repository.getActiveFollowersByUserId).not.toHaveBeenCalled();
  });
});
