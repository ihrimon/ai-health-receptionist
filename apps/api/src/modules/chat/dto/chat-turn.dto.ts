import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ChatTurnDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  @IsNotEmpty()
  @IsString()
  text: string;
}
