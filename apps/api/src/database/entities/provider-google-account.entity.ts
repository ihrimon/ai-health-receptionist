import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

/**
 * One connected Google account per provider (unique on providerId) — used
 * to read busy time (freebusy) and write confirmed-booking events.
 * refreshToken is stored in plaintext for MVP, matching this project's
 * documented Phase-7-deferred "encryption at rest" posture — see
 * docs/implementation.md.
 */
@Entity('provider_google_accounts')
export class ProviderGoogleAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', unique: true })
  providerId: string;

  @OneToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ name: 'google_email' })
  googleEmail: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'calendar_id', default: 'primary' })
  calendarId: string;

  @CreateDateColumn({ name: 'connected_at' })
  connectedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
