import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderAvailability } from '../../database/entities';
import { CreateProviderAvailabilityDto } from './dto/create-provider-availability.dto';

@Injectable()
export class ProviderAvailabilityService {
  constructor(
    @InjectRepository(ProviderAvailability)
    private readonly availabilityRepository: Repository<ProviderAvailability>,
  ) {}

  create(
    providerId: string,
    dto: CreateProviderAvailabilityDto,
  ): Promise<ProviderAvailability> {
    const block = this.availabilityRepository.create({ ...dto, providerId });
    return this.availabilityRepository.save(block);
  }

  findAllForProvider(providerId: string): Promise<ProviderAvailability[]> {
    return this.availabilityRepository.find({
      where: { providerId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async remove(providerId: string, id: string): Promise<void> {
    const block = await this.availabilityRepository.findOne({
      where: { id, providerId },
    });
    if (!block) {
      throw new NotFoundException(
        `Availability block ${id} not found for provider ${providerId}`,
      );
    }
    await this.availabilityRepository.remove(block);
  }
}
