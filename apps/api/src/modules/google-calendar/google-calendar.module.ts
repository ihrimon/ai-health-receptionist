import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, ProviderGoogleAccount } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthClient } from './google-auth.client';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleConnectController } from './google-connect.controller';
import { GoogleOAuthCallbackController } from './google-oauth-callback.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderGoogleAccount, Booking]),
    AuthModule,
  ],
  controllers: [GoogleConnectController, GoogleOAuthCallbackController],
  providers: [GoogleAuthClient, GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
