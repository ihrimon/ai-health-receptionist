import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('providers')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * Auto-assign: finds the first active provider offering `service` with
   * an open slot in range. Registered before `:id/availability/slots`
   * (different segment shape either way, but kept first for clarity) so
   * a literal "availability" path segment is never mistaken for a
   * provider id.
   */
  @Get('availability/slots')
  async findAvailableProvider(
    @Query('service') service: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!service) {
      throw new BadRequestException('"service" query param is required');
    }
    requireDateParams(from, to);

    const result =
      await this.availabilityService.findAvailableProviderForService(
        service,
        from,
        to,
      );
    if (!result) {
      throw new NotFoundException(
        `No available provider found for service "${service}" between ${from} and ${to}`,
      );
    }
    return result;
  }

  @Get(':id/availability/slots')
  findSlotsForProvider(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    requireDateParams(from, to);
    return this.availabilityService.computeAvailableSlots(id, from, to);
  }
}

function requireDateParams(from: string, to: string): void {
  if (!from || !to) {
    throw new BadRequestException('"from" and "to" query params are required');
  }
}
