export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AvailabilityBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * MVP assumption: a single fixed UTC offset for Asia/Dhaka (no DST, so this
 * never drifts). If this ever needs to support multiple timezones, swap
 * this whole file for a real timezone library (e.g. luxon) instead of
 * patching the offset.
 */
const DHAKA_OFFSET_MINUTES = 6 * 60;

/** Shifts a UTC instant by the fixed Dhaka offset so its UTC getters read as Dhaka wall-clock values. */
export function toDhakaLocal(date: Date): Date {
  return new Date(date.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
}

/** 0 = Sunday ... 6 = Saturday, matching JS Date#getDay(), evaluated in Dhaka time. */
export function dhakaDayOfWeek(date: Date): number {
  return toDhakaLocal(date).getUTCDay();
}

/** Combines a UTC calendar date with an "HH:MM"[:SS] Dhaka-local time-of-day into the real UTC Date instant. */
export function combineDateAndDhakaTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const local = toDhakaLocal(date);
  const localInstant = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    hours,
    minutes,
  );
  return new Date(localInstant - DHAKA_OFFSET_MINUTES * 60_000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function overlapsAny(
  start: Date,
  end: Date,
  ranges: TimeRange[],
): boolean {
  return ranges.some((range) =>
    rangesOverlap(start, end, range.start, range.end),
  );
}

/**
 * Generates every candidate slot (no exclusions applied yet) for a
 * provider's weekly availability template over [dateFrom, dateTo]
 * (inclusive, UTC-midnight-aligned calendar dates). A slot whose end would
 * exceed its block's endTime is dropped rather than truncated.
 */
export function generateCandidateSlots(
  dateFrom: Date,
  dateTo: Date,
  blocks: AvailabilityBlock[],
  slotDurationMinutes: number,
): TimeRange[] {
  const blocksByDay = new Map<number, AvailabilityBlock[]>();
  for (const block of blocks) {
    const existing = blocksByDay.get(block.dayOfWeek) ?? [];
    existing.push(block);
    blocksByDay.set(block.dayOfWeek, existing);
  }

  const slots: TimeRange[] = [];
  const cursor = new Date(
    Date.UTC(
      dateFrom.getUTCFullYear(),
      dateFrom.getUTCMonth(),
      dateFrom.getUTCDate(),
    ),
  );
  const end = new Date(
    Date.UTC(
      dateTo.getUTCFullYear(),
      dateTo.getUTCMonth(),
      dateTo.getUTCDate(),
    ),
  );

  while (cursor <= end) {
    const dayBlocks = blocksByDay.get(dhakaDayOfWeek(cursor)) ?? [];

    for (const block of dayBlocks) {
      const blockStart = combineDateAndDhakaTime(cursor, block.startTime);
      const blockEnd = combineDateAndDhakaTime(cursor, block.endTime);

      let slotStart = blockStart;
      while (addMinutes(slotStart, slotDurationMinutes) <= blockEnd) {
        const slotEnd = addMinutes(slotStart, slotDurationMinutes);
        slots.push({ start: slotStart, end: slotEnd });
        slotStart = slotEnd;
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}

export function excludeOverlapping(
  slots: TimeRange[],
  busyRanges: TimeRange[],
): TimeRange[] {
  return slots.filter((slot) => !overlapsAny(slot.start, slot.end, busyRanges));
}

export function excludePastSlots(slots: TimeRange[], now: Date): TimeRange[] {
  return slots.filter((slot) => slot.start >= now);
}
