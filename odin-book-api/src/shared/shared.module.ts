import { Module } from '@nestjs/common';
import { PrismaService } from './infrastructure/database/prisma.service.js';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}
