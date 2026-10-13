import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@auth/auth.module.js';
import { ContentModule } from '@content/content.module.js';
import { FeedModule } from '@feed/feed.module.js';
import { ProfilesModule } from '@profiles/profiles.module.js';
import { SharedModule } from '@shared/shared.module.js';
import { SocialModule } from '@social/social.module.js';
import { StorageModule } from '@storage/storage.module.js';
import { UsersModule } from '@users/users.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { corsConfig } from './config/cors.config.js';
import { databaseConfig } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { googleOauthConfig } from './config/google-oauth.config.js';
import { jwtConfig } from './config/jwt.config.js';
import { storageConfig } from './config/storage.config.js';
import { throttlerConfig } from './config/throttler.config.js';
import { passwordHashingConfig } from './config/password-hashing.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
      load: [
        databaseConfig,
        jwtConfig,
        googleOauthConfig,
        storageConfig,
        corsConfig,
        throttlerConfig,
        passwordHashingConfig,
      ],
    }),
    UsersModule,
    AuthModule,
    ProfilesModule,
    ContentModule,
    FeedModule,
    SocialModule,
    StorageModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
