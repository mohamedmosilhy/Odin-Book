import { Inject } from '@nestjs/common';
import {
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
} from '../ports/profile-repository.port.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';

export type ResolvedProfileIdentity = {
  userId: string;
  visibility: 'PUBLIC' | 'PRIVATE';
};

export class ResolveProfileByUsernameUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(username: string): Promise<ResolvedProfileIdentity> {
    const profile = await this.profileRepository.findByUsername(username);
    if (!profile) {
      throw new ProfileNotFoundError('Profile not found for the given username');
    }
    return {
      userId: profile.userId,
      visibility: profile.visibility,
    };
  }
}
