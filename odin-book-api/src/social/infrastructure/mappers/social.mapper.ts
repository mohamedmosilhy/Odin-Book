import {
  FollowStatus,
  SocialProfileSummary,
} from '@social/application/ports/social-repository.port.js';
import { FollowRelationship } from '@social/domain/entities/follow-relationship.entity.js';
import { ProfileVisibility } from '../../../generated/prisma/enums.js';

export class SocialMapper {
  constructor() {}
  static toDomain(data: {
    id: string;
    requesterId: string;
    targetId: string;
    status: FollowStatus;
    createdAt: Date;
    updatedAt: Date;
  }): FollowRelationship {
    return new FollowRelationship(
      data.id,
      data.requesterId,
      data.targetId,
      data.status,
      data.createdAt,
      data.updatedAt,
    );
  }

  static toSocialProfileSummary(
    data: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      username: string;
      userId: string;
      displayName: string;
      bio: string | null;
      profilePicture: string | null;
      visibility: ProfileVisibility;
    } | null,
  ): SocialProfileSummary {
    if (!data) {
      throw new Error('Data is null');
    }
    return {
      id: data.id,
      username: data.username,
      displayName: data.displayName,
      profilePicture: data.profilePicture ?? null,
    };
  }
}
