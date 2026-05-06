import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

export interface HealthResponse {
  status: 'ok';
  ts: string;
}

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  get(): HealthResponse {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
