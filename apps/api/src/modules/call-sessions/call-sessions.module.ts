import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSession } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { CallSessionsController } from './call-sessions.controller';
import { CallSessionsService } from './call-sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([CallSession]), AuthModule],
  controllers: [CallSessionsController],
  providers: [CallSessionsService],
  exports: [CallSessionsService],
})
export class CallSessionsModule {}
