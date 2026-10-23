import { User } from '@users/domain/entities/user.entity.js';

export type LocalAccountData = {
  email: string;
  passwordHash: string;
  username: string;
  displayName: string;
  profilePicture: string | null;
};

export type GoogleAccountData = {
  email: string;
  username: string;
  displayName: string;
  providerUserId: string;
  provider: 'GOOGLE';
  profilePicture: string | null;
};

export interface AccountProvisioningPort {
  createAccount(data: LocalAccountData | GoogleAccountData): Promise<User>;
}

export const ACCOUNT_PROVISIONING_PORT = Symbol('ACCOUNT_PROVISIONING_PORT');
