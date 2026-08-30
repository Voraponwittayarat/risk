import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { canonicalRole, legacyFieldsForRole } from '../auth/role.utils';
import { normalizeRmScope } from '../auth/rm-scope.utils';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private permissionsFor(role: UserRole) {
    return legacyFieldsForRole(role);
  }

  private roleFor(userRole: number, member?: any): UserRole {
    return canonicalRole(member?.role, userRole);
  }

  private async passwordHash(password: string) {
    const hash = await bcrypt.hash(password, 12);
    return hash.replace(/^\$2b\$/, '$2y$');
  }

  private toView(user: any, member: any, departments: Map<number, string>, positions: Map<number, string>, teams: Map<number, string>) {
    const role = this.roleFor(user.role, member);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      cid: user.cid,
      name: member?.member_name || user.username,
      departmentId: member?.department_id1 ?? null,
      departmentId2: member?.department_id2 ?? null,
      departmentName: departments.get(member?.department_id1) || null,
      positionId: member?.position_id ?? null,
      positionName: positions.get(member?.position_id) || null,
      teamId: member?.team_id ?? null,
      teamName: member?.team_id ? teams.get(member.team_id) || null : null,
      role,
      rmScope: normalizeRmScope(role, member?.rm_scope),
      active: user.blocked_at == null,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  }

  async findAll() {
    const [users, members, departments, positions, teams] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { id: 'desc' } }),
      this.prisma.member.findMany(),
      this.prisma.department.findMany(),
      this.prisma.position.findMany(),
      this.prisma.team.findMany(),
    ]);
    const memberByCid = new Map(members.map((member) => [member.cid, member]));
    const departmentNames = new Map(departments.map((item) => [item.id, item.depart_name]));
    const positionNames = new Map(positions.map((item) => [item.id, item.position_name]));
    const teamNames = new Map(teams.map((item) => [item.id, item.team_name]));

    return users.map((user) =>
      this.toView(
        user,
        user.cid ? memberByCid.get(user.cid) : undefined,
        departmentNames,
        positionNames,
        teamNames,
      ),
    );
  }

  async metadata() {
    const [departments, positions, teams] = await Promise.all([
      this.prisma.department.findMany({ orderBy: { depart_name: 'asc' } }),
      this.prisma.position.findMany({ orderBy: { position_name: 'asc' } }),
      this.prisma.team.findMany({ orderBy: { id: 'asc' } }),
    ]);
    return {
      departments: departments.map((item) => ({ id: item.id, name: item.depart_name })),
      positions: positions.map((item) => ({ id: item.id, name: item.position_name })),
      teams: teams.map((item) => ({ id: item.id, name: item.team_name })),
      roles: [
        { id: 'admin', name: 'ผู้ดูแลระบบ' },
        { id: 'rm_committee', name: 'กรรมการบริหารความเสี่ยง' },
        { id: 'head', name: 'หัวหน้าหน่วยงาน' },
        { id: 'staff', name: 'เจ้าหน้าที่ทั่วไป' },
      ],
      rmScopes: [
        { id: 'department', name: 'เฉพาะหน่วยงานหลักและหน่วยงานรอง' },
        { id: 'group', name: 'ทุกหน่วยงานในกลุ่มงานเดียวกัน' },
        { id: 'hospital', name: 'ทุกหน่วยงานทั้งโรงพยาบาล (RM ส่วนกลาง)' },
      ],
    };
  }

  async findOne(id: number) {
    const users = await this.findAll();
    const user = users.find((item) => item.id === id);
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งาน');
    return user;
  }

  async create(dto: CreateUserDto) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();
    const cid = dto.cid.trim();
    const duplicate = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }, { cid }] },
    });
    if (duplicate) {
      throw new ConflictException('ชื่อผู้ใช้ อีเมล หรือเลขประจำตัวประชาชนนี้มีอยู่แล้ว');
    }

    const [department, position] = await Promise.all([
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
      this.prisma.position.findUnique({ where: { id: dto.positionId } }),
    ]);
    if (!department || !position) {
      throw new BadRequestException('หน่วยงานหรือตำแหน่งไม่ถูกต้อง');
    }

    const permissions = this.permissionsFor(dto.role);
    const rmScope = normalizeRmScope(dto.role, dto.rmScope);
    const passwordHash = await this.passwordHash(dto.password);
    const now = Math.floor(Date.now() / 1000);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          password_hash: passwordHash,
          cid,
          email,
          auth_key: randomBytes(16).toString('hex'),
          confirmed_at: now,
          role: permissions.userRole,
          created_at: now,
          updated_at: now,
        },
      });

      const existingMember = await tx.member.findFirst({ where: { cid } });
      const memberData = {
        member_name: dto.name.trim(),
        department_id1: dto.departmentId,
        department_id2: dto.departmentId2 ?? 0,
        position_id: dto.positionId,
        team_id: dto.teamId ?? null,
        role: dto.role,
        rm_scope: rmScope,
        priority: permissions.priority,
        accessrules: permissions.accessrules,
        rm_status: permissions.rmStatus,
        status: '1',
        modify_date: new Date(),
      };
      if (existingMember) {
        await tx.member.update({ where: { id: existingMember.id }, data: memberData });
      } else {
        await tx.member.create({
          data: { ...memberData, cid, create_date: new Date() },
        });
      }
      return created;
    });

    return { id: user.id, message: 'สร้างผู้ใช้งานเรียบร้อยแล้ว' };
  }

  async update(id: number, dto: UpdateUserDto, actorId: number) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบผู้ใช้งาน');
    if (id === actorId && dto.active === false) {
      throw new BadRequestException('ไม่สามารถปิดบัญชีที่กำลังใช้งานอยู่ได้');
    }

    const username = dto.username?.trim();
    const email = dto.email?.trim().toLowerCase();
    const cid = dto.cid?.trim();
    if (username || email || cid) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : []),
            ...(cid ? [{ cid }] : []),
          ],
        },
      });
      if (duplicate) {
        throw new ConflictException('ชื่อผู้ใช้ อีเมล หรือเลขประจำตัวประชาชนนี้มีอยู่แล้ว');
      }
    }

    const oldMember = current.cid
      ? await this.prisma.member.findFirst({ where: { cid: current.cid } })
      : null;
    const requestedRole = dto.role || this.roleFor(current.role, oldMember);
    const requestedRmScope = normalizeRmScope(
      requestedRole,
      dto.rmScope !== undefined ? dto.rmScope : oldMember?.rm_scope,
    );
    if (id === actorId && requestedRole !== 'admin') {
      throw new BadRequestException('ไม่สามารถลดสิทธิ์บัญชีที่กำลังใช้งานอยู่ได้');
    }
    const permissions = this.permissionsFor(requestedRole);
    const now = Math.floor(Date.now() / 1000);
    const nextCid = cid ?? current.cid;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(username ? { username } : {}),
          ...(email ? { email } : {}),
          ...(cid ? { cid } : {}),
          ...(dto.role ? { role: permissions.userRole } : {}),
          ...(dto.active !== undefined
            ? { blocked_at: dto.active ? null : now }
            : {}),
          updated_at: now,
        },
      });

      if (oldMember) {
        await tx.member.update({
          where: { id: oldMember.id },
          data: {
            ...(cid ? { cid } : {}),
            ...(dto.name ? { member_name: dto.name.trim() } : {}),
            ...(dto.departmentId !== undefined ? { department_id1: dto.departmentId } : {}),
            ...(dto.departmentId2 !== undefined ? { department_id2: dto.departmentId2 } : {}),
            ...(dto.positionId !== undefined ? { position_id: dto.positionId } : {}),
            ...(dto.teamId !== undefined ? { team_id: dto.teamId } : {}),
            ...((dto.role !== undefined || dto.rmScope !== undefined) ? { rm_scope: requestedRmScope } : {}),
            ...(dto.role
              ? {
                  role: requestedRole,
                  priority: permissions.priority,
                  accessrules: permissions.accessrules,
                  rm_status: permissions.rmStatus,
                }
              : {}),
            ...(dto.active !== undefined ? { status: dto.active ? '1' : '0' } : {}),
            modify_date: new Date(),
          },
        });
      } else if (nextCid && dto.name && dto.departmentId && dto.positionId) {
        await tx.member.create({
          data: {
            cid: nextCid,
            member_name: dto.name.trim(),
            department_id1: dto.departmentId,
            department_id2: dto.departmentId2 ?? 0,
            position_id: dto.positionId,
            team_id: dto.teamId ?? null,
            role: requestedRole,
            rm_scope: requestedRmScope,
            priority: permissions.priority,
            accessrules: permissions.accessrules,
            rm_status: permissions.rmStatus,
            status: dto.active === false ? '0' : '1',
            create_date: new Date(),
            modify_date: new Date(),
          },
        });
      }
    });

    return { message: 'บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว' };
  }

  async resetPassword(id: number, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งาน');
    const passwordHash = await this.passwordHash(password);
    await this.prisma.user.update({
      where: { id },
      data: {
        password_hash: passwordHash,
        auth_key: randomBytes(16).toString('hex'),
        updated_at: Math.floor(Date.now() / 1000),
        require_password_change: true,
      } as any,
    });
    return { message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว' };
  }
}
