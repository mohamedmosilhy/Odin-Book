import type { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { UsernameAlreadyTakenError } from '../../domain/errors/username-already-taken.error.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error.js';
import { PrismaAccountProvisioningRepository } from './prisma-account-provisioning.repository.js';

describe('PrismaAccountProvisioningRepository', () => {
  const input = {
    userId: 'caller-supplied-id-must-not-be-used',
    email: 'jane@example.com',
    username: 'jane',
    displayName: 'Jane Doe',
    profilePicture: 'https://images.example.com/jane.jpg',
    provider: 'GOOGLE' as const,
    providerUserId: 'google-user-123',
  };
  const localInput = {
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    username: 'jane',
    displayName: 'jane',
    profilePicture: null,
  };

  const persistedUser = {
    id: 'database-generated-user-id',
    email: input.email,
    passwordHash: null,
    createdAt: new Date('2026-10-15T00:00:00.000Z'),
    updatedAt: new Date('2026-10-15T00:00:00.000Z'),
  };

  function createRepository() {
    const createUser = vi.fn().mockResolvedValue(persistedUser);
    const createProfile = vi.fn().mockResolvedValue({});
    const createExternalIdentity = vi.fn().mockResolvedValue({});
    const transactionClient = {
      user: { create: createUser },
      profile: { create: createProfile },
      externalIdentity: { create: createExternalIdentity },
    };
    const transaction = vi.fn(async (operation: (client: typeof transactionClient) => unknown) =>
      operation(transactionClient),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;

    return {
      createExternalIdentity,
      createProfile,
      createUser,
      repository: new PrismaAccountProvisioningRepository(prisma),
      transaction,
    };
  }

  it('atomically creates a passwordless user, profile stub, and Google identity', async () => {
    const { createExternalIdentity, createProfile, createUser, repository, transaction } =
      createRepository();

    const user = await repository.createAccount(input);

    expect(transaction).toHaveBeenCalledOnce();
    expect(createUser).toHaveBeenCalledWith({
      data: {
        email: input.email,
        passwordHash: null,
      },
    });
    expect(createProfile).toHaveBeenCalledWith({
      data: {
        userId: persistedUser.id,
        username: input.username,
        displayName: input.displayName,
        profilePicture: input.profilePicture,
      },
    });
    expect(createExternalIdentity).toHaveBeenCalledWith({
      data: {
        userId: persistedUser.id,
        provider: input.provider,
        providerUserId: input.providerUserId,
      },
    });
    expect(user).toEqual(
      expect.objectContaining({
        id: persistedUser.id,
        email: input.email,
      }),
    );
  });

  it('atomically creates a password user and profile without an external identity', async () => {
    const { createExternalIdentity, createProfile, createUser, repository, transaction } =
      createRepository();

    const user = await repository.createAccount(localInput as never);

    expect(transaction).toHaveBeenCalledOnce();
    expect(createUser).toHaveBeenCalledWith({
      data: {
        email: localInput.email,
        passwordHash: localInput.passwordHash,
      },
    });
    expect(createProfile).toHaveBeenCalledWith({
      data: {
        userId: persistedUser.id,
        username: localInput.username,
        displayName: localInput.displayName,
        profilePicture: null,
      },
    });
    expect(createExternalIdentity).not.toHaveBeenCalled();
    expect(user).toEqual(expect.objectContaining({ id: persistedUser.id }));
  });

  it('surfaces a profile-creation failure from the atomic transaction', async () => {
    const { createProfile, repository } = createRepository();
    createProfile.mockRejectedValue(new Error('Profile insert failed'));

    await expect(repository.createAccount(localInput as never)).rejects.toThrow(
      'Profile insert failed',
    );
  });

  it('translates a username uniqueness failure without leaking Prisma', async () => {
    const { repository, transaction } = createRepository();
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on username', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['username'] },
      }),
    );

    await expect(repository.createAccount(input)).rejects.toBeInstanceOf(UsernameAlreadyTakenError);
  });

  it('creates the profile when Google does not provide a picture', async () => {
    const { createProfile, repository } = createRepository();

    await repository.createAccount({ ...input, profilePicture: null });

    expect(createProfile).toHaveBeenCalledWith({
      data: expect.objectContaining({ profilePicture: null }),
    });
  });

  it('translates an email uniqueness race without leaking Prisma', async () => {
    const { repository, transaction } = createRepository();
    const emailConflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on email',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['email'] },
      },
    );
    transaction.mockRejectedValue(emailConflict);

    await expect(repository.createAccount(localInput)).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );
  });

  it('does not misclassify an unrelated uniqueness failure', async () => {
    const { repository, transaction } = createRepository();
    const providerConflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on provider identity',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['provider', 'providerUserId'] },
      },
    );
    transaction.mockRejectedValue(providerConflict);

    await expect(repository.createAccount(input)).rejects.toBe(providerConflict);
  });
});
