import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { IsActiveFollowerUseCase } from './is-active-follower.use-case.js';

describe('IsActiveFollowerUseCase', () => {
  function createUseCase() {
    const isFollowing = vi.fn<SocialRepositoryPort['isFollowing']>();
    const socialRepository = {
      isFollowing,
    } as unknown as SocialRepositoryPort;
    const useCase = new IsActiveFollowerUseCase(socialRepository);

    return { isFollowing, useCase };
  }

  it('checks whether the viewer actively follows the author', async () => {
    const { isFollowing, useCase } = createUseCase();
    isFollowing.mockResolvedValue(true);

    await expect(useCase.execute('viewer-1', 'author-1')).resolves.toBe(true);

    expect(isFollowing).toHaveBeenCalledWith('viewer-1', 'author-1');
  });

  it('returns false when the viewer has no active follow relationship with the author', async () => {
    const { isFollowing, useCase } = createUseCase();
    isFollowing.mockResolvedValue(false);

    await expect(useCase.execute('viewer-1', 'author-1')).resolves.toBe(false);

    expect(isFollowing).toHaveBeenCalledWith('viewer-1', 'author-1');
  });
});
