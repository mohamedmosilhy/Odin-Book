import {
  type ProfileRepositoryPort,
  PROFILE_REPOSITORY,
} from '../ports/profile-repository.port.js';
import { Inject } from '@nestjs/common';
import { ProfileContractReturned } from '../types/profile-contract-returned.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';

export class GetProfileByUsernameUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(username: string): Promise<ProfileContractReturned> {
    const profile = await this.profileRepository.findByUsername(username);
    if (!profile) {
      throw new ProfileNotFoundError(`Profile with username ${username} not found`);
    }

    return {
      followerCount: 0,
      followingCount: 0,
      followStatus: 'NONE',
      posts: [],
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      profilePicture: profile.profilePicture,
      visibility: profile.visibility,
    };
  }
}
