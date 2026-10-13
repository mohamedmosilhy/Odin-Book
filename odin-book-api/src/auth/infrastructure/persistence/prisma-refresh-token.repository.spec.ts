import type {
  CreateRefreshTokenData,
  RotateRefreshTokenData,
} from '@auth/application/ports/refresh-token-repository.port.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import { RefreshTokenRotationConflictError } from '@auth/domain/errors/refresh-token-rotation-conflict.error.js';
import type { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository.js';

describe('PrismaRefreshTokenRepository', () => {
  const createdAt = new Date('2026-10-13T12:00:00.000Z');
  const expiresAt = new Date('2026-11-12T12:00:00.000Z');

  const persistedToken = {
    id: 'refresh-token-id',
    userId: 'user-id',
    tokenHash: 'current-token-hash',
    familyId: 'family-id',
    expiresAt,
    createdAt,
    revokedAt: null,
    replacedByTokenHash: null,
  };

  function createRepository() {
    const create = vi.fn();
    const findUnique = vi.fn();
    const transactionFindUnique = vi.fn();
    const transactionUpdateMany = vi.fn();
    const updateMany = vi.fn();
    const transaction = vi.fn(
      async (work: (transactionClient: unknown) => Promise<unknown>) =>
        work({
          refreshToken: {
            create,
            findUnique: transactionFindUnique,
            updateMany: transactionUpdateMany,
          },
        }),
    );

    const prisma = {
      refreshToken: {
        create,
        findUnique,
        updateMany,
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    return {
      create,
      findUnique,
      transactionFindUnique,
      transactionUpdateMany,
      updateMany,
      transaction,
      repository: new PrismaRefreshTokenRepository(prisma),
    };
  }

  it('creates a token while letting Prisma generate database-owned fields', async () => {
    const { create, repository } = createRepository();
    const input: CreateRefreshTokenData = {
      userId: persistedToken.userId,
      tokenHash: persistedToken.tokenHash,
      familyId: persistedToken.familyId,
      expiresAt: persistedToken.expiresAt,
    };
    create.mockResolvedValue(persistedToken);

    const token = await repository.create(input);

    expect(create).toHaveBeenCalledWith({ data: input });
    expect(token).toBeInstanceOf(RefreshToken);
    expect(token).toEqual(
      new RefreshToken(
        persistedToken.id,
        persistedToken.userId,
        persistedToken.tokenHash,
        persistedToken.familyId,
        persistedToken.expiresAt,
        persistedToken.createdAt,
        null,
        null,
      ),
    );
  });

  it('finds and maps a token by its hash', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(persistedToken);

    const token = await repository.findByTokenHash(persistedToken.tokenHash);

    expect(findUnique).toHaveBeenCalledWith({
      where: { tokenHash: persistedToken.tokenHash },
    });
    expect(token).toBeInstanceOf(RefreshToken);
    expect(token?.id).toBe(persistedToken.id);
  });

  it('returns null when no token has the requested hash', async () => {
    const { findUnique, repository } = createRepository();
    findUnique.mockResolvedValue(null);

    await expect(repository.findByTokenHash('missing-token-hash')).resolves.toBeNull();
  });

  it('atomically revokes the current token and creates its replacement in the same family', async () => {
    const {
      create,
      transactionFindUnique,
      transactionUpdateMany,
      transaction,
      repository,
    } = createRepository();
    const rotatedAt = new Date('2026-10-14T12:00:00.000Z');
    const replacementExpiresAt = new Date('2026-11-13T12:00:00.000Z');
    const input: RotateRefreshTokenData = {
      currentTokenHash: persistedToken.tokenHash,
      replacementTokenHash: 'replacement-token-hash',
      replacementExpiresAt,
      rotatedAt,
    };
    transactionFindUnique.mockResolvedValue(persistedToken);
    transactionUpdateMany.mockResolvedValue({ count: 1 });
    const replacementToken = {
      ...persistedToken,
      id: 'replacement-token-id',
      tokenHash: input.replacementTokenHash,
      expiresAt: replacementExpiresAt,
      createdAt: rotatedAt,
    };
    create.mockResolvedValue(replacementToken);

    const result = await repository.rotate(input);

    expect(transaction).toHaveBeenCalledOnce();
    expect(transactionFindUnique).toHaveBeenCalledWith({
      where: { tokenHash: input.currentTokenHash },
    });
    expect(transactionUpdateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: input.currentTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: input.rotatedAt,
        replacedByTokenHash: input.replacementTokenHash,
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: persistedToken.userId,
        tokenHash: input.replacementTokenHash,
        familyId: persistedToken.familyId,
        expiresAt: input.replacementExpiresAt,
      },
    });
    expect(result).toBeInstanceOf(RefreshToken);
    expect(result.id).toBe(replacementToken.id);
  });

  it('rejects rotation when another request has already revoked the current token', async () => {
    const { create, transactionFindUnique, transactionUpdateMany, repository } =
      createRepository();
    transactionFindUnique.mockResolvedValue(persistedToken);
    transactionUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.rotate({
        currentTokenHash: persistedToken.tokenHash,
        replacementTokenHash: 'losing-replacement-hash',
        replacementExpiresAt: new Date('2026-11-13T12:00:00.000Z'),
        rotatedAt: new Date('2026-10-14T12:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(RefreshTokenRotationConflictError);

    expect(create).not.toHaveBeenCalled();
  });

  it('revokes every currently active token in a family', async () => {
    const { updateMany, repository } = createRepository();
    const revokedAt = new Date('2026-10-14T12:00:00.000Z');
    updateMany.mockResolvedValue({ count: 2 });

    await repository.revokeFamily(persistedToken.familyId, revokedAt);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        familyId: persistedToken.familyId,
        revokedAt: null,
      },
      data: { revokedAt },
    });
  });
});
