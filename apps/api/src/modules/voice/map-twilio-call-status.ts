import { CallStatus } from '../../database/entities';

/**
 * Twilio's CallStatus values (queued/ringing/in-progress/completed/busy/
 * failed/no-answer/canceled) don't map 1:1 onto our 4-value CallStatus enum.
 * Expanding the enum would mean touching both the TypeORM entity and the
 * mirrored SQL migration for a taxonomy change that's out of scope here, so
 * busy/no-answer/canceled all collapse to FAILED — from the booking agent's
 * perspective they're all "the call didn't result in a booking."
 */
export function mapTwilioCallStatus(twilioStatus: string): CallStatus {
  switch (twilioStatus) {
    case 'queued':
    case 'ringing':
      return CallStatus.RINGING;
    case 'in-progress':
      return CallStatus.IN_PROGRESS;
    case 'completed':
      return CallStatus.COMPLETED;
    case 'busy':
    case 'failed':
    case 'no-answer':
    case 'canceled':
      return CallStatus.FAILED;
    default:
      return CallStatus.FAILED;
  }
}
