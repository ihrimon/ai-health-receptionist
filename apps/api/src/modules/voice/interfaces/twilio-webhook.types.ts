/**
 * Twilio POSTs these as `application/x-www-form-urlencoded` bodies with many
 * more fields than we use. Kept as plain interfaces (not class-validator
 * classes) so the global `ValidationPipe` (`forbidNonWhitelisted: true`)
 * doesn't reject the extra fields Twilio sends.
 */
export interface TwilioIncomingCallWebhookBody {
  CallSid: string;
  From?: string;
  To?: string;
  CallStatus?: string;
  [key: string]: string | undefined;
}

export interface TwilioStatusCallbackWebhookBody {
  CallSid: string;
  CallStatus: string;
  [key: string]: string | undefined;
}
