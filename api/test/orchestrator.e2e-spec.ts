import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { generateKeyPairSync } from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function makeTestKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const pub = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  return {
    JWT_PRIVATE_KEY_B64: Buffer.from(priv).toString('base64'),
    JWT_PUBLIC_KEY_B64: Buffer.from(pub).toString('base64'),
  };
}

describe('Orchestrator e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let request: ReturnType<typeof supertest>;
  let shopperToken: string;

  const keypair = makeTestKeypair();

  beforeAll(async () => {
    process.env.JWT_PRIVATE_KEY_B64 = keypair.JWT_PRIVATE_KEY_B64;
    process.env.JWT_PUBLIC_KEY_B64 = keypair.JWT_PUBLIC_KEY_B64;
    process.env.LLM_API_KEY = 'test-key-not-used';
    process.env.LLM_PROVIDER = 'openai';

    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    request = supertest(app.getHttpServer());

    const hash = await argon2.hash('TestPass1!');
    await prisma.user.createMany({
      data: [
        {
          id: 'e2e-orch-shopper',
          email: 'orch-shopper@test.com',
          passwordHash: hash,
          role: 'shopper',
        },
        {
          id: 'e2e-orch-merchant',
          email: 'orch-merchant@test.com',
          passwordHash: hash,
          role: 'merchant',
        },
      ],
      skipDuplicates: true,
    });

    const shopperRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'orch-shopper@test.com', password: 'TestPass1!' });
    shopperToken = shopperRes.body.accessToken as string;

    await request
      .post('/api/v1/auth/login')
      .send({ email: 'orch-merchant@test.com', password: 'TestPass1!' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: ['e2e-orch-shopper', 'e2e-orch-merchant'] } },
    });
    await app.close();
  });

  it('POST /api/v1/chat/message returns 200 with text/event-stream content type', async () => {
    const res = await request
      .post('/api/v1/chat/message')
      .set('Authorization', `Bearer ${shopperToken}`)
      .set('Accept', 'text/event-stream')
      .send({ message: 'Hello' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => callback(null, data));
      });

    expect(res.status).toBe(200);
    // SSE stream should contain a 'done' event
    expect(res.text).toContain('done');
  });

  it('POST /api/v1/chat/message returns 401 without token', async () => {
    const res = await request.post('/api/v1/chat/message').send({ message: 'Hello' });
    expect(res.status).toBe(401);
  });
});
