import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, ProviderGoogleAccount } from '../../database/entities';
import { TimeRange } from '../providers/slot-math';
import { GoogleAuthClient } from './google-auth.client';

/**
 * Google Calendar sync never blocks or fails the caller — a provider
 * without a connected account is a normal no-op (silent), an actual API
 * failure is caught and logged. Same resilience principle as
 * ChatService's knowledge-retrieval fallback and the chat tool loop.
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly googleAuthClient: GoogleAuthClient,
    @InjectRepository(ProviderGoogleAccount)
    private readonly accountsRepository: Repository<ProviderGoogleAccount>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  getAuthUrl(providerId: string): string {
    return this.googleAuthClient.getAuthUrl(providerId);
  }

  async handleCallback(providerId: string, code: string): Promise<void> {
    const { refreshToken, email } = await this.googleAuthClient.getTokens(code);

    const existing = await this.accountsRepository.findOne({
      where: { providerId },
    });
    const account = existing ?? this.accountsRepository.create({ providerId });
    account.refreshToken = refreshToken;
    account.googleEmail = email;
    await this.accountsRepository.save(account);
  }

  async disconnect(providerId: string): Promise<void> {
    const account = await this.accountsRepository.findOne({
      where: { providerId },
    });
    if (!account) {
      return;
    }

    try {
      await this.googleAuthClient.revokeToken(account.refreshToken);
    } catch (err) {
      this.logger.warn(
        `Failed to revoke Google token for provider ${providerId}: ${(err as Error).message}`,
      );
    }
    await this.accountsRepository.remove(account);
  }

  async getFreeBusy(
    providerId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<TimeRange[]> {
    const account = await this.accountsRepository.findOne({
      where: { providerId },
    });
    if (!account) {
      return [];
    }

    try {
      const calendar = this.googleAuthClient.getCalendarClient(
        account.refreshToken,
      );
      const { data } = await calendar.freebusy.query({
        requestBody: {
          timeMin: dateFrom.toISOString(),
          timeMax: dateTo.toISOString(),
          items: [{ id: account.calendarId }],
        },
      });

      const busy = data.calendars?.[account.calendarId]?.busy ?? [];
      return busy
        .filter((period) => period.start && period.end)
        .map((period) => ({
          start: new Date(period.start!),
          end: new Date(period.end!),
        }));
    } catch (err) {
      this.logger.warn(
        `Google freebusy lookup failed for provider ${providerId}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  async syncBookingEvent(booking: Booking): Promise<void> {
    if (!booking.providerId || !booking.startsAt || !booking.endsAt) {
      return;
    }

    const account = await this.accountsRepository.findOne({
      where: { providerId: booking.providerId },
    });
    if (!account) {
      return;
    }

    try {
      const calendar = this.googleAuthClient.getCalendarClient(
        account.refreshToken,
      );
      const { data } = await calendar.events.insert({
        calendarId: account.calendarId,
        requestBody: {
          summary: `${booking.service} — ${booking.name}`,
          description: booking.notes,
          start: { dateTime: booking.startsAt.toISOString() },
          end: { dateTime: booking.endsAt.toISOString() },
        },
      });

      if (data.id) {
        await this.bookingsRepository.update(booking.id, {
          googleEventId: data.id,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Google Calendar event sync failed for booking ${booking.id}: ${(err as Error).message}`,
      );
    }
  }
}
