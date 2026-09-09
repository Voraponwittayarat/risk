import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { CreateEffectivenessReviewDto } from './dto/create-effectiveness-review.dto';
import { DecideCapaClosureDto } from './dto/decide-capa-closure.dto';
import { UpdateCapaDto } from './dto/update-capa.dto';

const TERMINAL_CAPA_STATUSES = ['CLOSED', 'CANCELLED'];

@Injectable()
export class CapaService {
  private readonly logger = new Logger(CapaService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    // Prisma Client is regenerated as part of the migration release step.
    return this.prisma as any;
  }

  private actorId(user: any): number | null {
    const id = Number(user?.id || user?.userId || user?.sub);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private actorDepartments(user: any): string[] {
    return [user?.departmentId, user?.departmentId2]
      .filter((value) => value !== null && value !== undefined && String(value) !== '' && String(value) !== '0')
      .map(String);
  }

  private isRm(user: any): boolean {
    return user?.role === 'rm_committee';
  }

  private assertHospitalRm(user: any): void {
    if (!this.isRm(user) || user?.rmScope !== 'hospital') {
      throw new ForbiddenException('หน้านี้สำหรับ RM โรงพยาบาลเท่านั้น');
    }
  }

  async findMonitoringActions(user: any, query: Parameters<CapaService['findAll']>[1]) {
    this.assertHospitalRm(user);
    return this.findAll(user, query);
  }

  async departmentResponse(user: any, from?: string, to?: string) {
    this.assertHospitalRm(user);
    const parseDate = (value?: string) => {
      if (!value) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)
        || Number.isNaN(Date.parse(value))
        || new Date(value).toISOString().slice(0, 10) !== value) {
        throw new BadRequestException('ช่วงวันที่ไม่ถูกต้อง');
      }
      return new Date(`${value}T00:00:00+07:00`);
    };
    const start = parseDate(from);
    const end = parseDate(to);
    if (start && end && start > end) throw new BadRequestException('วันเริ่มต้องไม่อยู่หลังวันสิ้นสุด');
    const now = new Date();
    const [departments, slas] = await Promise.all([
      this.prisma.department.findMany({ select: { id: true, depart_name: true }, orderBy: { id: 'asc' } }),
      this.db.sla_instance.findMany({
        where: {
          entity_type: 'INCIDENT', workflow_stage: 'REVIEW_OWNER', status: { in: ['ACTIVE', 'COMPLETED'] },
          started_at: { ...(start ? { gte: start } : {}), ...(end ? { lt: new Date(end.getTime() + 86400000) } : {}) },
        },
        select: { owner_department_id: true, started_at: true, due_at: true, completed_at: true, status: true },
      }),
    ]);
    let invalidRecords = 0;
    const rows = departments.map((department) => {
      const items = slas.filter((sla: any) => Number(sla.owner_department_id) === department.id);
      const durations: number[] = [];
      const waits: number[] = [];
      let onTime = 0;
      let overdue = 0;
      for (const item of items) {
        const started = new Date(item.started_at).getTime();
        const due = new Date(item.due_at).getTime();
        const finished = item.completed_at ? new Date(item.completed_at).getTime() : NaN;
        if (!Number.isFinite(started) || started > now.getTime() || !Number.isFinite(due)
          || (item.status === 'COMPLETED' && (!Number.isFinite(finished) || finished < started || finished > now.getTime()))) {
          invalidRecords++;
          continue;
        }
        if (item.status === 'COMPLETED') {
          durations.push((finished - started) / 3600000);
          if (finished <= due) onTime++;
        } else {
          waits.push((now.getTime() - started) / 3600000);
          if (due < now.getTime()) overdue++;
        }
      }
      const sorted = [...durations].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return {
        department_id: String(department.id), department_name: department.depart_name,
        total: durations.length + waits.length, responded: durations.length, pending: waits.length, overdue,
        average_hours: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
        median_hours: sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : null,
        on_time_percent: durations.length ? onTime / durations.length * 100 : null,
        longest_wait_hours: waits.length ? Math.max(...waits) : null,
      };
    });
    return {
      generated_at: now.toISOString(), rows, invalid_records: invalidRecords,
      unassigned_records: slas.filter((sla: any) => !departments.some((department) => department.id === Number(sla.owner_department_id))).length,
    };
  }

  private async scopeDepartments(user: any): Promise<string[] | null> {
    if (user?.role === 'admin' || (this.isRm(user) && user?.rmScope === 'hospital')) return null;
    if ((this.isRm(user) || user?.role === 'head') && user?.rmScope === 'group' && user?.departmentGroup) {
      const rows = await this.prisma.department.findMany({
        where: { depart_group_id: Number(user.departmentGroup) },
        select: { id: true },
      });
      return rows.map((row) => String(row.id));
    }
    return this.actorDepartments(user);
  }

  private incidentTouchesScope(incident: any, departments: string[] | null): boolean {
    return departments === null || [incident?.department_id, incident?.sendto_department_id]
      .filter(Boolean)
      .some((departmentId) => departments.includes(String(departmentId)));
  }

  private allowed(user: any, capa: any, departments: string[] | null): boolean {
    if (user?.role === 'admin' || departments === null) return true;
    const actorId = this.actorId(user);
    return (capa.responsible_user_id != null && actorId != null && Number(capa.responsible_user_id) === actorId)
      || (Boolean(capa.responsible_member_cid) && String(capa.responsible_member_cid) === String(user?.cid || ''))
      || (capa.responsible_team_id != null && String(capa.responsible_team_id) === String(user?.teamId || ''))
      || departments.includes(String(capa.responsible_department_id || ''));
  }

  private allowedWithIncident(user: any, capa: any, incident: any, departments: string[] | null): boolean {
    return this.allowed(user, capa, departments)
      || (incident?.sendto_team_id != null && Number(incident.sendto_team_id) === Number(user?.teamId))
      || ((this.isRm(user) || user?.role === 'head') && this.incidentTouchesScope(incident, departments));
  }

  private canManageProgress(user: any, capa: any, departments: string[] | null): boolean {
    if (user?.role === 'admin') return false;
    const actorId = this.actorId(user);
    const directlyAssigned = (capa.responsible_user_id != null && actorId != null && Number(capa.responsible_user_id) === actorId)
      || (Boolean(capa.responsible_member_cid) && String(capa.responsible_member_cid) === String(user?.cid || ''))
      || (capa.responsible_team_id != null && String(capa.responsible_team_id) === String(user?.teamId || ''));
    const accountableHead = user?.role === 'head'
      && (departments === null || departments.includes(String(capa.responsible_department_id || '')));
    return directlyAssigned || accountableHead;
  }

  private severityGroup(severity?: string | null): string {
    const level = String(severity || '').trim().toUpperCase();
    if (['G', 'H', 'I', '4', '5'].includes(level)) return 'CRITICAL';
    if (['E', 'F', '3'].includes(level)) return 'HIGH';
    if (['C', 'D', '2'].includes(level)) return 'MEDIUM';
    return 'LOW';
  }

  private endOfDay(value: Date | string): Date {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private assertDateOrder(implementationDue: Date, effectivenessDue: Date): void {
    if (Number.isNaN(implementationDue.getTime()) || Number.isNaN(effectivenessDue.getTime())) {
      throw new BadRequestException('วันที่ครบกำหนด CAPA ไม่ถูกต้อง');
    }
    if (effectivenessDue.getTime() <= implementationDue.getTime()) {
      throw new BadRequestException('วันประเมินประสิทธิผลต้องอยู่หลังวันครบกำหนดดำเนินมาตรการ');
    }
  }

  private async createOrRestartSla(
    tx: any,
    capa: any,
    incident: any,
    stage: 'CAPA_IMPLEMENTATION' | 'CAPA_EFFECTIVENESS',
    explicitDue?: Date | null,
  ): Promise<void> {
    const severityGroup = this.severityGroup(incident?.level_id);
    const policy = await tx.sla_policy.findUnique({
      where: { workflow_stage_severity_group: { workflow_stage: stage, severity_group: severityGroup } },
    });
    const startedAt = new Date();
    const dueAt = explicitDue
      ? this.endOfDay(explicitDue)
      : new Date(startedAt.getTime() + Number(policy?.duration_hours || 168) * 3600000);
    await tx.sla_instance.upsert({
      where: {
        entity_type_entity_id_workflow_stage: {
          entity_type: 'CAPA',
          entity_id: String(capa.id),
          workflow_stage: stage,
        },
      },
      create: {
        policy_id: policy?.id || null,
        entity_type: 'CAPA',
        entity_id: String(capa.id),
        workflow_stage: stage,
        severity: incident?.level_id || null,
        owner_user_id: capa.responsible_user_id || null,
        owner_department_id: capa.responsible_department_id || null,
        started_at: startedAt,
        due_at: dueAt,
      },
      update: {
        policy_id: policy?.id || null,
        severity: incident?.level_id || null,
        owner_user_id: capa.responsible_user_id || null,
        owner_department_id: capa.responsible_department_id || null,
        started_at: startedAt,
        due_at: dueAt,
        status: 'ACTIVE',
        breached_at: null,
        completed_at: null,
        escalation_level: 0,
        last_escalated_at: null,
      },
    });
  }

  private async completeSla(tx: any, capaId: number, stage: string): Promise<void> {
    await tx.sla_instance.updateMany({
      where: { entity_type: 'CAPA', entity_id: String(capaId), workflow_stage: stage, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completed_at: new Date(), updated_at: new Date() },
    });
  }

  private async audit(tx: any, capaId: number, action: string, oldValue: any, newValue: any, user: any, reason?: string) {
    await tx.workflow_audit.create({
      data: {
        entity_type: 'CAPA',
        entity_id: String(capaId),
        action,
        old_value: oldValue == null ? null : JSON.stringify(oldValue),
        new_value: newValue == null ? null : JSON.stringify(newValue),
        reason: reason || null,
        changed_by: this.actorId(user),
      },
    });
  }

  private async requireCapa(id: number, user: any): Promise<{ capa: any; departments: string[] | null; incident: any }> {
    const capa = await this.db.capa_action.findUnique({ where: { id } });
    if (!capa) throw new NotFoundException('ไม่พบ CAPA');
    const departments = await this.scopeDepartments(user);
    const incident = await this.prisma.riskregister.findFirst({ where: { id: capa.incident_id } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์ต้นทางของ CAPA');
    if (!this.allowedWithIncident(user, capa, incident, departments)) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง CAPA นี้');
    return { capa, departments, incident };
  }

  private async enrich(rows: any[]): Promise<any[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => String(row.id));
    const incidentIds = [...new Set(rows.map((row) => Number(row.incident_id)))];
    const [slas, incidents] = await Promise.all([
      this.db.sla_instance.findMany({
        where: { entity_type: 'CAPA', entity_id: { in: ids } },
        include: { escalation_events: { orderBy: { notified_at: 'desc' } } },
      }),
      this.db.riskregister.findMany({
        where: { id: { in: incidentIds } },
        select: {
          id: true,
          id_risk: true,
          level_id: true,
          status_risk: true,
          nrls_code: true,
          nrls_name_snapshot: true,
          department_id: true,
          sendto_department_id: true,
          operational_closed_at: true,
          improvement_status: true,
        },
      }),
    ]);
    const incidentMap = new Map(incidents.map((incident: any) => [Number(incident.id), incident]));
    const now = Date.now();
    return rows.map((row) => {
      const rowSlas = slas.filter((sla: any) => sla.entity_id === String(row.id));
      const activeSla = rowSlas.find((sla: any) => sla.status === 'ACTIVE');
      const overdue = Boolean(activeSla && new Date(activeSla.due_at).getTime() < now);
      return {
        ...row,
        incident: incidentMap.get(Number(row.incident_id)) || null,
        sla: rowSlas,
        active_sla: activeSla || null,
        is_overdue: overdue,
        overdue_hours: overdue ? Math.floor((now - new Date(activeSla.due_at).getTime()) / 3600000) : 0,
      };
    });
  }

  async findAll(user: any, query: { status?: string; nrls_code?: string; due?: string; incident_id?: number }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.nrls_code) where.nrls_code = query.nrls_code;
    if (query.incident_id) where.incident_id = Number(query.incident_id);
    const rows = await this.db.capa_action.findMany({
      where,
      include: { effectiveness_reviews: { orderBy: { review_date: 'desc' } } },
      orderBy: [{ due_date: 'asc' }, { id: 'desc' }],
    });
    const departments = await this.scopeDepartments(user);
    let result = (await this.enrich(rows))
      .filter((row) => this.allowedWithIncident(user, row, row.incident, departments));
    if (query.due === 'overdue') result = result.filter((row) => row.is_overdue);
    if (query.due === 'soon') {
      const soon = Date.now() + 7 * 86400000;
      result = result.filter((row) => row.active_sla
        && new Date(row.active_sla.due_at).getTime() >= Date.now()
        && new Date(row.active_sla.due_at).getTime() <= soon);
    }
    return result;
  }

  async findByIncident(incidentId: number, user: any) {
    return this.findAll(user, { incident_id: incidentId });
  }

  async alerts(user: any) {
    await this.processEscalations();
    const [overdue, dueSoon] = await Promise.all([
      this.findAll(user, { due: 'overdue' }),
      this.findAll(user, { due: 'soon' }),
    ]);
    const rcaOverdue = await this.prisma.riskregister.findMany({
      where: { rca_required: true, rca_status: { not: 'COMPLETED' }, rca_due_at: { lt: new Date() } },
      select: { id: true, id_risk: true, nrls_code: true, department_id: true, sendto_department_id: true, rca_status: true, rca_due_at: true },
    });
    const departments = await this.scopeDepartments(user);
    return {
      overdue,
      due_soon: dueSoon,
      rca_overdue: rcaOverdue.filter((incident) => this.incidentTouchesScope(incident, departments)),
    };
  }

  async create(dto: CreateCapaDto, user: any) {
    if (user?.role === 'admin') {
      throw new ForbiddenException('ผู้ดูแลระบบไม่มีสิทธิ์สร้างมาตรการทางคลินิก กรุณาใช้บัญชีผู้รับผิดชอบความเสี่ยง');
    }
    const incident = await this.prisma.riskregister.findFirst({ where: { id: Number(dto.incident_id) } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์ที่ต้องการสร้าง CAPA');
    const departments = await this.scopeDepartments(user);
    const teamParticipant = incident.sendto_team_id != null && Number(incident.sendto_team_id) === Number(user?.teamId);
    const managementRole = this.isRm(user) || user?.role === 'head';
    if ((!managementRole || !this.incidentTouchesScope(incident, departments)) && !teamParticipant) {
      throw new ForbiddenException('เฉพาะ Owner, Co-review หรือ RM ในขอบเขตอุบัติการณ์เท่านั้นที่สร้าง CAPA ได้');
    }
    const dueDate = new Date(dto.due_date);
    const effectivenessDueDate = new Date(dto.effectiveness_due_date);
    this.assertDateOrder(dueDate, effectivenessDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate.getTime() < today.getTime()) throw new BadRequestException('วันครบกำหนดดำเนินมาตรการต้องไม่เป็นวันที่ย้อนหลัง');
    const responsibleDepartment = await this.prisma.department.findUnique({
      where: { id: Number(dto.responsible_department_id) }, select: { id: true },
    });
    if (!responsibleDepartment) throw new BadRequestException('ไม่พบหน่วยงานรับผิดชอบ CAPA ที่เลือก');
    if (teamParticipant && !managementRole && ![incident.department_id, incident.sendto_department_id]
      .filter(Boolean).map(String).includes(String(dto.responsible_department_id))) {
      throw new ForbiddenException('Co-review สร้าง CAPA ได้เฉพาะหน่วยงานต้นทางหรือหน่วยงานเจ้าของเรื่อง');
    }
    const actorId = this.actorId(user);
    const sourceId = `INC-${incident.id}-${Date.now()}`.slice(0, 50);

    const created = await this.prisma.$transaction(async (tx) => {
      const capa = await (tx as any).capa_action.create({
        data: {
          source_type: 'NON_RCA',
          source_id: sourceId,
          incident_id: incident.id,
          incident_id_risk: incident.id_risk,
          nrls_code: incident.nrls_code || `LEGACY-${incident.id}`,
          action: dto.action.trim(),
          action_type: dto.action_type,
          responsible_user_id: dto.responsible_user_id || null,
          responsible_member_cid: dto.responsible_member_cid?.trim() || null,
          responsible_team_id: dto.responsible_team_id || null,
          responsible_department_id: String(dto.responsible_department_id),
          responsible_display_name: dto.responsible_display_name.trim(),
          due_date: dueDate,
          effectiveness_criteria: dto.effectiveness_criteria.trim(),
          baseline_value: dto.baseline_value?.trim() || null,
          target_value: dto.target_value.trim(),
          effectiveness_due_date: effectivenessDueDate,
          effectiveness_status: 'NOT_DUE',
          approval_status: 'NOT_READY',
          created_by: actorId,
        },
      });
      await this.createOrRestartSla(tx, capa, incident, 'CAPA_IMPLEMENTATION', dueDate);
      await (tx as any).riskregister.updateMany({
        where: { id: incident.id, id_risk: incident.id_risk },
        data: { improvement_status: 'MONITORING', effectiveness_closed_at: null },
      });
      await this.audit(tx, capa.id, 'CAPA_CREATED', null, {
        source_type: 'NON_RCA', status: capa.status, due_date: dueDate,
      }, user);
      return capa;
    });
    return (await this.enrich([{ ...created, effectiveness_reviews: [] }]))[0];
  }

  async initializeMonitoring(capaId: number): Promise<void> {
    const capa = await this.db.capa_action.findUnique({ where: { id: capaId } });
    if (!capa) throw new NotFoundException('ไม่พบ CAPA ที่ต้องเริ่มติดตาม');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: capa.incident_id } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์ต้นทางของ CAPA');
    await this.prisma.$transaction(async (tx) => {
      await this.createOrRestartSla(tx, capa, incident, 'CAPA_IMPLEMENTATION', capa.due_date);
      await (tx as any).riskregister.updateMany({
        where: { id: incident.id, id_risk: incident.id_risk },
        data: { improvement_status: 'MONITORING', effectiveness_closed_at: null },
      });
    });
  }

  async update(id: number, dto: UpdateCapaDto, user: any) {
    const { capa, departments, incident } = await this.requireCapa(id, user);
    if (!this.canManageProgress(user, capa, departments)) {
      throw new ForbiddenException('เฉพาะผู้รับผิดชอบ CAPA หรือหัวหน้าหน่วยงานเจ้าของมาตรการเท่านั้นที่อัปเดตความคืบหน้าได้');
    }
    const requested = dto.status === 'COMPLETED' ? 'IMPLEMENTED' : dto.status;
    const current = String(capa.status || 'PENDING').toUpperCase();
    const transitions: Record<string, string[]> = {
      PENDING: ['PENDING', 'IN_PROGRESS'],
      IN_PROGRESS: ['IN_PROGRESS', 'IMPLEMENTED'],
      REWORK: ['REWORK', 'IN_PROGRESS'],
    };
    if (!Object.prototype.hasOwnProperty.call(transitions, current)) {
      throw new BadRequestException('เกณฑ์และหลักฐาน CAPA ถูกล็อกแล้วหลังเข้าสู่ช่วงประเมินประสิทธิผล');
    }
    if (requested && requested !== current && !(transitions[current] || []).includes(requested)) {
      throw new BadRequestException(`ไม่สามารถเปลี่ยน CAPA จาก ${current} เป็น ${requested} ได้`);
    }
    const dueDate = dto.due_date ? new Date(dto.due_date) : capa.due_date;
    const effectivenessDueDate = dto.effectiveness_due_date ? new Date(dto.effectiveness_due_date) : capa.effectiveness_due_date;
    if (dueDate && effectivenessDueDate) this.assertDateOrder(dueDate, effectivenessDueDate);
    const mergedEvidence = dto.evidence === undefined ? capa.evidence : dto.evidence.trim();
    const mergedCriteria = dto.effectiveness_criteria === undefined ? capa.effectiveness_criteria : dto.effectiveness_criteria.trim();
    const mergedTarget = dto.target_value === undefined ? capa.target_value : dto.target_value.trim();
    if (requested === 'IMPLEMENTED' && (!mergedEvidence || !mergedCriteria || !mergedTarget || !effectivenessDueDate)) {
      throw new BadRequestException('ก่อนยืนยันว่าดำเนินมาตรการแล้ว ต้องมีหลักฐาน เกณฑ์/เป้าหมาย และวันประเมินประสิทธิผล');
    }

    const now = new Date();
    const storedStatus = requested === 'IMPLEMENTED' ? 'AWAITING_EFFECTIVENESS' : requested;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await (tx as any).capa_action.update({
        where: { id },
        data: {
          status: storedStatus,
          evidence: dto.evidence === undefined ? undefined : dto.evidence.trim(),
          effectiveness_criteria: dto.effectiveness_criteria === undefined ? undefined : dto.effectiveness_criteria.trim(),
          baseline_value: dto.baseline_value === undefined ? undefined : dto.baseline_value.trim() || null,
          target_value: dto.target_value === undefined ? undefined : dto.target_value.trim(),
          due_date: dto.due_date ? dueDate : undefined,
          effectiveness_due_date: dto.effectiveness_due_date ? effectivenessDueDate : undefined,
          completed_at: requested === 'IMPLEMENTED' ? now : undefined,
          implementation_verified_by: requested === 'IMPLEMENTED' ? this.actorId(user) : undefined,
          implementation_verified_at: requested === 'IMPLEMENTED' ? now : undefined,
          effectiveness_status: requested === 'IMPLEMENTED' ? 'PENDING' : undefined,
          approval_status: requested === 'IMPLEMENTED' ? 'NOT_READY' : undefined,
          updated_at: now,
        },
      });
      if (requested === 'IMPLEMENTED') {
        await this.completeSla(tx, id, 'CAPA_IMPLEMENTATION');
        await this.createOrRestartSla(tx, row, incident, 'CAPA_EFFECTIVENESS', effectivenessDueDate);
      } else if (dto.due_date) {
        await this.createOrRestartSla(tx, row, incident, 'CAPA_IMPLEMENTATION', dueDate);
      }
      await this.audit(tx, id, requested === 'IMPLEMENTED' ? 'IMPLEMENTATION_VERIFIED' : 'PROGRESS_UPDATED', {
        status: capa.status, evidence: capa.evidence,
      }, {
        status: row.status, evidence: row.evidence,
      }, user);
      return row;
    });
    return (await this.enrich([{ ...updated, effectiveness_reviews: [] }]))[0];
  }

  async recordEffectiveness(id: number, dto: CreateEffectivenessReviewDto, user: any) {
    const { capa, incident } = await this.requireCapa(id, user);
    if (user?.role === 'admin') throw new ForbiddenException('ผู้ดูแลระบบไม่สามารถให้ผลประเมินทางคลินิกได้');
    const actorId = this.actorId(user);
    const sameOwner = (capa.responsible_user_id && Number(capa.responsible_user_id) === actorId)
      || (capa.responsible_member_cid && String(capa.responsible_member_cid) === String(user?.cid || ''))
      || (capa.implementation_verified_by && Number(capa.implementation_verified_by) === actorId);
    if (sameOwner) throw new ForbiddenException('ผู้ดำเนินมาตรการต้องไม่เป็นผู้ประเมินประสิทธิผลของมาตรการเดียวกัน');
    const isCoReviewer = incident.sendto_team_id != null && Number(incident.sendto_team_id) === Number(user?.teamId);
    if (!this.isRm(user) && user?.role !== 'head' && !isCoReviewer) {
      throw new ForbiddenException('การประเมินประสิทธิผลต้องทำโดย Co-review, หัวหน้าหน่วยงาน หรือ RM ที่เป็นอิสระจากผู้ดำเนินการ');
    }
    const current = String(capa.status || '').toUpperCase();
    if (!['IMPLEMENTED', 'AWAITING_EFFECTIVENESS'].includes(current)) {
      throw new BadRequestException('CAPA ยังไม่อยู่ในขั้นพร้อมประเมินประสิทธิผล');
    }
    const reviewDate = new Date(dto.review_date);
    if (capa.completed_at && this.endOfDay(reviewDate).getTime() < new Date(capa.completed_at).getTime()) {
      throw new BadRequestException('วันที่ประเมินประสิทธิผลต้องไม่อยู่ก่อนวันที่ดำเนินมาตรการเสร็จ');
    }
    if (capa.effectiveness_due_date && this.endOfDay(reviewDate).getTime() < new Date(capa.effectiveness_due_date).getTime()) {
      throw new BadRequestException('ยังไม่ถึงวันที่กำหนดประเมินประสิทธิผล กรุณารอให้ครบช่วงติดตามก่อน');
    }
    if (!String(dto.measured_value || '').trim() && !String(dto.evidence || '').trim()) {
      throw new BadRequestException('กรุณาระบุค่าที่วัดได้หรือหลักฐานประกอบการประเมินประสิทธิผล');
    }
    const effective = dto.result === 'EFFECTIVE' && !dto.followup_required;
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).capa_effectiveness_review.create({
        data: {
          capa_action_id: id,
          review_date: reviewDate,
          result: dto.result,
          measured_value: dto.measured_value?.trim() || null,
          observation: dto.observation.trim(),
          evidence: dto.evidence?.trim() || null,
          followup_required: dto.followup_required || false,
          reviewer_user_id: actorId,
          reviewer_member_cid: user?.cid || null,
          reviewer_role: this.isRm(user) ? 'RM' : isCoReviewer ? 'CO_REVIEW' : 'HEAD',
        },
      });
      const row = await (tx as any).capa_action.update({
        where: { id },
        data: effective ? {
          status: 'AWAITING_APPROVAL',
          effectiveness_status: 'EFFECTIVE',
          approval_status: 'PENDING',
          updated_at: now,
        } : {
          status: 'REWORK',
          effectiveness_status: dto.result,
          approval_status: 'NOT_READY',
          completed_at: null,
          implementation_verified_by: null,
          implementation_verified_at: null,
          revision: { increment: 1 },
          updated_at: now,
        },
      });
      await this.completeSla(tx, id, 'CAPA_EFFECTIVENESS');
      if (!effective) await this.createOrRestartSla(tx, row, incident, 'CAPA_IMPLEMENTATION', null);
      await this.audit(tx, id, 'EFFECTIVENESS_REVIEWED', {
        status: capa.status, effectiveness_status: capa.effectiveness_status,
      }, {
        status: row.status, effectiveness_status: row.effectiveness_status, result: dto.result,
      }, user, dto.observation);
    });
    await this.refreshIncidentImprovementStatus(capa.incident_id);
    const refreshed = await this.requireCapa(id, user);
    return (await this.enrich([refreshed.capa]))[0];
  }

  async decideClosure(id: number, dto: DecideCapaClosureDto, user: any) {
    const { capa, incident } = await this.requireCapa(id, user);
    if (!this.isRm(user)) throw new ForbiddenException('เฉพาะคณะกรรมการ RM ในขอบเขตที่รับผิดชอบเท่านั้นที่อนุมัติปิด CAPA ได้');
    if (String(capa.status).toUpperCase() !== 'AWAITING_APPROVAL' || capa.effectiveness_status !== 'EFFECTIVE') {
      throw new BadRequestException('ปิด CAPA ได้ต่อเมื่อมีผลประเมิน EFFECTIVE และอยู่ระหว่างรอ RM อนุมัติ');
    }
    if (dto.decision === 'RETURN' && String(dto.note || '').trim().length < 10) {
      throw new BadRequestException('กรุณาระบุเหตุผลส่งกลับอย่างน้อย 10 ตัวอักษร');
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await (tx as any).capa_action.update({
        where: { id },
        data: dto.decision === 'APPROVE' ? {
          status: 'CLOSED',
          approval_status: 'APPROVED',
          approved_by: this.actorId(user),
          approved_at: now,
          closed_at: now,
          updated_at: now,
        } : {
          status: 'REWORK',
          approval_status: 'RETURNED',
          effectiveness_status: 'REVIEW_REQUIRED',
          completed_at: null,
          implementation_verified_by: null,
          implementation_verified_at: null,
          revision: { increment: 1 },
          updated_at: now,
        },
      });
      if (dto.decision === 'RETURN') await this.createOrRestartSla(tx, row, incident, 'CAPA_IMPLEMENTATION', row.due_date);
      await this.audit(tx, id, dto.decision === 'APPROVE' ? 'CLOSURE_APPROVED' : 'CLOSURE_RETURNED', {
        status: capa.status, approval_status: capa.approval_status,
      }, {
        status: row.status, approval_status: row.approval_status,
      }, user, dto.note);
      return row;
    });
    await this.refreshIncidentImprovementStatus(capa.incident_id);
    return (await this.enrich([updated]))[0];
  }

  async refreshIncidentImprovementStatus(incidentId: number): Promise<void> {
    const [incident, actions] = await Promise.all([
      this.prisma.riskregister.findFirst({ where: { id: incidentId } }),
      this.db.capa_action.findMany({ where: { incident_id: incidentId }, select: { status: true } }),
    ]);
    if (!incident) return;
    const statuses = actions.map((action: any) => String(action.status || '').toUpperCase());
    const active = statuses.filter((status: string) => !TERMINAL_CAPA_STATUSES.includes(status));
    const closedCount = statuses.filter((status: string) => status === 'CLOSED').length;
    const improvementStatus = statuses.length === 0 || (active.length === 0 && closedCount === 0)
      ? 'NOT_REQUIRED'
      : active.length === 0
        ? 'CLOSED'
        : 'MONITORING';
    await this.db.riskregister.updateMany({
      where: { id: incident.id, id_risk: incident.id_risk },
      data: {
        improvement_status: improvementStatus,
        effectiveness_closed_at: improvementStatus === 'CLOSED' ? new Date() : null,
      },
    });
  }

  @Cron('0 */30 * * * *')
  async scheduledEscalation(): Promise<void> {
    try {
      await this.processEscalations();
    } catch (error: any) {
      this.logger.warn(`CAPA SLA escalation skipped: ${error?.message || error}`);
    }
  }

  async processEscalations(user?: any) {
    if (user && !this.isRm(user)) throw new ForbiddenException('เฉพาะ RM เท่านั้นที่สั่งประมวลผล Escalation ได้');
    const now = new Date();
    const breached = await this.db.sla_instance.findMany({
      where: { status: 'ACTIVE', due_at: { lt: now } },
      include: { policy: true },
    });
    let escalated = 0;
    for (const sla of breached) {
      const overdueHours = Math.floor((now.getTime() - new Date(sla.due_at).getTime()) / 3600000);
      const level2 = Number(sla.policy?.escalation_level2_hours || 24);
      const level3 = Number(sla.policy?.escalation_level3_hours || 72);
      const desiredLevel = overdueHours >= level3 + 72 ? 4 : overdueHours >= level3 ? 3 : overdueHours >= level2 ? 2 : 1;
      if (desiredLevel <= Number(sla.escalation_level || 0)) continue;
      const targetRole = ['OWNER', 'DEPARTMENT_HEAD', 'RM_COMMITTEE', 'EXECUTIVE'][desiredLevel - 1];
      const notificationKey = `SLA:${sla.id}:L${desiredLevel}`;
      await this.prisma.$transaction(async (tx) => {
        await (tx as any).escalation_event.create({
          data: {
            sla_instance_id: sla.id,
            escalation_level: desiredLevel,
            target_role: targetRole,
            target_user_id: desiredLevel === 1 ? sla.owner_user_id : null,
            target_department_id: sla.owner_department_id,
            reason: `${sla.workflow_stage} เกิน SLA ${overdueHours} ชั่วโมง`,
          },
        });
        await (tx as any).sla_instance.update({
          where: { id: sla.id },
          data: {
            breached_at: sla.breached_at || now,
            escalation_level: desiredLevel,
            last_escalated_at: now,
            updated_at: now,
          },
        });
        await (tx as any).notification_log.upsert({
          where: { notification_key: notificationKey },
          create: {
            notification_key: notificationKey,
            entity_type: sla.entity_type,
            entity_id: sla.entity_id,
            notification_type: 'SLA_ESCALATION',
            recipient_scope: `${targetRole}:${sla.owner_department_id || ''}`,
          },
          update: {},
        });
        if (sla.entity_type === 'CAPA') {
          await (tx as any).capa_action.updateMany({
            where: { id: Number(sla.entity_id) },
            data: { escalation_level: desiredLevel, last_escalated_at: now, last_notified_at: now },
          });
        }
      });
      escalated += 1;
    }
    return { checked: breached.length, escalated, processed_at: now };
  }
}
