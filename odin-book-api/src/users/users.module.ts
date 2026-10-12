import { Module } from '@nestjs/common';
import { FindUserByIdUseCase } from './application/use-cases/find-user-by-id.use-case.js';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email.use-case.js';
import { UsersController } from './presentation/controllers/users.controller.js';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository.js';
import { USER_REPOSITORY } from './application/ports/user-repository.port.js';
import { SharedModule } from '@shared/shared.module.js';

@Module({
  controllers: [UsersController],
  providers: [
    FindUserByEmailUseCase,
    FindUserByIdUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  imports: [SharedModule],
  exports: [FindUserByEmailUseCase, FindUserByIdUseCase],
})
export class UsersModule {}
