import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make JWT optional:
  // - If valid token is present → req.user will be populated (user-specific data filtering)
  // - If no token or invalid token → req.user = null (still works, returns all public data)
  handleRequest(err: any, user: any, info: any) {
    // Don't throw error if token is missing or invalid — just return null user
    if (err) throw err;
    return user || null;
  }
}
