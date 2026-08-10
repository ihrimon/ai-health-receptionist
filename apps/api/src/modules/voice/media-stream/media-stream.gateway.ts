import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Server as HttpServer, IncomingMessage } from 'http';
import type { Socket } from 'net';
import { WebSocket, WebSocketServer } from 'ws';
import { CallStatus } from '../../../database/entities';
import { CallSessionsService } from '../../call-sessions/call-sessions.service';
import { TwilioMediaStreamEvent } from './twilio-media-stream.types';

export const MEDIA_STREAM_PATH = '/voice/media-stream';

/**
 * Handles Twilio's raw Media Streams WebSocket protocol directly (not via
 * @nestjs/websockets — Twilio's `{event: ...}` frames don't fit that
 * module's socket.io/ws gateway envelope). Attaches to the same HTTP server
 * Nest already listens on, keeping everything on one port.
 *
 * Phase 2 scope: prove the stream connects and track call lifecycle. Actual
 * audio forwarding to Deepgram is Phase 3.
 */
@Injectable()
export class MediaStreamGateway implements OnModuleInit {
  private readonly logger = new Logger(MediaStreamGateway.name);
  private wss?: WebSocketServer;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly callSessionsService: CallSessionsService,
  ) {}

  onModuleInit(): void {
    const httpServer =
      this.httpAdapterHost.httpAdapter.getHttpServer() as HttpServer;
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on(
      'upgrade',
      (request: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = new URL(request.url ?? '', 'http://localhost');
        if (pathname !== MEDIA_STREAM_PATH) {
          return;
        }
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.handleConnection(ws);
        });
      },
    );
  }

  private handleConnection(ws: WebSocket): void {
    let callSid: string | undefined;

    ws.on('message', (raw: Buffer) => {
      let message: TwilioMediaStreamEvent;
      try {
        message = JSON.parse(raw.toString()) as TwilioMediaStreamEvent;
      } catch {
        this.logger.warn('Received non-JSON media stream frame');
        return;
      }

      switch (message.event) {
        case 'connected':
          this.logger.log('Media stream connected');
          break;
        case 'start':
          callSid = message.start.callSid;
          this.logger.log(`Media stream started for call ${callSid}`);
          void this.markInProgress(callSid);
          break;
        case 'media':
          // Phase 3: forward message.media.payload (base64 mulaw audio) to Deepgram STT.
          break;
        case 'stop':
          this.logger.log(
            `Media stream stopped for call ${message.stop.callSid}`,
          );
          break;
      }
    });

    ws.on('close', () => {
      this.logger.log(
        `Media stream closed${callSid ? ` for call ${callSid}` : ''}`,
      );
    });
  }

  private async markInProgress(callSid: string): Promise<void> {
    const session = await this.callSessionsService.findByCallSid(callSid);
    if (!session) {
      this.logger.warn(`No call session found for callSid ${callSid}`);
      return;
    }
    await this.callSessionsService.update(session.id, {
      status: CallStatus.IN_PROGRESS,
    });
  }
}
