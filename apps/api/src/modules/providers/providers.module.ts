import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  Provider,
  ProviderAvailability,
} from '../../database/entities';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { ProviderAvailabilityController } from './provider-availability.controller';
import { ProviderAvailabilityService } from './provider-availability.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, ProviderAvailability, Booking]),
    GoogleCalendarModule,
  ],
  controllers: [
    ProvidersController,
    ProviderAvailabilityController,
    AvailabilityController,
  ],
  providers: [
    ProvidersService,
    ProviderAvailabilityService,
    AvailabilityService,
  ],
  exports: [ProvidersService, ProviderAvailabilityService, AvailabilityService],
})
export class ProvidersModule {}
