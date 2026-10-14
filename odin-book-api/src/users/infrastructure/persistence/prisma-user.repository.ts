import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import {
  CreateUserData,
  UserRepositoryPort,
} from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';
import { UserMapper } from '@users/infrastructure/mappers/user.mapper.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      return null;
    }
    return UserMapper.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    // Implementation for finding user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return null;
    }
    return UserMapper.toDomain(user);
  }

  async create(user: CreateUserData): Promise<User> {
    try {
      const createdUser = await this.prisma.user.create({
        data: {
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });

      return UserMapper.toDomain(createdUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | string | undefined)?.toString().includes('email')
      ) {
        throw new EmailAlreadyRegisteredError();
      }

      throw error;
    }
  }
}
