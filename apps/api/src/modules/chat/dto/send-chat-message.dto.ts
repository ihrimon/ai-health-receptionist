import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChatTurnDto } from './chat-turn.dto';

export class SendChatMessageDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  /**
   * Every turn so far in this session, as the caller (chat UI) already
   * holds it client-side — the server no longer keeps its own copy of an
   * in-progress (unbooked) conversation, so this is the only way it knows
   * what came before. Omit/empty on the first message. See ChatService
   * for why: a conversations row is only ever created once a booking is
   * actually confirmed, not on every message.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  transcript?: ChatTurnDto[];
}
