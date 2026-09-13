import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking, ProviderGoogleAccount } from '../../database/entities';
import { GoogleAuthClient } from './google-auth.client';
import { GoogleCalendarService } from './google-calendar.service';

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let googleAuthClient: {
    getAuthUrl: jest.Mock;
    getTokens: jest.Mock;
    getCalendarClient: jest.Mock;
    revokeToken: jest.Mock;
  };
  let accountsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let bookingsRepository: { update: jest.Mock };

  const account = {
    providerId: 'provider-1',
    refreshToken: 'refresh-token',
    calendarId: 'primary',
    googleEmail: 'provider@example.com',
  };

  beforeEach(async () => {
    googleAuthClient = {
      getAuthUrl: jest.fn(),
      getTokens: jest.fn(),
      getCalendarClient: jest.fn(),
      revokeToken: jest.fn(),
    };
    accountsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    bookingsRepository = { update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        { provide: GoogleAuthClient, useValue: googleAuthClient },
        {
          provide: getRepositoryToken(ProviderGoogleAccount),
          useValue: accountsRepository,
        },
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
  });

  describe('getFreeBusy', () => {
    it('returns an empty list without calling Google when no account is connected', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      const result = await service.getFreeBusy(
        'provider-1',
        new Date('2026-08-28'),
        new Date('2026-09-01'),
      );

      expect(result).toEqual([]);
      expect(googleAuthClient.getCalendarClient).not.toHaveBeenCalled();
    });

    it('maps the freebusy response into TimeRange[]', async () => {
      accountsRepository.findOne.mockResolvedValue(account);
      const calendar = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: {
              calendars: {
                primary: {
                  busy: [
                    {
                      start: '2026-08-28T09:00:00.000Z',
                      end: '2026-08-28T10:00:00.000Z',
                    },
                  ],
                },
              },
            },
          }),
        },
      };
      googleAuthClient.getCalendarClient.mockReturnValue(calendar);

      const result = await service.getFreeBusy(
        'provider-1',
        new Date('2026-08-28'),
        new Date('2026-09-01'),
      );

      expect(result).toEqual([
        {
          start: new Date('2026-08-28T09:00:00.000Z'),
          end: new Date('2026-08-28T10:00:00.000Z'),
        },
      ]);
    });

    it('returns an empty list and logs a warning when the Google API call fails', async () => {
      accountsRepository.findOne.mockResolvedValue(account);
      googleAuthClient.getCalendarClient.mockReturnValue({
        freebusy: { query: jest.fn().mockRejectedValue(new Error('API down')) },
      });

      const result = await service.getFreeBusy(
        'provider-1',
        new Date('2026-08-28'),
        new Date('2026-09-01'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('syncBookingEvent', () => {
    const booking = {
      id: 'booking-1',
      providerId: 'provider-1',
      service: 'Consulting',
      name: 'Jane Doe',
      notes: undefined,
      startsAt: new Date('2026-08-28T09:00:00.000Z'),
      endsAt: new Date('2026-08-28T09:30:00.000Z'),
    } as Booking;

    it('is a no-op when the booking has no providerId or slot', async () => {
      await service.syncBookingEvent({ id: 'b1' } as Booking);

      expect(accountsRepository.findOne).not.toHaveBeenCalled();
    });

    it('is a no-op when the provider has no connected Google account', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      await service.syncBookingEvent(booking);

      expect(googleAuthClient.getCalendarClient).not.toHaveBeenCalled();
    });

    it('creates the event and stores the returned googleEventId', async () => {
      accountsRepository.findOne.mockResolvedValue(account);
      const calendar = {
        events: {
          insert: jest.fn().mockResolvedValue({ data: { id: 'event-1' } }),
        },
      };
      googleAuthClient.getCalendarClient.mockReturnValue(calendar);

      await service.syncBookingEvent(booking);

      expect(calendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({ calendarId: 'primary' }),
      );
      expect(bookingsRepository.update).toHaveBeenCalledWith('booking-1', {
        googleEventId: 'event-1',
      });
    });

    it('never throws when the Google API call fails', async () => {
      accountsRepository.findOne.mockResolvedValue(account);
      googleAuthClient.getCalendarClient.mockReturnValue({
        events: { insert: jest.fn().mockRejectedValue(new Error('API down')) },
      });

      await expect(service.syncBookingEvent(booking)).resolves.toBeUndefined();
      expect(bookingsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    it('creates a new account row when none exists yet', async () => {
      googleAuthClient.getTokens.mockResolvedValue({
        refreshToken: 'new-refresh',
        email: 'a@example.com',
      });
      accountsRepository.findOne.mockResolvedValue(null);
      accountsRepository.create.mockReturnValue({ providerId: 'provider-1' });
      accountsRepository.save.mockResolvedValue(undefined);

      await service.handleCallback('provider-1', 'auth-code');

      expect(accountsRepository.create).toHaveBeenCalledWith({
        providerId: 'provider-1',
      });
      expect(accountsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: 'new-refresh',
          googleEmail: 'a@example.com',
        }),
      );
    });

    it('upserts (updates) an existing account row on reconnect', async () => {
      googleAuthClient.getTokens.mockResolvedValue({
        refreshToken: 'refreshed-token',
        email: 'a@example.com',
      });
      accountsRepository.findOne.mockResolvedValue({ ...account });

      await service.handleCallback('provider-1', 'auth-code');

      expect(accountsRepository.create).not.toHaveBeenCalled();
      expect(accountsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'refreshed-token' }),
      );
    });
  });

  describe('disconnect', () => {
    it('is a no-op when no account is connected', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      await service.disconnect('provider-1');

      expect(accountsRepository.remove).not.toHaveBeenCalled();
    });

    it('best-effort revokes the token then always removes the row', async () => {
      accountsRepository.findOne.mockResolvedValue(account);
      googleAuthClient.revokeToken.mockRejectedValue(
        new Error('already revoked'),
      );

      await service.disconnect('provider-1');

      expect(accountsRepository.remove).toHaveBeenCalledWith(account);
    });
  });
});
