import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLlmCredentialDto } from './create-llm-credential.dto';

export class UpdateLlmCredentialDto extends PartialType(
  CreateLlmCredentialDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
