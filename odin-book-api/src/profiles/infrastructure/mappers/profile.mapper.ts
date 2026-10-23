import { Profile } from '@profiles/domain/entities/profile.entity.js';

export class ProfileMapper {
  static toDomain(rawProfile: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    username: string;
    displayName: string;
    bio: string | null;
    profilePicture: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
  }): Profile {
    return new Profile(
      rawProfile.userId,
      rawProfile.username,
      rawProfile.displayName,
      rawProfile.bio,
      rawProfile.profilePicture,
      rawProfile.visibility,
      rawProfile.createdAt,
      rawProfile.updatedAt,
    );
  }
}
