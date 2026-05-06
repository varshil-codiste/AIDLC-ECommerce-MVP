import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const PROMPT_VERSIONS: Record<string, string> = {
  orchestrator: '1.0.0',
  'noop-agent': '1.0.0',
  'product-agent': '1.1.0',
  'order-agent': '1.1.0',
  'customer-agent': '1.0.0',
  'notification-agent': '1.0.0',
  'cart-agent': '1.0.0',
  'checkout-agent': '1.0.0',
};

@Injectable()
export class PromptLoaderService implements OnModuleInit {
  private readonly logger = new Logger(PromptLoaderService.name);
  private readonly cache = new Map<string, string>();

  onModuleInit(): void {
    for (const [name, version] of Object.entries(PROMPT_VERSIONS)) {
      const filePath = path.join(__dirname, `${name}.v${version}.txt`);
      try {
        this.cache.set(name, fs.readFileSync(filePath, 'utf-8').trim());
        this.logger.log({ event: 'prompt.loaded', name, version });
      } catch (err) {
        this.logger.error({ event: 'prompt.load.failed', name, version, err });
        throw err;
      }
    }
  }

  get(name: string): string {
    const prompt = this.cache.get(name);
    if (!prompt) throw new Error(`Prompt not found: ${name}`);
    return prompt;
  }
}
