import { ExternalIdentity } from '@users/domain/entities/external-identity.entity.js';

export class ExternalIdentityMapper {
  static toDomain(externalIdentity: {
    id: string;
    userId: string;
    provider: 'GOOGLE';
    providerUserId: string;
    createdAt: Date;
  }): ExternalIdentity {
    return new ExternalIdentity(
      externalIdentity.id,
      externalIdentity.userId,
      externalIdentity.provider,
      externalIdentity.providerUserId,
      externalIdentity.createdAt,
    );
  }
}
