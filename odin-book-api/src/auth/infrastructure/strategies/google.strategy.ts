import { GoogleProfile } from '@auth/application/types/google-profile.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('googleOauth.clientId'),
      clientSecret: config.getOrThrow<string>('googleOauth.clientSecret'),
      callbackURL: config.getOrThrow<string>('googleOauth.callbackUrl'),
      scope: ['email', 'profile', 'openid'],
      state: true,
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    const email = profile.emails?.[0];
    const emailVerified = email?.verified ?? false;

    if (!email || !emailVerified || email.value === '') {
      throw new UnauthorizedException('Email not found in Google profile');
    }

    return {
      provider: 'GOOGLE',
      providerUserId: profile.id,
      email: email.value,
      emailVerified: email.verified,
      displayName: profile.displayName,
      picture: profile.photos?.[0]?.value ?? null,
    };
  }
}
