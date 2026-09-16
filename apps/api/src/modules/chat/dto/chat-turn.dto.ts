import { IsIn, IsString } from 'class-validator';

export class ChatTurnDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  // Deliberately NOT @IsNotEmpty(): ChatService now guards against ever
  // emitting an empty model reply (see EMPTY_REPLY_FALLBACK), but a
  // browser that already has an old empty turn cached in its
  // sessionStorage transcript re-sends it on every later message —
  // rejecting the whole request would permanently 400-lock that
  // conversation instead of just harmlessly passing an empty turn to
  // the model.
  @IsString()
  text: string;
}
