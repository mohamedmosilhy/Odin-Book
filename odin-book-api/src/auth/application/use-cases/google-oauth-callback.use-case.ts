import { Inject } from '@nestjs/common';
import * as userRepositoryPort from '@users/application/ports/user-repository.port.js';
import { ACCESS_TOKEN } from '../ports/access-token.port.js';
import type { AccessTokenPort } from '../ports/access-token.port.js';
import { REFRESH_TOKEN_SERVICE } from '../ports/refresh-token-service.port.js';

import type { RefreshTokenServicePort } from '../ports/refresh-token-service.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../ports/refresh-token-repository.port.js';
import { AuthenticationResult } from '../types/authentication-result.js';
import {
  EXTERNAL_IDENTITY_PORT,
  type ExternalIdentityPort,
} from '@users/application/ports/external-identity.port.js';
import {
  ACCOUNT_PROVISIONING_PORT,
  type AccountProvisioningPort,
} from '@users/application/ports/account-provisioning.port.js';
import { GoogleProfile } from '../types/google-profile.js';
import { UsernameAlreadyTakenError } from '@users/domain/errors/username-already-taken.error.js';

export class GoogleOAuthCallbackUseCase {
  constructor(
    @Inject(userRepositoryPort.USER_REPOSITORY)
    private readonly userRepository: userRepositoryPort.UserRepositoryPort,
    @Inject(EXTERNAL_IDENTITY_PORT)
    private readonly externalIdentityPort: ExternalIdentityPort,
    @Inject(ACCOUNT_PROVISIONING_PORT)
    private readonly accountProvisioning: AccountProvisioningPort,
    @Inject(ACCESS_TOKEN)
    private readonly accessTokenPort: AccessTokenPort,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenServicePort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  async execute(googleProfile: GoogleProfile): Promise<AuthenticationResult> {
    let user;

    const externalIdentity = await this.externalIdentityPort.findByProviderUserId(
      googleProfile.provider,
      googleProfile.providerUserId,
    );

    const emailPrefix = googleProfile.email.split('@')[0].toLowerCase();

    const baseUsername = emailPrefix.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'user';

    const displayName = googleProfile.displayName.trim() || baseUsername;

    if (externalIdentity) {
      user = await this.userRepository.findById(externalIdentity.userId);

      if (!user) {
        throw new Error('External identity references a nonexistent user.');
      }
    } else {
      user = await this.userRepository.findByEmail(googleProfile.email);

      if (user) {
        await this.externalIdentityPort.create(
          user.id,
          googleProfile.provider,
          googleProfile.providerUserId,
        );
      } else {
        try {
          user = await this.accountProvisioning.createAccount({
            email: googleProfile.email,
            username: baseUsername,
            displayName: displayName,
            provider: googleProfile.provider,
            providerUserId: googleProfile.providerUserId,
            profilePicture: googleProfile.picture,
          });
        } catch (error: unknown) {
          if (!(error instanceof UsernameAlreadyTakenError)) {
            throw error;
          }

          const uniqueUsername = `${baseUsername}-${crypto.randomUUID().slice(0, 8)}`;

          user = await this.accountProvisioning.createAccount({
            email: googleProfile.email,
            username: uniqueUsername,
            displayName,
            provider: googleProfile.provider,
            providerUserId: googleProfile.providerUserId,
            profilePicture: googleProfile.picture,
          });
        }
      }
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
