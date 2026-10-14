import { RefreshTokenServicePort } from '@auth/application/ports/refresh-token-service.port.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomUUID } from 'node:crypto';

@Injectable()
export class RefreshTokenService implements RefreshTokenServicePort {
  constructor(private readonly configService: ConfigService) {}
  generate(): Promise<string> {
    return Promise.resolve(randomBytes(32).toString('base64url'));
  }
  hash(token: string): Promise<string> {
    return Promise.resolve(createHash('sha256').update(token, 'utf8').digest('hex'));
  }
  generateFamilyId(): Promise<string> {
    return Promise.resolve(randomUUID());
  }
  getExpirationDate(): Promise<Date> {
    const expirationTimeInSeconds =
      this.configService.getOrThrow<number>('jwt.refreshTokenTtlDays') * 24 * 60 * 60;

    return Promise.resolve(new Date(Date.now() + expirationTimeInSeconds * 1000));
  }
}
