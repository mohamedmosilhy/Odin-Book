import { InvalidCredentialsError } from '@auth/domain/errors/invalid-credentials.error.js';
import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import {
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { HttpExceptionFilter } from './global-exception.filter.js';

describe('HttpExceptionFilter', () => {
  function createHttpHost() {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  it.each([
    {
      exception: new InvalidCredentialsError(),
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    },
    {
      exception: new InvalidRefreshTokenError(),
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Please login again.',
    },
    {
      exception: new EmailAlreadyRegisteredError(),
      statusCode: HttpStatus.CONFLICT,
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'An account with this email already exists.',
    },
  ])('maps $code to the uniform error envelope', ({ exception, statusCode, code, message }) => {
    const { host, status, json } = createHttpHost();
    const filter = new HttpExceptionFilter();

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(statusCode);
    expect(json).toHaveBeenCalledWith({
      error: { code, message, details: null },
    });
  });

  it('maps guard failures to UNAUTHENTICATED without exposing JWT details', () => {
    const { host, status, json } = createHttpHost();
    const filter = new HttpExceptionFilter();

    filter.catch(new UnauthorizedException('jwt expired at 2026-10-13'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        details: null,
      },
    });
  });

  it('preserves validation messages as field-level details', () => {
    const { host, status, json } = createHttpHost();
    const filter = new HttpExceptionFilter();
    const details = ['email must be an email', 'password must be longer than 8 characters'];

    filter.catch(new BadRequestException({ message: details }), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details,
      },
    });
  });

  it('does not expose unexpected internal error details', () => {
    const { host, status, json } = createHttpHost();
    const filter = new HttpExceptionFilter();

    filter.catch(new Error('database password appeared here'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        details: null,
      },
    });
  });
});
