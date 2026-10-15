import { User } from '@users/domain/entities/user.entity.js';

export interface AccountProvisioningPort {
  createAccount(data: {
    email: string;
    username: string;
    displayName: string;
    provider: 'GOOGLE';
    providerUserId: string;
    profilePicture: string | null;
  }): Promise<User>;
}

export const ACCOUNT_PROVISIONING_PORT = Symbol('ACCOUNT_PROVISIONING_PORT');
