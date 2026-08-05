import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
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
}
