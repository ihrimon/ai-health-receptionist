export enum CallStatus {
  RINGING = 'ringing',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface CallSession {
  id: string;
  callSid: string;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}
