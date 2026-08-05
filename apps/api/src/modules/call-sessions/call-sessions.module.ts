import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSession } from '../../database/entities';
import { CallSessionsController } from './call-sessions.controller';
import { CallSessionsService } from './call-sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([CallSession])],
  controllers: [CallSessionsController],
  providers: [CallSessionsService],
  exports: [CallSessionsService],
})
export class CallSessionsModule {}
