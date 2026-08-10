import { twiml } from 'twilio';

/**
 * Hands the call over to our Media Streams WebSocket endpoint. Actual audio
 * handling (STT/TTS) is Phase 3 — Phase 2 only proves the call can be
 * connected to a live bidirectional stream.
 */
export function buildIncomingCallTwiml(mediaStreamUrl: string): string {
  const response = new twiml.VoiceResponse();
  response.connect().stream({ url: mediaStreamUrl });
  return response.toString();
}
