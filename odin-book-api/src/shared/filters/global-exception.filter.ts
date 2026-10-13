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

type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

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
    }

    response.status(status).json(body);
  }
}
