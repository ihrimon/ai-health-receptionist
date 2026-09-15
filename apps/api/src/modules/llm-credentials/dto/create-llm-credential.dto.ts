import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLlmCredentialDto {
  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @IsNotEmpty()
  @IsString()
  model: string;
}
