import { Inject } from '@nestjs/common';
import { REFRESH_TOKEN_SERVICE } from '../ports/refresh-token-service.port.js';
import type { RefreshTokenServicePort } from '../ports/refresh-token-service.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../ports/refresh-token-repository.port.js';

export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenServicePort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}
  async execute(rawRefreshToken: string): Promise<void> {
    const now = new Date();
    const hashedToken = await this.refreshTokenService.hash(rawRefreshToken);

    const refreshToken = await this.refreshTokenRepository.findByTokenHash(hashedToken);

    if (!refreshToken) {
      return;
    }

    await this.refreshTokenRepository.revokeFamily(refreshToken.familyId, now);
  }
}
