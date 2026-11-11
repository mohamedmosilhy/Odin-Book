import type { GetProfileVisibilityUseCase } from '@profiles/application/use-cases/get-profile-visibility.use-case.js';
import { VisibilityPolicy } from './visibility-policy.service.js';

describe('VisibilityPolicy', () => {
  function createPolicy() {
    const getProfileVisibility = {
      execute: vi.fn<GetProfileVisibilityUseCase['execute']>(),
    };
    const isActiveFollower = {
      execute: vi.fn<(viewerId: string, authorId: string) => Promise<boolean>>(),
    };

    const policy = new VisibilityPolicy(
      getProfileVisibility as unknown as ConstructorParameters<typeof VisibilityPolicy>[0],
      isActiveFollower as unknown as ConstructorParameters<typeof VisibilityPolicy>[1],
    );

    return { getProfileVisibility, isActiveFollower, policy };
  }

  it('allows the viewer to access their own profile without looking up visibility or follow status', async () => {
    const { getProfileVisibility, isActiveFollower, policy } = createPolicy();

    await expect(policy.canView('user-1', 'user-1')).resolves.toBe(true);

    expect(getProfileVisibility.execute).not.toHaveBeenCalled();
    expect(isActiveFollower.execute).not.toHaveBeenCalled();
  });

  it('allows anyone to view a public profile without checking follow status', async () => {
    const { getProfileVisibility, isActiveFollower, policy } = createPolicy();
    getProfileVisibility.execute.mockResolvedValue('PUBLIC');

    await expect(policy.canView('viewer-1', 'author-1')).resolves.toBe(true);

    expect(getProfileVisibility.execute).toHaveBeenCalledWith('author-1');
    expect(isActiveFollower.execute).not.toHaveBeenCalled();
  });

  it('allows an active follower to view a private profile', async () => {
    const { getProfileVisibility, isActiveFollower, policy } = createPolicy();
    getProfileVisibility.execute.mockResolvedValue('PRIVATE');
    isActiveFollower.execute.mockResolvedValue(true);

    await expect(policy.canView('viewer-1', 'author-1')).resolves.toBe(true);

    expect(isActiveFollower.execute).toHaveBeenCalledWith('viewer-1', 'author-1');
  });

  it('denies a non-follower access to a private profile', async () => {
    const { getProfileVisibility, isActiveFollower, policy } = createPolicy();
    getProfileVisibility.execute.mockResolvedValue('PRIVATE');
    isActiveFollower.execute.mockResolvedValue(false);

    await expect(policy.canView('viewer-1', 'author-1')).resolves.toBe(false);

    expect(isActiveFollower.execute).toHaveBeenCalledWith('viewer-1', 'author-1');
  });

  it('denies a viewer whose follow request is still pending', async () => {
    const { getProfileVisibility, isActiveFollower, policy } = createPolicy();
    getProfileVisibility.execute.mockResolvedValue('PRIVATE');
    isActiveFollower.execute.mockResolvedValue(false);

    await expect(policy.canView('pending-viewer', 'private-author')).resolves.toBe(false);

    expect(isActiveFollower.execute).toHaveBeenCalledWith('pending-viewer', 'private-author');
  });
});
