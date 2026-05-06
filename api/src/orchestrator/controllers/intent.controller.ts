import { Body, Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { ConfirmationGuard } from '../confirmation/confirmation.guard';
import { OrchestratorService, type IntentDto } from '../orchestrator.service';
import type { JwtPayload } from '../../auth/types/jwt-payload.type';

@Controller('api/v1/orchestrator')
export class IntentController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Sse('intent')
  @UseGuards(ConfirmationGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  streamIntent(@Body() dto: IntentDto, @Req() req: { user: JwtPayload }): Observable<MessageEvent> {
    return this.orchestrator.streamIntent(dto, { id: req.user.sub, role: req.user.role });
  }
}
