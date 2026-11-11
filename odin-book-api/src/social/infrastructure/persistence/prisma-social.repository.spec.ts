import { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaService } from '../../../shared/infrastructure/database/prisma.service.js';
import { FollowRelationship } from '../../domain/entities/follow-relationship.entity.js';
import { DuplicateRelationshipError } from '../../domain/errors/duplicate-relationship.error.js';
import { PrismaSocialRepository } from './prisma-social.repository.js';

describe('PrismaSocialRepository', () => {
  const persistedRelationship = {
    id: 'relationship-1',
    requesterId: 'requester-1',
    targetId: 'target-1',
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-10-25T10:00:00.000Z'),
    updatedAt: new Date('2026-10-25T10:00:00.000Z'),
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  function createRepository() {
    const create = vi.fn();
    const count = vi.fn();
    const findMany = vi.fn();
    const findUnique = vi.fn();
    const update = vi.fn();
    const remove = vi.fn();
    const prisma = {
      followRelationship: {
        create,
        count,
        findMany,
        findUnique,
        update,
        delete: remove,
      },
    } as unknown as PrismaService;

    return {
      create,
      count,
      findMany,
      findUnique,
      remove,
      repository: new PrismaSocialRepository(prisma),
      update,
    };
  }

  it('finds a directional relationship and maps it into the domain entity', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(persistedRelationship);

    const relationship = await repository.findByIds('requester-1', 'target-1');

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        requesterId_targetId: {
          requesterId: 'requester-1',
          targetId: 'target-1',
        },
      },
    });
    expect(relationship).toBeInstanceOf(FollowRelationship);
    expect(relationship).toEqual(
      expect.objectContaining({
        id: 'relationship-1',
        requesterId: 'requester-1',
        targetId: 'target-1',
      }),
    );
    expect(relationship?.getStatus()).toBe('ACTIVE');
    expect(relationship?.getUpdatedAt()).toEqual(persistedRelationship.updatedAt);
  });

  it('returns null when the directional relationship does not exist', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(null);

    await expect(repository.findByIds('requester-1', 'target-1')).resolves.toBeNull();
  });

  it('creates a relationship while letting Prisma generate its ID and timestamps', async () => {
    const { create, repository } = createRepository();
    const input = {
      requesterId: 'requester-1',
      targetId: 'target-1',
      status: 'ACTIVE' as const,
    };
    create.mockResolvedValue(persistedRelationship);

    await expect(repository.createFollowRelationship(input)).resolves.toBe('ACTIVE');

    expect(create).toHaveBeenCalledWith({ data: input });
  });

  it('maps a duplicate relationship race from Prisma P2002 to the domain conflict', async () => {
    const { create, repository } = createRepository();
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['requesterId', 'targetId'] },
      }),
    );

    await expect(
      repository.createFollowRelationship({
        requesterId: 'requester-1',
        targetId: 'target-1',
        status: 'PENDING',
      }),
    ).rejects.toBeInstanceOf(DuplicateRelationshipError);
  });

  it('does not translate unrelated persistence failures', async () => {
    const { create, repository } = createRepository();
    const databaseError = new Error('Database unavailable');
    create.mockRejectedValue(databaseError);

    await expect(
      repository.createFollowRelationship({
        requesterId: 'requester-1',
        targetId: 'target-1',
        status: 'ACTIVE',
      }),
    ).rejects.toBe(databaseError);
  });

  it('persists the status and timestamp changed by the domain entity', async () => {
    vi.useFakeTimers();
    const acceptedAt = new Date('2026-10-25T12:00:00.000Z');
    vi.setSystemTime(acceptedAt);
    const { repository, update } = createRepository();
    const relationship = new FollowRelationship(
      'relationship-1',
      'requester-1',
      'target-1',
      'PENDING',
      persistedRelationship.createdAt,
      persistedRelationship.updatedAt,
    );
    relationship.accept('target-1');
    update.mockResolvedValue({ ...persistedRelationship, status: 'ACTIVE', updatedAt: acceptedAt });

    await repository.saveRelationship(relationship);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'relationship-1' },
      data: {
        status: 'ACTIVE',
        updatedAt: acceptedAt,
      },
    });
  });

  it('deletes a relationship by its ID', async () => {
    const { remove, repository } = createRepository();
    remove.mockResolvedValue(persistedRelationship);

    await repository.deleteFollowRelationship('relationship-1');

    expect(remove).toHaveBeenCalledWith({ where: { id: 'relationship-1' } });
  });

  it('returns pending incoming requests with requester profile summaries', async () => {
    const { findMany, repository } = createRepository();
    findMany.mockResolvedValue([
      {
        ...persistedRelationship,
        status: 'PENDING',
        requester: {
          id: 'requester-1',
          profile: {
            id: 'profile-1',
            userId: 'requester-1',
            username: 'jane',
            displayName: 'Jane Doe',
            bio: null,
            profilePicture: 'https://images.example.com/jane.jpg',
            visibility: 'PUBLIC',
            createdAt: new Date('2026-10-20T10:00:00.000Z'),
            updatedAt: new Date('2026-10-20T10:00:00.000Z'),
          },
        },
      },
    ]);

    await expect(
      repository.getPendingFollowRequestsForUser('target-1', { cursor: null, limit: 20 }),
    ).resolves.toEqual({
      items: [
        {
          requestId: 'relationship-1',
          requester: {
            username: 'jane',
            displayName: 'Jane Doe',
            profilePicture: 'https://images.example.com/jane.jpg',
          },
          createdAt: persistedRelationship.createdAt,
        },
      ],
      pageInfo: {
        nextCursor: null,
        hasMore: false,
      },
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        targetId: 'target-1',
        status: 'PENDING',
      },
      take: 21,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
      },
    });
  });

  it('limits the first page and creates a cursor from the last returned request when more exist', async () => {
    const { findMany, repository } = createRepository();
    const requests = [
      {
        ...persistedRelationship,
        id: 'request-3',
        createdAt: new Date('2026-10-25T12:00:00.000Z'),
      },
      {
        ...persistedRelationship,
        id: 'request-2',
        createdAt: new Date('2026-10-25T11:00:00.000Z'),
      },
      {
        ...persistedRelationship,
        id: 'request-1',
        createdAt: new Date('2026-10-25T10:00:00.000Z'),
      },
    ].map((request) => ({
      ...request,
      status: 'PENDING' as const,
      requester: {
        profile: {
          username: `user-${request.id}`,
          displayName: `Name ${request.id}`,
          profilePicture: null,
        },
      },
    }));
    findMany.mockResolvedValue(requests);

    const result = await repository.getPendingFollowRequestsForUser('target-1', {
      cursor: null,
      limit: 2,
    });

    expect(result.items.map((item) => item.requestId)).toEqual(['request-3', 'request-2']);
    expect(result.pageInfo).toEqual({
      nextCursor: Buffer.from(
        JSON.stringify({
          createdAt: '2026-10-25T11:00:00.000Z',
          id: 'request-2',
        }),
      ).toString('base64'),
      hasMore: true,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        targetId: 'target-1',
        status: 'PENDING',
      },
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 3,
    });
  });

  it('uses the opaque cursor to start after the previous request', async () => {
    const { findMany, repository } = createRepository();
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: '2026-10-25T11:00:00.000Z',
        id: 'request-2',
      }),
    ).toString('base64');
    findMany.mockResolvedValue([]);

    await repository.getPendingFollowRequestsForUser('target-1', { cursor, limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          targetId: 'target-1',
          status: 'PENDING',
          OR: [
            { createdAt: { gt: new Date('2026-10-25T11:00:00.000Z') } },
            { createdAt: new Date('2026-10-25T11:00:00.000Z'), id: { gt: 'request-2' } },
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 3,
      }),
    );
  });

  it('returns a paginated first page of active followed users', async () => {
    const { findMany, repository } = createRepository();
    const createdAt = new Date('2026-10-25T11:00:00.000Z');
    findMany.mockResolvedValue(
      [
        {
          id: 'relationship-1',
          createdAt: new Date('2026-10-25T10:00:00.000Z'),
          target: {
            profile: {
              id: 'profile-target-1',
              username: 'alice',
              displayName: 'Alice Doe',
              profilePicture: 'https://images.example.com/alice.jpg',
            },
          },
        },
        {
          id: 'relationship-2',
          createdAt,
          target: {
            profile: {
              id: 'profile-target-2',
              username: 'bob',
              displayName: 'Bob Doe',
              profilePicture: null,
            },
          },
        },
        {
          id: 'relationship-3',
          createdAt: new Date('2026-10-25T12:00:00.000Z'),
          target: {
            profile: {
              id: 'profile-target-3',
              username: 'carol',
              displayName: 'Carol Doe',
              profilePicture: null,
            },
          },
        },
      ].map((row) => ({
        ...row,
        requesterId: 'requester-1',
        targetId: row.id,
        status: 'ACTIVE',
        updatedAt: row.createdAt,
      })),
    );

    await expect(
      repository.getFollowedUsersByUserId('requester-1', { cursor: null, limit: 2 }),
    ).resolves.toEqual({
      items: [
        {
          id: 'profile-target-1',
          username: 'alice',
          displayName: 'Alice Doe',
          profilePicture: 'https://images.example.com/alice.jpg',
        },
        {
          id: 'profile-target-2',
          username: 'bob',
          displayName: 'Bob Doe',
          profilePicture: null,
        },
      ],
      pageInfo: {
        nextCursor: Buffer.from(
          JSON.stringify({ createdAt: createdAt.toISOString(), id: 'relationship-2' }),
        ).toString('base64url'),
        hasMore: true,
      },
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        requesterId: 'requester-1',
        status: 'ACTIVE',
      },
      include: {
        target: {
          include: {
            profile: true,
          },
        },
      },
      take: 3,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('uses the opaque cursor to continue the followed users list', async () => {
    const { findMany, repository } = createRepository();
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-10-25T11:00:00.000Z', id: 'relationship-2' }),
    ).toString('base64url');
    findMany.mockResolvedValue([]);

    await repository.getFollowedUsersByUserId('requester-1', { cursor, limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          requesterId: 'requester-1',
          status: 'ACTIVE',
          OR: [
            { createdAt: { gt: new Date('2026-10-25T11:00:00.000Z') } },
            { createdAt: new Date('2026-10-25T11:00:00.000Z'), id: { gt: 'relationship-2' } },
          ],
        },
        take: 3,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('returns a paginated first page of active followers', async () => {
    const { findMany, repository } = createRepository();
    const createdAt = new Date('2026-10-25T11:00:00.000Z');
    findMany.mockResolvedValue(
      [
        {
          id: 'relationship-1',
          createdAt: new Date('2026-10-25T10:00:00.000Z'),
          requester: {
            profile: {
              id: 'profile-requester-1',
              username: 'bob',
              displayName: 'Bob Doe',
              profilePicture: null,
            },
          },
        },
        {
          id: 'relationship-2',
          createdAt,
          requester: {
            profile: {
              id: 'profile-requester-2',
              username: 'dana',
              displayName: 'Dana Doe',
              profilePicture: 'https://images.example.com/dana.jpg',
            },
          },
        },
        {
          id: 'relationship-3',
          createdAt: new Date('2026-10-25T12:00:00.000Z'),
          requester: {
            profile: {
              id: 'profile-requester-3',
              username: 'erin',
              displayName: 'Erin Doe',
              profilePicture: null,
            },
          },
        },
      ].map((row) => ({
        ...row,
        requesterId: row.id,
        targetId: 'target-1',
        status: 'ACTIVE',
        updatedAt: row.createdAt,
      })),
    );

    await expect(
      repository.getActiveFollowersByUserId('target-1', { cursor: null, limit: 2 }),
    ).resolves.toEqual({
      items: [
        {
          id: 'profile-requester-1',
          username: 'bob',
          displayName: 'Bob Doe',
          profilePicture: null,
        },
        {
          id: 'profile-requester-2',
          username: 'dana',
          displayName: 'Dana Doe',
          profilePicture: 'https://images.example.com/dana.jpg',
        },
      ],
      pageInfo: {
        nextCursor: Buffer.from(
          JSON.stringify({ createdAt: createdAt.toISOString(), id: 'relationship-2' }),
        ).toString('base64url'),
        hasMore: true,
      },
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        targetId: 'target-1',
        status: 'ACTIVE',
      },
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
      },
      take: 3,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('uses the opaque cursor to continue the active followers list', async () => {
    const { findMany, repository } = createRepository();
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-10-25T11:00:00.000Z', id: 'relationship-2' }),
    ).toString('base64url');
    findMany.mockResolvedValue([]);

    await repository.getActiveFollowersByUserId('target-1', { cursor, limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          targetId: 'target-1',
          status: 'ACTIVE',
          OR: [
            { createdAt: { gt: new Date('2026-10-25T11:00:00.000Z') } },
            { createdAt: new Date('2026-10-25T11:00:00.000Z'), id: { gt: 'relationship-2' } },
          ],
        },
        take: 3,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('returns an empty paginated result when there are no followed users', async () => {
    const { findMany, repository } = createRepository();
    findMany.mockResolvedValue([]);

    await expect(
      repository.getFollowedUsersByUserId('requester-1', { cursor: null, limit: 20 }),
    ).resolves.toEqual({
      items: [],
      pageInfo: { nextCursor: null, hasMore: false },
    });
  });

  it('returns an empty paginated result when there are no active followers', async () => {
    const { findMany, repository } = createRepository();
    findMany.mockResolvedValue([]);

    await expect(
      repository.getActiveFollowersByUserId('target-1', { cursor: null, limit: 20 }),
    ).resolves.toEqual({
      items: [],
      pageInfo: { nextCursor: null, hasMore: false },
    });
  });
  it.each([
    { row: null, expected: false },
    { row: { ...persistedRelationship, status: 'PENDING' }, expected: false },
    { row: persistedRelationship, expected: true },
  ])(
    'grants follower lookup only for ACTIVE relationships: $expected',
    async ({ row, expected }) => {
      const { repository, findUnique } = createRepository();
      findUnique.mockResolvedValue(row);
      await expect(repository.isFollowing('viewer-1', 'target-1')).resolves.toBe(expected);
      expect(findUnique).toHaveBeenCalledWith({
        where: { requesterId_targetId: { requesterId: 'viewer-1', targetId: 'target-1' } },
      });
    },
  );

  it.each(['getFollowerCount', 'getFollowingCount'] as const)(
    'counts only active relationships using %s',
    async (method) => {
      const { repository, count } = createRepository();
      count.mockResolvedValue(4);
      await expect(repository[method]('target-1')).resolves.toBe(4);
      expect(count).toHaveBeenCalledWith({
        where: {
          [method === 'getFollowerCount' ? 'targetId' : 'requesterId']: 'target-1',
          status: 'ACTIVE',
        },
      });
    },
  );

  it.each(['NONE', 'PENDING', 'ACTIVE'] as const)(
    'returns viewer-relative status %s',
    async (status) => {
      const { repository, findUnique } = createRepository();
      findUnique.mockResolvedValue(status === 'NONE' ? null : { ...persistedRelationship, status });
      await expect(repository.getViewerFollowStatus('viewer-1', 'target-1')).resolves.toBe(status);
      expect(findUnique).toHaveBeenCalledWith({
        where: { requesterId_targetId: { requesterId: 'viewer-1', targetId: 'target-1' } },
      });
    },
  );
});
