import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Redirect,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('providers/:providerId/google')
export class GoogleConnectController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('connect')
  @Redirect()
  connect(@Param('providerId') providerId: string) {
    return { url: this.googleCalendarService.getAuthUrl(providerId) };
  }

  @Delete()
  @HttpCode(204)
  disconnect(@Param('providerId') providerId: string) {
    return this.googleCalendarService.disconnect(providerId);
  }
}
