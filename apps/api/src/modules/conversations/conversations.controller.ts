import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
@UseGuards(AdminAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.conversationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }
}
