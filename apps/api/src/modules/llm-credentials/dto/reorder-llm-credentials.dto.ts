import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderLlmCredentialsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds: string[];
}
