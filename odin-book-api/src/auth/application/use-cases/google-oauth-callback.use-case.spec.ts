import type { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import type { RefreshTokenRepositoryPort } from '@auth/application/ports/refresh-token-repository.port.js';
import type { RefreshTokenServicePort } from '@auth/application/ports/refresh-token-service.port.js';
import type { GoogleProfile } from '@auth/application/types/google-profile.js';
import type { AccountProvisioningPort } from '@users/application/ports/account-provisioning.port.js';
import type { ExternalIdentityPort } from '@users/application/ports/external-identity.port.js';
import type { UserRepositoryPort } from '@users/application/ports/user-repository.port.js';
import { ExternalIdentity } from '@users/domain/entities/external-identity.entity.js';
import { User } from '@users/domain/entities/user.entity.js';
import { UsernameAlreadyTakenError } from '@users/domain/errors/username-already-taken.error.js';
import { GoogleOAuthCallbackUseCase } from './google-oauth-callback.use-case.js';

describe('GoogleOAuthCallbackUseCase', () => {
  const googleProfile: GoogleProfile = {
    provider: 'GOOGLE',
    providerUserId: 'google-user-123',
    email: 'jane@example.com',
    emailVerified: true,
    displayName: 'Jane Doe',
    picture: 'https://images.example.com/jane.jpg',
  };

  const user = new User(
    'user-id',
    'jane@example.com',
    null,
    new Date('2026-10-15T00:00:00.000Z'),
    new Date('2026-10-15T00:00:00.000Z'),
  );

  function createUseCase() {
    const userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
    };
    const externalIdentityPort = {
      findByProviderUserId: vi.fn(),
      create: vi.fn(),
    };
    const accountProvisioning = {
      createAccount: vi.fn(),
    };
    const accessTokenPort = {
      generate: vi.fn().mockResolvedValue('odin-access-token'),
      verify: vi.fn(),
    };
    const refreshTokenService = {
      generate: vi.fn().mockResolvedValue('raw-refresh-token'),
      hash: vi.fn().mockResolvedValue('hashed-refresh-token'),
      generateFamilyId: vi.fn().mockResolvedValue('refresh-family-id'),
      getExpirationDate: vi.fn().mockResolvedValue(new Date('2026-11-14T00:00:00.000Z')),
    };
    const refreshTokenRepository = {
      create: vi.fn().mockResolvedValue({}),
      findByTokenHash: vi.fn(),
      rotate: vi.fn(),
      revokeFamily: vi.fn(),
    };
    const useCase = new GoogleOAuthCallbackUseCase(
      userRepository as unknown as UserRepositoryPort,
      externalIdentityPort as unknown as ExternalIdentityPort,
      accountProvisioning as unknown as AccountProvisioningPort,
      accessTokenPort as unknown as AccessTokenPort,
      refreshTokenService as unknown as RefreshTokenServicePort,
      refreshTokenRepository as unknown as RefreshTokenRepositoryPort,
    );

    return {
      accessTokenPort,
      accountProvisioning,
      externalIdentityPort,
      refreshTokenRepository,
      refreshTokenService,
      useCase,
      userRepository,
    };
  }

  function expectTokensIssued(
    dependencies: ReturnType<typeof createUseCase>,
    result: Awaited<ReturnType<GoogleOAuthCallbackUseCase['execute']>>,
  ) {
    expect(dependencies.accessTokenPort.generate).toHaveBeenCalledOnce();
    expect(dependencies.accessTokenPort.generate).toHaveBeenCalledWith(user.id);
    expect(dependencies.refreshTokenService.generate).toHaveBeenCalledOnce();
    expect(dependencies.refreshTokenService.hash).toHaveBeenCalledWith('raw-refresh-token');
    expect(dependencies.refreshTokenRepository.create).toHaveBeenCalledWith({
      tokenHash: 'hashed-refresh-token',
      userId: user.id,
      familyId: 'refresh-family-id',
      expiresAt: new Date('2026-11-14T00:00:00.000Z'),
    });
    expect(result).toEqual({
      user: { id: user.id, email: user.email },
      accessToken: 'odin-access-token',
      refreshToken: 'raw-refresh-token',
    });
  }

  it('logs in through an existing external identity without considering the returned email', async () => {
    const dependencies = createUseCase();
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(
      new ExternalIdentity(
        'identity-id',
        user.id,
        'GOOGLE',
        googleProfile.providerUserId,
        new Date('2026-10-15T00:00:00.000Z'),
      ),
    );
    dependencies.userRepository.findById.mockResolvedValue(user);

    const result = await dependencies.useCase.execute({
      ...googleProfile,
      email: 'changed-at-google@example.com',
    });

    expect(dependencies.userRepository.findById).toHaveBeenCalledWith(user.id);
    expect(dependencies.userRepository.findByEmail).not.toHaveBeenCalled();
    expect(dependencies.externalIdentityPort.create).not.toHaveBeenCalled();
    expect(dependencies.accountProvisioning.createAccount).not.toHaveBeenCalled();
    expectTokensIssued(dependencies, result);
  });

  it('links Google to an existing local user without creating another account or profile', async () => {
    const dependencies = createUseCase();
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(null);
    dependencies.userRepository.findByEmail.mockResolvedValue(user);
    dependencies.externalIdentityPort.create.mockResolvedValue({});

    const result = await dependencies.useCase.execute(googleProfile);

    expect(dependencies.userRepository.findByEmail).toHaveBeenCalledWith(googleProfile.email);
    expect(dependencies.externalIdentityPort.create).toHaveBeenCalledWith(
      user.id,
      'GOOGLE',
      googleProfile.providerUserId,
    );
    expect(dependencies.accountProvisioning.createAccount).not.toHaveBeenCalled();
    expectTokensIssued(dependencies, result);
  });

  it('provisions a new account with a normalized username and display-name fallback', async () => {
    const dependencies = createUseCase();
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(null);
    dependencies.userRepository.findByEmail.mockResolvedValue(null);
    dependencies.accountProvisioning.createAccount.mockResolvedValue(user);

    const result = await dependencies.useCase.execute({
      ...googleProfile,
      email: 'Jane.Doe+work@example.com',
      displayName: '   ',
    });

    expect(dependencies.accountProvisioning.createAccount).toHaveBeenCalledWith({
      email: 'Jane.Doe+work@example.com',
      username: 'jane_doe_work',
      displayName: 'jane_doe_work',
      provider: 'GOOGLE',
      providerUserId: googleProfile.providerUserId,
      profilePicture: googleProfile.picture,
    });
    expectTokensIssued(dependencies, result);
  });

  it('retries provisioning with a generated suffix after a username collision', async () => {
    const dependencies = createUseCase();
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(null);
    dependencies.userRepository.findByEmail.mockResolvedValue(null);
    dependencies.accountProvisioning.createAccount
      .mockRejectedValueOnce(new UsernameAlreadyTakenError())
      .mockResolvedValueOnce(user);

    await dependencies.useCase.execute(googleProfile);

    expect(dependencies.accountProvisioning.createAccount).toHaveBeenCalledTimes(2);
    expect(dependencies.accountProvisioning.createAccount.mock.calls[0]?.[0].username).toBe('jane');
    expect(dependencies.accountProvisioning.createAccount.mock.calls[1]?.[0].username).toMatch(
      /^jane[_-][a-z0-9]+$/,
    );
  });

  it('stops after the bounded retry also collides', async () => {
    const dependencies = createUseCase();
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(null);
    dependencies.userRepository.findByEmail.mockResolvedValue(null);
    dependencies.accountProvisioning.createAccount.mockRejectedValue(
      new UsernameAlreadyTakenError(),
    );

    await expect(dependencies.useCase.execute(googleProfile)).rejects.toBeInstanceOf(
      UsernameAlreadyTakenError,
    );
    expect(dependencies.accountProvisioning.createAccount).toHaveBeenCalledTimes(2);
    expect(dependencies.accessTokenPort.generate).not.toHaveBeenCalled();
  });

  it('does not hide non-username provisioning failures', async () => {
    const dependencies = createUseCase();
    const databaseFailure = new Error('database unavailable');
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(null);
    dependencies.userRepository.findByEmail.mockResolvedValue(null);
    dependencies.accountProvisioning.createAccount.mockRejectedValue(databaseFailure);

    await expect(dependencies.useCase.execute(googleProfile)).rejects.toBe(databaseFailure);
    expect(dependencies.accountProvisioning.createAccount).toHaveBeenCalledOnce();
    expect(dependencies.accessTokenPort.generate).not.toHaveBeenCalled();
  });

  it('fails closed when an external identity references a missing user', async () => {
    const dependencies = createUseCase();
    dependencies.externalIdentityPort.findByProviderUserId.mockResolvedValue(
      new ExternalIdentity(
        'identity-id',
        'missing-user-id',
        'GOOGLE',
        googleProfile.providerUserId,
        new Date('2026-10-15T00:00:00.000Z'),
      ),
    );
    dependencies.userRepository.findById.mockResolvedValue(null);

    await expect(dependencies.useCase.execute(googleProfile)).rejects.toThrow(
      'External identity references a nonexistent user.',
    );
    expect(dependencies.userRepository.findByEmail).not.toHaveBeenCalled();
    expect(dependencies.accessTokenPort.generate).not.toHaveBeenCalled();
  });
});
