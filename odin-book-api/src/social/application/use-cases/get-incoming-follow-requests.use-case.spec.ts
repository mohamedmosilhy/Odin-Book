import type { SocialRepositoryPort } from '../ports/social-repository.port.js';
import { GetIncomingFollowRequestsUseCase } from './get-incoming-follow-requests.use-case.js';

describe('GetIncomingFollowRequestsUseCase', () => {
  it('returns the target user’s pending requests with requester identity and pagination data', async () => {
    const getPendingFollowRequestsForUser = vi.fn();
    const socialRepository = {
      getPendingFollowRequestsForUser,
    } as unknown as SocialRepositoryPort;
    const useCase = new GetIncomingFollowRequestsUseCase(socialRepository);
    const query = { cursor: 'opaque-cursor', limit: 20 };
    const result = {
      items: [
        {
          requestId: 'request-1',
          requester: {
            username: 'jane',
            displayName: 'Jane Doe',
            profilePicture: 'https://images.example.com/jane.jpg',
          },
          createdAt: new Date('2026-10-26T10:00:00.000Z'),
        },
      ],
      pageInfo: {
        nextCursor: 'next-opaque-cursor',
        hasMore: true,
      },
    };
    getPendingFollowRequestsForUser.mockResolvedValue(result);

    await expect(useCase.execute('target-1', query)).resolves.toEqual(result);

    expect(getPendingFollowRequestsForUser).toHaveBeenCalledWith('target-1', query);
  });

  it('preserves an empty page when the user has no pending requests', async () => {
    const getPendingFollowRequestsForUser = vi.fn();
    const socialRepository = {
      getPendingFollowRequestsForUser,
    } as unknown as SocialRepositoryPort;
    const useCase = new GetIncomingFollowRequestsUseCase(socialRepository);
    const result = {
      items: [],
      pageInfo: {
        nextCursor: null,
        hasMore: false,
      },
    };
    getPendingFollowRequestsForUser.mockResolvedValue(result);

    await expect(useCase.execute('target-1', { limit: 20 })).resolves.toEqual(result);
  });
});
