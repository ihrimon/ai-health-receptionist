import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { ProviderAvailabilityService } from './provider-availability.service';
import { CreateProviderAvailabilityDto } from './dto/create-provider-availability.dto';

@Controller('providers/:providerId/availability')
@UseGuards(AdminAuthGuard)
export class ProviderAvailabilityController {
  constructor(
    private readonly availabilityService: ProviderAvailabilityService,
  ) {}

  @Post()
  create(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderAvailabilityDto,
  ) {
    return this.availabilityService.create(providerId, dto);
  }

  @Get()
  findAll(@Param('providerId') providerId: string) {
    return this.availabilityService.findAllForProvider(providerId);
  }

  @Delete(':id')
  remove(@Param('providerId') providerId: string, @Param('id') id: string) {
    return this.availabilityService.remove(providerId, id);
  }
}
