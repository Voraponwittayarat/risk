import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateNrlsMappingDto } from './dto/update-nrls-mapping.dto';
import {
  MappingPermission,
  normalizeMappingPermission,
} from '../auth/mapping-permission.utils';

@Injectable()
export class NrlsRiskstoreService {
  constructor(private prisma: PrismaService) {}

  private assertMappingRole(user: any) {
    if (user?.role !== 'admin' && user?.role !== 'rm_committee') {
      throw new ForbiddenException(
        'เฉพาะ Admin หรือ RM ที่ได้รับมอบหมายเท่านั้นที่จัดทำ Mapping ได้',
      );
    }
  }

  private async mappingPermissionFor(user: any): Promise<MappingPermission> {
    this.assertMappingRole(user);
    if (user?.role === 'admin') return 'full';
    const member = user?.cid
      ? await this.prisma.member.findFirst({
          where: { cid: String(user.cid) },
          select: { role: true, mapping_permission: true },
        })
      : null;
    const permission = normalizeMappingPermission(
      member?.role || user?.role,
      member?.mapping_permission ?? user?.mappingPermission,
    );
    if (permission === 'none') {
      throw new ForbiddenException(
        'Admin ปิดสิทธิ์การจัดทำ Mapping ของบัญชีนี้',
      );
    }
    return permission;
  }

  private actorId(user: any): number | null {
    const value = Number(user?.id ?? user?.userId ?? user?.sub);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  private toLocalRiskView(topic: any) {
    const fullName = String(topic.riskstore_name || '').trim();
    const spaceIndex = fullName.indexOf(' ');
    return {
      id: topic.riskstore_id,
      code: spaceIndex > 0 ? fullName.slice(0, spaceIndex) : fullName,
      name: spaceIndex > 0 ? fullName.slice(spaceIndex + 1).trim() : fullName,
      fullName,
      groupId: topic.group_id,
      programId: topic.program_id,
      typeId: topic.type_id,
      levelId: topic.level_id,
      active: topic.status !== '0',
      nrlsCode: topic.nrls_code,
    };
  }

  async findAll() {
    return this.prisma.nRLS_riskstore.findMany({
      include: {
        local_risks: true,
        program: true,
      },
    });
  }

  async findOne(nrls_code: string) {
    return this.prisma.nRLS_riskstore.findUnique({
      where: { nrls_code },
      include: {
        local_risks: true,
        program: true,
      },
    });
  }

  async getMappingContext(user: any) {
    const mappingPermission = await this.mappingPermissionFor(user);
    const [nrlsRisks, localRisks, programs] = await Promise.all([
      this.findAll(),
      this.prisma.riskstore.findMany({ orderBy: { riskstore_name: 'asc' } }),
      this.prisma.program.findMany({ orderBy: { program_name: 'asc' } }),
    ]);
    const canFullEdit = mappingPermission === 'full';
    return {
      nrlsRisks,
      localRisks: localRisks.map((risk) => this.toLocalRiskView(risk)),
      programs,
      permissions: {
        can_manage_mapping: true,
        can_full_edit: canFullEdit,
        can_edit_program: canFullEdit,
        permission_level: mappingPermission,
        scope_label: canFullEdit
          ? 'แก้ไข Mapping ได้เต็มรูปแบบ'
          : 'เพิ่มชื่อความเสี่ยงที่ยังไม่ถูก Mapping ได้',
      },
    };
  }

  async update(nrls_code: string, data: any) {
    return this.prisma.nRLS_riskstore.update({
      where: { nrls_code },
      data,
    });
  }

  async updateMapping(nrls_code: string, dto: UpdateNrlsMappingDto, user: any) {
    const mappingPermission = await this.mappingPermissionFor(user);
    const reason = String(dto.reason || '').trim();
    if (reason.length < 5) {
      throw new BadRequestException(
        'กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 5 ตัวอักษร',
      );
    }

    const requestedIds = [...new Set(dto.riskstore_ids.map(Number))];
    if (requestedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('รหัสชื่อความเสี่ยงไม่ถูกต้อง');
    }

    const [target, currentMappings, requestedRisks] = await Promise.all([
      this.prisma.nRLS_riskstore.findUnique({ where: { nrls_code } }),
      this.prisma.riskstore.findMany({
        where: { nrls_code },
        select: { riskstore_id: true, nrls_code: true, status: true },
      }),
      requestedIds.length > 0
        ? this.prisma.riskstore.findMany({
            where: { riskstore_id: { in: requestedIds } },
            select: { riskstore_id: true, nrls_code: true, status: true },
          })
        : Promise.resolve(
            [] as Array<{
              riskstore_id: number;
              nrls_code: string | null;
              status: string | null;
            }>,
          ),
    ]);

    if (!target)
      throw new NotFoundException('ไม่พบมาตรฐาน NRLS ที่ต้องการ Mapping');
    if (requestedRisks.length !== requestedIds.length) {
      throw new BadRequestException('พบชื่อความเสี่ยงที่ไม่มีอยู่ในระบบ');
    }
    if (requestedRisks.some((risk) => risk.status === '0')) {
      throw new BadRequestException(
        'ไม่สามารถ Mapping ชื่อความเสี่ยงที่ปิดใช้งานแล้ว',
      );
    }

    const canFullEdit = mappingPermission === 'full';
    if (
      !canFullEdit &&
      dto.program_id !== undefined &&
      dto.program_id !== target.program_id
    ) {
      throw new ForbiddenException(
        'สิทธิ์ระดับเพิ่มอย่างเดียวไม่สามารถเปลี่ยนโปรแกรม NRLS ได้',
      );
    }

    const mappedToOther = requestedRisks.filter(
      (risk) => risk.nrls_code && risk.nrls_code !== nrls_code,
    );
    if (!canFullEdit && mappedToOther.length > 0) {
      throw new ForbiddenException(
        'สิทธิ์ระดับเพิ่มอย่างเดียวไม่สามารถย้ายรายการที่ Mapping อยู่แล้ว กรุณาให้ผู้ที่ Admin กำหนดสิทธิ์แก้ไขทั้งหมดดำเนินการ',
      );
    }

    const currentIds = currentMappings.map((risk) => risk.riskstore_id);
    const desiredIds = canFullEdit
      ? requestedIds
      : [...new Set([...currentIds, ...requestedIds])];
    const added = desiredIds.filter((id) => !currentIds.includes(id));
    const removed = currentIds.filter((id) => !desiredIds.includes(id));
    const reassigned = mappedToOther.map((risk) => ({
      riskstore_id: risk.riskstore_id,
      from_nrls_code: risk.nrls_code,
      to_nrls_code: nrls_code,
    }));
    const nextProgramId =
      canFullEdit && dto.program_id !== undefined
        ? dto.program_id
        : target.program_id;
    const changedAt = new Date();
    const changedBy = this.actorId(user);

    await this.prisma.$transaction(async (tx) => {
      if (canFullEdit && dto.program_id !== undefined) {
        await tx.nRLS_riskstore.update({
          where: { nrls_code },
          data: { program_id: dto.program_id },
        });
      }

      if (canFullEdit && removed.length > 0) {
        await tx.riskstore.updateMany({
          where: { nrls_code, riskstore_id: { in: removed } },
          data: {
            nrls_code: null,
            modify_date: changedAt,
            updated_by: changedBy,
          },
        });
      }

      if (desiredIds.length > 0) {
        const typeId = nrls_code.startsWith('C')
          ? 2
          : nrls_code.startsWith('G')
            ? 1
            : undefined;
        await tx.riskstore.updateMany({
          where: { riskstore_id: { in: desiredIds } },
          data: {
            nrls_code,
            ...(typeId !== undefined ? { type_id: typeId } : {}),
            modify_date: changedAt,
            updated_by: changedBy,
          },
        });
      }

      await tx.workflow_audit.create({
        data: {
          entity_type: 'NRLS_MAPPING',
          entity_id: nrls_code,
          action: 'MAPPING_UPDATED',
          old_value: JSON.stringify({
            riskstore_ids: currentIds,
            program_id: target.program_id,
          }),
          new_value: JSON.stringify({
            riskstore_ids: desiredIds,
            program_id: nextProgramId,
            added,
            removed,
            reassigned,
            actor_role: user?.role || null,
            actor_rm_scope: user?.rmScope || null,
            actor_department_id: user?.departmentId ?? null,
            actor_mapping_permission: mappingPermission,
          }),
          reason,
          changed_by: changedBy,
        },
      });
    });

    return {
      success: true,
      added: added.length,
      removed: removed.length,
      reassigned: reassigned.length,
    };
  }
}
