import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from './booking-status.enum';
import { Conversation } from './conversation.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  company?: string;

  @Column()
  service: string;

  @Column({ nullable: true })
  budget?: string;

  @Column({ type: 'date', name: 'preferred_date' })
  preferredDate: string;

  @Column({ type: 'time', name: 'preferred_time' })
  preferredTime: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @OneToMany(() => Conversation, (conversation) => conversation.booking)
  conversations: Conversation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
