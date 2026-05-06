import { INestApplication, ValidationPipe } from '@nestjs/common';
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

describe('Auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let request: ReturnType<typeof supertest>;

  const keypair = makeTestKeypair();

  beforeAll(async () => {
    process.env.JWT_PRIVATE_KEY_B64 = keypair.JWT_PRIVATE_KEY_B64;
    process.env.JWT_PUBLIC_KEY_B64 = keypair.JWT_PUBLIC_KEY_B64;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    request = supertest(app.getHttpServer());

    const passwordHash = await argon2.hash('e2e-passw0rd-test!', { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email: 'e2e-shopper@test.local' },
      update: { passwordHash },
      create: { email: 'e2e-shopper@test.local', role: 'shopper', passwordHash, status: 'active' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-shopper@test.local' } });
    await app.close();
  });

  let accessToken: string;
  let refreshToken: string;
  let tokenFamily: string;
  let userId: string;

  it('POST /api/v1/auth/login → 200 with tokens', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: 'e2e-shopper@test.local',
      password: 'e2e-passw0rd-test!',
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.tokenFamily).toBeTruthy();
    expect(res.body.userId).toBeTruthy();

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    tokenFamily = res.body.tokenFamily;
    userId = res.body.userId;
  });

  it('GET /api/v1/health → 200 (public route)', async () => {
    const res = await request.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/refresh with valid token → 200 with new tokens', async () => {
    const res = await request.post('/api/v1/auth/refresh').send({ userId, tokenFamily, refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(refreshToken);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/v1/auth/logout → 204', async () => {
    const res = await request
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tokenFamily, refreshToken });

    expect(res.status).toBe(204);
  });

  it('POST /api/v1/auth/refresh after logout → 401', async () => {
    const res = await request.post('/api/v1/auth/refresh').send({ userId, tokenFamily, refreshToken });
    expect(res.status).toBe(401);
  });
});
