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

    // Create JWT Payload
    const payload = {
      sub: member.id, // Using member.id as user ID for the new system
      cid: member.cid,
      name: member.member_name,
      departmentId: member.department_id1,
      departmentGroup: departmentGroup,
      priority: member.priority,
      accessrules: member.accessrules,
      rmStatus: member.rm_status,
      teamId: member.team_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: member.id,
        name: member.member_name,
        department_id: member.department_id1,
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
}
