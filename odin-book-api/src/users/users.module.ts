import { Module } from '@nestjs/common';
import { FindUserByIdUseCase } from './application/use-cases/find-user-by-id.use-case.js';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email.use-case.js';
import { UsersController } from './presentation/controllers/users.controller.js';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository.js';
import { USER_REPOSITORY } from './application/ports/user-repository.port.js';
import { SharedModule } from '@shared/shared.module.js';
import { PrismaExternalIdentityRepository } from './infrastructure/persistence/prisma-external-identity.repository.js';
import { EXTERNAL_IDENTITY_PORT } from './application/ports/external-identity.port.js';
import { ACCOUNT_PROVISIONING_PORT } from './application/ports/account-provisioning.port.js';
import { PrismaAccountProvisioningRepository } from './infrastructure/persistence/prisma-account-provisioning.repository.js';

@Module({
  controllers: [UsersController],
  providers: [
    FindUserByEmailUseCase,
    FindUserByIdUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: EXTERNAL_IDENTITY_PORT, useClass: PrismaExternalIdentityRepository },
    { provide: ACCOUNT_PROVISIONING_PORT, useClass: PrismaAccountProvisioningRepository },
  ],
  imports: [SharedModule],
  exports: [
    FindUserByEmailUseCase,
    FindUserByIdUseCase,
    USER_REPOSITORY,
    EXTERNAL_IDENTITY_PORT,
    ACCOUNT_PROVISIONING_PORT,
  ],
})
export class UsersModule {}
