import { ConfigService } from '@nestjs/config';
import { createOAuthSessionConfig } from './oauth-session.config.js';

const STATE_SECRET = 'test-oauth-state-secret-with-32-characters';

function createConfigService(nodeEnv: 'development' | 'test' | 'production') {
  const values: Record<string, string> = {
    NODE_ENV: nodeEnv,
    OAUTH_STATE_SECRET: STATE_SECRET,
    'googleOauth.stateSecret': STATE_SECRET,
  };

  return {
    get: vi.fn((key: string) => values[key]),
    getOrThrow: vi.fn((key: string) => {
      if (!(key in values)) {
        throw new Error(`Unexpected configuration key: ${key}`);
      }

      return values[key];
    }),
  } as unknown as ConfigService;
}

describe('OAuth session configuration', () => {
  it('reads the signing secret from the registered Google OAuth configuration', () => {
    const config = createConfigService('development');

    const options = createOAuthSessionConfig(config);

    expect(config.getOrThrow).toHaveBeenCalledWith('googleOauth.stateSecret');
    expect(options?.keys).toEqual([STATE_SECRET]);
  });

  it('uses a ten-minute HTTP-only Lax cookie limited to Google auth routes', () => {
    const options = createOAuthSessionConfig(createConfigService('development'));

    expect(options).toMatchObject({
      name: 'odin-book-oauth-session',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/api/v1/auth/google',
    });
  });

  it.each([
    ['development', false],
    ['test', false],
    ['production', true],
  ] as const)('sets secure correctly in the %s environment', (nodeEnv, expectedSecure) => {
    const options = createOAuthSessionConfig(createConfigService(nodeEnv));

    expect(options?.secure).toBe(expectedSecure);
  });
});
