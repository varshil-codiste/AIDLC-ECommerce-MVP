import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';

function makeTestKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    JWT_PRIVATE_KEY_B64: Buffer.from(
      privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    ).toString('base64'),
    JWT_PUBLIC_KEY_B64: Buffer.from(
      publicKey.export({ type: 'spki', format: 'pem' }) as string,
    ).toString('base64'),
  };
}

describe('UoW-01 api e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const keypair = makeTestKeypair();
    process.env.JWT_PRIVATE_KEY_B64 = keypair.JWT_PRIVATE_KEY_B64;
    process.env.JWT_PUBLIC_KEY_B64 = keypair.JWT_PUBLIC_KEY_B64;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health returns 200 with status=ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.ts).toBe('string');
  });
});
