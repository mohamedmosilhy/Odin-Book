import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import type { PasswordHasherPort } from './password-hasher.port.js';

@Injectable()
export class PasswordHasherService implements PasswordHasherPort {
  constructor(private readonly config: ConfigService) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.getOrThrow<number>('passwordHashing.memoryCost'),
      timeCost: this.config.getOrThrow<number>('passwordHashing.timeCost'),
      parallelism: this.config.getOrThrow<number>('passwordHashing.parallelism'),
    });
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, plainText);
  }
}
