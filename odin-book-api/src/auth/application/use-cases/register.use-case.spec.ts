import type { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import type { RefreshTokenRepositoryPort } from '@auth/application/ports/refresh-token-repository.port.js';
import type { RefreshTokenServicePort } from '@auth/application/ports/refresh-token-service.port.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import { Test } from '@nestjs/testing';
import type { PasswordHasherPort } from '@shared/password-hasher/password-hasher.port.js';
import { PasswordHasherService } from '@shared/password-hasher/password-hasher.service.js';
import {
  ACCOUNT_PROVISIONING_PORT,
  type AccountProvisioningPort,
} from '@users/application/ports/account-provisioning.port.js';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '@users/application/ports/user-repository.port.js';
import { USER_REPOSITORY } from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { UsernameAlreadyTakenError } from '@users/domain/errors/username-already-taken.error.js';
import { RegisterUseCase } from './register.use-case.js';
import { ACCESS_TOKEN } from '../ports/access-token.port.js';
import { REFRESH_TOKEN_REPOSITORY } from '../ports/refresh-token-repository.port.js';
import { REFRESH_TOKEN_SERVICE } from '../ports/refresh-token-service.port.js';

class InMemoryUserRepository implements UserRepositoryPort {
  private readonly users: User[] = [];
  readonly createInputs: CreateUserData[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async create(data: CreateUserData): Promise<User> {
    this.createInputs.push(data);

    const user = new User(
      `test-user-${this.users.length + 1}`,
      data.email,
      data.passwordHash,
      data.createdAt,
      data.updatedAt,
    );

    this.users.push(user);
    return user;
  }

  count(): number {
    return this.users.length;
  }
}

describe('RegisterUseCase', () => {
  const passwordHasher = {
    hash: vi.fn<PasswordHasherPort['hash']>(),
    verify: vi.fn<PasswordHasherPort['verify']>(),
  };
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
  const refreshTokenRepository = {
    create: vi.fn<RefreshTokenRepositoryPort['create']>(),
    findByTokenHash: vi.fn<RefreshTokenRepositoryPort['findByTokenHash']>(),
    rotate: vi.fn<RefreshTokenRepositoryPort['rotate']>(),
    revokeFamily: vi.fn<RefreshTokenRepositoryPort['revokeFamily']>(),
  };
  const accountProvisioning = {
    createAccount: vi.fn<AccountProvisioningPort['createAccount']>(),
  };
  const expiresAt = new Date('2026-11-12T00:00:00.000Z');
  const provisionedUser = new User(
    'test-user-1',
    'person@example.com',
    'hashed-password',
    new Date('2026-10-13T00:00:00.000Z'),
    new Date('2026-10-13T00:00:00.000Z'),
  );

  let userRepository: InMemoryUserRepository;
  let useCase: RegisterUseCase;

  beforeEach(async () => {
    vi.clearAllMocks();
    userRepository = new InMemoryUserRepository();
    const module = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: ACCOUNT_PROVISIONING_PORT, useValue: accountProvisioning },
        { provide: PasswordHasherService, useValue: passwordHasher },
        { provide: ACCESS_TOKEN, useValue: accessTokenPort },
        { provide: REFRESH_TOKEN_SERVICE, useValue: refreshTokenService },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: refreshTokenRepository },
      ],
    }).compile();
    useCase = module.get(RegisterUseCase);
    passwordHasher.hash.mockResolvedValue('hashed-password');
    accountProvisioning.createAccount.mockResolvedValue(provisionedUser);
    accessTokenPort.generate.mockResolvedValue('test-access-token');
    refreshTokenService.generate.mockResolvedValue('raw-refresh-token');
    refreshTokenService.hash.mockResolvedValue('hashed-refresh-token');
    refreshTokenService.generateFamilyId.mockResolvedValue('test-family-id');
    refreshTokenService.getExpirationDate.mockResolvedValue(expiresAt);
    refreshTokenRepository.create.mockImplementation(
      async (data) =>
        new RefreshToken(
          'refresh-token-id',
          data.userId,
          data.tokenHash,
          data.familyId,
          data.expiresAt,
          new Date('2026-10-13T00:00:00.000Z'),
          null,
          null,
        ),
    );
  });

  it('provisions the local user and profile before returning a new authenticated session', async () => {
    const result = await useCase.execute('person@example.com', 'plain-password');

    expect(result).toEqual({
      accessToken: 'test-access-token',
      refreshToken: 'raw-refresh-token',
      user: {
        id: 'test-user-1',
        email: 'person@example.com',
      },
    });
    expect(accountProvisioning.createAccount).toHaveBeenCalledWith({
      email: 'person@example.com',
      passwordHash: 'hashed-password',
      username: 'person',
      displayName: 'person',
      profilePicture: null,
    });
    expect(userRepository.createInputs).toHaveLength(0);
    expect(passwordHasher.hash).toHaveBeenCalledWith('plain-password');
    expect(accessTokenPort.generate).toHaveBeenCalledWith('test-user-1');
    expect(refreshTokenService.hash).toHaveBeenCalledWith('raw-refresh-token');
    expect(refreshTokenRepository.create).toHaveBeenCalledWith({
      userId: 'test-user-1',
      tokenHash: 'hashed-refresh-token',
      familyId: 'test-family-id',
      expiresAt,
    });
  });

  it('never sends the plaintext password to persistence', async () => {
    await useCase.execute('person@example.com', 'plain-password');

    expect(accountProvisioning.createAccount).toHaveBeenCalledOnce();
    const savedData = accountProvisioning.createAccount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;

    expect(savedData.passwordHash).toBe('hashed-password');
    expect(savedData).not.toHaveProperty('password');
    expect(Object.values(savedData)).not.toContain('plain-password');
  });

  it('rejects an email that is already registered without hashing or creating', async () => {
    await userRepository.create({
      email: 'person@example.com',
      passwordHash: 'stored-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(useCase.execute('person@example.com', 'plain-password')).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(accountProvisioning.createAccount).not.toHaveBeenCalled();
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    expect(userRepository.count()).toBe(1);
    expect(userRepository.createInputs).toHaveLength(1);
  });

  it('does not issue tokens when atomic account provisioning fails', async () => {
    accountProvisioning.createAccount.mockRejectedValue(new Error('Profile insert failed'));

    await expect(useCase.execute('person@example.com', 'plain-password')).rejects.toThrow(
      'Profile insert failed',
    );

    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('retries provisioning with a generated suffix after a username collision', async () => {
    accountProvisioning.createAccount
      .mockRejectedValueOnce(new UsernameAlreadyTakenError())
      .mockResolvedValueOnce(provisionedUser);

    await useCase.execute('person@example.com', 'plain-password');

    expect(accountProvisioning.createAccount).toHaveBeenCalledTimes(2);
    expect(accountProvisioning.createAccount.mock.calls[0][0]).toEqual(
      expect.objectContaining({ username: 'person' }),
    );
    expect(accountProvisioning.createAccount.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        username: expect.stringMatching(/^person-[0-9a-f]{8}$/),
        displayName: 'person',
      }),
    );
  });

  it('normalizes the email prefix consistently before using it as public identity', async () => {
    await useCase.execute('Jane.Doe+tag@example.com', 'plain-password');

    expect(accountProvisioning.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'jane_doe_tag',
        displayName: 'jane_doe_tag',
      }),
    );
  });
});
