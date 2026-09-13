import {
  IsDateString,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

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
