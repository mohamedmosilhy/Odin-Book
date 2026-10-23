import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { SharedModule } from '@shared/shared.module.js';
import { ProfileController } from './presentation/controllers/profile.controller.js';
import { ProfilesModule } from './profiles.module.js';

describe('ProfilesModule', () => {
  it('imports the module that provides PrismaService', () => {
    const imports = (Reflect.getOwnMetadata(MODULE_METADATA.IMPORTS, ProfilesModule) ??
      []) as unknown[];

    expect(imports).toContain(SharedModule);
  });

  it('registers the profile HTTP controller', () => {
    const controllers = (Reflect.getOwnMetadata(MODULE_METADATA.CONTROLLERS, ProfilesModule) ??
      []) as unknown[];

    expect(controllers).toContain(ProfileController);
  });
});
