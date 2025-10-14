import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    console.log('=== JWT AUTH GUARD ACTIVATED ===');
    const request = context.switchToHttp().getRequest();
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    console.log('Request headers:', request.headers);
    console.log('==============================');

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('=== JWT AUTH GUARD - HANDLE REQUEST ===');
    console.log('Error:', err?.message || 'none');
    console.log('User:', user?.email || 'none');
    console.log('Info:', info?.message || 'none');
    const request = context.switchToHttp().getRequest();
    console.log('Request body:', request.body);
    console.log('=====================================');

    if (err || !user) {
      this.logger.error('JWT Authentication failed');
      throw err || new Error('Unauthorized');
    }

    return user;
  }
}
