import { Module } from '@nestjs/common';
import { VisibilityPolicy } from './domain/services/visibility-policy.service.js';
import { SocialModule } from '@social/social.module.js';
import { ProfilesModule } from '@profiles/profiles.module.js';

@Module({
  providers: [VisibilityPolicy],
  exports: [VisibilityPolicy],
  imports: [SocialModule, ProfilesModule],
})
export class SharedModule {}
