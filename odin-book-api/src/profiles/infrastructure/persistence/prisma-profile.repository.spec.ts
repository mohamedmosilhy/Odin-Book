import type { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { Profile } from '../../domain/entities/profile.entity.js';
import { PrismaProfileRepository } from './prisma-profile.repository.js';

describe('PrismaProfileRepository', () => {
  const persistedProfile = {
    id: 'profile-1',
    userId: 'user-1',
    username: 'jane',
    displayName: 'Jane Doe',
    bio: 'Hello there',
    profilePicture: null,
    visibility: 'PUBLIC' as const,
    createdAt: new Date('2026-10-20T10:00:00.000Z'),
    updatedAt: new Date('2026-10-21T10:00:00.000Z'),
  };

  function createRepository() {
    const findUnique = vi.fn();
    const update = vi.fn().mockResolvedValue(persistedProfile);
    const create = vi.fn().mockResolvedValue(persistedProfile);
    const remove = vi.fn().mockResolvedValue(persistedProfile);
    const prisma = {
      profile: {
        findUnique,
        update,
        create,
        delete: remove,
      },
    } as unknown as PrismaService;

    return {
      create,
      findUnique,
      remove,
      repository: new PrismaProfileRepository(prisma),
      update,
    };
  }

  it('maps a profile found by user id into the domain entity', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(persistedProfile);

    const result = await repository.findByUserId('user-1');

    expect(findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result).toBeInstanceOf(Profile);
    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        username: 'jane',
        displayName: 'Jane Doe',
      }),
    );
  });

  it('returns null when a profile lookup finds no row', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(null);

    await expect(repository.findByUserId('missing-user')).resolves.toBeNull();
    await expect(repository.findByUsername('missing')).resolves.toBeNull();
  });

  it('updates the profile selected by its unique user id', async () => {
    const { repository, update } = createRepository();
    const updateData = {
      displayName: 'Jane Updated',
      bio: null,
      visibility: 'PRIVATE' as const,
    };

    await repository.updateProfile(updateData, 'user-1');

    expect(update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: updateData,
    });
  });
});
