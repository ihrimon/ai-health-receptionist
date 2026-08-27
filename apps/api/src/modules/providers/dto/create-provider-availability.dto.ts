import { IsInt, IsMilitaryTime, Max, Min } from 'class-validator';

export class CreateProviderAvailabilityDto {
  /** 0 = Sunday ... 6 = Saturday, matching JS Date#getDay(). */
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  /** 24-hour "HH:MM" format, e.g. "09:00". */
  @IsMilitaryTime()
  startTime: string;

  @IsMilitaryTime()
  endTime: string;
}
