import { Booking } from '../../database/entities';

export interface BookingConfirmationEmail {
  subject: string;
  html: string;
}

const BRAND_COLOR = '#4f46e5';

/**
 * Table-based layout with only inline styles — the safe subset that
 * renders consistently across Gmail, Outlook desktop (which uses Word's
 * rendering engine, not a browser), and mobile mail apps. No external
 * CSS/fonts/flex/grid.
 */
export function buildBookingConfirmationEmail(
  booking: Booking,
  providerName?: string,
): BookingConfirmationEmail {
  const subject = `Appointment confirmed: ${booking.service} on ${formatDate(booking.preferredDate)}`;
  const reference = booking.id.slice(0, 8).toUpperCase();

  const rows = [
    ['Service', booking.service],
    ...(providerName ? [['Doctor', providerName]] : []),
    ['Date', formatDate(booking.preferredDate)],
    ['Time', formatTime(booking.preferredTime)],
    ['Reference', `#${reference}`],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eef0f4;color:#6b7280;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eef0f4;color:#111827;font-size:14px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background-color:${BRAND_COLOR};padding:36px 32px;text-align:center;">
            <div style="width:56px;height:56px;border-radius:50%;background-color:rgba(255,255,255,0.15);line-height:56px;margin:0 auto 16px;font-size:28px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">&#10003;</div>
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Appointment Confirmed</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#111827;font-size:15px;font-family:Arial,Helvetica,sans-serif;">
              Hi ${escapeHtml(booking.name)},
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              Your appointment has been successfully booked. Here are the details:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${detailRows}
            </table>
            ${
              booking.notes
                ? `<p style="margin:0 0 24px;padding:12px 16px;background-color:#f9fafb;border-radius:10px;color:#4b5563;font-size:13px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                    <strong style="color:#111827;">Notes:</strong> ${escapeHtml(booking.notes)}
                  </p>`
                : ''
            }
            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              Need to reschedule or cancel? Just reply to this email or contact us directly.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:#f9fafb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
              Sent by BrainStack AI Receptionist
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return { subject, html };
}

/** "2026-09-20" -> "Sunday, September 20, 2026" (UTC-anchored so the calendar date never shifts by server timezone). */
function formatDate(preferredDate: string): string {
  const date = new Date(`${preferredDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** "14:30:00" / "14:30" -> "2:30 PM". */
function formatTime(preferredTime: string): string {
  const [hourStr, minuteStr] = preferredTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr ?? '0', 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
