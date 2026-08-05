import { IsEnum, IsOptional } from 'class-validator';
import { CallStatus } from '../../../database/entities';

export class UpdateCallSessionDto {
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;
}
