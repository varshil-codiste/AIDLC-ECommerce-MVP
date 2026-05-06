import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfirmationService } from './confirmation.service';
import { DESTRUCTIVE_INTENTS } from './destructive-intents.const';
import type { WidgetIntent } from '../types/orchestrator.types';

export interface IntentDto {
  intent: WidgetIntent;
  conversationId: string;
  intentId?: string;
}

@Injectable()
export class ConfirmationGuard implements CanActivate {
  private readonly logger = new Logger(ConfirmationGuard.name);

  constructor(private readonly confirmationService: ConfirmationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ body: IntentDto; user: { id: string } }>();
    const { intent, intentId } = req.body;
    const intentType = intent?.intent;

    if (!DESTRUCTIVE_INTENTS.has(intentType)) return true;

    // Confirmation.confirm / .cancel pass through immediately
    if (intentType === 'confirmation.confirm' || intentType === 'confirmation.cancel') return true;

    if (!intentId) {
      this.logger.warn({ event: 'confirmation.required', intentType });
      // Signal to controller: destructive intent needs confirmation_prompt
      (req as Record<string, unknown>)['requiresConfirmation'] = true;
      return true; // Guard passes; controller checks the flag and emits confirmation_prompt
    }

    const pending = await this.confirmationService.retrieve(intentId);
    if (!pending || pending.userId !== req.user.id) {
      this.logger.warn({ event: 'confirmation.mismatch', intentId });
      (req as Record<string, unknown>)['requiresConfirmation'] = true;
      return true;
    }

    return true;
  }
}
