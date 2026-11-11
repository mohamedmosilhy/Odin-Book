import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { GetProfileSocialSummaryUseCase } from './get-profile-social-summary.use-case.js';

describe('GetProfileSocialSummaryUseCase', () => {
  function setup() {
    const repository = {
      getFollowerCount: vi.fn().mockResolvedValue(3),
      getFollowingCount: vi.fn().mockResolvedValue(7),
      getViewerFollowStatus: vi.fn<SocialRepositoryPort['getViewerFollowStatus']>(),
    };
    return {
      repository,
      useCase: new GetProfileSocialSummaryUseCase(repository as unknown as SocialRepositoryPort),
    };
  }

  it.each(['NONE', 'PENDING', 'ACTIVE'] as const)(
    'returns target counts and viewer status %s',
    async (status) => {
      const { repository, useCase } = setup();
      repository.getViewerFollowStatus.mockResolvedValue(status);
      await expect(useCase.execute('target-1', 'viewer-1')).resolves.toEqual({
        followerCount: 3,
        followingCount: 7,
        followStatus: status,
      });
      expect(repository.getFollowerCount).toHaveBeenCalledWith('target-1');
      expect(repository.getFollowingCount).toHaveBeenCalledWith('target-1');
      expect(repository.getViewerFollowStatus).toHaveBeenCalledWith('viewer-1', 'target-1');
    },
  );

  it('does not query a viewer relationship for an anonymous visitor', async () => {
    const { repository, useCase } = setup();
    await expect(useCase.execute('target-1', null)).resolves.toEqual({
      followerCount: 3,
      followingCount: 7,
      followStatus: 'NONE',
    });
    expect(repository.getViewerFollowStatus).not.toHaveBeenCalled();
  });
});
