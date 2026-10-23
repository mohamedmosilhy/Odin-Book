import { ProfileRepositoryPort } from '@profiles/application/ports/profile-repository.port.js';

import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { ProfileMapper } from '../mappers/profile.mapper.js';
import { Profile } from '@profiles/domain/entities/profile.entity.js';
import { ProfilePartialUpdate } from '@profiles/application/types/profile-partial-update.js';

@Injectable()
export class PrismaProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly prismaService: PrismaService) {}

  async findByUserId(userId: string): Promise<Profile | null> {
    const profile = await this.prismaService.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return null;
    }
    return ProfileMapper.toDomain(profile);
  }

  async findByUsername(username: string): Promise<Profile | null> {
    const profile = await this.prismaService.profile.findUnique({
      where: { username },
      include: {
        user: true,
      },
    });
    if (!profile) {
      return null;
    }

    return ProfileMapper.toDomain(profile);
  }

  async updateProfile(data: ProfilePartialUpdate, userId: string): Promise<void> {
    await this.prismaService.profile.update({
      where: { userId },
      data,
    });
  }

  async createProfile(profile: Profile): Promise<void> {
    await this.prismaService.profile.create({
      data: profile,
    });
  }

  async deleteProfile(userId: string): Promise<void> {
    await this.prismaService.profile.delete({
      where: { userId },
    });
  }
}
