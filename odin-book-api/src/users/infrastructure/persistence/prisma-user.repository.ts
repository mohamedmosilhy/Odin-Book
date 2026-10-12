import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { UserRepositoryPort } from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';
import { UserMapper } from '@users/infrastructure/mappers/user.mapper.js';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private prisma: PrismaService) {}
  async findById(id: string): Promise<User | null> {
    // Implementation for finding user by ID
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
}
