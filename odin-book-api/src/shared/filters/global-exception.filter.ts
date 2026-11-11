import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvalidCredentialsError } from '@auth/domain/errors/invalid-credentials.error.js';
import { InvalidRefreshTokenError } from '@auth/domain/errors/invalid-refresh-token.error.js';
import { EmailAlreadyRegisteredError } from '@users/domain/errors/email-already-registered.error.js';
import { ProfileNotFoundError } from '@profiles/domain/errors/profile-not-found.error.js';
import { InvalidSameUserError } from '@social/domain/errors/same-user.error.js';
import { DuplicateRelationshipError } from '@social/domain/errors/duplicate-relationship.error.js';
import { FollowRelationshipNotFoundError } from '@social/domain/errors/follow-relationship-not-found.error.js';
import { InvalidTargetError } from '@social/domain/errors/invalid-target.error.js';

type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  | 'PROFILE_NOT_FOUND'
  | 'SELF_FOLLOW_NOT_ALLOWED'
  | 'INVALID_TARGET'
  | 'FOLLOW_RELATIONSHIP_ALREADY_EXISTS'
  | 'FOLLOW_RELATIONSHIP_NOT_FOUND';

interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details: unknown;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    let status = 500;
    let body: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        details: null,
      },
    };

    if (exception instanceof InvalidCredentialsError) {
      status = 401;
      body = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof InvalidRefreshTokenError) {
      status = 401;
      body = {
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof EmailAlreadyRegisteredError) {
      status = 409;
      body = {
        error: {
          code: 'EMAIL_ALREADY_REGISTERED',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof UnauthorizedException) {
      status = 401;
      body = {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required.',
          details: null,
        },
      };
    } else if (exception instanceof BadRequestException) {
      status = 400;

      const exceptionResponse = exception.getResponse();

      const details =
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse &&
        Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : null;

      body = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details,
        },
      };
    } else if (exception instanceof ProfileNotFoundError) {
      status = 404;
      body = {
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof InvalidSameUserError) {
      status = 400;
      body = {
        error: {
          code: 'SELF_FOLLOW_NOT_ALLOWED',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof DuplicateRelationshipError) {
      status = 409;
      body = {
        error: {
          code: 'FOLLOW_RELATIONSHIP_ALREADY_EXISTS',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof FollowRelationshipNotFoundError) {
      status = 404;
      body = {
        error: {
          code: 'FOLLOW_RELATIONSHIP_NOT_FOUND',
          message: exception.message,
          details: null,
        },
      };
    } else if (exception instanceof InvalidTargetError) {
      status = 403;
      body = {
        error: {
          code: 'INVALID_TARGET',
          message: exception.message,
          details: null,
        },
      };
    }

    response.status(status).json(body);
  }
}
