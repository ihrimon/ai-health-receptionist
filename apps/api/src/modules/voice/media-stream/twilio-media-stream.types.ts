export interface TwilioMediaStreamConnectedEvent {
  event: 'connected';
  protocol: string;
  version: string;
}

export interface TwilioMediaStreamStartEvent {
  event: 'start';
  streamSid: string;
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
}

export interface TwilioMediaStreamMediaEvent {
  event: 'media';
  streamSid: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
}

export interface TwilioMediaStreamStopEvent {
  event: 'stop';
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
}

export type TwilioMediaStreamEvent =
  | TwilioMediaStreamConnectedEvent
  | TwilioMediaStreamStartEvent
  | TwilioMediaStreamMediaEvent
  | TwilioMediaStreamStopEvent;
