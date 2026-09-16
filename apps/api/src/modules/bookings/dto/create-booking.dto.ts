import {
  IsDateString,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

// 24-hour "HH:MM" (optionally ":SS"), what combineDateAndDhakaTime (see
// providers/slot-math.ts) actually parses. Without this, a malformed
// value the chat LLM invents instead of reusing a real find_available_slots
// result (e.g. "2:30 PM") sails through validation as a plain non-empty
// string, then crashes combineDateAndDhakaTime's Date.UTC/toISOString
// with an uncaught RangeError — a 500 instead of the graceful "couldn't
// quite save that" retry prompt every other invalid record_booking call
// already gets.
const TIME_HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsNotEmpty()
  @IsString()
  service: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsNotEmpty()
  @IsDateString()
  preferredDate: string;

  @IsNotEmpty()
  @IsString()
  @Matches(TIME_HH_MM_PATTERN, {
    message: 'preferredTime must be in 24-hour HH:MM format',
  })
  preferredTime: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  // Server-computed (from providerId + preferredDate/preferredTime) — never
  // accepted directly from the chat LLM, see ChatService.sendMessage().
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
