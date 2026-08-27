import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../../database/entities';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providersRepository: Repository<Provider>,
  ) {}

  create(dto: CreateProviderDto): Promise<Provider> {
    const provider = this.providersRepository.create(dto);
    return this.providersRepository.save(provider);
  }

  findAll(): Promise<Provider[]> {
    return this.providersRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Provider> {
    const provider = await this.providersRepository.findOne({
      where: { id },
    });
    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }
    return provider;
  }

  async update(id: string, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.findOne(id);
    Object.assign(provider, dto);
    return this.providersRepository.save(provider);
  }

  async remove(id: string): Promise<void> {
    const provider = await this.findOne(id);
    await this.providersRepository.remove(provider);
  }
}
