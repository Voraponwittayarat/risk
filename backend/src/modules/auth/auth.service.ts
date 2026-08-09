import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(username: string, password: string) {
    // 1. Find user in the user table
    const dbUser = await this.prisma.user.findUnique({
      where: { username }
    });

    if (!dbUser) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    if (dbUser.blocked_at) {
      throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    // 2. Validate password (converting PHP's $2y$ prefix to $2a$ for Node.js compatibility)
    const hashToCompare = dbUser.password_hash.replace(/^\$2y\$/, '$2a$');
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);
    if (!isPasswordValid) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // 3. Find corresponding profile in member table by CID
    let member: any = await this.prisma.member.findFirst({
      where: { cid: dbUser.cid || '' }
    });

    // If no member profile exists for this CID, create a fallback or mock one based on user.role
    if (!member) {
      member = {
        id: dbUser.id,
        cid: dbUser.cid || '',
        member_name: dbUser.username,
        department_id1: '1', // default dept
        priority: dbUser.role === 1 ? '1' : '5',
        accessrules: dbUser.role === 1 ? '1' : null,
        rm_status: dbUser.role === 1 ? '1' : null,
        team_id: 1,
      } as any;
    }

    // 4. Find Department Group to determine scope
    let departmentGroup: number | null = null;
    if (member.department_id1) {
      const dept = await this.prisma.department.findUnique({
        where: { id: member.department_id1 }
      });
      if (dept) {
        departmentGroup = dept.depart_group_id;
      }
    }

    // 5. Create JWT Payload
    const accessrules = dbUser.role === 1 ? '1' : member.accessrules;
    const role = dbUser.role === 1
      ? 'admin'
      : member.rm_status === '1'
        ? 'rm_committee'
        : member.priority === '1'
          ? 'head'
          : 'staff';

    const payload = {
      sub: dbUser.id,
      username: dbUser.username,
      cid: member.cid,
      name: member.member_name,
      departmentId: member.department_id1,
      departmentId2: member.department_id2,
      departmentGroup: departmentGroup,
      priority: member.priority,
      accessrules,
      rmStatus: member.rm_status,
      teamId: member.team_id,
      role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: member.member_name,
        department_id: member.department_id1,
        department_id2: member.department_id2,
        role,
        accessrules,
        rmStatus: member.rm_status,
        priority: member.priority,
        teamId: member.team_id,
      }
    };
  }
}
