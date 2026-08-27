import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

/**
 * A single recurring weekly time block for a provider — dayOfWeek follows
 * JS `Date#getDay()` (0 = Sunday ... 6 = Saturday). A provider can have
 * multiple blocks on the same day (e.g. a morning block and an evening
 * block), so this is deliberately NOT unique on (providerId, dayOfWeek).
 */
@Entity('provider_availability')
@Index(['providerId', 'dayOfWeek'])
export class ProviderAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => Provider, (provider) => provider.availabilityBlocks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
