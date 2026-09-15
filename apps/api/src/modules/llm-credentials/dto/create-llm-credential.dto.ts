import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LlmProvider } from '../../../database/entities';

export class CreateLlmCredentialDto {
  @IsEnum(LlmProvider)
  provider: LlmProvider;

  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @IsNotEmpty()
  @IsString()
  model: string;
}
