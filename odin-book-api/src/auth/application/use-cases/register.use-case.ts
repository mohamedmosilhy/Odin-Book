import { Inject } from '@nestjs/common';
import { PasswordHasherService } from '@shared/password-hasher/password-hasher.service.js';
import type { PasswordHasherPort } from '@shared/password-hasher/password-hasher.port.js';
import * as userRepositoryPort from '@users/application/ports/user-repository.port.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { AuthenticationResult } from '../types/authentication-result.js';
import { ACCESS_TOKEN, type AccessTokenPort } from '../ports/access-token.port.js';
import {
  REFRESH_TOKEN_SERVICE,
  type RefreshTokenServicePort,
} from '../ports/refresh-token-service.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../ports/refresh-token-repository.port.js';

export class RegisterUseCase {
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
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new EmailAlreadyRegisteredError();
    }

    const now = new Date();
    
    const passwordHash = await this.passwordHasher.hash(password);

    const newUser = await this.userRepository.create({
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const accessToken = await this.accessTokenPort.generate(newUser.id);
    const refreshToken = await this.refreshTokenService.generate();
    const hashedRefreshToken = await this.refreshTokenService.hash(refreshToken);
    const familyId = await this.refreshTokenService.generateFamilyId();
    const expiresAt = await this.refreshTokenService.getExpirationDate();

    await this.refreshTokenRepository.create({
      tokenHash: hashedRefreshToken,
      userId: newUser.id,
      familyId,
      expiresAt,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }
}
