import { Inject } from '@nestjs/common';
import { ACCESS_TOKEN } from '../ports/access-token.port.js';
import type { AccessTokenPort } from '../ports/access-token.port.js';
import { REFRESH_TOKEN_SERVICE } from '../ports/refresh-token-service.port.js';

import type { RefreshTokenServicePort } from '../ports/refresh-token-service.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../ports/refresh-token-repository.port.js';

import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import { RefreshTokenRotationConflictError } from '@auth/domain/errors/refresh-token-rotation-conflict.error.js';

export class RefreshUseCase {
  constructor(
    @Inject(ACCESS_TOKEN)
    private readonly accessTokenPort: AccessTokenPort,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenServicePort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}
  async execute(rawRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const now = new Date();

    const hashedRefreshToken = await this.refreshTokenService.hash(rawRefreshToken);

    const tokenRow = await this.refreshTokenRepository.findByTokenHash(hashedRefreshToken);

    if (!tokenRow) {
      throw new InvalidRefreshTokenError();
    }

    if (tokenRow.revokedAt) {
      await this.refreshTokenRepository.revokeFamily(tokenRow.familyId, now);
      throw new InvalidRefreshTokenError();
    }

    if (tokenRow.expiresAt.getTime() <= now.getTime()) {
      throw new InvalidRefreshTokenError();
    }

    const newRefreshToken = await this.refreshTokenService.generate();
    const hashedNewRefreshToken = await this.refreshTokenService.hash(newRefreshToken);

    const expirationDate = await this.refreshTokenService.getExpirationDate();

    const accessToken = await this.accessTokenPort.generate(tokenRow.userId);

    try {
      await this.refreshTokenRepository.rotate({
        currentTokenHash: hashedRefreshToken,
        replacementTokenHash: hashedNewRefreshToken,
        rotatedAt: now,
        replacementExpiresAt: expirationDate,
      });
    } catch (error) {
      if (error instanceof RefreshTokenRotationConflictError) {
        await this.refreshTokenRepository.revokeFamily(tokenRow.familyId, now);
        throw new InvalidRefreshTokenError();
      }

      throw error;
    }
    return { accessToken, refreshToken: newRefreshToken };
  }
}
