import {
  BadRequestException,
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { IDEMPOTENT_KEY } from './decorators/idempotent.decorator';
import {
  IdempotencyService,
} from './idempotency.service';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isIdempotent = this.reflector.get<boolean>(
      IDEMPOTENT_KEY,
      context.getHandler(),
    );
    if (!isIdempotent) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = req.headers['idempotency-key'] as string | undefined;

    if (!key) {
      throw new BadRequestException({
        code: 'idempotency.key.missing',
        message: 'Idempotency-Key header is required for this endpoint.',
      });
    }

    const userId: string = (req as Request & { user?: { sub: string } }).user
      ?.sub ?? '';
    const fingerprint = IdempotencyService.computeFingerprint(
      req.method,
      req.path,
      req.body,
    );

    const result = await this.idempotencyService.check(key, userId, fingerprint);

    if ('conflict' in result) {
      throw new ConflictException({
        code: `idempotency.key.${result.reason}`,
        message:
          result.reason === 'expired'
            ? 'Idempotency key has expired. Generate a new key and retry.'
            : 'Idempotency key reused with a different request body.',
      });
    }

    if (result.hit) {
      res.status(result.responseStatus).json(result.responseBody);
      return false;
    }

    (req as Request & { _idempotencyKey?: string; _idempotencyFingerprint?: string })._idempotencyKey = key;
    (req as Request & { _idempotencyKey?: string; _idempotencyFingerprint?: string })._idempotencyFingerprint = fingerprint;
    return true;
  }
}
