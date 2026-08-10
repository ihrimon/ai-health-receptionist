import { Body, Controller, Header, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CallSessionsService } from '../call-sessions/call-sessions.service';
import type {
  TwilioIncomingCallWebhookBody,
  TwilioStatusCallbackWebhookBody,
} from './interfaces/twilio-webhook.types';
import { mapTwilioCallStatus } from './map-twilio-call-status';
import { MEDIA_STREAM_PATH } from './media-stream/media-stream.gateway';
import { buildIncomingCallTwiml } from './twiml/build-incoming-call-twiml';

@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly callSessionsService: CallSessionsService) {}

  /**
   * Twilio's "A call comes in" webhook. Twilio signature validation is a
   * Phase 7 item (see docs/implementation.md §11) — not done yet.
   */
  @Post('incoming')
  @Header('Content-Type', 'text/xml')
  async handleIncomingCall(
    @Body() body: TwilioIncomingCallWebhookBody,
    @Req() req: Request,
  ): Promise<string> {
    const { CallSid: callSid } = body;

    const existing = await this.callSessionsService.findByCallSid(callSid);
    if (!existing) {
      await this.callSessionsService.create({ callSid });
      this.logger.log(`Call session created for ${callSid}`);
    } else {
      this.logger.log(`Duplicate webhook for existing call ${callSid}`);
    }

    const mediaStreamUrl = `wss://${req.get('host') ?? 'localhost'}${MEDIA_STREAM_PATH}`;
    return buildIncomingCallTwiml(mediaStreamUrl);
  }

  /** Twilio's "Call status changes" webhook. */
  @Post('status')
  async handleStatusCallback(
    @Body() body: TwilioStatusCallbackWebhookBody,
  ): Promise<{ received: true }> {
    const { CallSid: callSid, CallStatus: callStatus } = body;

    const session = await this.callSessionsService.findByCallSid(callSid);
    if (!session) {
      this.logger.warn(`Status callback for unknown call ${callSid}`);
      return { received: true };
    }

    await this.callSessionsService.update(session.id, {
      status: mapTwilioCallStatus(callStatus),
    });
    return { received: true };
  }
}
