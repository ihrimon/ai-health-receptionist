import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @ManyToOne(() => Booking, (booking) => booking.conversations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'call_sid' })
  callSid: string;

  @Column({ type: 'jsonb', nullable: true })
  transcript?: Record<string, unknown>[];

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'int', nullable: true, comment: 'duration in seconds' })
  duration?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '1-5 star rating the caller gave this conversation',
  })
  rating?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
