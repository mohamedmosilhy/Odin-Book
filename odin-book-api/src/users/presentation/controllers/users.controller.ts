import { Controller } from '@nestjs/common';

import { FindUserByEmailUseCase } from '@users/application/use-cases/find-user-by-email.use-case.js';
import { FindUserByIdUseCase } from '@users/application/use-cases/find-user-by-id.use-case.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly findUserById: FindUserByIdUseCase,
    private readonly findUserByEmail: FindUserByEmailUseCase,
  ) {}
}
