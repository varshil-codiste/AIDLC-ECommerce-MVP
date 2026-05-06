import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        privateKey: Buffer.from(
          config.getOrThrow<string>('JWT_PRIVATE_KEY_B64'),
          'base64',
        ).toString('utf-8'),
        publicKey: Buffer.from(
          config.getOrThrow<string>('JWT_PUBLIC_KEY_B64'),
          'base64',
        ).toString('utf-8'),
        signOptions: { algorithm: 'RS256', expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
