import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmCredential } from '../../database/entities';
import { CreateLlmCredentialDto } from './dto/create-llm-credential.dto';
import { UpdateLlmCredentialDto } from './dto/update-llm-credential.dto';

@Injectable()
export class LlmCredentialsService {
  constructor(
    @InjectRepository(LlmCredential)
    private readonly repository: Repository<LlmCredential>,
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
    Object.assign(credential, dto);
    return this.repository.save(credential);
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
