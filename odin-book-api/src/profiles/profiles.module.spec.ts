import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { SharedModule } from '@shared/shared.module.js';
import { GetProfileVisibilityUseCase } from './application/use-cases/get-profile-visibility.use-case.js';
import { ResolveProfileByUsernameUseCase } from './application/use-cases/resolve-profile-by-username.use-case.js';
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

  it('provides and exports the profile visibility lookup for other modules', () => {
    const providers = (Reflect.getOwnMetadata(MODULE_METADATA.PROVIDERS, ProfilesModule) ??
      []) as unknown[];
    const exports = (Reflect.getOwnMetadata(MODULE_METADATA.EXPORTS, ProfilesModule) ??
      []) as unknown[];

    expect(providers).toContain(GetProfileVisibilityUseCase);
    expect(exports).toContain(GetProfileVisibilityUseCase);
  });

  it('provides and exports profile resolution by username for other modules', () => {
    const providers = (Reflect.getOwnMetadata(MODULE_METADATA.PROVIDERS, ProfilesModule) ??
      []) as unknown[];
    const exports = (Reflect.getOwnMetadata(MODULE_METADATA.EXPORTS, ProfilesModule) ??
      []) as unknown[];

    expect(providers).toContain(ResolveProfileByUsernameUseCase);
    expect(exports).toContain(ResolveProfileByUsernameUseCase);
  });
});
