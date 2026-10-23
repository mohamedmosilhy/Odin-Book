import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { User } from '@users/domain/entities/user.entity.js';
import {
  AccountProvisioningPort,
  GoogleAccountData,
  LocalAccountData,
} from '@users/application/ports/account-provisioning.port.js';
import { UsernameAlreadyTakenError } from '@users/domain/errors/username-already-taken.error.js';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';

@Injectable()
export class PrismaAccountProvisioningRepository implements AccountProvisioningPort {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(data: LocalAccountData | GoogleAccountData): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash: 'passwordHash' in data ? data.passwordHash : null,
          },
        });

        if (!('passwordHash' in data)) {
          await tx.externalIdentity.create({
            data: {
              userId: user.id,
              provider: data.provider,
              providerUserId: data.providerUserId,
            },
          });
        }

        await tx.profile.create({
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
      this.handlePrismaError(error);
      throw error;
    }
  }

  private handlePrismaError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return;
    }

    const target = error.meta?.target;

    if (this.matchesConstraint(target, 'username')) {
      throw new UsernameAlreadyTakenError();
    }

    if (this.matchesConstraint(target, 'email')) {
      throw new EmailAlreadyRegisteredError();
    }
  }

  private matchesConstraint(target: unknown, field: string): boolean {
    if (typeof target === 'string') {
      return target.toLowerCase().includes(field.toLowerCase());
    }

    if (Array.isArray(target)) {
      return target.some(
        (item) => typeof item === 'string' && item.toLowerCase().includes(field.toLowerCase()),
      );
    }

    return false;
  }
}
