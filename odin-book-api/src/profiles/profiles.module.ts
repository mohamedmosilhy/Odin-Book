import { Module } from '@nestjs/common';
import { EditProfileUseCase } from './application/use-cases/edit-profile.use-case.js';
import { GetProfileByUsernameUseCase } from './application/use-cases/get-profile-by-username.use-case.js';
import { PrismaProfileRepository } from './infrastructure/persistence/prisma-profile.repository.js';
import { PROFILE_REPOSITORY } from './application/ports/profile-repository.port.js';
import { ProfileController } from './presentation/controllers/profile.controller.js';
import { AuthModule } from '@auth/auth.module.js';
import { GetProfileVisibilityUseCase } from './application/use-cases/get-profile-visibility.use-case.js';
import { ResolveProfileByUsernameUseCase } from './application/use-cases/resolve-profile-by-username.use-case.js';
import { InfrastructureModule } from '@shared/infrastructure.module.js';

@Module({
  controllers: [ProfileController],
  imports: [InfrastructureModule, AuthModule],
  providers: [
    EditProfileUseCase,
    GetProfileByUsernameUseCase,
    GetProfileVisibilityUseCase,
    {
      provide: PROFILE_REPOSITORY,
      useClass: PrismaProfileRepository,
    },
    ResolveProfileByUsernameUseCase,
  ],
  exports: [
    EditProfileUseCase,
    GetProfileByUsernameUseCase,
    GetProfileVisibilityUseCase,
    ResolveProfileByUsernameUseCase,
  ],
})
export class ProfilesModule {}
