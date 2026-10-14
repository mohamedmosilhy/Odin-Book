import type cookieSession from 'cookie-session';
import { ConfigService } from '@nestjs/config';

type OAuthSessionOptions = Parameters<typeof cookieSession>[0];

export function createOAuthSessionConfig(config: ConfigService): OAuthSessionOptions {
  return {
    name: 'odin-book-oauth-session',
    keys: [config.getOrThrow<string>('googleOauth.stateSecret')],
    httpOnly: true,
    secure: config.get<string>('NODE_ENV') === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/v1/auth/google',
  };
}
