import { Controller, MessageEvent, Query, Req, Sse } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { OrchestratorService } from '../orchestrator.service';
import type { UserRole } from '../../auth/types/jwt-payload.type';

@Controller('orchestrator')
export class ChatController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Sse('stream')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  streamMessage(
    @Query('message') message: string,
    @Query('conversationId') conversationId: string | undefined,
    @Req() req: { user: { userId: string; role: UserRole } },
  ): Observable<MessageEvent> {
    return this.orchestrator.streamTurn(
      { message, conversationId },
      { id: req.user.userId, role: req.user.role },
    );
  }
}
