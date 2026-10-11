import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { corsConfig } from './config/cors.config.js';
import { databaseConfig } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { googleOauthConfig } from './config/google-oauth.config.js';
import { jwtConfig } from './config/jwt.config.js';
import { storageConfig } from './config/storage.config.js';
import { throttlerConfig } from './config/throttler.config.js';

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
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
