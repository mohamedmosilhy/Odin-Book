import { Module } from '@nestjs/common';
import { VisibilityPolicy } from './domain/services/visibility-policy.service.js';

import { ProfilesModule } from '@profiles/profiles.module.js';
import { SocialGraphModule } from '@social/social-graph.module.js';

@Module({
  providers: [VisibilityPolicy],
  exports: [VisibilityPolicy],
  imports: [ProfilesModule, SocialGraphModule],
})
export class SharedModule {}
