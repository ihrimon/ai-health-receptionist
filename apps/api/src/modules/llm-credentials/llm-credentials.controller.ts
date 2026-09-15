import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateLlmCredentialDto } from './dto/create-llm-credential.dto';
import { ReorderLlmCredentialsDto } from './dto/reorder-llm-credentials.dto';
import { UpdateLlmCredentialDto } from './dto/update-llm-credential.dto';
import { LlmCredentialsService } from './llm-credentials.service';

/**
 * Admin-only — the whole point is these API keys aren't in .env/source
 * control anymore, so this is the only place they're readable. The
 * dashboard additionally re-prompts for the admin password before
 * showing this page at all (see apps/dashboard's Settings page); this
 * guard is the actual enforcement, that re-prompt is a UX speed bump on
 * top of it.
 */
@Controller('llm-credentials')
@UseGuards(AdminAuthGuard)
export class LlmCredentialsController {
  constructor(private readonly llmCredentialsService: LlmCredentialsService) {}

  @Get()
  findAll() {
    return this.llmCredentialsService.findAllOrdered();
  }

  @Post()
  create(@Body() dto: CreateLlmCredentialDto) {
    return this.llmCredentialsService.create(dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderLlmCredentialsDto) {
    return this.llmCredentialsService.reorder(dto.orderedIds);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLlmCredentialDto) {
    return this.llmCredentialsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.llmCredentialsService.remove(id);
  }
}
