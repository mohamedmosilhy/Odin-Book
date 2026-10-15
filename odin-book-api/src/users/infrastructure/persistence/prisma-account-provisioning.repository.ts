import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { AccountProvisioningPort } from '@users/application/ports/account-provisioning.port.js';
import { UsernameAlreadyTakenError } from '@users/domain/errors/username-already-taken.error.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { User } from '@users/domain/entities/user.entity.js';

@Injectable()
export class PrismaAccountProvisioningRepository implements AccountProvisioningPort {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(data: {
    email: string;
    username: string;
    displayName: string;
    provider: 'GOOGLE';
    providerUserId: string;
    profilePicture: string | null;
  }): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            email: data.email,
            passwordHash: null,
          },
        });

        await prisma.externalIdentity.create({
          data: {
            userId: user.id,
            provider: data.provider,
            providerUserId: data.providerUserId,
          },
        });

        await prisma.profile.create({
          data: {
            userId: user.id,
            username: data.username,
            displayName: data.displayName,
            profilePicture: data.profilePicture,
          },
        });

        return user;
      });

      return UserMapper.toDomain(user);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        this.isUsernameConstraint(error.meta?.target)
      ) {
        throw new UsernameAlreadyTakenError();
      }

      throw error;
    }
  }

  private isUsernameConstraint(target: unknown): boolean {
    if (typeof target === 'string') {
      return target.includes('username');
    }

    if (Array.isArray(target)) {
      return target.includes('username');
    }

    return false;
  }
}
