import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import * as fc from 'fast-check';
import { ExecutionContext } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from './types/jwt-payload.type';

const makeUser = (overrides = {}) => ({
  id: 'user-uuid-1',
  email: 'test@example.com',
  passwordHash: '',
  role: 'shopper',
  status: 'active',
  name: null,
  phone: null,
  createdAt: new Date(),
  lastActiveAt: null,
  ...overrides,
});

function makeSut() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as PrismaService;

  const redis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  } as unknown as RedisService;

  const jwt = {
    sign: vi.fn().mockReturnValue('signed-access-token'),
  } as unknown as JwtService;

  const svc = new AuthService(prisma, redis, jwt);
  return { svc, prisma, redis, jwt };
}

describe('AuthService.login', () => {
  let hash: string;
  beforeEach(async () => {
    hash = await argon2.hash('correct-passw0rd!', { type: argon2.argon2id });
  });

  it('returns tokens on valid credentials', async () => {
    const { svc, prisma } = makeSut();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeUser({ passwordHash: hash }));

    const result = await svc.login({ email: 'test@example.com', password: 'correct-passw0rd!' });

    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toBeTruthy();
    expect(result.tokenFamily).toBeTruthy();
  });

  it('throws 401 on wrong password', async () => {
    const { svc, prisma } = makeSut();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeUser({ passwordHash: hash }));

    await expect(svc.login({ email: 'test@example.com', password: 'wrongpassword!!' })).rejects.toThrow('auth.invalid_credentials');
  });

  it('throws 401 when account disabled', async () => {
    const { svc, prisma } = makeSut();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeUser({ status: 'disabled' }));

    await expect(svc.login({ email: 'test@example.com', password: 'correct-passw0rd!' })).rejects.toThrow('auth.invalid_credentials');
  });

  it('throws 401 when user not found', async () => {
    const { svc, prisma } = makeSut();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(svc.login({ email: 'no@example.com', password: 'correct-passw0rd!' })).rejects.toThrow('auth.invalid_credentials');
  });

  it('increments failure counter on bad password', async () => {
    const { svc, prisma, redis } = makeSut();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeUser({ passwordHash: hash }));

    await svc.login({ email: 'test@example.com', password: 'wrongpassword!!' }).catch(() => {});

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:login:test@example.com');
  });

  it('returns 429 when lockout is active', async () => {
    const { svc, redis } = makeSut();
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue('1');

    await expect(svc.login({ email: 'test@example.com', password: 'correct-passw0rd!' })).rejects.toBeInstanceOf(HttpException);
  });

  it('sets lockout after 5th failure', async () => {
    const { svc, prisma, redis } = makeSut();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeUser({ passwordHash: hash }));
    (redis.incr as ReturnType<typeof vi.fn>).mockResolvedValue(5);

    await expect(svc.login({ email: 'test@example.com', password: 'wrongpassword!!' })).rejects.toBeInstanceOf(HttpException);
    expect(redis.setex).toHaveBeenCalledWith('lockout:login:test@example.com', 900, '1');
  });
});

describe('AuthService.refresh', () => {
  it('returns new tokens on valid refresh', async () => {
    const { svc, prisma, redis } = makeSut();
    const user = makeUser();
    const entry = JSON.stringify({
      hashedToken: createHash('sha256').update('old-token-uuid').digest('hex'),
      userId: user.id,
      tokenFamily: 'family-uuid',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      rotationCount: 0,
    });
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(entry);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    const result = await svc.refresh({ userId: user.id, tokenFamily: 'family-uuid', refreshToken: 'old-token-uuid' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe('old-token-uuid');
  });

  it('throws 401 when Redis key missing (expired)', async () => {
    const { svc, redis } = makeSut();
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(svc.refresh({ userId: 'x', tokenFamily: 'y', refreshToken: 'z' })).rejects.toThrow('auth.token_expired');
  });

  it('revokes all tokens on reuse detection', async () => {
    const { svc, redis } = makeSut();
    const entry = JSON.stringify({
      hashedToken: 'different-hash',
      userId: 'u1',
      tokenFamily: 'fam',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      rotationCount: 0,
    });
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(entry);

    await expect(svc.refresh({ userId: 'u1', tokenFamily: 'fam', refreshToken: 'stolen-token' })).rejects.toThrow('auth.token_reuse');
    expect(redis.keys).toHaveBeenCalledWith('rtoken:u1:*');
  });
});

describe('AuthService.logout', () => {
  it('calls Redis DEL on logout', async () => {
    const { svc, redis } = makeSut();

    await svc.logout('user-uuid', { tokenFamily: 'fam', refreshToken: 'token' });

    expect(redis.del).toHaveBeenCalledWith('rtoken:user-uuid:fam');
  });
});

describe('RolesGuard decision table (PBT)', () => {
  const roles: UserRole[] = ['shopper', 'merchant', 'admin'];

  it('allows access iff userRole matches required OR userRole is admin', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...roles),
        fc.constantFrom(...roles),
        (userRole: UserRole, requiredRole: UserRole) => {
          const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue([requiredRole]),
          };
          const guard = new RolesGuard(reflector as unknown as import('@nestjs/core').Reflector);
          const ctx = {
            getHandler: vi.fn(),
            getClass: vi.fn(),
            switchToHttp: vi.fn().mockReturnValue({
              getRequest: vi.fn().mockReturnValue({ user: { role: userRole } }),
            }),
          };
          const result = guard.canActivate(ctx as unknown as ExecutionContext);
          const expected = userRole === requiredRole || userRole === 'admin';
          return result === expected;
        },
      ),
    );
  });
});
