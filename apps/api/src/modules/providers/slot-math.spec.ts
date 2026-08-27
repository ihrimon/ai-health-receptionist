import {
  combineDateAndDhakaTime,
  dhakaDayOfWeek,
  excludeOverlapping,
  excludePastSlots,
  generateCandidateSlots,
} from './slot-math';

// 2026-08-22 is a Saturday, 2026-08-24 is a Monday, 2026-08-26 is a
// Wednesday — matching the plan's Doctor A example (Sat/Mon/Wed blocks).
const SATURDAY = new Date('2026-08-22T00:00:00.000Z');
const MONDAY = new Date('2026-08-24T00:00:00.000Z');
const WEDNESDAY = new Date('2026-08-26T00:00:00.000Z');

describe('dhakaDayOfWeek', () => {
  it('resolves the correct day of week in Asia/Dhaka (UTC+6)', () => {
    expect(dhakaDayOfWeek(SATURDAY)).toBe(6);
    expect(dhakaDayOfWeek(MONDAY)).toBe(1);
    expect(dhakaDayOfWeek(WEDNESDAY)).toBe(3);
  });
});

describe('combineDateAndDhakaTime', () => {
  it('converts a Dhaka-local time to the correct UTC instant', () => {
    // 07:00 Dhaka time (UTC+6) = 01:00 UTC the same calendar day.
    const result = combineDateAndDhakaTime(SATURDAY, '07:00');
    expect(result.toISOString()).toBe('2026-08-22T01:00:00.000Z');
  });
});

describe('generateCandidateSlots', () => {
  it('generates 30-minute slots within a single block', () => {
    const slots = generateCandidateSlots(
      SATURDAY,
      SATURDAY,
      [{ dayOfWeek: 6, startTime: '07:00', endTime: '08:00' }],
      30,
    );

    expect(slots).toHaveLength(2);
    expect(slots[0].start.toISOString()).toBe('2026-08-22T01:00:00.000Z');
    expect(slots[0].end.toISOString()).toBe('2026-08-22T01:30:00.000Z');
    expect(slots[1].start.toISOString()).toBe('2026-08-22T01:30:00.000Z');
    expect(slots[1].end.toISOString()).toBe('2026-08-22T02:00:00.000Z');
  });

  it('drops a trailing slot that would exceed the block end time', () => {
    // 45-minute slots in a 07:00-08:00 block: 07:00-07:45 fits, but the
    // next one (07:45-08:30) would exceed 08:00, so only 1 slot.
    const slots = generateCandidateSlots(
      SATURDAY,
      SATURDAY,
      [{ dayOfWeek: 6, startTime: '07:00', endTime: '08:00' }],
      45,
    );

    expect(slots).toHaveLength(1);
  });

  it('supports multiple blocks on the same day (e.g. morning + evening)', () => {
    const slots = generateCandidateSlots(
      SATURDAY,
      SATURDAY,
      [
        { dayOfWeek: 6, startTime: '07:00', endTime: '08:00' },
        { dayOfWeek: 6, startTime: '18:00', endTime: '19:00' },
      ],
      30,
    );

    expect(slots).toHaveLength(4);
  });

  it("only generates slots for days matching the block's dayOfWeek", () => {
    const slots = generateCandidateSlots(
      SATURDAY,
      WEDNESDAY,
      [
        { dayOfWeek: 1, startTime: '16:00', endTime: '17:00' }, // Monday only
      ],
      30,
    );

    expect(slots).toHaveLength(2); // just the Monday block, not Sat/Sun/Tue/Wed
    expect(dhakaDayOfWeek(slots[0].start)).toBe(1);
  });

  it('returns nothing for a provider with no availability blocks', () => {
    expect(generateCandidateSlots(SATURDAY, WEDNESDAY, [], 30)).toEqual([]);
  });
});

describe('excludeOverlapping', () => {
  it('removes exactly the slot that overlaps an existing booking', () => {
    const slots = generateCandidateSlots(
      SATURDAY,
      SATURDAY,
      [{ dayOfWeek: 6, startTime: '07:00', endTime: '08:00' }],
      30,
    );
    expect(slots).toHaveLength(2);

    const busy = [
      {
        start: new Date('2026-08-22T01:00:00.000Z'),
        end: new Date('2026-08-22T01:30:00.000Z'),
      },
    ];

    const result = excludeOverlapping(slots, busy);

    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-08-22T01:30:00.000Z');
  });

  it('keeps all slots when there is no overlap', () => {
    const slots = generateCandidateSlots(
      SATURDAY,
      SATURDAY,
      [{ dayOfWeek: 6, startTime: '07:00', endTime: '08:00' }],
      30,
    );

    const busy = [
      {
        start: new Date('2026-08-22T10:00:00.000Z'),
        end: new Date('2026-08-22T10:30:00.000Z'),
      },
    ];

    expect(excludeOverlapping(slots, busy)).toHaveLength(2);
  });
});

describe('excludePastSlots', () => {
  it('drops slots that start before "now"', () => {
    const slots = generateCandidateSlots(
      SATURDAY,
      SATURDAY,
      [{ dayOfWeek: 6, startTime: '07:00', endTime: '08:00' }],
      30,
    );

    const now = new Date('2026-08-22T01:15:00.000Z'); // between the two slots
    const result = excludePastSlots(slots, now);

    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-08-22T01:30:00.000Z');
  });
});
