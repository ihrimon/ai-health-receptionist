import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { CallStatus } from '../../database/entities';
import { CallSessionsService } from '../call-sessions/call-sessions.service';
import { VoiceController } from './voice.controller';

describe('VoiceController', () => {
  let controller: VoiceController;
  let callSessionsService: {
    findByCallSid: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const mockRequest = {
    get: jest.fn().mockReturnValue('localhost:3001'),
  } as unknown as Request;

  beforeEach(async () => {
    callSessionsService = {
      findByCallSid: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceController],
      providers: [
        { provide: CallSessionsService, useValue: callSessionsService },
      ],
    }).compile();

    controller = module.get<VoiceController>(VoiceController);
  });

  describe('handleIncomingCall', () => {
    it('creates a call session for a new CallSid and returns TwiML with a Stream', async () => {
      callSessionsService.findByCallSid.mockResolvedValue(null);

      const result = await controller.handleIncomingCall(
        { CallSid: 'CA123' },
        mockRequest,
      );

      expect(callSessionsService.create).toHaveBeenCalledWith({
        callSid: 'CA123',
      });
      expect(result).toContain('<Stream');
      expect(result).toContain('wss://localhost:3001/voice/media-stream');
    });

    it('does not create a duplicate session on a retried webhook', async () => {
      callSessionsService.findByCallSid.mockResolvedValue({
        id: 'session-1',
        callSid: 'CA123',
      });

      await controller.handleIncomingCall({ CallSid: 'CA123' }, mockRequest);

      expect(callSessionsService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleStatusCallback', () => {
    it('updates an existing session status', async () => {
      callSessionsService.findByCallSid.mockResolvedValue({
        id: 'session-1',
        callSid: 'CA123',
      });

      await controller.handleStatusCallback({
        CallSid: 'CA123',
        CallStatus: 'completed',
      });

      expect(callSessionsService.update).toHaveBeenCalledWith('session-1', {
        status: CallStatus.COMPLETED,
      });
    });

    it('does not throw for an unknown CallSid', async () => {
      callSessionsService.findByCallSid.mockResolvedValue(null);

      await expect(
        controller.handleStatusCallback({
          CallSid: 'CA999',
          CallStatus: 'completed',
        }),
      ).resolves.toEqual({ received: true });
      expect(callSessionsService.update).not.toHaveBeenCalled();
    });
  });
});
