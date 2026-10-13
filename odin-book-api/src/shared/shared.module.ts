import { Module } from '@nestjs/common';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { PasswordHasherService } from './password-hasher/password-hasher.service.js';

@Module({
  providers: [PrismaService, PasswordHasherService],
  exports: [PrismaService, PasswordHasherService],
})
export class SharedModule {}
