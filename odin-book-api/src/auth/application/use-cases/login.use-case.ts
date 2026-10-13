import { Inject } from '@nestjs/common';
import { PasswordHasherService } from '@shared/password-hasher/password-hasher.service.js';
import type { PasswordHasherPort } from '@shared/password-hasher/password-hasher.port.js';
import * as userRepositoryPort from '@users/application/ports/user-repository.port.js';
import { InvalidCredentialsError } from '@auth/domain/errors/invalid-credentials.error.js';
import { ACCESS_TOKEN } from '../ports/access-token.port.js';
import type { AccessTokenPort } from '../ports/access-token.port.js';
import { REFRESH_TOKEN_SERVICE } from '../ports/refresh-token-service.port.js';

import type { RefreshTokenServicePort } from '../ports/refresh-token-service.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../ports/refresh-token-repository.port.js';
import { AuthenticationResult } from '../types/authentication-result.js';

export class LoginUseCase {
  constructor(
    @Inject(userRepositoryPort.USER_REPOSITORY)
    private readonly userRepository: userRepositoryPort.UserRepositoryPort,
    @Inject(PasswordHasherService)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(ACCESS_TOKEN)
    private readonly accessTokenPort: AccessTokenPort,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenServicePort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}
  async execute(email: string, password: string): Promise<AuthenticationResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    const passwordHash = user.getPasswordHash();
    if (!passwordHash) {
      throw new InvalidCredentialsError();
    }
    const isPasswordValid = await this.passwordHasher.verify(password, passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.accessTokenPort.generate(user.id);

    const refreshToken = await this.refreshTokenService.generate();

    const hashedRefreshToken = await this.refreshTokenService.hash(refreshToken);

    const familyId = await this.refreshTokenService.generateFamilyId();
    const expiresAt = await this.refreshTokenService.getExpirationDate();

    await this.refreshTokenRepository.create({
      tokenHash: hashedRefreshToken,
      userId: user.id,
      familyId,
      expiresAt,
    });

    return { user: { id: user.id, email: user.email }, accessToken, refreshToken };
  }
}
