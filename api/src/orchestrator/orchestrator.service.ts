import { Inject, Injectable, Logger, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, merge, interval, from } from 'rxjs';
import { catchError, finalize, map, takeUntil } from 'rxjs/operators';
import { trace } from '@opentelemetry/api';
import { randomUUID } from 'crypto';
import { AGENT_REGISTRY, type AgentRegistry } from './agents/agent.interface';
import { LLM_PROVIDER, type ILlmProvider } from './llm/llm-provider.interface';
import { ConfirmationService } from './confirmation/confirmation.service';
import { DashboardDigestService } from './dashboard/dashboard-digest.service';
import { ConversationRepository } from './repositories/conversation.repository';
import { redactPii } from './utils/pii-redactor';
import { DESTRUCTIVE_INTENTS } from './confirmation/destructive-intents.const';
import { LlmCostMeterService } from '../telemetry/llm-cost-meter.service';
import { requestContext } from '../common/context/request-context';
import type {
  AgentInput,
  AgentName,
  AgentOutput,
  ProblemDetails,
  SseEvent,
  WidgetIntent,
} from './types/orchestrator.types';
import type { UserRole } from '../auth/types/jwt-payload.type';

const MAX_HANDOFF_DEPTH = 3;

export interface ChatMessageDto {
  conversationId?: string;
  message: string;
}

export interface IntentDto {
  conversationId: string;
  intent: WidgetIntent;
  intentId?: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly defaultBudget;

  constructor(
    @Inject(AGENT_REGISTRY) private readonly agentRegistry: AgentRegistry,
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly config: ConfigService,
    private readonly confirmationService: ConfirmationService,
    private readonly dashboardDigestService: DashboardDigestService,
    private readonly conversationRepo: ConversationRepository,
    private readonly costMeter: LlmCostMeterService,
  ) {
    this.defaultBudget = {
      maxTokensIn: this.config.get<number>('LLM_MAX_TOKENS_IN', 4000),
      maxTokensOut: this.config.get<number>('LLM_MAX_TOKENS_OUT', 800),
      softDeadlineMs: this.config.get<number>('LLM_SOFT_DEADLINE_MS', 8000),
    };
  }

  streamTurn(dto: ChatMessageDto, user: { id: string; role: UserRole }): Observable<MessageEvent> {
    const events$ = new Subject<SseEvent>();
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId ?? requestContext.getStore()?.traceId ?? 'N/A';

    this.logger.log({
      event: 'turn.start',
      userId: user.id,
      role: user.role,
      traceId,
      message: redactPii(dto.message),
    });

    const done$ = new Subject<void>();
    void this.executeTurn(dto, user, events$, traceId).finally(() => {
      events$.complete();
      done$.next();
      done$.complete();
    });

    const heartbeat$ = interval(15_000).pipe(
      map(() => ({ data: '' }) as MessageEvent),
      takeUntil(done$),
    );

    return merge(events$.pipe(map((e) => this.toMessageEvent(e))), heartbeat$).pipe(
      catchError((err: unknown) => {
        const problem = this.toProblem(err);
        return from([this.toMessageEvent({ event: 'error', data: problem })]);
      }),
      finalize(() => this.logger.log({ event: 'turn.closed', userId: user.id, traceId })),
    );
  }

  streamIntent(dto: IntentDto, user: { id: string; role: UserRole }): Observable<MessageEvent> {
    const events$ = new Subject<SseEvent>();
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId ?? requestContext.getStore()?.traceId ?? 'N/A';

    const done$ = new Subject<void>();
    void this.executeIntent(dto, user, events$, traceId).finally(() => {
      events$.complete();
      done$.next();
      done$.complete();
    });

    const heartbeat$ = interval(15_000).pipe(
      map(() => ({ data: '' }) as MessageEvent),
      takeUntil(done$),
    );

    return merge(events$.pipe(map((e) => this.toMessageEvent(e))), heartbeat$).pipe(
      catchError((err: unknown) => {
        const problem = this.toProblem(err);
        return from([this.toMessageEvent({ event: 'error', data: problem })]);
      }),
      finalize(() => this.logger.log({ event: 'intent.closed', userId: user.id, traceId })),
    );
  }

  private async executeTurn(
    dto: ChatMessageDto,
    user: { id: string; role: UserRole },
    events$: Subject<SseEvent>,
    traceId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepo.findOrCreate(
      user.id,
      user.role,
      dto.conversationId,
    );
    const conversationId = conversation.id;

    await this.conversationRepo.saveUserMessage(conversationId, user.id, dto.message);

    // Merchant first-turn: emit dashboard digest
    const isFirst = await this.conversationRepo.isFirstTurn(conversationId);
    if (isFirst && user.role === 'merchant') {
      try {
        const widget = await this.dashboardDigestService.buildDigest();
        events$.next({ event: 'widget', data: widget });
      } catch {
        events$.next({
          event: 'token',
          data: { delta: 'Welcome back! (Dashboard data unavailable right now.)\n' },
        });
      }
    }

    const priorContext = await this.conversationRepo.getPriorContext(conversationId);
    const agentInput: AgentInput = {
      requestId: randomUUID(),
      conversationId,
      user,
      message: dto.message,
      priorContext,
      budget: { ...this.defaultBudget },
    };

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCostUsd = 0;
    let assistantContent = '';
    let widgetPayload: object | undefined;
    let widgetType: string | undefined;

    await this.dispatchToAgent('router', agentInput, events$, 0, {
      onText: (content, t) => {
        assistantContent += content;
        totalTokensIn += t.in;
        totalTokensOut += t.out;
        totalCostUsd += t.cost;
      },
      onWidget: (w, t) => {
        widgetPayload = w.data;
        widgetType = w.type;
        totalTokensIn += t.in;
        totalTokensOut += t.out;
        totalCostUsd += t.cost;
      },
    });

    const msgId = await this.conversationRepo.saveAssistantMessage(
      conversationId,
      assistantContent,
      {
        widgetType,
        widgetPayload,
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        costUsd: totalCostUsd,
        traceId,
      },
    );

    if (totalTokensIn > 0) {
      this.costMeter.record({
        model: this.llm.modelName,
        inputTokens: totalTokensIn,
        outputTokens: totalTokensOut,
        calledAt: new Date(),
      });
    }

    events$.next({
      event: 'done',
      data: {
        messageId: msgId,
        usage: { tokensIn: totalTokensIn, tokensOut: totalTokensOut, costUsd: totalCostUsd },
      },
    });
  }

  private async executeIntent(
    dto: IntentDto,
    user: { id: string; role: UserRole },
    events$: Subject<SseEvent>,
    traceId: string,
  ): Promise<void> {
    const { intent, conversationId, intentId } = dto;
    const intentType = intent.intent;

    // Handle cancel
    if (intentType === 'confirmation.cancel' && intentId) {
      await this.confirmationService.cancel(intentId);
      events$.next({
        event: 'done',
        data: { messageId: randomUUID(), usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 } },
      });
      return;
    }

    // Handle confirm
    if (intentType === 'confirmation.confirm' && intentId) {
      const pending = await this.confirmationService.consume(intentId);
      if (!pending || pending.userId !== user.id) {
        events$.next({
          event: 'error',
          data: {
            type: 'https://errors.ecommmer-aidlc/confirmation.expired',
            title: 'Confirmation expired or not found',
            status: 410,
          },
        });
        events$.next({
          event: 'done',
          data: { messageId: randomUUID(), usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 } },
        });
        return;
      }
      // Resume with the original intent as message context
      await this.executeTurn(
        { conversationId, message: `[resumed: ${pending.originalIntent.intent}]` },
        user,
        events$,
        traceId,
      );
      return;
    }

    // Destructive without intentId: emit confirmation_prompt
    if (DESTRUCTIVE_INTENTS.has(intentType)) {
      const newIntentId = randomUUID();
      await this.confirmationService.store(newIntentId, {
        userId: user.id,
        originalIntent: intent,
        agentName: 'noop',
        conversationId,
      });
      events$.next({
        event: 'widget',
        data: {
          type: 'confirmation_prompt',
          data: {
            message: 'This action cannot be undone. Are you sure?',
            confirmAction: { intent: 'confirmation.confirm', original_intent_id: newIntentId },
            cancelAction: { intent: 'confirmation.cancel', original_intent_id: newIntentId },
          },
        },
      });
      events$.next({
        event: 'done',
        data: { messageId: randomUUID(), usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 } },
      });
      return;
    }

    // Non-destructive widget intent: dispatch as message
    await this.executeTurn(
      { conversationId, message: `[intent: ${intentType}] ${JSON.stringify(intent)}` },
      user,
      events$,
      traceId,
    );
  }

  private async dispatchToAgent(
    agentName: AgentName | string,
    input: AgentInput,
    events$: Subject<SseEvent>,
    depth: number,
    callbacks: {
      onText: (c: string, t: { in: number; out: number; cost: number }) => void;
      onWidget: (
        w: { type: string; data: Record<string, unknown> },
        t: { in: number; out: number; cost: number },
      ) => void;
    },
  ): Promise<void> {
    if (depth > MAX_HANDOFF_DEPTH) {
      this.logger.error({ event: 'agent.handoff.cycle', depth, agentName });
      events$.next({
        event: 'error',
        data: {
          type: 'https://errors.ecommmer-aidlc/agent.handoff.cycle',
          title: 'Agent coordination failed',
          status: 500,
        },
      });
      return;
    }

    const agent = this.agentRegistry.get(agentName) ?? this.agentRegistry.get('noop')!;

    for await (const output of agent.execute(input)) {
      await this.handleAgentOutput(output, input, events$, depth, callbacks);
    }
  }

  private async handleAgentOutput(
    output: AgentOutput,
    input: AgentInput,
    events$: Subject<SseEvent>,
    depth: number,
    callbacks: Parameters<OrchestratorService['dispatchToAgent']>[4],
  ): Promise<void> {
    if (output.type === 'text') {
      events$.next({ event: 'token', data: { delta: output.content } });
      callbacks.onText(output.content, {
        in: output.tokensIn,
        out: output.tokensOut,
        cost: output.costUsd,
      });
    } else if (output.type === 'widget') {
      events$.next({ event: 'widget', data: output.widget });
      callbacks.onWidget(output.widget, {
        in: output.tokensIn,
        out: output.tokensOut,
        cost: output.costUsd,
      });
    } else if (output.type === 'handoff') {
      await this.dispatchToAgent(output.toAgent, input, events$, depth + 1, callbacks);
    } else if (output.type === 'error') {
      events$.next({ event: 'error', data: output.problem });
    }
  }

  private toMessageEvent(e: SseEvent): MessageEvent {
    return { type: e.event, data: JSON.stringify(e.data) } as unknown as MessageEvent;
  }

  private toProblem(err: unknown): ProblemDetails {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return { type: 'https://errors.ecommmer-aidlc/internal', title: msg, status: 500 };
  }
}
