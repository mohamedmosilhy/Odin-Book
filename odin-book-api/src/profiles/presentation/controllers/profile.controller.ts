import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { EditProfileUseCase } from '@profiles/application/use-cases/edit-profile.use-case.js';
import { GetProfileByUsernameUseCase } from '@profiles/application/use-cases/get-profile-by-username.use-case.js';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { EditProfileDto } from '../dto/edit-profile.dto.js';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';

@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly editProfileUseCase: EditProfileUseCase,
    private readonly getProfileByUsernameUseCase: GetProfileByUsernameUseCase,
  ) {}

  @Get(':username')
  async getProfileByUsername(@Param('username') username: string) {
    return this.getProfileByUsernameUseCase.execute(username);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async editProfile(@Body() body: EditProfileDto, @CurrentUser() user: { id: string }) {
    return this.editProfileUseCase.execute(body, user.id);
  }
}
