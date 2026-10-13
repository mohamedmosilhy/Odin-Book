import type { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { RefreshTokenService } from './refresh-token.service.js';

const REFRESH_TOKEN_TTL_DAYS = 30;

function createSubject() {
  const configService = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'jwt.refreshTokenTtlDays') {
        return REFRESH_TOKEN_TTL_DAYS;
      }

      throw new Error(`Unexpected configuration key: ${key}`);
    }),
  };

  return {
    configService,
    subject: new RefreshTokenService(configService as unknown as ConfigService),
  };
}

describe('RefreshTokenService', () => {
  it('generates a unique 256-bit opaque token encoded as base64url', async () => {
    const { subject } = createSubject();

    const firstToken = await subject.generate();
    const secondToken = await subject.generate();

    expect(firstToken).not.toBe(secondToken);
    expect(firstToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(firstToken, 'base64url')).toHaveLength(32);
  });

  it('hashes a token deterministically with SHA-256 without returning the raw token', async () => {
    const { subject } = createSubject();
    const rawToken = 'raw-refresh-token';
    const expectedHash = createHash('sha256').update(rawToken).digest('hex');

    const firstHash = await subject.hash(rawToken);
    const secondHash = await subject.hash(rawToken);

    expect(firstHash).toBe(expectedHash);
    expect(secondHash).toBe(expectedHash);
    expect(firstHash).not.toBe(rawToken);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates a unique family ID for each new session', async () => {
    const { subject } = createSubject();

    const firstFamilyId = await subject.generateFamilyId();
    const secondFamilyId = await subject.generateFamilyId();

    expect(firstFamilyId).toBeTruthy();
    expect(secondFamilyId).toBeTruthy();
    expect(firstFamilyId).not.toBe(secondFamilyId);
  });

  it('calculates expiration from the configured refresh-token lifetime', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-10-13T12:00:00.000Z');
    vi.setSystemTime(now);
    const { configService, subject } = createSubject();

    try {
      const expiresAt = await subject.getExpirationDate();

      expect(expiresAt).toEqual(
        new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      );
      expect(configService.getOrThrow).toHaveBeenCalledWith('jwt.refreshTokenTtlDays');
    } finally {
      vi.useRealTimers();
    }
  });
});
