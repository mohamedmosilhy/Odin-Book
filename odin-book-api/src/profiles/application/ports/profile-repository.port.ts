import { Profile } from '@profiles/domain/entities/profile.entity.js';
import { ProfilePartialUpdate } from '../types/profile-partial-update.js';

export interface ProfileRepositoryPort {
  findByUserId(userId: string): Promise<Profile | null>;
  findByUsername(username: string): Promise<Profile | null>;
  updateProfile(data: ProfilePartialUpdate, userId: string): Promise<void>;
  createProfile(profile: Profile): Promise<void>;
  deleteProfile(userId: string): Promise<void>;
}

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');
