import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Booking } from '../../database/entities';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    const booking = this.bookingsRepository.create(dto);
    let saved: Booking;
    try {
      saved = await this.bookingsRepository.save(booking);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'That time slot was just booked by someone else.',
        );
      }
      throw err;
    }

    // Calendar sync must never fail booking creation — GoogleCalendarService
    // already catches internally, this is belt-and-suspenders.
    try {
      await this.googleCalendarService.syncBookingEvent(saved);
    } catch (err) {
      this.logger.warn(
        `Unexpected error syncing booking ${saved.id} to Google Calendar: ${(err as Error).message}`,
      );
    }

    return saved;
  }

  findAll(): Promise<Booking[]> {
    return this.bookingsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findOne(id);
    Object.assign(booking, dto);
    return this.bookingsRepository.save(booking);
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    await this.bookingsRepository.remove(booking);
  }
}
