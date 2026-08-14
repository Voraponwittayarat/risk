import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

type UserRole = 'admin' | 'rm_committee' | 'head' | 'staff';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  private permissionsFor(role: string): any {
    switch (role) {
      case 'admin':
        return { accessrules: '1', rmStatus: '1', priority: '1' };
      case 'rm_committee':
        return { accessrules: null, rmStatus: '1', priority: '5' };
      case 'head':
        return { accessrules: null, rmStatus: null, priority: '1' };
      default:
        return { accessrules: null, rmStatus: null, priority: '5' };
    }
  }

  private roleFor(member: any): string {
    if (member?.accessrules === '1' || member?.accessrules === 'admin') {
      return 'admin';
    }
    if (member?.rm_status === '1') return 'rm_committee';
    if (member?.priority === '1') return 'head';
    return 'staff';
  }

  async findAll() {
    const [members, departments, positions] = await Promise.all([
      this.prisma.member.findMany({ orderBy: { id: 'desc' } }),
      this.prisma.department.findMany(),
      this.prisma.position.findMany(),
    ]);

    const departmentNames = new Map(departments.map((item) => [item.id, item.depart_name]));
    const positionNames = new Map(positions.map((item) => [item.id, item.position_name]));

    return members.map((member) => ({
      id: member.id,
      cid: member.cid,
      name: member.member_name,
      departmentId: member.department_id1,
      departmentId2: member.department_id2,
      departmentName: departmentNames.get(member.department_id1) || null,
      positionId: member.position_id,
      positionName: positionNames.get(member.position_id) || null,
      teamId: member.team_id,
      role: this.roleFor(member),
      active: member.status === '1',
      createdAt: member.create_date,
    }));
  }

  async create(dto: CreateMemberDto) {
    const cid = dto.cid.trim();
    const duplicate = await this.prisma.member.findFirst({
      where: { cid },
    });
    
    if (duplicate) {
      throw new ConflictException('รหัสบัตรประชาชนนี้มีอยู่แล้วในระบบ');
    }

    const permissions = this.permissionsFor(dto.role || 'staff');

    const member = await this.prisma.member.create({
      data: {
        cid,
        member_name: dto.name.trim(),
        department_id1: dto.departmentId,
        department_id2: dto.departmentId2 ?? 0,
        position_id: dto.positionId,
        team_id: dto.teamId ?? null,
        priority: permissions.priority,
        accessrules: permissions.accessrules,
        rm_status: permissions.rmStatus,
        status: '1',
        create_date: new Date(),
        modify_date: new Date(),
      },
    });

    return { id: member.id, message: 'เพิ่มข้อมูลบุคลากรเรียบร้อยแล้ว' };
  }

  async update(id: number, dto: UpdateMemberDto) {
    const current = await this.prisma.member.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบข้อมูลบุคลากร');

    const permissions = dto.role ? this.permissionsFor(dto.role) : {};

    await this.prisma.member.update({
      where: { id },
      data: {
        ...(dto.name ? { member_name: dto.name.trim() } : {}),
        ...(dto.departmentId !== undefined ? { department_id1: dto.departmentId } : {}),
        ...(dto.departmentId2 !== undefined ? { department_id2: dto.departmentId2 } : {}),
        ...(dto.positionId !== undefined ? { position_id: dto.positionId } : {}),
        ...(dto.teamId !== undefined ? { team_id: dto.teamId } : {}),
        ...(dto.role
          ? {
              priority: permissions.priority,
              accessrules: permissions.accessrules,
              rm_status: permissions.rmStatus,
            }
          : {}),
        ...(dto.active !== undefined ? { status: dto.active ? '1' : '0' } : {}),
        modify_date: new Date(),
      },
    });

    return { message: 'บันทึกข้อมูลเรียบร้อยแล้ว' };
  }

  async remove(id: number) {
    const current = await this.prisma.member.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบข้อมูลบุคลากร');

    const linkedUser = await this.prisma.user.findFirst({
      where: { cid: current.cid }
    });

    if (linkedUser) {
      throw new BadRequestException('ไม่สามารถลบข้อมูลนี้ได้เนื่องจากบุคลากรได้ลงทะเบียนเข้าใช้งานระบบแล้ว');
    }

    await this.prisma.member.delete({ where: { id } });
    return { message: 'ลบข้อมูลบุคลากรเรียบร้อยแล้ว' };
  }
}
