import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Booking } from '../../database/entities';
import { EmailService } from '../email/email.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { ProvidersService } from '../providers/providers.service';
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
    private readonly providersService: ProvidersService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    // `dto.startsAt`/`endsAt` are ISO strings (validated by @IsISO8601 on
    // the DTO) — repository.create() does a shallow assign with no type
    // coercion, so without this the entity's `startsAt`/`endsAt` would
    // stay strings in memory (fine for Postgres, which parses them on
    // INSERT, but breaks anything here that calls .toISOString() on them
    // before a fresh DB read, e.g. GoogleCalendarService.syncBookingEvent).
    const booking = this.bookingsRepository.create({
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
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

    // Same never-fail-the-booking principle — EmailService itself already
    // no-ops silently when unconfigured, this only guards against an
    // actual send failure (bad credentials, provider outage, etc.).
    try {
      const providerName = saved.providerId
        ? (await this.providersService.findOne(saved.providerId)).name
        : undefined;
      await this.emailService.sendBookingConfirmation(saved, providerName);
    } catch (err) {
      this.logger.warn(
        `Unexpected error sending booking confirmation email for ${saved.id}: ${(err as Error).message}`,
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
