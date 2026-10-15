import { ExternalIdentity } from '@users/domain/entities/external-identity.entity.js';

export interface ExternalIdentityPort {
  findByProviderUserId(
    provider: 'GOOGLE',
    providerUserId: string,
  ): Promise<ExternalIdentity | null>;
  create(userId: string, provider: 'GOOGLE', providerUserId: string): Promise<ExternalIdentity>;
}

export const EXTERNAL_IDENTITY_PORT = Symbol('EXTERNAL_IDENTITY_PORT');
