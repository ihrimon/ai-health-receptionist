export interface TranscriptTurn {
  speaker: 'agent' | 'caller';
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  bookingId?: string;
  callSid: string;
  transcript?: TranscriptTurn[];
  summary?: string;
  duration?: number;
  createdAt: string;
}
