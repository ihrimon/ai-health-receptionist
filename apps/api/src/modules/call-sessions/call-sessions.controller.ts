import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CallSessionsService } from './call-sessions.service';
import { CreateCallSessionDto } from './dto/create-call-session.dto';
import { UpdateCallSessionDto } from './dto/update-call-session.dto';

@Controller('call-sessions')
export class CallSessionsController {
  constructor(private readonly callSessionsService: CallSessionsService) {}

  @Post()
  create(@Body() dto: CreateCallSessionDto) {
    return this.callSessionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.callSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callSessionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCallSessionDto) {
    return this.callSessionsService.update(id, dto);
  }
}
