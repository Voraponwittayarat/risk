import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { canonicalRole, legacyFieldsForRole } from '../auth/role.utils';
import { normalizeRmScope } from '../auth/rm-scope.utils';

type UserRole = 'admin' | 'rm_committee' | 'head' | 'staff';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  private roleFor(member: any): string {
    return canonicalRole(member?.role);
  }

  async findAll() {
    const [members, departments, positions, teams] = await Promise.all([
      this.prisma.member.findMany({ orderBy: { id: 'desc' } }),
      this.prisma.department.findMany(),
      this.prisma.position.findMany(),
      this.prisma.team.findMany(),
    ]);

    const departmentNames = new Map(departments.map((item) => [item.id, item.depart_name]));
    const positionNames = new Map(positions.map((item) => [item.id, item.position_name]));
    const teamNames = new Map(teams.map((item) => [item.id, item.team_name]));

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
      teamName: member.team_id ? teamNames.get(member.team_id) || null : null,
      role: this.roleFor(member),
      rmScope: normalizeRmScope(this.roleFor(member), member.rm_scope),
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

    const role = canonicalRole(dto.role);
    const legacy = legacyFieldsForRole(role);
    const rmScope = normalizeRmScope(role, dto.rmScope);

    const member = await this.prisma.member.create({
      data: {
        cid,
        member_name: dto.name.trim(),
        department_id1: dto.departmentId,
        department_id2: dto.departmentId2 ?? 0,
        position_id: dto.positionId,
        team_id: dto.teamId ?? null,
        role,
        rm_scope: rmScope,
        priority: legacy.priority,
        accessrules: legacy.accessrules,
        rm_status: legacy.rmStatus,
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

    const role = dto.role ? canonicalRole(dto.role) : undefined;
    const legacy = role ? legacyFieldsForRole(role) : undefined;
    const nextRole = role || this.roleFor(current);
    const rmScope = (dto.role !== undefined || dto.rmScope !== undefined)
      ? normalizeRmScope(nextRole, dto.rmScope !== undefined ? dto.rmScope : current.rm_scope)
      : undefined;

    const memberUpdate = this.prisma.member.update({
      where: { id },
      data: {
        ...(dto.name ? { member_name: dto.name.trim() } : {}),
        ...(dto.departmentId !== undefined ? { department_id1: dto.departmentId } : {}),
        ...(dto.departmentId2 !== undefined ? { department_id2: dto.departmentId2 } : {}),
        ...(dto.positionId !== undefined ? { position_id: dto.positionId } : {}),
        ...(dto.teamId !== undefined ? { team_id: dto.teamId } : {}),
        ...(rmScope !== undefined ? { rm_scope: rmScope } : {}),
        ...(dto.role
          ? {
              role,
              priority: legacy?.priority,
              accessrules: legacy?.accessrules,
              rm_status: legacy?.rmStatus,
            }
          : {}),
        ...(dto.active !== undefined ? { status: dto.active ? '1' : '0' } : {}),
        modify_date: new Date(),
      },
    });
    const operations: any[] = [memberUpdate];
    if (role && legacy) {
      operations.push(this.prisma.user.updateMany({
        where: { cid: current.cid },
        data: { role: legacy.userRole },
      }));
    }
    await this.prisma.$transaction(operations);

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
