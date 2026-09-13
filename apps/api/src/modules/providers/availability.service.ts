import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  Provider,
  ProviderAvailability,
} from '../../database/entities';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import {
  excludeOverlapping,
  excludePastSlots,
  generateCandidateSlots,
  TimeRange,
} from './slot-math';

export interface ProviderSlots {
  providerId: string;
  providerName: string;
  slotDurationMinutes: number;
  slots: TimeRange[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Provider)
    private readonly providersRepository: Repository<Provider>,
    @InjectRepository(ProviderAvailability)
    private readonly availabilityRepository: Repository<ProviderAvailability>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async computeAvailableSlots(
    providerId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ProviderSlots> {
    const provider = await this.providersRepository.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} not found`);
    }

    const slots = await this.computeSlotsForProvider(
      provider,
      dateFrom,
      dateTo,
    );

    return {
      providerId: provider.id,
      providerName: provider.name,
      slotDurationMinutes: provider.slotDurationMinutes,
      slots,
    };
  }

  /**
   * Auto-assign: tries each active provider offering the given service, in
   * no particular priority order, and returns the first one with at least
   * one open slot in range. O(providers) — fine at "a handful of
   * providers" scale; revisit if that grows large.
   */
  async findAvailableProviderForService(
    service: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ProviderSlots | null> {
    const candidates = await this.providersRepository.find({
      where: { service, isActive: true },
    });

    for (const provider of candidates) {
      const slots = await this.computeSlotsForProvider(
        provider,
        dateFrom,
        dateTo,
      );
      if (slots.length > 0) {
        return {
          providerId: provider.id,
          providerName: provider.name,
          slotDurationMinutes: provider.slotDurationMinutes,
          slots,
        };
      }
    }

    return null;
  }

  private async computeSlotsForProvider(
    provider: Provider,
    dateFrom: string,
    dateTo: string,
  ): Promise<TimeRange[]> {
    const rangeStart = parseDateParam(dateFrom);
    const rangeEnd = parseDateParam(dateTo);
    if (rangeEnd < rangeStart) {
      throw new BadRequestException('"to" must not be before "from"');
    }

    const blocks = await this.availabilityRepository.find({
      where: { providerId: provider.id },
    });

    const rangeEndOfDay = new Date(rangeEnd.getTime() + 24 * 60 * 60_000 - 1);
    const existingBookings = await this.bookingsRepository.find({
      where: {
        providerId: provider.id,
        startsAt: Between(rangeStart, rangeEndOfDay),
      },
    });
    const busyBookingRanges: TimeRange[] = existingBookings
      .filter(
        (booking) =>
          booking.status !== BookingStatus.CANCELLED &&
          booking.startsAt &&
          booking.endsAt,
      )
      .map((booking) => ({ start: booking.startsAt!, end: booking.endsAt! }));

    const googleBusyRanges = await this.googleCalendarService.getFreeBusy(
      provider.id,
      rangeStart,
      rangeEnd,
    );

    let slots = generateCandidateSlots(
      rangeStart,
      rangeEnd,
      blocks,
      provider.slotDurationMinutes,
    );
    slots = excludeOverlapping(slots, busyBookingRanges);
    slots = excludeOverlapping(slots, googleBusyRanges);
    slots = excludePastSlots(slots, new Date());

    return slots;
  }
}

function parseDateParam(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(
      `Invalid date "${value}", expected YYYY-MM-DD`,
    );
  }
  return date;
}
