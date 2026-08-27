import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { ProviderAvailability } from './provider-availability.entity';

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  service: string;

  @Column({ name: 'slot_duration_minutes', type: 'smallint', default: 30 })
  slotDurationMinutes: number;

  @Column({ default: 'Asia/Dhaka' })
  timezone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(
    () => ProviderAvailability,
    (availability) => availability.provider,
  )
  availabilityBlocks: ProviderAvailability[];

  @OneToMany(() => Booking, (booking) => booking.provider)
  bookings: Booking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
