import {
  type ProfileRepositoryPort,
  PROFILE_REPOSITORY,
} from '../ports/profile-repository.port.js';
import { Inject } from '@nestjs/common';
import { ProfileContractReturned } from '../types/profile-contract-returned.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';
import { GetProfileSocialSummaryUseCase } from '@social/application/use-cases/get-profile-social-summary.use-case.js';

export class GetProfileByUsernameUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: ProfileRepositoryPort,
    private readonly getProfileSocialSummary: GetProfileSocialSummaryUseCase,
  ) {}

  async execute(
    username: string,
    viewerId: string | null = null,
  ): Promise<ProfileContractReturned> {
    const profile = await this.profileRepository.findByUsername(username);
    if (!profile) {
      throw new ProfileNotFoundError(`Profile with username ${username} not found`);
    }

    return {
      ...(await this.getProfileSocialSummary.execute(profile.userId, viewerId)),
      posts: [],
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      profilePicture: profile.profilePicture,
      visibility: profile.visibility,
    };
  }
}
