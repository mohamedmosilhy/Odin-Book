export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}
