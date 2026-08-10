import { Module } from '@nestjs/common';
import { CallSessionsModule } from '../call-sessions/call-sessions.module';
import { MediaStreamGateway } from './media-stream/media-stream.gateway';
import { VoiceController } from './voice.controller';

@Module({
  imports: [CallSessionsModule],
  controllers: [VoiceController],
  providers: [MediaStreamGateway],
})
export class VoiceModule {}
