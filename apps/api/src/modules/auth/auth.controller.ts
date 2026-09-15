import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ADMIN_SESSION_COOKIE } from './auth.constants';
import { AuthService, SESSION_TTL_MS } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Locally the dashboard (localhost:3000) and API (localhost:3001) are
 * different origins but the same *site* (both "localhost"), so a Lax
 * cookie is sent on cross-origin fetches fine. Deployed, they're on
 * genuinely different sites (e.g. a vercel.app dashboard + onrender.com
 * API) — a cross-site fetch only carries the cookie if it's SameSite=None,
 * which itself requires Secure. Toggled by NODE_ENV rather than a
 * separate flag since it's already the right signal (prod is always
 * served over HTTPS on both ends; local dev is always HTTP).
 */
function sessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction
    ? { httpOnly: true, sameSite: 'none' as const, secure: true }
    : { httpOnly: true, sameSite: 'lax' as const };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): { ok: true } {
    const token = this.authService.login(dto.password);
    res.cookie(ADMIN_SESSION_COOKIE, token, {
      ...sessionCookieOptions(),
      maxAge: SESSION_TTL_MS,
    });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(ADMIN_SESSION_COOKIE, sessionCookieOptions());
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request): { authenticated: boolean } {
    const token = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
    return { authenticated: this.authService.verifyToken(token) };
  }
}
