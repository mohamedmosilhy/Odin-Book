import type { AccessTokenPort } from '@auth/application/ports/access-token.port.js';
import type { RefreshTokenRepositoryPort } from '@auth/application/ports/refresh-token-repository.port.js';
import type { RefreshTokenServicePort } from '@auth/application/ports/refresh-token-service.port.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import type { PasswordHasherPort } from '@shared/password-hasher/password-hasher.port.js';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { RegisterUseCase } from './register.use-case.js';

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
  const expiresAt = new Date('2026-11-12T00:00:00.000Z');

  let userRepository: InMemoryUserRepository;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository = new InMemoryUserRepository();
    useCase = new RegisterUseCase(
      userRepository,
      passwordHasher,
      accessTokenPort,
      refreshTokenService,
      refreshTokenRepository,
    );
    passwordHasher.hash.mockResolvedValue('hashed-password');
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

  it('creates the user and returns a new authenticated session', async () => {
    const result = await useCase.execute('person@example.com', 'plain-password');
    const savedUser = await userRepository.findById('test-user-1');

    expect(result).toEqual({
      accessToken: 'test-access-token',
      refreshToken: 'raw-refresh-token',
      user: {
        id: 'test-user-1',
        email: 'person@example.com',
      },
    });
    expect(savedUser).toBeInstanceOf(User);
    expect(savedUser?.getPasswordHash()).toBe('hashed-password');
    expect(passwordHasher.hash).toHaveBeenCalledWith('plain-password');
    expect(accessTokenPort.generate).toHaveBeenCalledWith('test-user-1');
    expect(refreshTokenService.hash).toHaveBeenCalledWith('raw-refresh-token');
    expect(refreshTokenRepository.create).toHaveBeenCalledWith({
      userId: 'test-user-1',
      tokenHash: 'hashed-refresh-token',
      familyId: 'test-family-id',
      expiresAt,
    });
    expect(userRepository.count()).toBe(1);
  });

  it('never sends the plaintext password to persistence', async () => {
    await useCase.execute('person@example.com', 'plain-password');

    expect(userRepository.createInputs).toHaveLength(1);
    const savedData = userRepository.createInputs[0];

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
    expect(accessTokenPort.generate).not.toHaveBeenCalled();
    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    expect(userRepository.count()).toBe(1);
    expect(userRepository.createInputs).toHaveLength(1);
  });
});
