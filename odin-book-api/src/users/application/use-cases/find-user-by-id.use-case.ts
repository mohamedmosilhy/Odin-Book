import { Inject } from '@nestjs/common';
import * as userRepositoryPort from '@users/application/ports/user-repository.port.js';
import { User } from '@users/domain/entities/user.entity.js';

export class FindUserByIdUseCase {
  constructor(
    @Inject(userRepositoryPort.USER_REPOSITORY)
    private readonly userRepository: userRepositoryPort.UserRepositoryPort,
  ) {}
  async execute(id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }
}
