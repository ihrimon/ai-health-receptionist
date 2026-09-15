import { Body, Controller, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  sendMessage(@Body() dto: SendChatMessageDto) {
    return this.chatService.sendMessage(dto);
  }

  @Post(':sessionId/rating')
  rateConversation(
    @Param('sessionId') sessionId: string,
    @Body() dto: RateConversationDto,
  ) {
    return this.chatService.rateConversation(sessionId, dto.rating);
  }
}
