import type { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import type {
  CreateRefreshTokenData,
  RefreshTokenRepositoryPort,
  RotateRefreshTokenData,
} from '@auth/application/ports/refresh-token-repository.port.js';
import type { RefreshTokenServicePort } from '@auth/application/ports/refresh-token-service.port.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import { RefreshTokenRotationConflictError } from '@auth/domain/errors/refresh-token-rotation-conflict.error.js';
import { RefreshUseCase } from './refresh.use-case.js';

class InMemoryRefreshTokenRepository implements RefreshTokenRepositoryPort {
  private tokens: RefreshToken[] = [];
  readonly rotateInputs: RotateRefreshTokenData[] = [];
  readonly revokeFamilyInputs: Array<{ familyId: string; revokedAt: Date }> = [];

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const token = new RefreshToken(
      `refresh-token-${this.tokens.length + 1}`,
      data.userId,
      data.tokenHash,
      data.familyId,
      data.expiresAt,
      new Date(),
      null,
      null,
    );
    this.tokens.push(token);
    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async rotate(data: RotateRefreshTokenData): Promise<RefreshToken> {
    this.rotateInputs.push(data);
    const currentIndex = this.tokens.findIndex(
      (token) => token.tokenHash === data.currentTokenHash,
    );
    if (currentIndex === -1) {
      throw new Error('Current refresh token does not exist.');
    }

    const current = this.tokens[currentIndex];
    this.tokens[currentIndex] = new RefreshToken(
      current.id,
      current.userId,
      current.tokenHash,
      current.familyId,
      current.expiresAt,
      current.createdAt,
      data.rotatedAt,
      data.replacementTokenHash,
    );

    const replacement = new RefreshToken(
      `refresh-token-${this.tokens.length + 1}`,
      current.userId,
      data.replacementTokenHash,
      current.familyId,
      data.replacementExpiresAt,
      data.rotatedAt,
      null,
      null,
    );
    this.tokens.push(replacement);
    return replacement;
  }

  async revokeFamily(familyId: string, revokedAt: Date): Promise<void> {
    this.revokeFamilyInputs.push({ familyId, revokedAt });
    this.tokens = this.tokens.map((token) =>
      token.familyId === familyId && token.revokedAt === null
        ? new RefreshToken(
            token.id,
            token.userId,
            token.tokenHash,
            token.familyId,
            token.expiresAt,
            token.createdAt,
            revokedAt,
            token.replacedByTokenHash,
          )
        : token,
    );
  }

  seed(...tokens: RefreshToken[]): void {
    this.tokens.push(...tokens);
  }

  findStored(tokenHash: string): RefreshToken | undefined {
    return this.tokens.find((token) => token.tokenHash === tokenHash);
  }
}

describe('RefreshUseCase', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');
  const replacementExpiresAt = new Date('2026-11-12T12:00:00.000Z');
  const rawCurrentToken = 'raw-current-token';
  const currentTokenHash = 'current-token-hash';
  const rawReplacementToken = 'raw-replacement-token';
  const replacementTokenHash = 'replacement-token-hash';

  const accessTokenPort = {
    generate: vi.fn<AccessTokenPort['generate']>(),
    verify: vi.fn<AccessTokenPort['verify']>(),
  };
  const refreshTokenService = {
    generate: vi.fn<RefreshTokenServicePort['generate']>(),
    hash: vi.fn<RefreshTokenServicePort['hash']>(),
    generateFamilyId: vi.fn<RefreshTokenServicePort['generateFamilyId']>(),
    getExpirationDate: vi.fn<RefreshTokenServicePort['getExpirationDate']>(),
  };

  let repository: InMemoryRefreshTokenRepository;
  let useCase: RefreshUseCase;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    repository = new InMemoryRefreshTokenRepository();
    useCase = new RefreshUseCase(accessTokenPort, refreshTokenService, repository);
    accessTokenPort.generate.mockResolvedValue('new-access-token');
    refreshTokenService.generate.mockResolvedValue(rawReplacementToken);
    refreshTokenService.hash.mockImplementation(async (token) => {
      if (token === rawCurrentToken) return currentTokenHash;
      if (token === rawReplacementToken) return replacementTokenHash;
      return `hash-of:${token}`;
    });
    refreshTokenService.getExpirationDate.mockResolvedValue(replacementExpiresAt);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rotates a valid token and returns a new access token plus the raw replacement token', async () => {
    repository.seed(
      new RefreshToken(
        'current-id',
        'user-id',
        currentTokenHash,
        'family-id',
        new Date('2026-10-20T12:00:00.000Z'),
        new Date('2026-10-01T12:00:00.000Z'),
        null,
        null,
      ),
    );

    const result = await useCase.execute(rawCurrentToken);

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: rawReplacementToken,
    });
    expect(accessTokenPort.generate).toHaveBeenCalledWith('user-id');
    expect(repository.rotateInputs).toEqual([
      {
        currentTokenHash,
        replacementTokenHash,
        replacementExpiresAt,
        rotatedAt: now,
      },
    ]);
    expect(repository.findStored(currentTokenHash)).toMatchObject({
      revokedAt: now,
      replacedByTokenHash: replacementTokenHash,
    });
    expect(repository.findStored(replacementTokenHash)).toMatchObject({
      userId: 'user-id',
      familyId: 'family-id',
      revokedAt: null,
      replacedByTokenHash: null,
    });
    expect(repository.findStored(rawReplacementToken)).toBeUndefined();
  });

  it('rejects an unknown token without issuing replacements', async () => {
    await expect(useCase.execute('unknown-raw-token')).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(repository.rotateInputs).toHaveLength(0);
    expect(repository.revokeFamilyInputs).toHaveLength(0);
  });

  it('rejects an expired token without rotating it', async () => {
    repository.seed(
      new RefreshToken(
        'expired-id',
        'user-id',
        currentTokenHash,
        'family-id',
        new Date('2026-10-13T11:59:59.000Z'),
        new Date('2026-09-01T12:00:00.000Z'),
        null,
        null,
      ),
    );

    await expect(useCase.execute(rawCurrentToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(repository.rotateInputs).toHaveLength(0);
    expect(repository.revokeFamilyInputs).toHaveLength(0);
  });

  it('rejects a token whose expiration time is exactly now', async () => {
    repository.seed(
      new RefreshToken(
        'expired-id',
        'user-id',
        currentTokenHash,
        'family-id',
        now,
        new Date('2026-09-01T12:00:00.000Z'),
        null,
        null,
      ),
    );

    await expect(useCase.execute(rawCurrentToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    expect(repository.rotateInputs).toHaveLength(0);
    expect(repository.revokeFamilyInputs).toHaveLength(0);
  });

  it('revokes the whole family when an already-revoked token is reused', async () => {
    const previouslyRotatedAt = new Date('2026-10-12T12:00:00.000Z');
    repository.seed(
      new RefreshToken(
        'stale-id',
        'user-id',
        currentTokenHash,
        'family-id',
        new Date('2026-10-20T12:00:00.000Z'),
        new Date('2026-10-01T12:00:00.000Z'),
        previouslyRotatedAt,
        replacementTokenHash,
      ),
      new RefreshToken(
        'active-id',
        'user-id',
        replacementTokenHash,
        'family-id',
        replacementExpiresAt,
        previouslyRotatedAt,
        null,
        null,
      ),
    );

    await expect(useCase.execute(rawCurrentToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    expect(repository.revokeFamilyInputs).toEqual([{ familyId: 'family-id', revokedAt: now }]);
    expect(repository.findStored(replacementTokenHash)?.revokedAt).toEqual(now);
    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(repository.rotateInputs).toHaveLength(0);
  });

  it('revokes the family when another request wins the rotation race', async () => {
    repository.seed(
      new RefreshToken(
        'current-id',
        'user-id',
        currentTokenHash,
        'family-id',
        new Date('2026-10-20T12:00:00.000Z'),
        new Date('2026-10-01T12:00:00.000Z'),
        null,
        null,
      ),
      new RefreshToken(
        'concurrent-replacement-id',
        'user-id',
        'concurrent-replacement-hash',
        'family-id',
        replacementExpiresAt,
        now,
        null,
        null,
      ),
    );
    vi.spyOn(repository, 'rotate').mockRejectedValue(
      new RefreshTokenRotationConflictError(),
    );

    await expect(useCase.execute(rawCurrentToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    expect(repository.revokeFamilyInputs).toEqual([{ familyId: 'family-id', revokedAt: now }]);
    expect(repository.findStored('concurrent-replacement-hash')?.revokedAt).toEqual(now);
  });

  it('does not hide unexpected persistence failures', async () => {
    repository.seed(
      new RefreshToken(
        'current-id',
        'user-id',
        currentTokenHash,
        'family-id',
        new Date('2026-10-20T12:00:00.000Z'),
        new Date('2026-10-01T12:00:00.000Z'),
        null,
        null,
      ),
    );
    const databaseError = new Error('Database unavailable');
    vi.spyOn(repository, 'rotate').mockRejectedValue(databaseError);

    await expect(useCase.execute(rawCurrentToken)).rejects.toBe(databaseError);
    expect(repository.revokeFamilyInputs).toHaveLength(0);
  });
});
