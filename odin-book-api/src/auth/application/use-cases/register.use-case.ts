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
import {
  ACCOUNT_PROVISIONING_PORT,
  type AccountProvisioningPort,
} from '@users/application/ports/account-provisioning.port.js';
import { UsernameAlreadyTakenError } from '@users/domain/errors/username-already-taken.error.js';

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

    @Inject(ACCOUNT_PROVISIONING_PORT)
    private readonly accountProvisioningPort: AccountProvisioningPort,
  ) {}

  async execute(email: string, password: string): Promise<AuthenticationResult> {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await this.passwordHasher.hash(password);

    const emailPrefix = email.split('@')[0].toLowerCase();

    const baseUsername = emailPrefix.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'user';

    let newUser;

    try {
      newUser = await this.accountProvisioningPort.createAccount({
        email,
        passwordHash,
        username: baseUsername,
        displayName: baseUsername,
        profilePicture: null,
      });
    } catch (error: unknown) {
      if (!(error instanceof UsernameAlreadyTakenError)) {
        throw error;
      }

      const uniqueUsername = `${baseUsername}-${crypto.randomUUID().slice(0, 8)}`;

      newUser = await this.accountProvisioningPort.createAccount({
        email,
        passwordHash,
        username: uniqueUsername,
        displayName: baseUsername,
        profilePicture: null,
      });
    }

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
