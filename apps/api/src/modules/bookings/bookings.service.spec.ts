import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { Booking } from '../../database/entities';
import { EmailService } from '../email/email.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { ProvidersService } from '../providers/providers.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let repository: { create: jest.Mock; save: jest.Mock };
  let googleCalendarService: { syncBookingEvent: jest.Mock };
  let providersService: { findOne: jest.Mock };
  let emailService: { sendBookingConfirmation: jest.Mock };

  beforeEach(async () => {
    repository = { create: jest.fn(), save: jest.fn() };
    googleCalendarService = {
      syncBookingEvent: jest.fn().mockResolvedValue(undefined),
    };
    providersService = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'provider-1', name: 'Dr. Smith' }),
    };
    emailService = {
      sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: repository },
        { provide: GoogleCalendarService, useValue: googleCalendarService },
        { provide: ProvidersService, useValue: providersService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('creates and saves a new booking', async () => {
    const dto = {
      name: 'Jane Doe',
      phone: '+15550001111',
      email: 'jane@example.com',
      service: 'Consulting',
      preferredDate: '2026-09-01',
      preferredTime: '14:00',
    };
    repository.create.mockReturnValue({ ...dto });
    repository.save.mockResolvedValue({ id: 'booking-1', ...dto });

    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'booking-1', ...dto });
  });

  it('maps a unique-violation (double-booked slot) to ConflictException', async () => {
    repository.create.mockReturnValue({});
    repository.save.mockRejectedValue(
      new QueryFailedError('insert into bookings...', [], {
        name: 'error',
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      } as unknown as Error),
    );

    await expect(service.create({} as never)).rejects.toThrow(
      ConflictException,
    );
    expect(googleCalendarService.syncBookingEvent).not.toHaveBeenCalled();
  });

  it('rethrows unrelated database errors as-is', async () => {
    repository.create.mockReturnValue({});
    repository.save.mockRejectedValue(new Error('connection lost'));

    await expect(service.create({} as never)).rejects.toThrow(
      'connection lost',
    );
  });

  it('syncs the saved booking to Google Calendar', async () => {
    const saved = { id: 'booking-1', providerId: 'provider-1' };
    repository.create.mockReturnValue({});
    repository.save.mockResolvedValue(saved);

    await service.create({} as never);

    expect(googleCalendarService.syncBookingEvent).toHaveBeenCalledWith(saved);
  });

  it('still returns the saved booking even if Google Calendar sync fails unexpectedly', async () => {
    const saved = { id: 'booking-1', providerId: 'provider-1' };
    repository.create.mockReturnValue({});
    repository.save.mockResolvedValue(saved);
    googleCalendarService.syncBookingEvent.mockRejectedValue(
      new Error('unexpected sync failure'),
    );

    const result = await service.create({} as never);

    expect(result).toEqual(saved);
  });

  it('sends a confirmation email with the assigned doctor name looked up by providerId', async () => {
    const saved = { id: 'booking-1', providerId: 'provider-1' };
    repository.create.mockReturnValue({});
    repository.save.mockResolvedValue(saved);

    await service.create({} as never);

    expect(providersService.findOne).toHaveBeenCalledWith('provider-1');
    expect(emailService.sendBookingConfirmation).toHaveBeenCalledWith(
      saved,
      'Dr. Smith',
    );
  });

  it('sends a confirmation email without a doctor name when no provider is assigned', async () => {
    const saved = { id: 'booking-1', providerId: undefined };
    repository.create.mockReturnValue({});
    repository.save.mockResolvedValue(saved);

    await service.create({} as never);

    expect(providersService.findOne).not.toHaveBeenCalled();
    expect(emailService.sendBookingConfirmation).toHaveBeenCalledWith(
      saved,
      undefined,
    );
  });

  it('still returns the saved booking even if sending the confirmation email fails unexpectedly', async () => {
    const saved = { id: 'booking-1', providerId: undefined };
    repository.create.mockReturnValue({});
    repository.save.mockResolvedValue(saved);
    emailService.sendBookingConfirmation.mockRejectedValue(
      new Error('smtp failure'),
    );

    const result = await service.create({} as never);

    expect(result).toEqual(saved);
  });
});
