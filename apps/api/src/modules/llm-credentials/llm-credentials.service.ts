import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmCredential, LlmProvider } from '../../database/entities';
import { ProviderRegistry } from '../chat/providers/provider-registry';
import { CreateLlmCredentialDto } from './dto/create-llm-credential.dto';
import { UpdateLlmCredentialDto } from './dto/update-llm-credential.dto';

@Injectable()
export class LlmCredentialsService {
  constructor(
    @InjectRepository(LlmCredential)
    private readonly repository: Repository<LlmCredential>,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  findAllOrdered(): Promise<LlmCredential[]> {
    return this.repository.find({ order: { sortOrder: 'ASC' } });
  }

  /** Only the active ones, in rotation order — what LlmKeyManager actually uses. */
  async findActiveOrdered(): Promise<LlmCredential[]> {
    const all = await this.findAllOrdered();
    return all.filter((c) => c.isActive);
  }

  async create(dto: CreateLlmCredentialDto): Promise<LlmCredential> {
    await this.validateCredential(dto.provider, dto.apiKey, dto.model);
    const maxOrder = await this.repository
      .createQueryBuilder('c')
      .select('MAX(c.sort_order)', 'max')
      .getRawOne<{ max: number | null }>();
    const credential = this.repository.create({
      ...dto,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });
    return this.repository.save(credential);
  }

  async update(
    id: string,
    dto: UpdateLlmCredentialDto,
  ): Promise<LlmCredential> {
    const credential = await this.findOne(id);
    // Only re-validate when the key or model actually changed — pure
    // isActive toggles and reorders shouldn't burn a real API call.
    if (dto.apiKey !== undefined || dto.model !== undefined) {
      await this.validateCredential(
        dto.provider ?? credential.provider,
        dto.apiKey ?? credential.apiKey,
        dto.model ?? credential.model,
      );
    }
    Object.assign(credential, dto);
    return this.repository.save(credential);
  }

  /**
   * Makes one real (minimal) completion call so a bad API key or a
   * mistyped/deprecated model id ("gemini-2.0-flash" after Google retired
   * it) surfaces immediately on the Settings page instead of only in
   * production logs the next time the chat assistant happens to rotate to
   * this credential.
   */
  private async validateCredential(
    provider: LlmProvider,
    apiKey: string,
    model: string,
  ): Promise<void> {
    const adapter = this.providerRegistry.get(provider);
    try {
      await adapter.complete({
        apiKey,
        model,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Couldn't verify this ${provider} credential — the provider rejected it: ${detail}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const credential = await this.findOne(id);
    await this.repository.remove(credential);
  }

  /** Re-numbers sort_order to match the given id order — used by the settings UI's drag/move-up-down reordering. */
  async reorder(orderedIds: string[]): Promise<LlmCredential[]> {
    const all = await this.findAllOrdered();
    if (
      orderedIds.length !== all.length ||
      !all.every((c) => orderedIds.includes(c.id))
    ) {
      throw new BadRequestException(
        'orderedIds must contain exactly the existing credential ids',
      );
    }
    await Promise.all(
      orderedIds.map((id, index) =>
        this.repository.update({ id }, { sortOrder: index }),
      ),
    );
    return this.findAllOrdered();
  }

  /**
   * Best-effort — called from LlmKeyManager right after a chat completion
   * call (success or 429) to persist the provider's rate-limit headers
   * for that credential. Never allowed to fail the chat turn: a write
   * error here is logged and swallowed by the caller, not surfaced.
   */
  async recordUsage(
    id: string,
    snapshot: Pick<
      LlmCredential,
      | 'rlLimitRequests'
      | 'rlRemainingRequests'
      | 'rlResetRequests'
      | 'rlLimitTokens'
      | 'rlRemainingTokens'
      | 'rlResetTokens'
    >,
  ): Promise<void> {
    await this.repository.update(
      { id },
      { ...snapshot, lastUsedAt: new Date() },
    );
  }

  private async findOne(id: string): Promise<LlmCredential> {
    const credential = await this.repository.findOne({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`LLM credential ${id} not found`);
    }
    return credential;
  }
}
