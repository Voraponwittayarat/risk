import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No roles required
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // `role` is the only authorization source. Legacy flags are compatibility mirrors only.
    const isAdmin = user.role === 'admin';
    const isRmCommittee = user.role === 'rm_committee';
    const isSimpleTeam = user.teamId != null;
    const isHeadOfGroup = user.role === 'head';

    let hasAccess = false;

    if (requiredRoles.includes('admin') && isAdmin) hasAccess = true;
    if (requiredRoles.includes('rm_committee') && isRmCommittee) hasAccess = true;
    if (requiredRoles.includes('simple_team') && isSimpleTeam) hasAccess = true;
    if (requiredRoles.includes('head') && isHeadOfGroup) hasAccess = true;

    if (isAdmin) hasAccess = true; // Admin bypass

    if (!hasAccess) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงหรือจัดการข้อมูลส่วนนี้ (Forbidden)');
    }

    return true;
  }
}
