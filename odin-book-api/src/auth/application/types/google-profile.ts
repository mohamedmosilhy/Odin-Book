export interface GoogleProfile {
  provider: 'GOOGLE';
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  picture: string | null;
}
