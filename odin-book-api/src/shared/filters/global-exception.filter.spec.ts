import { InvalidCredentialsError } from '@auth/domain/errors/invalid-credentials.error.js';
import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import {
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';
import { DuplicateRelationshipError } from '@social/domain/errors/duplicate-relationship.error.js';
import { FollowRelationshipNotFoundError } from '@social/domain/errors/follow-relationship-not-found.error.js';
import { InvalidSameUserError } from '@social/domain/errors/same-user.error.js';
import { InvalidTargetError } from '@social/domain/errors/invalid-target.error.js';
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
    {
      exception: new ProfileNotFoundError('Profile not found'),
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PROFILE_NOT_FOUND',
      message: 'Profile not found',
    },
    {
      exception: new InvalidSameUserError(),
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'SELF_FOLLOW_NOT_ALLOWED',
      message: 'Users cannot follow themselves',
    },
    {
      exception: new DuplicateRelationshipError('Follow relationship already exists.'),
      statusCode: HttpStatus.CONFLICT,
      code: 'FOLLOW_RELATIONSHIP_ALREADY_EXISTS',
      message: 'Follow relationship already exists.',
    },
    {
      exception: new FollowRelationshipNotFoundError(),
      statusCode: HttpStatus.NOT_FOUND,
      code: 'FOLLOW_RELATIONSHIP_NOT_FOUND',
      message: 'Follow relationship not found.',
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

  it('returns 403 when a user attempts to manage another user’s incoming request', () => {
    const { host, status, json } = createHttpHost();
    const exception = new InvalidTargetError();

    new HttpExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: expect.any(String),
        message: exception.message,
        details: null,
      },
    });
    expect(json.mock.calls[0][0].error.code).not.toBe('INTERNAL_SERVER_ERROR');
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
