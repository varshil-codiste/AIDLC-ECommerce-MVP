import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import pino from 'pino';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtPayload, UserRole } from './types/jwt-payload.type';

const logger = pino({
  base: { service: 'api' },
  redact: ['email', 'password', 'passwordHash'],
});

const RATE_LIMIT_TTL = 60; // 1 minute window
const LOCKOUT_TTL = 900; // 15 minutes
const MAX_FAILURES = 5;
const REFRESH_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenFamily: string;
  userId: string;
}

interface RefreshTokenEntry {
  hashedToken: string;
  userId: string;
  tokenFamily: string;
  issuedAt: string;
  expiresAt: string;
  rotationCount: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    await this.checkLockout(dto.email);

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.status !== 'active') {
      await this.recordFailedAttempt(dto.email);
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordFailedAttempt(dto.email);
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    await this.redis.del(`ratelimit:login:${dto.email}`);

    const accessToken = this.generateAccessToken(user.id, user.role as UserRole, user.email);
    const { refreshToken, tokenFamily } = await this.issueRefreshToken(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    logger.info({ event: 'auth.login', userId: user.id, role: user.role }, 'User logged in');

    return { accessToken, refreshToken, tokenFamily, userId: user.id };
  }

  async refresh(dto: RefreshDto): Promise<LoginResponse> {
    const key = `rtoken:${dto.userId}:${dto.tokenFamily}`;
    const raw = await this.redis.get(key);

    if (!raw) {
      throw new UnauthorizedException('auth.token_expired');
    }

    const entry: RefreshTokenEntry = JSON.parse(raw);
    const hashedIncoming = this.hashToken(dto.refreshToken);

    if (entry.hashedToken !== hashedIncoming) {
      await this.revokeAllTokens(dto.userId);
      logger.warn(
        { event: 'auth.refresh.reuse_detected', userId: dto.userId },
        'Token reuse detected — all tokens revoked',
      );
      throw new UnauthorizedException('auth.token_reuse');
    }

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('auth.account.disabled');
    }

    await this.redis.del(key);

    const accessToken = this.generateAccessToken(user.id, user.role as UserRole, user.email);
    const { refreshToken, tokenFamily } = await this.issueRefreshToken(
      user.id,
      dto.tokenFamily,
      entry.rotationCount + 1,
    );

    logger.info({ event: 'auth.refresh', userId: user.id }, 'Token refreshed');

    return { accessToken, refreshToken, tokenFamily, userId: user.id };
  }

  async logout(userId: string, dto: LogoutDto): Promise<void> {
    await this.redis.del(`rtoken:${userId}:${dto.tokenFamily}`);
    logger.info({ event: 'auth.logout', userId }, 'User logged out');
  }

  private generateAccessToken(userId: string, role: UserRole, email: string): string {
    const payload: JwtPayload = {
      sub: userId,
      role,
      email,
      jti: randomUUID(),
    };
    return this.jwt.sign(payload);
  }

  private async issueRefreshToken(
    userId: string,
    existingFamily?: string,
    rotationCount = 0,
  ): Promise<{ refreshToken: string; tokenFamily: string }> {
    const refreshToken = randomUUID();
    const tokenFamily = existingFamily ?? randomUUID();
    const hashedToken = this.hashToken(refreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TTL * 1000);

    const entry: RefreshTokenEntry = {
      hashedToken,
      userId,
      tokenFamily,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      rotationCount,
    };

    await this.redis.setex(`rtoken:${userId}:${tokenFamily}`, REFRESH_TTL, JSON.stringify(entry));

    return { refreshToken, tokenFamily };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async checkLockout(email: string): Promise<void> {
    const locked = await this.redis.get(`lockout:login:${email}`);
    if (locked) {
      throw new HttpException('Too many failed login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordFailedAttempt(email: string): Promise<void> {
    const counterKey = `ratelimit:login:${email}`;
    const count = await this.redis.incr(counterKey);
    if (count === 1) {
      await this.redis.expire(counterKey, RATE_LIMIT_TTL);
    }
    if (count >= MAX_FAILURES) {
      await this.redis.setex(`lockout:login:${email}`, LOCKOUT_TTL, '1');
      throw new HttpException('Too many failed login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async revokeAllTokens(userId: string): Promise<void> {
    const keys = await this.redis.keys(`rtoken:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
