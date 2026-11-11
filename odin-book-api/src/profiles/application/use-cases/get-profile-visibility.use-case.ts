import { Inject } from '@nestjs/common';
import {
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
} from '../ports/profile-repository.port.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';

export class GetProfileVisibilityUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(userId: string): Promise<'PUBLIC' | 'PRIVATE'> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new ProfileNotFoundError(`Profile not found`);
    }
    return profile.visibility;
  }
}
