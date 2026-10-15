import type { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { PrismaExternalIdentityRepository } from './prisma-external-identity.repository.js';

describe('PrismaExternalIdentityRepository', () => {
  const persistedIdentity = {
    id: 'external-identity-id',
    userId: 'user-id',
    provider: 'GOOGLE' as const,
    providerUserId: 'google-user-123',
    createdAt: new Date('2026-10-15T00:00:00.000Z'),
  };

  function createRepository() {
    const findUnique = vi.fn();
    const create = vi.fn();
    const upsert = vi.fn();
    const prisma = {
      externalIdentity: {
        findUnique,
        create,
        upsert,
      },
    } as unknown as PrismaService;

    return {
      create,
      findUnique,
      upsert,
      repository: new PrismaExternalIdentityRepository(prisma),
    };
  }

  it('finds and maps an identity by its provider-owned stable identifier', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(persistedIdentity);

    const identity = await repository.findByProviderUserId('GOOGLE', 'google-user-123');

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        provider_providerUserId: {
          provider: 'GOOGLE',
          providerUserId: 'google-user-123',
        },
      },
    });
    expect(identity).toEqual({
      id: 'external-identity-id',
      userId: 'user-id',
      provider: 'GOOGLE',
      providerUserId: 'google-user-123',
      createdAt: new Date('2026-10-15T00:00:00.000Z'),
    });
  });

  it('returns null when the provider identity has not been linked', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(null);

    await expect(
      repository.findByProviderUserId('GOOGLE', 'unknown-google-user'),
    ).resolves.toBeNull();
  });

  it('creates a link without allowing an existing identity to be reassigned', async () => {
    const { create, findUnique, repository, upsert } = createRepository();
    create.mockResolvedValue(persistedIdentity);

    const identity = await repository.create('user-id', 'GOOGLE', 'google-user-123');

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        provider: 'GOOGLE',
        providerUserId: 'google-user-123',
      },
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(identity).toEqual({
      id: 'external-identity-id',
      userId: 'user-id',
      provider: 'GOOGLE',
      providerUserId: 'google-user-123',
      createdAt: new Date('2026-10-15T00:00:00.000Z'),
    });
  });
});
