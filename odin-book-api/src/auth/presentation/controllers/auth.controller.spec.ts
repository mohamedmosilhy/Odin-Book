import type { AuthenticationResult } from '@auth/application/types/authentication-result.js';
import type { LoginUseCase } from '@auth/application/use-cases/login.use-case.js';
import type { LogoutUseCase } from '@auth/application/use-cases/logout.use-case.js';
import type { RefreshUseCase } from '@auth/application/use-cases/refresh.use-case.js';
import type { RegisterUseCase } from '@auth/application/use-cases/register.use-case.js';
import type { GoogleOAuthCallbackUseCase } from '@auth/application/use-cases/google-oauth-callback.use-case.js';
import type { GoogleProfile } from '@auth/application/types/google-profile.js';
import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import type { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import type { Request, Response } from 'express';
import { GooglePassportGuard } from '../guards/google-passport.guard.js';
import type { GoogleOAuthRequest } from '../types/google-oauth-request.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  const authenticationResult: AuthenticationResult = {
    accessToken: 'test-access-token',
    refreshToken: 'raw-refresh-token',
    user: {
      id: 'user-id',
      email: 'person@example.com',
    },
  };

  function createController() {
    const registerUseCase = {
      execute: vi.fn<RegisterUseCase['execute']>(),
    };
    const loginUseCase = {
      execute: vi.fn<LoginUseCase['execute']>(),
    };
    const refreshUseCase = {
      execute: vi.fn<RefreshUseCase['execute']>(),
    };
    const logoutUseCase = {
      execute: vi.fn<LogoutUseCase['execute']>(),
    };
    const googleOAuthCallbackUseCase = {
      execute: vi.fn<GoogleOAuthCallbackUseCase['execute']>(),
    };
    const configService = {
      getOrThrow: vi.fn().mockReturnValue('http://localhost:5173/'),
    };
    const cookie = vi.fn();
    const clearCookie = vi.fn();
    const redirect = vi.fn();
    const send = vi.fn();
    const status = vi.fn();
    const response = { cookie, clearCookie, redirect, send, status } as unknown as Response;
    status.mockReturnValue(response);
    const controller = new AuthController(
      registerUseCase as unknown as RegisterUseCase,
      loginUseCase as unknown as LoginUseCase,
      refreshUseCase as unknown as RefreshUseCase,
      logoutUseCase as unknown as LogoutUseCase,
      googleOAuthCallbackUseCase as unknown as GoogleOAuthCallbackUseCase,
      configService as unknown as ConfigService,
    );

    return {
      controller,
      registerUseCase,
      loginUseCase,
      refreshUseCase,
      logoutUseCase,
      googleOAuthCallbackUseCase,
      configService,
      cookie,
      clearCookie,
      redirect,
      response,
      send,
      status,
    };
  }

  function expectSecureRefreshCookie(cookie: ReturnType<typeof vi.fn>) {
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      authenticationResult.refreshToken,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/v1/auth',
      }),
    );
  }

  const expectedBody = {
    accessToken: authenticationResult.accessToken,
    user: authenticationResult.user,
  };

  it('starts Google sign-in through the Google Passport guard', async () => {
    const { controller } = createController();

    const result = await controller.googleAuth();
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthController.prototype.googleAuth,
    ) as unknown[];

    expect(Reflect.getMetadata(PATH_METADATA, AuthController.prototype.googleAuth)).toBe('google');
    expect(guards).toContain(GooglePassportGuard);
    expect(result).toBeUndefined();
  });

  it('hands the trusted Google identity to the use case and redirects with only the Odin access token in the fragment', async () => {
    const {
      configService,
      controller,
      cookie,
      googleOAuthCallbackUseCase,
      redirect,
      response,
      send,
      status,
    } = createController();
    const googleProfile: GoogleProfile = {
      provider: 'GOOGLE',
      providerUserId: 'google-user-123',
      email: 'person@example.com',
      emailVerified: true,
      displayName: 'Person Example',
      picture: null,
    };
    const callbackResult: AuthenticationResult = {
      ...authenticationResult,
      accessToken: 'odin access/token?value=1#private',
    };
    const request = { user: googleProfile } as GoogleOAuthRequest;
    googleOAuthCallbackUseCase.execute.mockResolvedValue(callbackResult);

    const result = await controller.googleAuthCallback(request, response);

    expect(Reflect.getMetadata(PATH_METADATA, AuthController.prototype.googleAuthCallback)).toBe(
      'google/callback',
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.googleAuthCallback),
    ).toContain(GooglePassportGuard);
    expect(googleOAuthCallbackUseCase.execute).toHaveBeenCalledWith(googleProfile);
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      callbackResult.refreshToken,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/v1/auth',
      }),
    );
    expect(configService.getOrThrow).toHaveBeenCalledWith('cors.frontendUrl');
    expect(redirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      `http://localhost:5173/oauth/callback#accessToken=${encodeURIComponent(callbackResult.accessToken)}`,
    );
    expect(status).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('registers a user, sets the refresh cookie, and omits it from the response body', async () => {
    const { controller, registerUseCase, cookie, response } = createController();
    registerUseCase.execute.mockResolvedValue(authenticationResult);

    const result = await controller.register(response, {
      email: 'person@example.com',
      password: 'password1',
    });

    expect(registerUseCase.execute).toHaveBeenCalledWith('person@example.com', 'password1');
    expectSecureRefreshCookie(cookie);
    expect(result).toEqual(expectedBody);
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('logs in a user, sets the refresh cookie, and omits it from the response body', async () => {
    const { controller, loginUseCase, cookie, response } = createController();
    loginUseCase.execute.mockResolvedValue(authenticationResult);

    const result = await controller.login(response, {
      email: 'person@example.com',
      password: 'password1',
    });

    expect(loginUseCase.execute).toHaveBeenCalledWith('person@example.com', 'password1');
    expectSecureRefreshCookie(cookie);
    expect(result).toEqual(expectedBody);
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('reads the refresh token from its HttpOnly cookie, rotates it, and returns only an access token', async () => {
    const { controller, refreshUseCase, cookie, response } = createController();
    const request = {
      cookies: { refresh_token: 'raw-current-refresh-token' },
    } as unknown as Request;
    refreshUseCase.execute.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: authenticationResult.refreshToken,
    });

    const result = await controller.refresh(response, request);

    expect(refreshUseCase.execute).toHaveBeenCalledWith('raw-current-refresh-token');
    expectSecureRefreshCookie(cookie);
    expect(result).toEqual({ accessToken: 'new-access-token' });
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('rejects refresh when the refresh-token cookie is missing', async () => {
    const { controller, refreshUseCase, response } = createController();
    const request = { cookies: {} } as unknown as Request;

    await expect(controller.refresh(response, request)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
    expect(refreshUseCase.execute).not.toHaveBeenCalled();
  });

  it('logs out using the refresh cookie, clears it, and returns no body', async () => {
    const { controller, logoutUseCase, clearCookie, response } = createController();
    const request = {
      cookies: { refresh_token: 'raw-current-refresh-token' },
    } as unknown as Request;

    const result = await controller.logout(request, response);

    expect(logoutUseCase.execute).toHaveBeenCalledWith('raw-current-refresh-token');
    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/v1/auth',
      }),
    );
    expect(result).toBeUndefined();
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.logout)).toBe(
      HttpStatus.NO_CONTENT,
    );
  });

  it('still clears the cookie and succeeds when no refresh cookie is present', async () => {
    const { controller, logoutUseCase, clearCookie, response } = createController();
    const request = { cookies: {} } as unknown as Request;

    const result = await controller.logout(request, response);

    expect(logoutUseCase.execute).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
    expect(result).toBeUndefined();
  });

  it('protects the dummy route and exposes the authenticated user id', async () => {
    const { controller } = createController();
    const request = { user: { id: 'user-id' } } as unknown as Request & {
      user: { id: string };
    };

    const result = await controller.protectedRoute(request);
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthController.prototype.protectedRoute,
    ) as unknown[];

    expect(Reflect.getMetadata(PATH_METADATA, AuthController.prototype.protectedRoute)).toBe(
      'protected',
    );
    expect(guards).toContain(AuthGuard);
    expect(result).toEqual({ userId: 'user-id' });
  });
});
