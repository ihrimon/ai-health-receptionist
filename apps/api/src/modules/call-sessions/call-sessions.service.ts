import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallStatus } from '../../database/entities';
import { CreateCallSessionDto } from './dto/create-call-session.dto';
import { UpdateCallSessionDto } from './dto/update-call-session.dto';

@Injectable()
export class CallSessionsService {
  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionsRepository: Repository<CallSession>,
  ) {}

  create(dto: CreateCallSessionDto): Promise<CallSession> {
    const session = this.callSessionsRepository.create({
      ...dto,
      status: CallStatus.RINGING,
      startedAt: new Date(),
    });
    return this.callSessionsRepository.save(session);
  }

  findAll(): Promise<CallSession[]> {
    return this.callSessionsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CallSession> {
    const session = await this.callSessionsRepository.findOne({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException(`Call session ${id} not found`);
    }
    return session;
  }

  findByCallSid(callSid: string): Promise<CallSession | null> {
    return this.callSessionsRepository.findOne({ where: { callSid } });
  }

  async update(id: string, dto: UpdateCallSessionDto): Promise<CallSession> {
    const session = await this.findOne(id);
    Object.assign(session, dto);
    if (
      dto.status &&
      [CallStatus.COMPLETED, CallStatus.FAILED].includes(dto.status) &&
      !session.endedAt
    ) {
      session.endedAt = new Date();
    }
    return this.callSessionsRepository.save(session);
  }
}
