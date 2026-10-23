import * as ProfileRepositoryPort from '../ports/profile-repository.port.js';
import { Inject } from '@nestjs/common';
import { ProfilePartialUpdate } from '../types/profile-partial-update.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';

export class EditProfileUseCase {
  constructor(
    @Inject(ProfileRepositoryPort.PROFILE_REPOSITORY)
    private readonly profileRepository: ProfileRepositoryPort.ProfileRepositoryPort,
  ) {}

  async execute(data: ProfilePartialUpdate, userId: string): Promise<void> {
    const existingProfile = await this.profileRepository.findByUserId(userId);

    if (!existingProfile) {
      throw new ProfileNotFoundError('Profile not found');
    }

    return this.profileRepository.updateProfile(data, userId);
  }
}
