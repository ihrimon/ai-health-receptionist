import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Which LLM provider this credential's apiKey/model belong to — determines
 * which adapter (see modules/chat/providers) LlmChatClient dispatches to.
 * Groq and OpenAI both speak the same OpenAI-compatible chat-completions
 * format; Anthropic and Gemini each have their own distinct API shape,
 * handled by dedicated adapters.
 */
export enum LlmProvider {
  GROQ = 'groq',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
}

/**
 * Admin-managed LLM API key + model pairs, replacing the old .env-based
 * GROQ_API_KEY/GROQ_MODEL config — see docs/update.md. Ordered by
 * `sortOrder` (ascending): index 0 is the default/primary credential
 * LlmKeyManager tries first, falling back to the next one in order when
 * a key hits its provider's rate limit. Each row carries its own `model`
 * (not a single global model) so keys from different providers can be
 * mixed — the whole point of moving off a Groq-only setup.
 *
 * MVP posture: apiKey stored in plaintext, matching this project's
 * already-documented Phase-7-deferred "encryption at rest" stance (see
 * provider_google_accounts.refresh_token) — not a new gap introduced
 * here.
 */
@Entity('llm_credentials')
export class LlmCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LlmProvider,
    default: LlmProvider.GROQ,
  })
  provider: LlmProvider;

  @Column({ name: 'api_key' })
  apiKey: string;

  @Column()
  model: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Usage/limit snapshot — a read-out of the provider's rate-limit
  // response headers (OpenAI-compatible: x-ratelimit-*) from the most
  // recent call made with this credential. Not live/polled (that would
  // itself burn quota) — just what the provider told us last time this
  // key was actually used, so Settings can show "how close to the limit
  // is this key" without a separate metering integration.
  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'rl_limit_requests', type: 'int', nullable: true })
  rlLimitRequests?: number;

  @Column({ name: 'rl_remaining_requests', type: 'int', nullable: true })
  rlRemainingRequests?: number;

  @Column({ name: 'rl_reset_requests', type: 'varchar', nullable: true })
  rlResetRequests?: string;

  @Column({ name: 'rl_limit_tokens', type: 'int', nullable: true })
  rlLimitTokens?: number;

  @Column({ name: 'rl_remaining_tokens', type: 'int', nullable: true })
  rlRemainingTokens?: number;

  @Column({ name: 'rl_reset_tokens', type: 'varchar', nullable: true })
  rlResetTokens?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
