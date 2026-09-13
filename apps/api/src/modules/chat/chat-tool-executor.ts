import { Injectable, Logger } from '@nestjs/common';
import {
  AvailabilityService,
  ProviderSlots,
} from '../providers/availability.service';
import { ProvidersService } from '../providers/providers.service';
import { TimeRange, toDhakaLocal } from '../providers/slot-math';

export interface FindAvailableSlotsArgs {
  service: string;
  providerName?: string;
  dateFrom?: string;
  dateTo?: string;
}

const DEFAULT_WINDOW_DAYS = 13;
const MAX_WINDOW_DAYS = 30;
const MAX_SLOTS_RETURNED = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// slot-math.ts's slot computation is hardcoded to a fixed Asia/Dhaka offset
// regardless of Provider.timezone (that column isn't consulted anywhere in
// availability math yet) — reporting the actual column here would imply
// per-provider timezone support that doesn't exist. Keep this in sync with
// slot-math.ts's DHAKA_OFFSET_MINUTES assumption.
const TIMEZONE_LABEL = 'Asia/Dhaka';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Executes tools the chat LLM calls mid-conversation. Kept separate from
 * ChatService so this branching logic (auto-assign vs named-provider vs
 * ambiguous vs no-match) is independently unit-testable, matching this
 * repo's convention of small single-purpose services. Every method here
 * must resolve into tool-result content the model can react to — never
 * throw, or the whole turn crashes instead of the model just re-asking.
 */
@Injectable()
export class ChatToolExecutor {
  private readonly logger = new Logger(ChatToolExecutor.name);

  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly providersService: ProvidersService,
  ) {}

  /**
   * Args come straight from the model's tool-call JSON — untrusted, so
   * fields are read defensively rather than trusted as FindAvailableSlotsArgs.
   */
  async findAvailableSlots(
    rawArgs: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const service = readString(rawArgs.service);
    if (!service) {
      return { error: 'missing_service' };
    }
    const providerName = readString(rawArgs.providerName);

    try {
      const { dateFrom, dateTo } = resolveDateRange(
        readString(rawArgs.dateFrom),
        readString(rawArgs.dateTo),
      );

      const result = providerName
        ? await this.resolveNamedProvider(
            providerName,
            service,
            dateFrom,
            dateTo,
          )
        : await this.availabilityService.findAvailableProviderForService(
            service,
            dateFrom,
            dateTo,
          );

      if (!result) {
        return { error: 'no_provider_for_service', service };
      }
      if ('error' in result) {
        return result;
      }
      if (result.slots.length === 0) {
        return {
          error: 'no_slots_available',
          providerId: result.providerId,
          providerName: result.providerName,
          dateFrom,
          dateTo,
        };
      }

      return {
        providerId: result.providerId,
        providerName: result.providerName,
        service,
        timezone: TIMEZONE_LABEL,
        slots: result.slots.slice(0, MAX_SLOTS_RETURNED).map(formatSlot),
        truncated: result.slots.length > MAX_SLOTS_RETURNED,
      };
    } catch (err) {
      this.logger.warn(
        `find_available_slots failed: ${(err as Error).message}`,
      );
      return { error: 'lookup_failed' };
    }
  }

  private async resolveNamedProvider(
    providerName: string,
    service: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ProviderSlots | { error: string; [key: string]: unknown } | null> {
    const matches = await this.providersService.findActiveByExactNameAndService(
      providerName,
      service,
    );
    if (matches.length === 0) {
      return { error: 'provider_not_found', providerName, service };
    }
    if (matches.length > 1) {
      return {
        error: 'ambiguous_provider',
        providerName,
        candidates: matches.map((provider) => provider.name),
      };
    }
    return this.availabilityService.computeAvailableSlots(
      matches[0].id,
      dateFrom,
      dateTo,
    );
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function resolveDateRange(
  dateFrom: string | undefined,
  dateTo: string | undefined,
): { dateFrom: string; dateTo: string } {
  const from = dateFrom ?? toDateString(new Date());
  const maxTo = addDays(from, MAX_WINDOW_DAYS);
  const requestedTo = dateTo ?? addDays(from, DEFAULT_WINDOW_DAYS);
  // YYYY-MM-DD strings compare lexicographically = chronologically
  const to = requestedTo > maxTo ? maxTo : requestedTo;
  return { dateFrom: from, dateTo: to };
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return toDateString(new Date(date.getTime() + days * MS_PER_DAY));
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Formats a UTC slot instant as Dhaka-local strings — the model must never do this timezone math itself. */
function formatSlot(range: TimeRange): {
  date: string;
  time: string;
  label: string;
} {
  const local = toDhakaLocal(range.start);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const hours24 = local.getUTCHours();
  const minutes = local.getUTCMinutes();

  const date = `${year}-${pad2(month + 1)}-${pad2(day)}`;
  const time = `${pad2(hours24)}:${pad2(minutes)}`;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const label = `${DAY_NAMES[local.getUTCDay()]}, ${MONTH_NAMES[month]} ${day} at ${hours12}:${pad2(minutes)} ${period}`;

  return { date, time, label };
}
