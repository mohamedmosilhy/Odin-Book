import { ExternalIdentityPort } from '@users/application/ports/external-identity.port.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';
import { ExternalIdentity } from '@users/domain/entities/external-identity.entity.js';
import { ExternalIdentityMapper } from '../mappers/external-identity.mapper.js';

@Injectable()
export class PrismaExternalIdentityRepository implements ExternalIdentityPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderUserId(
    provider: 'GOOGLE',
    providerUserId: string,
  ): Promise<ExternalIdentity | null> {
    const externalIdentity = await this.prisma.externalIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: provider,
          providerUserId,
        },
      },
    });

    if (!externalIdentity) {
      return null;
    }

    return ExternalIdentityMapper.toDomain(externalIdentity);
  }

  async create(
    userId: string,
    provider: 'GOOGLE',
    providerUserId: string,
  ): Promise<ExternalIdentity> {
    const externalIdentity = await this.prisma.externalIdentity.create({
      data: {
        userId,
        provider,
        providerUserId,
      },
    });

    return ExternalIdentityMapper.toDomain(externalIdentity);
  }
}
