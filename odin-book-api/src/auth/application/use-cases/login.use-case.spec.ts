import type { PasswordHasherPort } from '@shared/password-hasher/password-hasher.port.js';
import type { AccessTokenPort } from '../ports/access-token.port.js';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';
import { InvalidCredentialsError } from '@auth/domain/errors/invalid-credentials.error.js';
import { LoginUseCase } from './login.use-case.js';
import { RefreshTokenServicePort } from '../ports/refresh-token-service.port.js';
import type { RefreshTokenRepositoryPort } from '../ports/refresh-token-repository.port.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';

class InMemoryUserRepository implements UserRepositoryPort {
  private readonly users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async create(data: CreateUserData): Promise<User> {
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

  async seed(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }
}

describe('LoginUseCase', () => {
  it('rejects an unknown email without attempting password verification', async () => {
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = {
      hash: vi.fn<PasswordHasherPort['hash']>(),
      verify: vi.fn<PasswordHasherPort['verify']>(),
    };
    const accessTokenPort = {
      generate: vi.fn<AccessTokenPort['generate']>(),
      verify: vi.fn<AccessTokenPort['verify']>(),
    };
    const refreshTokenPort = {
      generate: vi.fn<RefreshTokenServicePort['generate']>(),
      hash: vi.fn<RefreshTokenServicePort['hash']>(),
      generateFamilyId: vi.fn<RefreshTokenServicePort['generateFamilyId']>(),
      getExpirationDate: vi.fn<RefreshTokenServicePort['getExpirationDate']>(),
    };
    const refreshTokenRepositoryPort = {
      create: vi.fn<RefreshTokenRepositoryPort['create']>(),
      findByTokenHash: vi.fn<RefreshTokenRepositoryPort['findByTokenHash']>(),
      rotate: vi.fn<RefreshTokenRepositoryPort['rotate']>(),
      revokeFamily: vi.fn<RefreshTokenRepositoryPort['revokeFamily']>(),
    };

    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      accessTokenPort,
      refreshTokenPort,
      refreshTokenRepositoryPort,
    );

    accessTokenPort.generate.mockResolvedValue('test-access-token');

    refreshTokenPort.generate.mockResolvedValue('raw-refresh-token');

    await expect(
      useCase.execute('missing@example.com', 'submitted-password'),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(refreshTokenPort.generate).not.toHaveBeenCalled();
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(refreshTokenPort.hash).not.toHaveBeenCalled();
    expect(refreshTokenRepositoryPort.create).not.toHaveBeenCalled();
  });
});

describe('LoginUseCase', () => {
  it('rejects a known email with an incorrect password', async () => {
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = {
      hash: vi.fn<PasswordHasherPort['hash']>(),
      verify: vi.fn<PasswordHasherPort['verify']>(),
    };
    const accessTokenPort = {
      generate: vi.fn<AccessTokenPort['generate']>(),
      verify: vi.fn<AccessTokenPort['verify']>(),
    };
    const refreshTokenPort = {
      generate: vi.fn<RefreshTokenServicePort['generate']>(),
      hash: vi.fn<RefreshTokenServicePort['hash']>(),
      generateFamilyId: vi.fn<RefreshTokenServicePort['generateFamilyId']>(),
      getExpirationDate: vi.fn<RefreshTokenServicePort['getExpirationDate']>(),
    };
    const refreshTokenRepositoryPort = {
      create: vi.fn<RefreshTokenRepositoryPort['create']>(),
      findByTokenHash: vi.fn<RefreshTokenRepositoryPort['findByTokenHash']>(),
      rotate: vi.fn<RefreshTokenRepositoryPort['rotate']>(),
      revokeFamily: vi.fn<RefreshTokenRepositoryPort['revokeFamily']>(),
    };

    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      accessTokenPort,
      refreshTokenPort,
      refreshTokenRepositoryPort,
    );

    accessTokenPort.generate.mockResolvedValue('test-access-token');

    refreshTokenPort.generate.mockResolvedValue('raw-refresh-token');

    // Create a user with a known email and password hash
    const email = 'test@example.com';
    const passwordHash = 'correct-hash';
    const now = new Date();
    await userRepository.create({
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    // Mock the password hasher to return false for the incorrect password
    passwordHasher.verify.mockResolvedValue(false);

    await expect(useCase.execute(email, 'incorrect-password')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(refreshTokenPort.generate).not.toHaveBeenCalled();
    expect(passwordHasher.verify).toHaveBeenCalledWith('incorrect-password', passwordHash);
    expect(refreshTokenPort.hash).not.toHaveBeenCalled();
    expect(refreshTokenRepositoryPort.create).not.toHaveBeenCalled();
  });
});

describe('LoginUseCase', () => {
  it('rejects a user without a local password hash without attempting verification', async () => {
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = {
      hash: vi.fn<PasswordHasherPort['hash']>(),
      verify: vi.fn<PasswordHasherPort['verify']>(),
    };
    const accessTokenPort = {
      generate: vi.fn<AccessTokenPort['generate']>(),
      verify: vi.fn<AccessTokenPort['verify']>(),
    };
    const refreshTokenPort = {
      generate: vi.fn<RefreshTokenServicePort['generate']>(),
      hash: vi.fn<RefreshTokenServicePort['hash']>(),
      generateFamilyId: vi.fn<RefreshTokenServicePort['generateFamilyId']>(),
      getExpirationDate: vi.fn<RefreshTokenServicePort['getExpirationDate']>(),
    };
    const refreshTokenRepositoryPort = {
      create: vi.fn<RefreshTokenRepositoryPort['create']>(),
      findByTokenHash: vi.fn<RefreshTokenRepositoryPort['findByTokenHash']>(),
      rotate: vi.fn<RefreshTokenRepositoryPort['rotate']>(),
      revokeFamily: vi.fn<RefreshTokenRepositoryPort['revokeFamily']>(),
    };

    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      accessTokenPort,
      refreshTokenPort,
      refreshTokenRepositoryPort,
    );

    accessTokenPort.generate.mockResolvedValue('test-access-token');

    refreshTokenPort.generate.mockResolvedValue('raw-refresh-token');

    const email = 'test@example.com';
    const now = new Date();
    await userRepository.seed(new User('google-user-id', email, null, now, now));

    await expect(useCase.execute(email, 'incorrect-password')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(refreshTokenPort.generate).not.toHaveBeenCalled();
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(refreshTokenPort.hash).not.toHaveBeenCalled();
    expect(refreshTokenRepositoryPort.create).not.toHaveBeenCalled();
  });
});

describe('LoginUseCase', () => {
  it('accepts a known email with the correct password', async () => {
    const userRepository = new InMemoryUserRepository();
    const passwordHasher = {
      hash: vi.fn<PasswordHasherPort['hash']>(),
      verify: vi.fn<PasswordHasherPort['verify']>(),
    };
    const accessTokenPort = {
      generate: vi.fn<AccessTokenPort['generate']>(),
      verify: vi.fn<AccessTokenPort['verify']>(),
    };
    const refreshTokenPort = {
      generate: vi.fn<RefreshTokenServicePort['generate']>(),
      hash: vi.fn<RefreshTokenServicePort['hash']>(),
      generateFamilyId: vi.fn<RefreshTokenServicePort['generateFamilyId']>(),
      getExpirationDate: vi.fn<RefreshTokenServicePort['getExpirationDate']>(),
    };

    const refreshTokenRepositoryPort = {
      create: vi.fn<RefreshTokenRepositoryPort['create']>(),
      findByTokenHash: vi.fn<RefreshTokenRepositoryPort['findByTokenHash']>(),
      rotate: vi.fn<RefreshTokenRepositoryPort['rotate']>(),
      revokeFamily: vi.fn<RefreshTokenRepositoryPort['revokeFamily']>(),
    };

    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      accessTokenPort,
      refreshTokenPort,
      refreshTokenRepositoryPort,
    );

    accessTokenPort.generate.mockResolvedValue('test-access-token');

    refreshTokenPort.generate.mockResolvedValue('raw-refresh-token');

    refreshTokenPort.hash.mockResolvedValue('hashed-refresh-token');

    refreshTokenPort.generateFamilyId.mockResolvedValue('test-family-id');

    const expiresAt = new Date('2026-11-12T00:00:00Z');
    refreshTokenPort.getExpirationDate.mockResolvedValue(expiresAt);

    // Create a user with a known email and password hash
    const email = 'test@example.com';
    const passwordHash = 'correct-hash';
    const now = new Date();
    const user = await userRepository.create({
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    refreshTokenRepositoryPort.create.mockResolvedValue(
      new RefreshToken(
        'refresh-token-id',
        user.id,
        'hashed-refresh-token',
        'test-family-id',
        expiresAt,
        now,
        null,
        null,
      ),
    );

    // Mock the password hasher to return true for the correct password
    passwordHasher.verify.mockResolvedValue(true);

    const editedUser = {
      id: user.id,
      email: user.email,
    };

    await expect(useCase.execute(email, 'correct-password')).resolves.toEqual({
      user: editedUser,
      accessToken: 'test-access-token',
      refreshToken: 'raw-refresh-token',
    });

    expect(accessTokenPort.generate).toHaveBeenCalledWith(user.id);
    expect(refreshTokenPort.generate).toHaveBeenCalledOnce();
    expect(refreshTokenPort.hash).toHaveBeenCalledWith('raw-refresh-token');

    expect(refreshTokenPort.generateFamilyId).toHaveBeenCalledOnce();
    expect(refreshTokenPort.getExpirationDate).toHaveBeenCalledOnce();
    expect(refreshTokenRepositoryPort.create).toHaveBeenCalledWith({
      userId: user.id,
      tokenHash: 'hashed-refresh-token',
      familyId: 'test-family-id',
      expiresAt,
    });

    expect(passwordHasher.verify).toHaveBeenCalledWith('correct-password', passwordHash);
  });
});
