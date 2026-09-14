import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ADMIN_SESSION_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
    if (!this.authService.verifyToken(token)) {
      throw new UnauthorizedException('Admin login required');
    }
    return true;
  }
}
