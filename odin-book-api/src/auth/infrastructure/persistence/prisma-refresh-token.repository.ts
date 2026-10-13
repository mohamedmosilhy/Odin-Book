import {
  CreateRefreshTokenData,
  RefreshTokenRepositoryPort,
  RotateRefreshTokenData,
} from '@auth/application/ports/refresh-token-repository.port.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service.js';

import { AuthMapper } from '../mappers/auth.mapper.js';
import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';
import { RefreshTokenRotationConflictError } from '@auth/domain/errors/refresh-token-rotation-conflict.error.js';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        expiresAt: data.expiresAt,
      },
    });

    return AuthMapper.toDomain(refreshToken);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });
    if (!refreshToken) {
      return null;
    }
    return AuthMapper.toDomain(refreshToken);
  }

  async rotate(data: RotateRefreshTokenData): Promise<RefreshToken> {
    const refreshToken = await this.prisma.$transaction(async (tx) => {
      const existingToken = await tx.refreshToken.findUnique({
        where: { tokenHash: data.currentTokenHash },
      });

      if (!existingToken) {
        throw new RefreshTokenRotationConflictError();
      }
      const rows = await tx.refreshToken.updateMany({
        data: {
          revokedAt: data.rotatedAt,
          replacedByTokenHash: data.replacementTokenHash,
        },
        where: { tokenHash: data.currentTokenHash, revokedAt: null },
      });

      if (rows.count !== 1) {
        throw new RefreshTokenRotationConflictError();
      }

      return await tx.refreshToken.create({
        data: {
          userId: existingToken.userId,
          tokenHash: data.replacementTokenHash,
          familyId: existingToken.familyId,
          expiresAt: data.replacementExpiresAt,
        },
      });
    });

    return AuthMapper.toDomain(refreshToken);
  }

  async revokeFamily(familyId: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });
  }
}
