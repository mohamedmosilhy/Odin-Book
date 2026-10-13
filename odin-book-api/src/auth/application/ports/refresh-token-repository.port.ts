import { RefreshToken } from '@auth/domain/entities/refresh-token.entity.js';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}
export interface RotateRefreshTokenData {
  currentTokenHash: string;
  replacementTokenHash: string;
  replacementExpiresAt: Date;
  rotatedAt: Date;
}

export interface RefreshTokenRepositoryPort {
  create(data: CreateRefreshTokenData): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  rotate(data: RotateRefreshTokenData): Promise<RefreshToken>;
  revokeFamily(familyId: string, revokedAt: Date): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
