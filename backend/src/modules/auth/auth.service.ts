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

  async mockLogin(cid: string) {
    // Find Member by CID
    const member = await this.prisma.member.findFirst({
      where: { cid: cid },
    });

    if (!member) {
      throw new UnauthorizedException('ไม่พบข้อมูลสิทธิ์ (Member) ในระบบ โปรดตรวจสอบเลขบัตรประชาชนอีกครั้ง');
    }

    // Find Department Group
    let departmentGroup: number | null = null;
    if (member.department_id1) {
      const dept = await this.prisma.department.findUnique({
        where: { id: member.department_id1 }
      });
      if (dept) {
        departmentGroup = dept.depart_group_id;
      }
    }

    const userRow = await this.prisma.user.findFirst({
      where: { cid: member.cid }
    });
    const subId = userRow ? userRow.id : member.id;

    // Create JWT Payload
    const payload = {
      sub: subId,
      cid: member.cid,
      name: member.member_name,
      departmentId: member.department_id1,
      departmentId2: member.department_id2,
      departmentGroup: departmentGroup,
      priority: member.priority,
      accessrules: member.accessrules,
      rmStatus: member.rm_status,
      teamId: member.team_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: subId,
        name: member.member_name,
        department_id: member.department_id1,
        department_id2: member.department_id2,
      }
    };
  }

  async mockRoleLogin(role: string) {
    let mockUser: any = {
      id: 9999,
      cid: 'mock-' + role,
      member_name: 'Mock ' + role,
      department_id1: 1,
      team_id: 1,
      priority: '1',
      accessrules: null,
      rm_status: null,
    };

    switch (role) {
      case 'user':
        mockUser.member_name = 'พนักงานทั่วไป (User)';
        break;
      case 'supervisor':
        mockUser.member_name = 'หัวหน้างาน (Supervisor)';
        mockUser.accessrules = 'head'; // Based on system_analysis.md logic
        break;
      case 'manager':
        mockUser.member_name = 'หัวหน้าแผนก/ผู้จัดการ (Manager)';
        mockUser.accessrules = 'manager';
        break;
      case 'admin':
        mockUser.member_name = 'ผู้ดูแลระบบ (Admin)';
        mockUser.accessrules = 'admin';
        break;
      default:
        throw new UnauthorizedException('Role ไม่ถูกต้อง');
    }

    const payload = {
      sub: mockUser.id,
      cid: mockUser.cid,
      name: mockUser.member_name,
      departmentId: mockUser.department_id1,
      departmentGroup: 1, // Mock group
      priority: mockUser.priority,
      accessrules: mockUser.accessrules,
      rmStatus: mockUser.rm_status,
      teamId: mockUser.team_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: mockUser.id,
        name: mockUser.member_name,
        department_id: mockUser.department_id1,
      }
    };
  }

  async login(username: string, password: string) {
    // 1. Find user in the user table
    const dbUser = await this.prisma.user.findUnique({
      where: { username }
    });

    if (!dbUser) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
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
    const payload = {
      sub: dbUser.id,
      cid: member.cid,
      name: member.member_name,
      departmentId: member.department_id1,
      departmentId2: member.department_id2,
      departmentGroup: departmentGroup,
      priority: member.priority,
      accessrules: member.accessrules,
      rmStatus: member.rm_status,
      teamId: member.team_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: dbUser.id,
        name: member.member_name,
        department_id: member.department_id1,
        department_id2: member.department_id2,
        role: member.accessrules || (member.priority === '1' ? 'head' : 'user')
      }
    };
  }
}
