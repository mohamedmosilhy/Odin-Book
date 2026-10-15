import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy.js';

type StrategyInternals = {
  _callbackURL?: string;
  _passReqToCallback?: boolean;
  _scope?: string[];
  _stateStore?: { constructor?: { name?: string } };
};

describe('GoogleStrategy', () => {
  function createGoogleProfile(overrides: Partial<Profile> = {}): Profile {
    return {
      provider: 'google',
      id: 'google-user-123',
      displayName: 'Jane Doe',
      profileUrl: 'https://profiles.google.com/google-user-123',
      emails: [{ value: 'jane@example.com', verified: true }],
      photos: [{ value: 'https://images.example.com/jane.jpg' }],
      _raw: '{}',
      _json: {
        iss: 'https://accounts.google.com',
        aud: 'test-google-client-id',
        sub: 'google-user-123',
        iat: 1,
        exp: 2,
      },
      ...overrides,
    } as Profile;
  }

  function createStrategy() {
    const values: Record<string, string> = {
      'googleOauth.clientId': 'test-google-client-id',
      'googleOauth.clientSecret': 'test-google-client-secret',
      'googleOauth.callbackUrl': 'http://localhost:3000/api/v1/auth/google/callback',
    };
    const configService = {
      getOrThrow: vi.fn((key: string) => {
        if (!(key in values)) {
          throw new Error(`Unexpected configuration key: ${key}`);
        }

        return values[key];
      }),
    } as unknown as ConfigService;

    return {
      configService,
      strategy: new GoogleStrategy(configService),
    };
  }

  it('configures the Google authorization request from validated application config', () => {
    const { configService, strategy } = createStrategy();
    const internals = strategy as unknown as StrategyInternals;

    expect(configService.getOrThrow).toHaveBeenCalledWith('googleOauth.clientId');
    expect(configService.getOrThrow).toHaveBeenCalledWith('googleOauth.clientSecret');
    expect(configService.getOrThrow).toHaveBeenCalledWith('googleOauth.callbackUrl');
    expect(internals._callbackURL).toBe('http://localhost:3000/api/v1/auth/google/callback');
    expect(internals._scope).toEqual(expect.arrayContaining(['openid', 'email', 'profile']));
    expect(internals._stateStore?.constructor?.name).not.toBe('NullStore');
  });

  it('keeps the Passport verify callback arguments aligned when request access is unused', () => {
    const { strategy } = createStrategy();
    const internals = strategy as unknown as StrategyInternals;

    expect(internals._passReqToCallback).toBeFalsy();
  });

  it('normalizes the Google profile without exposing Google tokens', () => {
    const { strategy } = createStrategy();
    const profile = createGoogleProfile();

    const result = strategy.validate(
      'google-access-token-must-not-leak',
      'google-refresh-token-must-not-leak',
      profile,
    );

    expect(result).toEqual({
      provider: 'GOOGLE',
      providerUserId: 'google-user-123',
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane Doe',
      picture: 'https://images.example.com/jane.jpg',
    });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('rejects a Google identity that has no email', () => {
    const { strategy } = createStrategy();
    const profile = createGoogleProfile({ emails: undefined });

    expect(() => strategy.validate('access-token', 'refresh-token', profile)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a Google identity whose email is not verified', () => {
    const { strategy } = createStrategy();
    const profile = createGoogleProfile({
      emails: [{ value: 'jane@example.com', verified: false }],
    });

    expect(() => strategy.validate('access-token', 'refresh-token', profile)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a Google identity whose verified email is empty', () => {
    const { strategy } = createStrategy();
    const profile = createGoogleProfile({ emails: [{ value: '', verified: true }] });

    expect(() => strategy.validate('access-token', 'refresh-token', profile)).toThrow(
      UnauthorizedException,
    );
  });
});
