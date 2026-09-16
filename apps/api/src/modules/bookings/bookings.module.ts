import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { ProvidersModule } from '../providers/providers.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking]),
    GoogleCalendarModule,
    ProvidersModule,
    EmailModule,
    AuthModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
