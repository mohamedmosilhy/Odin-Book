import type {
  CreateRefreshTokenData,
  RefreshTokenRepositoryPort,
  RotateRefreshTokenData,
} from '@auth/application/ports/refresh-token-repository.port.js';
import { REFRESH_TOKEN_REPOSITORY } from '@auth/application/ports/refresh-token-repository.port.js';
import { AuthModule } from '@auth/auth.module.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import { jwtConfig } from '../src/config/jwt.config.js';
import { passwordHashingConfig } from '../src/config/password-hashing.config.js';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from '@shared/filters/global-exception.filter.js';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import type { PasswordHasherPort } from '@shared/password-hasher/password-hasher.port.js';
import { PasswordHasherService } from '@shared/password-hasher/password-hasher.service.js';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '@users/application/ports/user-repository.port.js';
import { USER_REPOSITORY } from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';
import cookieParser from 'cookie-parser';
import request from 'supertest';

class InMemoryUserRepository implements UserRepositoryPort {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = new User(
      `user-${this.users.length + 1}`,
      data.email,
      data.passwordHash,
      data.createdAt,
      data.updatedAt,
    );
    this.users.push(user);
    return user;
  }

  reset(): void {
    this.users = [];
  }
}

class InMemoryRefreshTokenRepository implements RefreshTokenRepositoryPort {
  private tokens: RefreshToken[] = [];

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const token = new RefreshToken(
      `refresh-${this.tokens.length + 1}`,
      data.userId,
      data.tokenHash,
      data.familyId,
      data.expiresAt,
      new Date(),
      null,
      null,
    );
    this.tokens.push(token);
    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async rotate(data: RotateRefreshTokenData): Promise<RefreshToken> {
    const currentIndex = this.tokens.findIndex(
      (token) => token.tokenHash === data.currentTokenHash,
    );
    if (currentIndex === -1) throw new Error('Refresh token not found.');

    const current = this.tokens[currentIndex];
    this.tokens[currentIndex] = new RefreshToken(
      current.id,
      current.userId,
      current.tokenHash,
      current.familyId,
      current.expiresAt,
      current.createdAt,
      data.rotatedAt,
      data.replacementTokenHash,
    );

    const replacement = new RefreshToken(
      `refresh-${this.tokens.length + 1}`,
      current.userId,
      data.replacementTokenHash,
      current.familyId,
      data.replacementExpiresAt,
      data.rotatedAt,
      null,
      null,
    );
    this.tokens.push(replacement);
    return replacement;
  }

  async revokeFamily(familyId: string, revokedAt: Date): Promise<void> {
    this.tokens = this.tokens.map((token) =>
      token.familyId === familyId && token.revokedAt === null
        ? new RefreshToken(
            token.id,
            token.userId,
            token.tokenHash,
            token.familyId,
            token.expiresAt,
            token.createdAt,
            revokedAt,
            token.replacedByTokenHash,
          )
        : token,
    );
  }

  reset(): void {
    this.tokens = [];
  }
}

describe('Auth HTTP flow (e2e)', () => {
  let app: INestApplication;
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const passwordHasher: PasswordHasherPort = {
    hash: vi.fn(async (password) => `hashed:${password}`),
    verify: vi.fn(async (password, hash) => hash === `hashed:${password}`),
  };

  function getCookie(response: request.Response, name = 'refresh_token'): string {
    const header = response.headers['set-cookie'] as unknown;
    const cookies = Array.isArray(header) ? header : typeof header === 'string' ? [header] : [];
    const cookie = cookies.find((value) => value.startsWith(`${name}=`));
    if (!cookie) throw new Error(`Expected ${name} Set-Cookie header.`);
    return cookie.split(';')[0];
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-secret-with-at-least-thirty-two-characters';
    process.env.JWT_ACCESS_TOKEN_TTL = '15m';
    process.env.JWT_REFRESH_TOKEN_TTL_DAYS = '30';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [jwtConfig, passwordHashingConfig],
        }),
        AuthModule,
      ],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(users)
      .overrideProvider(REFRESH_TOKEN_REPOSITORY)
      .useValue(refreshTokens)
      .overrideProvider(PasswordHasherService)
      .useValue(passwordHasher)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  beforeEach(() => {
    users.reset();
    refreshTokens.reset();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, authorizes a protected request, rotates, and detects replay', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'person@example.com', password: 'password1' })
      .expect(201);

    expect(registration.body).toMatchObject({
      accessToken: expect.any(String),
      user: { id: 'user-1', email: 'person@example.com' },
    });
    expect(registration.body).not.toHaveProperty('refreshToken');
    const firstCookie = getCookie(registration);

    await request(app.getHttpServer())
      .get('/api/v1/auth/protected')
      .expect(401)
      .expect({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required.',
          details: null,
        },
      });

    await request(app.getHttpServer())
      .get('/api/v1/auth/protected')
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200)
      .expect({ userId: 'user-1' });

    const rotation = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(200);
    const replacementCookie = getCookie(rotation);
    expect(rotation.body).toEqual({ accessToken: expect.any(String) });
    expect(replacementCookie).not.toBe(firstCookie);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(401)
      .expect({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Please login again.',
          details: null,
        },
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', replacementCookie)
      .expect(401);
  });

  it('returns uniform duplicate-email and validation errors', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'person@example.com', password: 'password1' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'person@example.com', password: 'password1' })
      .expect(409)
      .expect({
        error: {
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'An account with this email already exists.',
          details: null,
        },
      });

    const validation = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(validation.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details: expect.any(Array),
      },
    });
  });

  it('revokes the session on logout, clears the cookie, and remains idempotent', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'person@example.com', password: 'password1' })
      .expect(201);
    const cookie = getCookie(registration);

    const logout = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    expect(getCookie(logout)).toBe('refresh_token=');

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);

    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(204);
  });
});
