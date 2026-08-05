import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsNotEmpty()
  @IsString()
  callSid: string;

  @IsOptional()
  transcript?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsInt()
  duration?: number;
}
