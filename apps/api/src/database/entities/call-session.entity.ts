import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CallStatus } from './call-status.enum';

@Entity('call_sessions')
export class CallSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'call_sid', unique: true })
  callSid: string;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.RINGING,
  })
  status: CallStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
