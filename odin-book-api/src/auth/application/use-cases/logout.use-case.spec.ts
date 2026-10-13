import type { RefreshTokenRepositoryPort } from '@auth/application/ports/refresh-token-repository.port.js';
import type { RefreshTokenServicePort } from '@auth/application/ports/refresh-token-service.port.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import { LogoutUseCase } from './logout.use-case.js';

describe('LogoutUseCase', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');
  const rawRefreshToken = 'raw-refresh-token';
  const hashedRefreshToken = 'hashed-refresh-token';

  const refreshTokenService = {
    generate: vi.fn<RefreshTokenServicePort['generate']>(),
    hash: vi.fn<RefreshTokenServicePort['hash']>(),
    generateFamilyId: vi.fn<RefreshTokenServicePort['generateFamilyId']>(),
    getExpirationDate: vi.fn<RefreshTokenServicePort['getExpirationDate']>(),
  };

  const refreshTokenRepository = {
    create: vi.fn<RefreshTokenRepositoryPort['create']>(),
    findByTokenHash: vi.fn<RefreshTokenRepositoryPort['findByTokenHash']>(),
    rotate: vi.fn<RefreshTokenRepositoryPort['rotate']>(),
    revokeFamily: vi.fn<RefreshTokenRepositoryPort['revokeFamily']>(),
  };

  let useCase: LogoutUseCase;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    useCase = new LogoutUseCase(refreshTokenService, refreshTokenRepository);
    refreshTokenService.hash.mockResolvedValue(hashedRefreshToken);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hashes the presented token and revokes its entire family', async () => {
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      new RefreshToken(
        'token-id',
        'user-id',
        hashedRefreshToken,
        'family-id',
        new Date('2026-11-12T12:00:00.000Z'),
        new Date('2026-10-01T12:00:00.000Z'),
        null,
        null,
      ),
    );

    await expect(useCase.execute(rawRefreshToken)).resolves.toBeUndefined();

    expect(refreshTokenService.hash).toHaveBeenCalledWith(rawRefreshToken);
    expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(hashedRefreshToken);
    expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family-id', now);
    expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalledWith(rawRefreshToken);
  });

  it('succeeds without revocation when the token no longer exists', async () => {
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute(rawRefreshToken)).resolves.toBeUndefined();

    expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
  });
});
