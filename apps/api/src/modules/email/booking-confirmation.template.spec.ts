import { Booking } from '../../database/entities';
import { buildBookingConfirmationEmail } from './booking-confirmation.template';

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    name: 'Jane Doe',
    phone: '+15550001111',
    email: 'jane@example.com',
    service: 'Cardiology',
    preferredDate: '2026-09-20',
    preferredTime: '14:30:00',
    status: 'confirmed',
    ...overrides,
  } as Booking;
}

describe('buildBookingConfirmationEmail', () => {
  it('includes the patient name, service, formatted date/time, and a short reference in the subject and body', () => {
    const { subject, html } = buildBookingConfirmationEmail(makeBooking());

    expect(subject).toContain('Cardiology');
    expect(subject).toContain('Sunday, September 20, 2026');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Cardiology');
    expect(html).toContain('Sunday, September 20, 2026');
    expect(html).toContain('2:30 PM');
    expect(html).toContain('#A1B2C3D4');
  });

  it('includes the doctor name only when one is passed', () => {
    const withDoctor = buildBookingConfirmationEmail(
      makeBooking(),
      'Dr. Smith',
    );
    const withoutDoctor = buildBookingConfirmationEmail(makeBooking());

    expect(withDoctor.html).toContain('Dr. Smith');
    expect(withoutDoctor.html).not.toContain('Doctor');
  });

  it('includes notes when present, and omits the notes block otherwise', () => {
    const withNotes = buildBookingConfirmationEmail(
      makeBooking({ notes: 'Please arrive 10 minutes early.' }),
    );
    const withoutNotes = buildBookingConfirmationEmail(makeBooking());

    expect(withNotes.html).toContain('Please arrive 10 minutes early.');
    expect(withoutNotes.html).not.toContain('Notes:');
  });

  it('escapes HTML-significant characters in user-supplied fields', () => {
    const { html } = buildBookingConfirmationEmail(
      makeBooking({ name: '<script>alert(1)</script>' }),
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('formats midnight and noon correctly (12-hour boundary)', () => {
    const midnight = buildBookingConfirmationEmail(
      makeBooking({ preferredTime: '00:00:00' }),
    );
    const noon = buildBookingConfirmationEmail(
      makeBooking({ preferredTime: '12:00:00' }),
    );

    expect(midnight.html).toContain('12:00 AM');
    expect(noon.html).toContain('12:00 PM');
  });
});
