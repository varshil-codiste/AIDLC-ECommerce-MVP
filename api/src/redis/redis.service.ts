import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, ttlSeconds, value);
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  pipeline(): ReturnType<Redis['pipeline']> {
    return this.client.pipeline();
  }

  xadd(
    stream: string,
    ...args: Parameters<Redis['xadd']>[1][]
  ): Promise<string | null> {
    return this.client.xadd(stream, '*', ...args);
  }

  hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async xreadMessages(stream: string, id: string, count = 50): Promise<Array<{ id: string; data: Record<string, string> }>> {
    const result = await (this.client.xread as (...args: unknown[]) => Promise<Array<[string, Array<[string, string[]]>]> | null>)(
      'COUNT', count, 'STREAMS', stream, id,
    );
    if (!result || result.length === 0) return [];
    const entries = result[0][1];
    return entries.map(([entryId, fields]) => {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length - 1; i += 2) {
        data[fields[i]] = fields[i + 1];
      }
      return { id: entryId, data };
    });
  }
}
