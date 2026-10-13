import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';

export class AuthMapper {
  static toDomain(refreshToken: {
    id: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenHash: string | null;
    createdAt: Date;
  }): RefreshToken {
    return new RefreshToken(
      refreshToken.id,
      refreshToken.userId,
      refreshToken.tokenHash,
      refreshToken.familyId,
      refreshToken.expiresAt,
      refreshToken.createdAt,
      refreshToken.revokedAt,
      refreshToken.replacedByTokenHash,
    );
  }
}
