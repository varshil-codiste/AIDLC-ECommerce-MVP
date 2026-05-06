import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(
        config.getOrThrow<string>('JWT_PUBLIC_KEY_B64'),
        'base64',
      ).toString('utf-8'),
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): { userId: string; role: string; email: string } {
    return { userId: payload.sub, role: payload.role, email: payload.email };
  }
}
