import { LoginUseCase } from '@auth/application/use-cases/login.use-case.js';
import { RegisterUseCase } from '@auth/application/use-cases/register.use-case.js';
import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto.js';

import { type Request, type Response } from 'express';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshUseCase } from '@auth/application/use-cases/refresh.use-case.js';
import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import { LogoutUseCase } from '@auth/application/use-cases/logout.use-case.js';

import { Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@shared/guards/auth.guard.js';
import { GooglePassportGuard } from '../guards/google-passport.guard.js';
import { GoogleOAuthCallbackUseCase } from '@auth/application/use-cases/google-oauth-callback.use-case.js';
import { type GoogleOAuthRequest } from '../types/google-oauth-request.js';
import { ConfigService } from '@nestjs/config';

type AuthenticatedRequest = Request & {
  user: { id: string };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly googleOAuthCallbackUseCase: GoogleOAuthCallbackUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Res({ passthrough: true }) response: Response, @Body() body: RegisterDto) {
    const res = await this.registerUseCase.execute(body.email, body.password);

    response.cookie('refresh_token', res.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return {
      user: {
        id: res.user.id,
        email: res.user.email,
      },
      accessToken: res.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Res({ passthrough: true }) response: Response, @Body() body: LoginDto) {
    const result = await this.loginUseCase.execute(body.email, body.password);

    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Res({ passthrough: true }) response: Response, @Req() request: Request) {
    const refreshToken = request.cookies.refresh_token;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new InvalidRefreshTokenError();
    }

    const result = await this.refreshUseCase.execute(refreshToken);

    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.refresh_token;

    if (typeof refreshToken === 'string') {
      await this.logoutUseCase.execute(refreshToken);
    }

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  @Get('protected')
  @UseGuards(AuthGuard)
  async protectedRoute(@Req() request: AuthenticatedRequest) {
    return { userId: request.user.id };
  }

  @Get('google')
  @UseGuards(GooglePassportGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GooglePassportGuard)
  async googleAuthCallback(@Req() request: GoogleOAuthRequest, @Res() response: Response) {
    const result = await this.googleOAuthCallbackUseCase.execute(request.user);

    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    const frontendUrl = this.configService
      .getOrThrow<string>('cors.frontendUrl')
      .replace(/\/+$/, '');

    response.redirect(
      302,
      `${frontendUrl}/oauth/callback#accessToken=${encodeURIComponent(result.accessToken)}`,
    );
  }
}
