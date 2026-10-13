import { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import type { CreateUserData } from '@users/application/ports/user-repository.port.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { PrismaUserRepository } from './prisma-user.repository.js';

describe('PrismaUserRepository', () => {
  const createInput: CreateUserData = {
    email: 'person@example.com',
    passwordHash: 'hashed-password',
    createdAt: new Date('2026-10-13T00:00:00.000Z'),
    updatedAt: new Date('2026-10-13T00:00:00.000Z'),
  };

  const persistedUser = {
    id: 'generated-cuid',
    ...createInput,
  };

  function createRepository() {
    const create = vi.fn();
    const prisma = {
      user: {
        create,
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    return {
      create,
      repository: new PrismaUserRepository(prisma),
    };
  }

  it('lets Prisma generate the user ID and maps the persisted row to the domain', async () => {
    const { create, repository } = createRepository();
    create.mockResolvedValue(persistedUser);

    const user = await repository.create(createInput);

    expect(create).toHaveBeenCalledWith({
      data: {
        email: createInput.email,
        passwordHash: createInput.passwordHash,
        createdAt: createInput.createdAt,
        updatedAt: createInput.updatedAt,
      },
    });
    expect(user.id).toBe('generated-cuid');
    expect(user.email).toBe(createInput.email);
    expect(user.getPasswordHash()).toBe(createInput.passwordHash);
  });

  it('maps an email uniqueness race from Prisma P2002 to EmailAlreadyRegisteredError', async () => {
    const { create, repository } = createRepository();
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on email', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['email'] },
      }),
    );

    await expect(repository.create(createInput)).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );
  });

  it('does not translate unrelated Prisma errors', async () => {
    const { create, repository } = createRepository();
    const databaseError = new Error('Database unavailable');
    create.mockRejectedValue(databaseError);

    await expect(repository.create(createInput)).rejects.toBe(databaseError);
  });
});
