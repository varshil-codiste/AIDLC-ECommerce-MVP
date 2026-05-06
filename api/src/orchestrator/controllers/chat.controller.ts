import { Body, Controller, MessageEvent, Req, Sse } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { OrchestratorService, type ChatMessageDto } from '../orchestrator.service';
import type { JwtPayload } from '../../auth/types/jwt-payload.type';

@Controller('api/v1/chat')
export class ChatController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Sse('message')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  streamMessage(
    @Body() dto: ChatMessageDto,
    @Req() req: { user: JwtPayload },
  ): Observable<MessageEvent> {
    return this.orchestrator.streamTurn(dto, { id: req.user.sub, role: req.user.role });
  }
}
