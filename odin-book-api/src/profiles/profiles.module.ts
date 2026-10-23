import { Module } from '@nestjs/common';
import { EditProfileUseCase } from './application/use-cases/edit-profile.use-case.js';
import { GetProfileByUsernameUseCase } from './application/use-cases/get-profile-by-username.use-case.js';
import { PrismaProfileRepository } from './infrastructure/persistence/prisma-profile.repository.js';
import { PROFILE_REPOSITORY } from './application/ports/profile-repository.port.js';
import { SharedModule } from '@shared/shared.module.js';
import { ProfileController } from './presentation/controllers/profile.controller.js';
import { AuthModule } from '@auth/auth.module.js';

@Module({
  controllers: [ProfileController],
  imports: [SharedModule, AuthModule],
  providers: [
    EditProfileUseCase,
    GetProfileByUsernameUseCase,
    {
      provide: PROFILE_REPOSITORY,
      useClass: PrismaProfileRepository,
    },
  ],
  exports: [EditProfileUseCase, GetProfileByUsernameUseCase],
})
export class ProfilesModule {}
