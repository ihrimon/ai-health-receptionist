import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCallSessionDto {
  @IsNotEmpty()
  @IsString()
  callSid: string;
}
