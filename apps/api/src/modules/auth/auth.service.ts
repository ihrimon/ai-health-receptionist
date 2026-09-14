import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * MVP admin auth — a single shared password (no per-user accounts), see
 * docs decision log. Session is a signed `<expiresAt>.<hmac>` string, not
 * a JWT library, to avoid a new dependency for something this small.
 */
@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  login(password: string): string {
    const expected = this.configService.get<string>('admin.password');
    if (!expected || !this.safeEqual(password, expected)) {
      throw new UnauthorizedException('Incorrect password');
    }
    return this.issueToken();
  }

  verifyToken(token?: string): boolean {
    if (!token) return false;
    const [expiresAt, signature] = token.split('.');
    if (!expiresAt || !signature) return false;
    if (this.sign(expiresAt) !== signature) return false;
    return Number(expiresAt) > Date.now();
  }

  private issueToken(): string {
    const expiresAt = String(Date.now() + SESSION_TTL_MS);
    return `${expiresAt}.${this.sign(expiresAt)}`;
  }

  private sign(payload: string): string {
    const secret = this.configService.get<string>('admin.sessionSecret');
    return createHmac('sha256', secret || 'dev-only-insecure-secret')
      .update(payload)
      .digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
