import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { calendar_v3 } from '@googleapis/calendar';

const SCOPES = ['https://www.googleapis.com/auth/calendar', 'openid', 'email'];

export interface GoogleTokens {
  refreshToken: string;
  email: string;
}

/**
 * Thin wrapper around `google-auth-library` + `@googleapis/calendar` —
 * matches GroqChatClient's role as a transport layer with no domain
 * knowledge (GoogleCalendarService owns what a "connected provider" or
 * "booking sync" means). Deliberately NOT using the monolithic
 * `googleapis` package — its bundled types for ~200 APIs blow past this
 * project's TypeScript compiler heap limit (confirmed: `tsc` OOMs on
 * `import { google } from 'googleapis'` alone). The scoped
 * `@googleapis/calendar` package + `google-auth-library` avoid that.
 */
@Injectable()
export class GoogleAuthClient {
  constructor(private readonly configService: ConfigService) {}

  getAuthUrl(providerId: string): string {
    const client = this.buildClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      // Forces a refresh_token even on reconnect — Google only returns one
      // by default on a caller's very first-ever consent.
      prompt: 'consent',
      scope: SCOPES,
      state: providerId,
    });
  }

  async getTokens(code: string): Promise<GoogleTokens> {
    const client = this.buildClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        'Google did not return a refresh_token (missing access_type=offline/prompt=consent?)',
      );
    }
    if (!tokens.id_token) {
      throw new Error(
        'Google did not return an id_token (missing openid/email scope?)',
      );
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.configService.get<string>('google.clientId'),
    });
    const email = ticket.getPayload()?.email;
    if (!email) {
      throw new Error('Google id_token did not include an email claim');
    }

    return { refreshToken: tokens.refresh_token, email };
  }

  getCalendarClient(refreshToken: string): calendar_v3.Calendar {
    const client = this.buildClient();
    client.setCredentials({ refresh_token: refreshToken });
    return new calendar_v3.Calendar({ auth: client });
  }

  async revokeToken(refreshToken: string): Promise<void> {
    const client = this.buildClient();
    await client.revokeToken(refreshToken);
  }

  private buildClient(): OAuth2Client {
    return new OAuth2Client(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      this.configService.get<string>('google.redirectUri'),
    );
  }
}
