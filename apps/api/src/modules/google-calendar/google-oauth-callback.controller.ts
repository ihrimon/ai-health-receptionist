import { Controller, Get, Logger, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GoogleCalendarService } from './google-calendar.service';

/**
 * Path is a literal match for GOOGLE_REDIRECT_URI as registered in Google
 * Cloud Console — this app has no global route prefix, so this controller
 * carries the "/api" segment itself rather than the whole app adopting one.
 */
@Controller('api/auth/google')
export class GoogleOAuthCallbackController {
  private readonly logger = new Logger(GoogleOAuthCallbackController.name);

  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('callback')
  async callback(
    @Req() req: Request,
    @Query('code') code?: string,
    @Query('state') providerId?: string,
    @Query('error') error?: string,
  ): Promise<string> {
    this.logger.warn(`TEMP DEBUG callback originalUrl: ${req.originalUrl}`);
    if (error) {
      return `Google Calendar connection was not completed (${error}). You can close this tab and try again.`;
    }
    if (!code || !providerId) {
      return 'Missing code or provider — please restart the connection from /providers/:providerId/google/connect.';
    }

    try {
      await this.googleCalendarService.handleCallback(providerId, code);
      return 'Google Calendar connected successfully. You can close this tab.';
    } catch (err) {
      this.logger.warn(
        `Google OAuth callback failed for provider ${providerId}: ${(err as Error).message}`,
      );
      return 'Sorry, something went wrong connecting Google Calendar — please try again from /providers/:providerId/google/connect.';
    }
  }
}
