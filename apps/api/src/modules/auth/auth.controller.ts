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
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
    });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(ADMIN_SESSION_COOKIE);
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request): { authenticated: boolean } {
    const token = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
    return { authenticated: this.authService.verifyToken(token) };
  }
}
