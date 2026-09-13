import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from './booking-status.enum';
import { Conversation } from './conversation.entity';
import { Provider } from './provider.entity';

/**
 * Concurrency guard against double-booking the same provider+slot — must
 * be declared here, not just in the SQL migration, or TypeORM's
 * `synchronize: true` (dev-only, see database.module.ts) silently DROPS
 * it on the next app start: synchronize doesn't just add missing schema,
 * it removes anything present in the DB but absent from entity metadata.
 * Confirmed live: the migration-created index disappeared after starting
 * `pnpm --filter api dev` once, with no error — a second insert at an
 * identical provider+slot succeeded when it should have been rejected.
 */
@Entity('bookings')
@Index('idx_bookings_provider_slot', ['providerId', 'startsAt'], {
  unique: true,
  where: `"status" <> 'cancelled' AND "provider_id" IS NOT NULL`,
})
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

  @Column({ name: 'provider_id', nullable: true })
  providerId?: string;

  @ManyToOne(() => Provider, (provider) => provider.bookings, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'provider_id' })
  provider?: Provider;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ name: 'google_event_id', nullable: true })
  googleEventId?: string;

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
