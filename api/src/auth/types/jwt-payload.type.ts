export type UserRole = 'shopper' | 'merchant' | 'admin';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  jti: string;
  iat?: number;
  exp?: number;
}
