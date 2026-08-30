import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IncidentRcaPolicyService } from './incident-rca-policy.service';
import { normalizeContributingFactors, serializeContributingFactors, toLegacyFishbone } from './contributing-factor.catalog';
import { CapaService } from '../capa/capa.service';

export class EvaluateCriteriaDto {
  incident_id?: number;
  level_id?: string;
  riskstore_id?: number;
  is_sec41?: boolean;
  is_potential_harm?: boolean;
  risk_name?: string;
  source_trigger?: boolean;
}

export class AiAssistDto {
  topic: string;
  what_happened?: string;
  actual_impact?: string;
  severity?: string;
  rca_type?: string;
}

export class CreateRcaCaseDto {
  id?: string;
  topic: string;
  rca_type: 'mini' | 'concise';
  review_date: string;
  incident_date?: string;
  incident_detail?: string;
  created_by?: number;
  status?: string;
  due_at?: string;
  completed_at?: string;
  contributing_factors?: Array<{ code: string; detail?: string; process_key?: string; tier?: number }>;
  incidents?: Array<{
    incident_id: number;
    incident_id_risk?: number;
    risk_name?: string;
    report_date?: string;
    severity_level?: string;
    department_id?: string;
    detail?: string;
    sort_order?: number;
  }>;
  swiss_cheeses?: Array<{
    layer: string;
    hole: string;
  }>;
  cmps?: Array<{
    process?: string;
    cmp_problem: string;
    corrective_action: string;
    responsible_unit?: string;
    status?: string;
    due_date?: string;
    effectiveness_criteria?: string;
    baseline_value?: string;
    target_value?: string;
    effectiveness_due_date?: string;
    sort_order?: number;
  }>;
  reviewers?: Array<{
    name: string;
    position?: string;
    department?: string;
    sort_order?: number;
  }>;
}

export class CreateStandardRcaDto {
  id?: string;
  rm_no?: string;
  incident_id?: number;
  incident_id_risk?: number;
  source_trigger_review_id?: number;
  topic: string;
  incident_date?: string;
  rca_team?: string;
  severity?: string;
  is_not_risk?: boolean;
  what_happened?: string;
  actual_impact?: string;
  potential_impact?: string;
  contributing_factors?: Array<{ code: string; detail?: string; process_key?: string; tier?: number }>;
  info_interview?: boolean;
  info_cctv?: boolean;
  info_document?: boolean;
  info_inspection?: boolean;
  status?: string;
  created_by?: number;
  timelines?: Array<{
    event_time: string;
    event_date?: string;
    event_description: string;
    is_critical_point?: boolean;
    tag?: string;
    sort_order?: number;
  }>;
  whys?: Array<{
    level: number;
    question?: string;
    answer: string;
    sort_order?: number;
  }>;
  fishbones?: Array<{
    category: string;
    factor: string;
    sub_factor?: string;
    sort_order?: number;
  }>;
  cmps?: Array<{
    observation?: string;
    hypothesis?: string;
    comment?: string;
    sort_order?: number;
  }>;
  process_analyses?: Array<{
    process_key: string;
    problem?: string;
    tier1_personnel?: string;
    tier2_teamwork?: string;
    tier3_environment?: string;
    tier4_policy?: string;
    tier5_external?: string;
    corrective_action?: string;
    sort_order?: number;
  }>;
  capas?: Array<{
    action: string;
    type: string;
    responsible: string;
    due_date?: string;
    status?: string;
    evidence?: string;
    effectiveness_criteria?: string;
    baseline_value?: string;
    target_value?: string;
    effectiveness_due_date?: string;
    sort_order?: number;
  }>;
  review_sessions?: Array<{
    reviewers?: string;
    review_date_time?: string;
    notes?: string;
    sort_order?: number;
  }>;
}

@Injectable()
export class RcaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: IncidentRcaPolicyService,
    private readonly capaService: CapaService,
  ) {}

  private async allowedDepartments(user: any): Promise<string[] | null> {
    if (user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital')) return null;
    if ((user?.role === 'rm_committee' && user?.rmScope === 'group') || user?.role === 'head') {
      const rows = await this.prisma.department.findMany({ where: { depart_group_id: Number(user?.departmentGroup) }, select: { id: true } });
      return rows.map((r) => String(r.id));
    }
    return [user?.departmentId, user?.departmentId2].filter(Boolean).map(String);
  }

  private async assertDepartmentAccess(departmentId: string | null | undefined, user: any, assignedCid?: string | null) {
    const allowed = await this.allowedDepartments(user);
    if (assignedCid && String(assignedCid) === String(user?.cid || '')) return;
    if (allowed && !allowed.includes(String(departmentId || ''))) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง RCA นอกขอบเขต');
  }

  // ================= 1. Criteria Evaluation with 9 Standards =================
  async evaluateCriteria(dto: EvaluateCriteriaDto, user?: any) {
    if (!dto.incident_id) throw new BadRequestException('ต้องระบุ incident_id เพื่อให้ backend อ่าน NRLS และ severity จากฐานข้อมูล');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: dto.incident_id } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์');
    await this.assertDepartmentAccess(incident.department_id, user);
    const result = await this.policy.evaluate(incident);
    return { ...result, matched_criteria: result.criteria_matches, recommended_mode: result.recommended_rca_type.toLowerCase() };
  }

  async reevaluateIncident(incidentId: number, actorId?: number, reason?: string, user?: any) {
    if (!reason?.trim()) throw new BadRequestException('ต้องระบุเหตุผลการประเมินซ้ำ');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: incidentId }, select: { department_id: true } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์');
    await this.assertDepartmentAccess(incident.department_id, user);
    const result = await this.policy.evaluateAndPersist(incidentId, actorId, reason);
    if (!result) throw new NotFoundException('ไม่พบอุบัติการณ์');
    return result;
  }

  // ================= 2. Mini & Concise RCA =================
  async getMiniConciseList(type?: 'mini' | 'concise', user?: any) {
    const allowed = await this.allowedDepartments(user);
    const where: any = { ...(type ? { rca_type: type } : {}), ...(allowed ? { OR: [{ department_id: { in: allowed } }, { assigned_member_cid: user?.cid }] } : {}) };
    return this.prisma.rca_case.findMany({
      where,
      include: {
        incidents: true,
        swiss_cheeses: true,
        cmps: true,
        reviewers: true,
      },
      orderBy: { review_date: 'desc' },
    });
  }

  async getMiniConciseById(id: string, user?: any) {
    const rcaCase = await this.prisma.rca_case.findUnique({
      where: { id },
      include: {
        incidents: true,
        swiss_cheeses: true,
        cmps: true,
        reviewers: true,
      },
    });
    if (!rcaCase) throw new NotFoundException(`RCA Case #${id} not found`);
    if (user) await this.assertDepartmentAccess(rcaCase.department_id, user, rcaCase.assigned_member_cid);
    return rcaCase;
  }

  async createMiniConcise(data: CreateRcaCaseDto, user?: any) {
    const source = data.incidents?.[0];
    if (!source?.incident_id) throw new BadRequestException('ต้องสร้าง RCA จาก incident_id');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: source.incident_id } });
    if (!incident?.nrls_code) throw new BadRequestException('อุบัติการณ์ยังไม่มี NRLS ที่ถูกต้อง');
    await this.assertDepartmentAccess(incident.department_id, user);
    const duplicate = await this.prisma.rca_case.findFirst({ where: { incident_id: incident.id, rca_type: data.rca_type } });
    if (duplicate) throw new ConflictException(`มี ${data.rca_type} RCA สำหรับอุบัติการณ์นี้แล้ว`);
    const caseId = data.id || `RCA-${data.rca_type.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    
    const created = await this.prisma.rca_case.create({
      data: {
        id: caseId,
        topic: incident.nrls_name_snapshot || data.topic,
        rca_type: data.rca_type,
        incident_id: incident.id,
        incident_id_risk: incident.id_risk,
        nrls_code: incident.nrls_code,
        nrls_name_snapshot: incident.nrls_name_snapshot,
        program_id: incident.program_id,
        severity: incident.level_id,
        department_id: incident.department_id,
        status: (data.status || 'IN_PROGRESS').toUpperCase(),
        due_at: data.due_at ? new Date(data.due_at) : incident.rca_due_at,
        completed_at: data.completed_at ? new Date(data.completed_at) : null,
        review_date: new Date(data.review_date),
        incident_date: data.incident_date ? new Date(data.incident_date) : null,
        incident_detail: data.incident_detail,
        contributing_factors: serializeContributingFactors(data.contributing_factors),
        created_by: data.created_by,
        incidents: data.incidents?.length
          ? {
              create: data.incidents.map((inc) => ({
                incident_id: incident.id,
                incident_id_risk: incident.id_risk,
                risk_name: incident.nrls_name_snapshot,
                nrls_code: incident.nrls_code,
                nrls_name_snapshot: incident.nrls_name_snapshot,
                program_id: incident.program_id,
                report_date: incident.date_report,
                severity_level: incident.level_id,
                department_id: incident.department_id,
                detail: incident.detail,
                sort_order: inc.sort_order || 0,
              })),
            }
          : undefined,
        swiss_cheeses: data.swiss_cheeses?.length
          ? {
              create: data.swiss_cheeses.map((sc) => ({
                layer: sc.layer,
                hole: sc.hole,
              })),
            }
          : undefined,
        cmps: data.cmps?.length
          ? {
              create: data.cmps.map((c) => ({
                process: c.process,
                cmp_problem: c.cmp_problem,
                corrective_action: c.corrective_action,
                responsible_unit: c.responsible_unit,
                status: c.status || 'pending',
                due_date: c.due_date ? new Date(c.due_date) : null,
                sort_order: c.sort_order || 0,
              })),
            }
          : undefined,
        reviewers: data.reviewers?.length
          ? {
              create: data.reviewers.map((r) => ({
                name: r.name,
                position: r.position,
                department: r.department,
                sort_order: r.sort_order || 0,
              })),
            }
          : undefined,
      },
      include: {
        incidents: true,
        swiss_cheeses: true,
        cmps: true,
        reviewers: true,
      },
    });

    await this.prisma.riskregister.updateMany({
      where: { id: incident.id, id_risk: incident.id_risk },
      data: { rca_status: created.status === 'COMPLETED' && created.completed_at ? 'COMPLETED' : 'IN_PROGRESS', rca_case_id: caseId },
    });
    if (created.cmps.length) {
      const profile = await this.prisma.riskanalysis.findFirst({
        where: { nrls_code: incident.nrls_code, scope_level: 'department', department_id: incident.department_id }, select: { id: true },
      });
      const sourceType = data.rca_type === 'concise' ? 'CONCISE_RCA' : 'MINI_RCA';
      await this.prisma.capa_action.createMany({ data: created.cmps.map((c, index) => ({
        source_type: sourceType, source_id: caseId, source_item_id: c.id,
        incident_id: incident.id, incident_id_risk: incident.id_risk, nrls_code: incident.nrls_code!, risk_analysis_id: profile?.id,
        action: c.corrective_action, action_type: 'CORRECTIVE', responsible_display_name: c.responsible_unit,
        responsible_department_id: incident.department_id, due_date: c.due_date,
        status: ['PENDING', 'IN_PROGRESS'].includes(String(c.status || 'PENDING').toUpperCase())
          ? String(c.status || 'PENDING').toUpperCase()
          : 'IN_PROGRESS',
        effectiveness_criteria: data.cmps?.[index]?.effectiveness_criteria || null,
        baseline_value: data.cmps?.[index]?.baseline_value || null,
        target_value: data.cmps?.[index]?.target_value || null,
        effectiveness_due_date: data.cmps?.[index]?.effectiveness_due_date
          ? new Date(data.cmps[index].effectiveness_due_date!)
          : null,
        created_by: data.created_by,
      })) });
      const capaRows = await this.prisma.capa_action.findMany({
        where: { source_type: sourceType, source_id: caseId },
        select: { id: true },
      });
      await Promise.all(capaRows.map((capa) => this.capaService.initializeMonitoring(capa.id)));
    }

    return created;
  }

  async updateMiniConcise(id: string, data: Partial<CreateRcaCaseDto>, user?: any) {
    await this.getMiniConciseById(id, user);

    // Delete sub-records if new ones are passed
    if (data.swiss_cheeses) {
      await this.prisma.rca_swiss_cheese.deleteMany({ where: { rca_case_id: id } });
    }
    if (data.cmps) {
      await this.prisma.rca_cmp.deleteMany({ where: { rca_case_id: id } });
    }
    if (data.reviewers) {
      await this.prisma.rca_reviewer.deleteMany({ where: { rca_case_id: id } });
    }

    const updated = await this.prisma.rca_case.update({
      where: { id },
      data: {
        topic: data.topic,
        review_date: data.review_date ? new Date(data.review_date) : undefined,
        incident_date: data.incident_date ? new Date(data.incident_date) : undefined,
        incident_detail: data.incident_detail,
        contributing_factors: data.contributing_factors === undefined
          ? undefined
          : serializeContributingFactors(data.contributing_factors),
        status: data.status ? data.status.toUpperCase() : undefined,
        due_at: data.due_at ? new Date(data.due_at) : undefined,
        completed_at: data.status?.toUpperCase() === 'COMPLETED' ? new Date(data.completed_at || new Date()) : data.status ? null : undefined,
        swiss_cheeses: data.swiss_cheeses?.length
          ? {
              create: data.swiss_cheeses.map((sc) => ({
                layer: sc.layer,
                hole: sc.hole,
              })),
            }
          : undefined,
        cmps: data.cmps?.length
          ? {
              create: data.cmps.map((c) => ({
                process: c.process,
                cmp_problem: c.cmp_problem,
                corrective_action: c.corrective_action,
                responsible_unit: c.responsible_unit,
                status: c.status || 'pending',
                due_date: c.due_date ? new Date(c.due_date) : null,
                sort_order: c.sort_order || 0,
              })),
            }
          : undefined,
        reviewers: data.reviewers?.length
          ? {
              create: data.reviewers.map((r) => ({
                name: r.name,
                position: r.position,
                department: r.department,
                sort_order: r.sort_order || 0,
              })),
            }
          : undefined,
      },
      include: {
        incidents: true,
        swiss_cheeses: true,
        cmps: true,
        reviewers: true,
      },
    });
    if (updated.incident_id) {
      await this.prisma.riskregister.updateMany({ where: { id: updated.incident_id }, data: {
        rca_status: updated.status === 'COMPLETED' && updated.completed_at ? 'COMPLETED' : 'IN_PROGRESS',
      } });
    }
    return updated;
  }

  async deleteMiniConcise(id: string, reason?: string, actorId?: number, user?: any) {
    const existing = await this.getMiniConciseById(id, user);
    if (!reason?.trim()) throw new BadRequestException('ต้องระบุเหตุผลการยกเลิก RCA');
    const cancelled = await this.prisma.rca_case.update({ where: { id }, data: { status: 'CANCELLED', completed_at: null } });
    if (existing.incident_id) await this.prisma.riskregister.updateMany({ where: { id: existing.incident_id }, data: { rca_status: 'REQUIRED', rca_case_id: null } });
    await this.prisma.workflow_audit.create({ data: { entity_type: 'RCA', entity_id: id, action: 'CANCELLED', reason, changed_by: actorId } });
    return cancelled;
  }

  // ================= 3. Standard Full RCA =================
  async getStandardCandidates(search?: string, user?: any) {
    const allowed = await this.allowedDepartments(user);
    const existingCases = await this.prisma.standard_rca_case.findMany({
      where: { incident_id: { not: null } },
      select: { incident_id: true },
    });
    const existingIncidentIds = existingCases
      .map((row) => Number(row.incident_id))
      .filter((incidentId) => Number.isFinite(incidentId) && incidentId > 0);
    const term = String(search || '').trim();
    const numericTerm = Number(term);
    const andConditions: any[] = [
      { nrls_code: { not: null } },
      { status_risk: { not: 'ไม่ใช่ความเสี่ยง' } },
    ];

    if (allowed) andConditions.push({ department_id: { in: allowed } });
    if (existingIncidentIds.length) andConditions.push({ id: { notIn: existingIncidentIds } });
    if (term) {
      const searchConditions: any[] = [
        { nrls_code: { contains: term } },
        { nrls_name_snapshot: { contains: term } },
        { detail: { contains: term } },
        { problem_basic: { contains: term } },
      ];
      if (Number.isFinite(numericTerm)) {
        searchConditions.push({ id: numericTerm }, { id_risk: numericTerm });
      }
      andConditions.push({ OR: searchConditions });
    }

    const incidents = await this.prisma.riskregister.findMany({
      where: { AND: andConditions },
      orderBy: { id: 'desc' },
      take: 50,
      select: {
        id: true,
        id_risk: true,
        nrls_code: true,
        nrls_name_snapshot: true,
        detail: true,
        problem_basic: true,
        level_id: true,
        date_report: true,
        status_risk: true,
        department_id: true,
        nrls_standard: { select: { name: true } },
        local_risk: { select: { riskstore_name: true } },
      },
    });

    return incidents.map((incident) => ({
      id: incident.id,
      id_risk: incident.id_risk,
      rm_no: String(incident.id_risk || incident.id),
      nrls_code: incident.nrls_code,
      nrls_name: incident.nrls_name_snapshot
        || incident.nrls_standard?.name
        || incident.local_risk?.riskstore_name
        || null,
      incident_topic: incident.nrls_name_snapshot
        || incident.nrls_standard?.name
        || incident.local_risk?.riskstore_name
        || `อุบัติการณ์ #${incident.id}`,
      incident_description: incident.detail || incident.problem_basic || '',
      detail: incident.detail,
      problem_basic: incident.problem_basic,
      level_id: incident.level_id,
      date_report: incident.date_report,
      status_risk: incident.status_risk,
      department_id: incident.department_id,
    }));
  }

  async getStandardList(user?: any) {
    const allowed = await this.allowedDepartments(user);
    return this.prisma.standard_rca_case.findMany({
      where: allowed ? { OR: [{ department_id: { in: allowed } }, { assigned_member_cid: user?.cid }] } : {},
      include: {
        timelines: { orderBy: { sort_order: 'asc' } },
        cmps: { orderBy: { sort_order: 'asc' } },
        whys: { orderBy: { level: 'asc' } },
        fishbones: { orderBy: { sort_order: 'asc' } },
        process_analyses: { orderBy: { sort_order: 'asc' } },
        capas: { orderBy: { sort_order: 'asc' } },
        review_sessions: { orderBy: { sort_order: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStandardById(id: string, user?: any) {
    const stdCase = await this.prisma.standard_rca_case.findUnique({
      where: { id },
      include: {
        timelines: { orderBy: { sort_order: 'asc' } },
        cmps: { orderBy: { sort_order: 'asc' } },
        whys: { orderBy: { level: 'asc' } },
        fishbones: { orderBy: { sort_order: 'asc' } },
        process_analyses: { orderBy: { sort_order: 'asc' } },
        capas: { orderBy: { sort_order: 'asc' } },
        review_sessions: { orderBy: { sort_order: 'asc' } },
      },
    });
    if (!stdCase) throw new NotFoundException(`Standard RCA Case #${id} not found`);
    if (user) await this.assertDepartmentAccess(stdCase.department_id, user, stdCase.assigned_member_cid);

    let incidentDetail = '';

    if (stdCase.source_trigger_review_id) {
      const triggerRev = await this.prisma.medical_record_review.findUnique({
        where: { id: stdCase.source_trigger_review_id },
      });
      if (triggerRev && triggerRev.ae_description) {
        incidentDetail = triggerRev.ae_description;
      }
    }

    if (!incidentDetail && (stdCase.incident_id || stdCase.rm_no)) {
      const incId = stdCase.incident_id ? Number(stdCase.incident_id) : undefined;
      const rmNum = stdCase.rm_no ? (Number(stdCase.rm_no) || Number(stdCase.rm_no.replace(/\D/g, '')) || undefined) : undefined;

      const orConditions: any[] = [];
      if (incId && !isNaN(incId)) orConditions.push({ id: incId });
      if (rmNum && !isNaN(rmNum)) orConditions.push({ id_risk: rmNum });

      if (orConditions.length > 0) {
        const riskReg = await this.prisma.riskregister.findFirst({
          where: { OR: orConditions },
        });
        if (riskReg) {
          incidentDetail = riskReg.detail || riskReg.problem_basic || '';
        }
      }
    }

    return {
      ...stdCase,
      what_happened: stdCase.what_happened || incidentDetail,
      incident_detail_raw: incidentDetail,
    };
  }

  async createStandard(data: CreateStandardRcaDto, user?: any) {
    if (!data.incident_id) throw new BadRequestException('ต้องสร้าง Standard RCA จาก incident_id');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: data.incident_id } });
    if (!incident?.nrls_code) throw new BadRequestException('อุบัติการณ์ยังไม่มี NRLS ที่ถูกต้อง');
    await this.assertDepartmentAccess(incident.department_id, user);
    const duplicate = await this.prisma.standard_rca_case.findFirst({ where: { incident_id: incident.id } });
    if (duplicate) throw new ConflictException('มี Standard RCA สำหรับอุบัติการณ์นี้แล้ว');
    const caseId = data.id || `RCA-FULL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const created = await this.prisma.standard_rca_case.create({
      data: {
        id: caseId,
        rm_no: data.rm_no || String(incident.id_risk || incident.id),
        incident_id: incident.id,
        incident_id_risk: incident.id_risk,
        source_trigger_review_id: data.source_trigger_review_id,
        topic: incident.nrls_name_snapshot || data.topic,
        incident_date: incident.date_report,
        rca_team: data.rca_team,
        severity: incident.level_id,
        nrls_code: incident.nrls_code,
        nrls_name_snapshot: incident.nrls_name_snapshot,
        program_id: incident.program_id,
        department_id: incident.department_id,
        due_at: incident.rca_due_at,
        completed_at: String(data.status || '').toUpperCase() === 'COMPLETED' ? new Date() : null,
        is_not_risk: data.is_not_risk ?? false,
        what_happened: data.what_happened || incident.detail || incident.problem_basic,
        actual_impact: data.actual_impact,
        potential_impact: data.potential_impact,
        contributing_factors: serializeContributingFactors(data.contributing_factors),
        info_interview: data.info_interview ?? false,
        info_cctv: data.info_cctv ?? false,
        info_document: data.info_document ?? false,
        info_inspection: data.info_inspection ?? false,
        status: (data.status || 'IN_PROGRESS').toUpperCase(),
        created_by: data.created_by,
        timelines: data.timelines?.length
          ? {
              create: data.timelines.map((t, idx) => ({
                event_time: t.event_time,
                event_date: t.event_date ? new Date(t.event_date) : null,
                event_description: t.event_description,
                is_critical_point: t.is_critical_point ?? false,
                tag: t.tag,
                sort_order: t.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        whys: data.whys?.length
          ? {
              create: data.whys.map((w, idx) => ({
                level: w.level || idx + 1,
                question: w.question,
                answer: w.answer,
                sort_order: w.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        fishbones: data.fishbones?.length
          ? {
              create: data.fishbones.map((f, idx) => ({
                category: f.category,
                factor: f.factor,
                sub_factor: f.sub_factor,
                sort_order: f.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        cmps: data.cmps?.length
          ? {
              create: data.cmps.map((cmp, idx) => ({
                observation: cmp.observation,
                hypothesis: cmp.hypothesis,
                comment: cmp.comment,
                sort_order: cmp.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        process_analyses: data.process_analyses?.length
          ? {
              create: data.process_analyses.map((p, idx) => ({
                process_key: p.process_key,
                problem: p.problem,
                tier1_personnel: p.tier1_personnel,
                tier2_teamwork: p.tier2_teamwork,
                tier3_environment: p.tier3_environment,
                tier4_policy: p.tier4_policy,
                tier5_external: p.tier5_external,
                corrective_action: p.corrective_action,
                sort_order: p.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        capas: data.capas?.length
          ? {
              create: data.capas.map((c, idx) => ({
                action: c.action,
                type: c.type,
                responsible: c.responsible,
                due_date: c.due_date ? new Date(c.due_date) : null,
                status: c.status || 'pending',
                evidence: c.evidence,
                sort_order: c.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        review_sessions: data.review_sessions?.length
          ? {
              create: data.review_sessions.map((s, idx) => ({
                reviewers: s.reviewers,
                review_date_time: s.review_date_time ? new Date(s.review_date_time) : null,
                notes: s.notes,
                sort_order: s.sort_order ?? idx + 1,
              })),
            }
          : undefined,
      },
      include: {
        timelines: true,
        cmps: true,
        whys: true,
        fishbones: true,
        process_analyses: true,
        capas: true,
        review_sessions: true,
      },
    });

    await this.prisma.riskregister.updateMany({
      where: { id: incident.id, id_risk: incident.id_risk },
      data: { rca_status: created.status === 'COMPLETED' && created.completed_at ? 'COMPLETED' : 'IN_PROGRESS', rca_case_id: caseId },
    });

    if (created.capas.length) {
      const profile = await this.prisma.riskanalysis.findFirst({
        where: { nrls_code: incident.nrls_code, scope_level: 'department', department_id: incident.department_id },
        select: { id: true },
      });
      await this.prisma.capa_action.createMany({ data: created.capas.map((c, index) => ({
        source_type: 'STANDARD_RCA', source_id: caseId, source_item_id: c.id,
        incident_id: incident.id, incident_id_risk: incident.id_risk,
        nrls_code: incident.nrls_code!, risk_analysis_id: profile?.id, action: c.action,
        action_type: String(c.type || 'CORRECTIVE').toUpperCase(),
        responsible_display_name: c.responsible, responsible_department_id: incident.department_id,
        due_date: c.due_date,
        status: ['PENDING', 'IN_PROGRESS'].includes(String(c.status || 'PENDING').toUpperCase())
          ? String(c.status || 'PENDING').toUpperCase()
          : 'IN_PROGRESS',
        evidence: c.evidence,
        effectiveness_criteria: data.capas?.[index]?.effectiveness_criteria || null,
        baseline_value: data.capas?.[index]?.baseline_value || null,
        target_value: data.capas?.[index]?.target_value || null,
        effectiveness_due_date: data.capas?.[index]?.effectiveness_due_date
          ? new Date(data.capas[index].effectiveness_due_date!)
          : null,
        created_by: data.created_by,
      })) });
      const capaRows = await this.prisma.capa_action.findMany({
        where: { source_type: 'STANDARD_RCA', source_id: caseId },
        select: { id: true },
      });
      await Promise.all(capaRows.map((capa) => this.capaService.initializeMonitoring(capa.id)));
    }

    return created;
  }

  async updateStandard(id: string, data: Partial<CreateStandardRcaDto>, user?: any) {
    await this.getStandardById(id, user);

    // Delete sub tables if replacement arrays are passed
    if (data.timelines) {
      await this.prisma.standard_rca_timeline.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.whys) {
      await this.prisma.standard_rca_why.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.fishbones) {
      await this.prisma.standard_rca_fishbone.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.cmps) {
      await this.prisma.standard_rca_cmp.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.process_analyses) {
      await this.prisma.standard_rca_process_analysis.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.capas) {
      await this.prisma.standard_rca_capa.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.review_sessions) {
      await this.prisma.standard_rca_review_session.deleteMany({ where: { standard_rca_case_id: id } });
    }

    const updated = await this.prisma.standard_rca_case.update({
      where: { id },
      data: {
        rm_no: data.rm_no,
        topic: data.topic,
        incident_date: data.incident_date ? new Date(data.incident_date) : undefined,
        rca_team: data.rca_team,
        severity: data.severity,
        is_not_risk: data.is_not_risk,
        what_happened: data.what_happened,
        actual_impact: data.actual_impact,
        potential_impact: data.potential_impact,
        contributing_factors: data.contributing_factors === undefined
          ? undefined
          : serializeContributingFactors(data.contributing_factors),
        info_interview: data.info_interview,
        info_cctv: data.info_cctv,
        info_document: data.info_document,
        info_inspection: data.info_inspection,
        status: data.status ? data.status.toUpperCase() : undefined,
        completed_at: data.status?.toUpperCase() === 'COMPLETED' ? new Date() : data.status ? null : undefined,
        timelines: data.timelines?.length
          ? {
              create: data.timelines.map((t, idx) => ({
                event_time: t.event_time,
                event_date: t.event_date ? new Date(t.event_date) : null,
                event_description: t.event_description,
                is_critical_point: t.is_critical_point ?? false,
                tag: t.tag,
                sort_order: t.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        whys: data.whys?.length
          ? {
              create: data.whys.map((w, idx) => ({
                level: w.level || idx + 1,
                question: w.question,
                answer: w.answer,
                sort_order: w.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        fishbones: data.fishbones?.length
          ? {
              create: data.fishbones.map((f, idx) => ({
                category: f.category,
                factor: f.factor,
                sub_factor: f.sub_factor,
                sort_order: f.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        cmps: data.cmps?.length
          ? {
              create: data.cmps.map((cmp, idx) => ({
                observation: cmp.observation,
                hypothesis: cmp.hypothesis,
                comment: cmp.comment,
                sort_order: cmp.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        process_analyses: data.process_analyses?.length
          ? {
              create: data.process_analyses.map((p, idx) => ({
                process_key: p.process_key,
                problem: p.problem,
                tier1_personnel: p.tier1_personnel,
                tier2_teamwork: p.tier2_teamwork,
                tier3_environment: p.tier3_environment,
                tier4_policy: p.tier4_policy,
                tier5_external: p.tier5_external,
                corrective_action: p.corrective_action,
                sort_order: p.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        capas: data.capas?.length
          ? {
              create: data.capas.map((c, idx) => ({
                action: c.action,
                type: c.type,
                responsible: c.responsible,
                due_date: c.due_date ? new Date(c.due_date) : null,
                status: c.status || 'pending',
                evidence: c.evidence,
                sort_order: c.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        review_sessions: data.review_sessions?.length
          ? {
              create: data.review_sessions.map((s, idx) => ({
                reviewers: s.reviewers,
                review_date_time: s.review_date_time ? new Date(s.review_date_time) : null,
                notes: s.notes,
                sort_order: s.sort_order ?? idx + 1,
              })),
            }
          : undefined,
      },
      include: {
        timelines: true,
        cmps: true,
        whys: true,
        fishbones: true,
        process_analyses: true,
        capas: true,
        review_sessions: true,
      },
    });
    if (updated.incident_id) {
      await this.prisma.riskregister.updateMany({
        where: { id: updated.incident_id },
        data: { rca_status: updated.status === 'COMPLETED' && updated.completed_at ? 'COMPLETED' : 'IN_PROGRESS' },
      });
    }
    return updated;
  }

  async deleteStandard(id: string, reason?: string, actorId?: number, user?: any) {
    const existing = await this.getStandardById(id, user);
    if (!reason?.trim()) throw new BadRequestException('ต้องระบุเหตุผลการยกเลิก RCA');
    const cancelled = await this.prisma.standard_rca_case.update({ where: { id }, data: { status: 'CANCELLED', completed_at: null } });
    if (existing.incident_id) await this.prisma.riskregister.updateMany({ where: { id: existing.incident_id }, data: { rca_status: 'REQUIRED', rca_case_id: null } });
    await this.prisma.workflow_audit.create({ data: { entity_type: 'RCA', entity_id: id, action: 'CANCELLED', reason, changed_by: actorId } });
    return cancelled;
  }

  // ================= 4. Unified RCA Dashboard / Stats =================
  async getOverviewStats(user?: any) {
    const [miniRows, conciseRows, standardRows, reviewRows] = await Promise.all([
      this.getMiniConciseList('mini', user), this.getMiniConciseList('concise', user), this.getStandardList(user), this.getIncidentReviews(user),
    ]);
    const miniCases = miniRows.length, conciseCases = conciseRows.length, standardCases = standardRows.length, incidentReviews = reviewRows.length;

    const departments = await this.allowedDepartments(user);
    const capas = await this.prisma.capa_action.findMany({ where: departments ? { responsible_department_id: { in: departments } } : {} });
    const pendingCapas = capas.filter((c) => !['CLOSED', 'CANCELLED'].includes(c.status.toUpperCase())).length;
    const completedCapas = capas.filter((c) => c.status.toUpperCase() === 'CLOSED').length;
    const implementedCapas = capas.filter((c) => ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'AWAITING_APPROVAL'].includes(c.status.toUpperCase())).length;
    const overdueCapas = capas.filter((c) => c.due_date && c.due_date < new Date() && !['CLOSED', 'CANCELLED'].includes(c.status.toUpperCase())).length;

    return {
      total_rca: miniCases + conciseCases + standardCases + incidentReviews,
      mini_count: miniCases,
      concise_count: conciseCases,
      standard_count: standardCases,
      review_count: incidentReviews,
      pending_capas: pendingCapas,
      completed_capas: completedCapas,
      implemented_capas: implementedCapas,
      overdue_capas: overdueCapas,
    };
  }

  async getIncidentReviews(user?: any) {
    const allowed = await this.allowedDepartments(user);
    const scopedIncidents = allowed
      ? await this.prisma.riskregister.findMany({
          where: {
            OR: [
              { department_id: { in: allowed } },
              { sendto_department_id: { in: allowed } },
            ],
          },
          select: {
            id: true,
            id_risk: true,
            detail: true,
            level_id: true,
            department_id: true,
            sendto_department_id: true,
            nrls_code: true,
            nrls_name_snapshot: true,
          },
        })
      : [];
    const scopedIncidentIds = scopedIncidents.map((incident) => incident.id);
    const scopedLegacyRiskIds = scopedIncidents.map((incident) => incident.id_risk);
    if (allowed && scopedIncidentIds.length === 0) return [];

    const reviewContentFilter = {
      OR: [
        { cause_problem: { not: null } },
        { contributing_factors: { not: null } },
      ],
    };
    const reviews = await this.prisma.riskreview.findMany({
      where: allowed
        ? {
            AND: [
              reviewContentFilter,
              {
                OR: [
                  { riskregister_id: { in: scopedIncidentIds } },
                  { risk_id: { in: scopedLegacyRiskIds } },
                ],
              },
            ],
          }
        : reviewContentFilter,
      // Legacy riskreview rows can contain MySQL zero dates in unused timestamp
      // columns. Selecting only the fields used by this queue avoids Prisma P2020
      // while preserving the historical rows unchanged.
      select: {
        id: true,
        riskregister_id: true,
        risk_id: true,
        review_date: true,
        cause_problem: true,
        contributing_factors: true,
        notereview: true,
      },
      orderBy: { review_date: 'desc' },
      take: 100,
    });

    const riskregisterIds = reviews.map((review) => review.riskregister_id).filter((id): id is number => Boolean(id));
    const riskIds = reviews.map((r) => r.risk_id).filter((id): id is number => Boolean(id));
    const incidents = allowed
      ? scopedIncidents
      : await this.prisma.riskregister.findMany({
          where: {
            OR: [
              { id: { in: riskregisterIds } },
              { id_risk: { in: riskIds } },
            ],
          },
          select: {
            id: true,
            id_risk: true,
            detail: true,
            level_id: true,
            department_id: true,
            sendto_department_id: true,
            nrls_code: true,
            nrls_name_snapshot: true,
          },
        });
    const incidentById = new Map(incidents.map((incident) => [incident.id, incident]));
    const incidentByLegacyRiskId = new Map(incidents.map((incident) => [incident.id_risk, incident]));

    return reviews.map((review) => {
      const incident = (review.riskregister_id ? incidentById.get(review.riskregister_id) : undefined)
        || (review.risk_id ? incidentByLegacyRiskId.get(review.risk_id) : undefined);
      return {
        id: review.id,
        risk_id: review.risk_id,
        riskregister_id: incident?.id || review.riskregister_id,
        incident_id_risk: incident?.id_risk || review.risk_id,
        review_date: review.review_date,
        cause_problem: review.cause_problem,
        contributing_factors: review.contributing_factors,
        notereview: review.notereview,
        risk_name: incident?.nrls_name_snapshot || incident?.detail || `อุบัติการณ์ #${incident?.id || review.riskregister_id || review.risk_id || '-'}`,
        nrls_code: incident?.nrls_code || null,
        severity_level: incident?.level_id || '-',
        department_id: incident?.department_id || '-',
        sendto_department_id: incident?.sendto_department_id || null,
      };
    });
  }

  // ================= 5. Get RCA Cases By Incident ID =================
  async getByIncident(incidentId: number, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id: incidentId }, select: { department_id: true } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์');
    await this.assertDepartmentAccess(incident.department_id, user);
    const standardCases = await this.prisma.standard_rca_case.findMany({
      where: { incident_id: incidentId },
      include: {
        timelines: true,
        cmps: true,
        whys: true,
        fishbones: true,
        process_analyses: true,
        capas: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const incidentLinks = await this.prisma.rca_incident_item.findMany({
      where: { incident_id: incidentId },
      include: {
        rca_case: {
          include: {
            swiss_cheeses: true,
            cmps: true,
            reviewers: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      standardCases,
      miniConciseCases: incidentLinks.map((l) => l.rca_case).filter(Boolean),
    };
  }

  // ================= 6. AI RCA Clinical Assistant Engine =================
  async generateAiAssistance(dto: AiAssistDto) {
    const topic = (dto.topic || '').trim();
    const whatHappened = (dto.what_happened || '').trim();
    const actualImpact = (dto.actual_impact || '').trim();
    const severity = (dto.severity || 'G').toUpperCase();

    const text = `${topic} ${whatHappened} ${actualImpact}`.toLowerCase();

    // Context Detection
    const isMed = /ยา|medication|dose|drug|dispens|high\s*alert|ฉีด|แพ้ยา|overdose|potassium|insulin|morphine/i.test(text);
    const isFall = /ล้ม|ตก|fall|เตียง|ห้องน้ำ|slip|bed/i.test(text);
    const isSepsisOrDelay = /sepsis|ช็อก|shock|ล่าช้า|delay|ส่งต่อ|refer|triage|cpr|หมดสติ|arrest/i.test(text);
    const isIden = /ระบุตัว|ชื่อ|สลับ|ผิดคน|wrong\s*patient|identification|blood\s*group|สลับเลือด/i.test(text);
    const isEquip = /เครื่อง|ชำรุด|ดับ|oxygen|suction|monitor|ventilator|defib/i.test(text);
    const isComm = /สื่อสาร|ส่งเวร|sbar|ไม่แจ้ง|เข้าใจผิด|โทร|consult/i.test(text);

    // Dynamic NRLS fiscal-year 2569 Contributing Factors
    const fishbones: Array<{ category: string; factor: string; sub_factor?: string }> = [];
    // Dynamic 5 Whys
    const whys: Array<{ level: number; question: string; answer: string }> = [];
    // Dynamic CMPs
    const cmps: Array<{ observation: string; hypothesis: string; comment: string }> = [];
    // Dynamic 5-Tier Process
    const process_analyses: Array<{
      process_key: string;
      problem: string;
      tier1_personnel: string;
      tier2_teamwork: string;
      tier3_environment: string;
      tier4_policy: string;
      tier5_external: string;
      corrective_action: string;
    }> = [];
    // Dynamic Swiss Cheese
    const swiss_cheeses: Array<{ layer: string; hole: string }> = [];
    // Dynamic CAPA
    const capas: Array<{ action: string; type: string; responsible: string; due_date: string; status: string }> = [];
    // Dynamic Timelines
    const timelines: Array<{ event_time: string; event_description: string; is_critical_point: boolean }> = [];

    if (isMed) {
      fishbones.push(
        toLegacyFishbone('F0001', 'บุคลากรมีความเหนื่อยล้าจากเวรดึกและภาระงานหนาแน่น จนอาจขาดการตรวจสอบซ้ำ'),
        toLegacyFishbone('F0011', 'รายการยาและกระบวนการบริหารยาความเสี่ยงสูงมีความซับซ้อน'),
        toLegacyFishbone('F0021', 'การส่งต่อคำสั่งยาและข้อมูลระหว่างห้องยากับหอผู้ป่วยไม่ครบถ้วน'),
        toLegacyFishbone('F0027', 'ไม่ได้ทำ Independent Double Check ตามแนวทางยา High Alert Drug'),
        toLegacyFishbone('F0032', 'ระบบสั่งยาและหน้าจอไม่มีการออกแบบป้องกันการเลือกยาหรือขนาดยาคลาดเคลื่อน'),
        toLegacyFishbone('F0036', 'จุดเตรียมยามีเสียงรบกวนและแสงสว่างไม่เพียงพอ'),
      );

      whys.push(
        { level: 1, question: 'ทำไมผู้ป่วยจึงได้รับยาไม่ตรงตามแผนการรักษา / เกิด Medication Error?', answer: 'ผู้ปฏิบัติงานจัดยาและฉีดยาผิดขนาด/ผิดชนิดเนื่องจากอ่านคำสั่งคลาดเคลื่อน' },
        { level: 2, question: 'ทำไมผู้ปฏิบัติงานจึงอ่านคำสั่งคลาดเคลื่อนและไม่ตรวจพบก่อนให้ยา?', answer: 'ขาดการทำ Independent Double Check ร่วมกับพยาบาลอีกท่านเนื่องจากเวลานั้นมีผู้ป่วยวิกฤตพร้อมกัน' },
        { level: 3, question: 'ทำไมจึงไม่มีระบบบังคับ Double Check หรือระบบล็อกความปลอดภัย?', answer: 'ระบบคอมพิวเตอร์สั่งยาไม่มี Warning Popup สำหรับยาที่มีความเสี่ยงสูง (HAD)' },
        { level: 4, question: 'ทำไมระบบเทคโนโลยีและแนวทางปฏิบัติจึงยังไม่ครอบคลุม?', answer: 'ขาดการทบทวนแนวทางการจัดการยาความเสี่ยงสูง (HAD Policy) ร่วมกันระหว่างทีมเภสัชกรรมและทีมการพยาบาล' },
        { level: 5, question: 'ทำไม (สาเหตุรากเหง้าเชิงระบบ)?', answer: 'ระบบบริหารความปลอดภัยด้านยา (Medication Safety System) ขาดการเชื่อมโยงระบบแจ้งเตือนอัจฉริยะและการออกแบบสิ่งแวดล้อมที่ป้องกัน Human Error (Poka-Yoke)' },
      );

      cmps.push(
        {
          observation: 'ขั้นตอนการเตรียมยาและการส่งมอบยาขาดการ Double Check ที่เป็นอิสระต่อกัน (Independent Double Check)',
          hypothesis: 'ภาระงานหนาแน่นในช่วงส่งเวรและขาดเครื่องมือช่วยตรวจสอบแบบ Real-time',
          comment: 'กำหนดให้มี Had Check-box บนระบบคอมพิวเตอร์และป้ายเตือนสองชั้นทันที',
        },
        {
          observation: 'การจัดเก็บยา Look-Alike Sound-Alike (LASA) บนตู้ยาจัดวางติดกัน',
          hypothesis: 'พื้นที่จัดเก็บจำกัดและไม่ได้ทำ Tallman Lettering บนฉลากยา',
          comment: 'จัดระเบียบตู้ยาใหม่ แยกตำแหน่ง LASA และติดสติกเกอร์สีสะท้อนแสงเตือน',
        },
      );

      process_analyses.push({
        process_key: 'กระบวนการสั่งยา จัดยา และบริหารยา (Medication Process)',
        problem: 'การตรวจสอบคำสั่งยาและขนาดยาก่อนให้ผู้ป่วยเกิดความคลาดเคลื่อน',
        tier1_personnel: 'เจ้าหน้าที่เร่งรีบเนื่องจากปริมาณผู้รับบริการมาก มีความล้า',
        tier2_teamwork: 'การประสานงานระหว่างห้องยากับพยาบาลวอร์ดใช้การโทรศัพท์แบบไม่เป็นทางการ ขาด Read-back',
        tier3_environment: 'จุดเตรียมยามีแสงสว่างไม่พอ มีการเดินผ่านไปมาและเสียงรบกวนสมาธิ',
        tier4_policy: 'นโยบาย HAD ยังไม่มีข้อบังคับ Scan Barcode ยืนยันตัวยาก่อนฉีด',
        tier5_external: 'บรรจุภัณฑ์ยาจากบริษัทยาภายนอกมีการเปลี่ยนรูปแบบกะทันหันโดยไม่มีการแจ้งเตือนล่วงหน้า',
        corrective_action: 'ติดตั้งระบบ Barcode Medication Administration (BCMA) และปรับสิ่งแวดล้อมจุดผสมยาเป็น Silent Zone',
      });

      swiss_cheeses.push(
        { layer: 'การบริหารองค์กร (Organizational Influences)', hole: 'ขาดนโยบายบังคับใช้ระบบ Barcode Medication Verification และงบประมาณในการปรับปรุงบรรจุภัณฑ์ LASA' },
        { layer: 'การนิเทศกำกับ (Unsafe Supervision)', hole: 'หัวหน้าเวรไม่ได้สุ่มตรวจ Audit กระบวนการ Double-check ของยา HAD ในช่วงเวรดึก' },
        { layer: 'สภาพแวดล้อมและเงื่อนไข (Preconditions)', hole: 'ความเหนื่อยล้าของบุคลากร จุดเตรียมยามีเสียงดังรบกวน และยา LASA วางติดกัน' },
        { layer: 'การกระทำหน้างาน (Unsafe Acts)', hole: 'ผู้ปฏิบัติงานไม่ได้ตรวจสอบซ้ำชื่อยาและขนาดยากับใบ MAR ก่อนฉีดให้ผู้ป่วย' },
      );

      capas.push(
        { action: 'จัดทำระบบ Smart Alert Warning ในโปรแกรม HosXP สำหรับยา High Alert Drug ทุกรายการ', type: 'systemic', responsible: 'ทีมสารสนเทศ (IT) & ทีม PTC', due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), status: 'pending' },
        { action: 'ปรับปรุงตู้ยาและฉลากยา LASA ให้ใช้ Tall-Man Lettering และแยกชั้นวางออกจากกันอย่างชัดเจน', type: 'preventive', responsible: 'กลุ่มงานเภสัชกรรม', due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), status: 'pending' },
        { action: 'จัดตั้งพื้นที่ "Silent Zone / เขตปลอดการรบกวน" บริเวณจุดเตรียมยาฉีดในทุกหอผู้ป่วย', type: 'immediate', responsible: 'หัวหน้าพยาบาลทุกหน่วยงาน', due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), status: 'pending' },
      );

      timelines.push(
        { event_time: '08:30 น.', event_description: 'แพทย์มีคำสั่งปรับแผนการรักษาและสั่งยาผ่านระบบเวชระเบียน', is_critical_point: false },
        { event_time: '09:15 น.', event_description: 'ห้องยาจัดส่งยาขึ้นหอผู้ป่วย โดยซองยามีลักษณะคล้ายคลึงกับยาเดิมของผู้ป่วยข้างเตียง', is_critical_point: true },
        { event_time: '10:00 น.', event_description: 'พยาบาลเตรียมยาและนำไปให้ผู้ป่วยโดยไม่ได้ทำ Independent Double Check', is_critical_point: true },
        { event_time: '10:30 น.', event_description: 'ผู้ป่วยเริ่มแสดงอาการผิดปกติ พยาบาลตรวจสอบซองยาพบความคลาดเคลื่อน จึงรายงานแพทย์และให้การรักษาแก้ไขทันที', is_critical_point: true },
      );
    } else if (isFall) {
      fishbones.push(
        toLegacyFishbone('F0010', 'ผู้ป่วยมีภาวะสับสนหรือกล้ามเนื้ออ่อนแรงและมีความเสี่ยงต่อการพลัดตกหกล้ม'),
        toLegacyFishbone('F0037', 'สภาวะเฉพาะบุคคลและข้อจำกัดในการช่วยเหลือตนเองเพิ่มความเสี่ยง'),
        toLegacyFishbone('F0022', 'การสื่อสารวิธีขอความช่วยเหลือและข้อควรระวังแก่ผู้ป่วยหรือญาติไม่ชัดเจน'),
        toLegacyFishbone('F0027', 'ไม่ได้ประเมิน Fall Risk ซ้ำหลังได้รับยาที่มีฤทธิ์กดประสาทตามแนวทาง'),
        toLegacyFishbone('F0031', 'ระบบล็อกล้อเตียงหรือกริ่งเรียกพยาบาลทำงานไม่เหมาะสม'),
        toLegacyFishbone('F0036', 'พื้นห้องน้ำเปียกและแสงสว่างทางเดินช่วงกลางคืนไม่เพียงพอ'),
      );

      whys.push(
        { level: 1, question: 'ทำไมผู้ป่วยจึงพลัดตกหกล้มในหอผู้ป่วย?', answer: 'ผู้ป่วยลุกไปเข้าห้องน้ำคนเดียวในเวลากลางคืนแล้วเกิดอาการเซ เสียการทรงตัว' },
        { level: 2, question: 'ทำไมผู้ป่วยจึงลุกไปคนเดียวโดยไม่เรียกพยาบาล?', answer: 'ผู้ป่วยเกรงใจเจ้าหน้าที่และสายกริ่งเรียกพยาบาลวางอยู่ไกลเอื้อมไม่ถึง' },
        { level: 3, question: 'ทำไมเจ้าหน้าที่จึงไม่ได้เฝ้าระวังหรือยกไม้กั้นเตียงขึ้นให้สนิท?', answer: 'ไม่ได้ระบุว่าผู้ป่วยเป็นกลุ่ม High Risk หลังได้รับยาปรับพฤติกรรม/ยานอนหลับ' },
        { level: 4, question: 'ทำไมจึงไม่มีระบบ Re-assessment อัตโนมัติเมื่อมีการสั่งยานอนหลับ?', answer: 'ขั้นตอนการประเมิน Fall Risk ยังใช้กระดาษและประเมินแค่วันละครั้ง ไม่ได้ Trigger ตามการสั่งยา' },
        { level: 5, question: 'ทำไม (สาเหตุรากเหง้าเชิงระบบ)?', answer: 'ระบบการจัดการสิ่งแวดล้อมและความปลอดภัยของผู้ป่วย (Patient Safety Environment) ขาดระบบ Sensor แจ้งเตือนการลุกจากเตียงและการเชื่อมโยงการประเมินความเสี่ยงแบบ Dynamic' },
      );

      cmps.push(
        { observation: 'ไม่มีการประเมินซ้ำความเสี่ยงพลัดตกหกล้มหลังได้รับยาที่มีฤทธิ์กดประสาท', hypothesis: 'เจ้าหน้าที่ขาดเครื่องมือบันทึก Dynamic Fall Risk ที่สะดวก', comment: 'ปรับแบบประเมิน Fall Risk ให้เตือนใน HosXP ทันทีที่มีการสั่ง Sedatives' },
        { observation: 'สายกริ่งฉุกเฉินหลุดจากที่ยึดข้างเตียง', hypothesis: 'อุปกรณ์ยึดชำรุดและไม่มีการเดินตรวจความพร้อมประจำวัน', comment: 'จัดทำ Checklist ตรวจสอบอุปกรณ์ข้างเตียงก่อนรับเวรทุกกะ' },
      );

      process_analyses.push({
        process_key: 'กระบวนการดูแลและเฝ้าระวังผู้ป่วยกลุ่มเสี่ยง (Fall Prevention Process)',
        problem: 'ผู้ป่วยกลุ่มเสี่ยงสูงลุกจากเตียงโดยลำพังและเกิดอุบัติเหตุพลัดตกหกล้ม',
        tier1_personnel: 'เจ้าหน้าที่พยาบาลเวรดึกมีจำนวนจำกัด ดูแลผู้ป่วยหลายห้อง',
        tier2_teamwork: 'การประสานงานกับญาติผู้ป่วยเรื่องการเฝ้าไข้ยังไม่เป็นลายลักษณ์อักษร',
        tier3_environment: 'พื้นทางเดินมีความลื่นและแสงสว่างในห้องผู้ป่วยไม่เพียงพอเวลากลางคืน',
        tier4_policy: 'นโยบาย Fall Prevention ขาดเกณฑ์บังคับใช้อุปกรณ์ Bed Sensor สำหรับผู้ป่วยเสี่ยงสูง',
        tier5_external: 'ญาติมีความจำเป็นต้องกลับบ้านกะทันหันโดยไม่ได้แจ้งพยาบาล',
        corrective_action: 'ติดตั้ง Bed Motion Sensor และจัดหาเตียงไฟฟ้าปรับระดับต่ำพิเศษสำหรับหอผู้ป่วย',
      });

      swiss_cheeses.push(
        { layer: 'การบริหารองค์กร (Organizational Influences)', hole: 'ขาดการจัดสรรงบประมาณสำหรับเตียง Low-bed และระบบ Sensor แจ้งเตือนการลุกจากเตียง' },
        { layer: 'การนิเทศกำกับ (Unsafe Supervision)', hole: 'ไม่มีการ Audit มาตรการป้องกันการพลัดตกหกล้มในช่วงเวรดึกอย่างสม่ำเสมอ' },
        { layer: 'สภาพแวดล้อมและเงื่อนไข (Preconditions)', hole: 'พื้นห้องน้ำลื่น แสงสว่างไม่พอ และสายกริ่งเรียกพยาบาลอยู่ไกลมือ' },
        { layer: 'การกระทำหน้างาน (Unsafe Acts)', hole: 'ผู้ป่วยพยายามลุกเข้าห้องน้ำเองโดยไม่กดเรียกเจ้าหน้าที่ และไม่ได้ยกไม้กั้นเตียงขึ้นทั้งสองฝั่ง' },
      );

      capas.push(
        { action: 'จัดทำป้ายสัญลักษณ์ High Fall Risk แถบสีเหลืองเด่นชัดติดหัวเตียงและสายรัดข้อมือ', type: 'immediate', responsible: 'ทีมการพยาบาลทุกหอผู้ป่วย', due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), status: 'pending' },
        { action: 'สำรวจและติดตั้งแผ่นยางกันลื่นพร้อมราวจับในห้องน้ำผู้ป่วยทุกห้อง', type: 'preventive', responsible: 'กลุ่มงานบริหารทั่วไป & ทีม ENV', due_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), status: 'pending' },
        { action: 'จัดซื้อและติดตั้งระบบ Bed Exit Alarm Sensor สำหรับผู้ป่วยกลุ่ม High Risk', type: 'systemic', responsible: 'คณะกรรมการบริหารความเสี่ยง & ทีม PCT', due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), status: 'pending' },
      );

      timelines.push(
        { event_time: '20:00 น.', event_description: 'ผู้ป่วยได้รับยานอนหลับตามแผนการรักษา พยาบาลยกไม้กั้นเตียงขึ้น 1 ข้าง', is_critical_point: false },
        { event_time: '02:30 น.', event_description: 'ผู้ป่วยตื่นนอนรู้สึกปวดปัสสาวะ พยายามเอื้อมมือกดกริ่งเรียกพยาบาลแต่สายกริ่งหล่นอยู่ข้างเตียง', is_critical_point: true },
        { event_time: '02:35 น.', event_description: 'ผู้ป่วยพยายามก้าวลงจากเตียงด้วยตนเอง เกิดเสียการทรงตัวและล้มลงข้างเตียง มีเสียงกระแทก', is_critical_point: true },
        { event_time: '02:37 น.', event_description: 'พยาบาลเข้าช่วยเหลือทันที ตรวจร่างกาย ทำการปฐมพยาบาล และรายงานแพทย์เวรเพื่อประเมินและ X-ray', is_critical_point: false },
      );
    } else {
      // General Clinical / Sepsis / Delay / Communication Case
      fishbones.push(
        toLegacyFishbone('F0004', 'บุคลากรขาดประสบการณ์ในการประเมินสัญญาณเตือนวิกฤต MEWS/SOS Score'),
        toLegacyFishbone('F0015', 'มีผู้ป่วยหลายรายต้องได้รับการดูแลพร้อมกันภายใต้เวลาจำกัด'),
        toLegacyFishbone('F0021', 'การส่งต่อข้อมูลด้วย SBAR และการยืนยันแผนการรักษาไม่ครบถ้วน'),
        toLegacyFishbone('F0024', 'การกำกับติดตามและจัดสรรบุคลากรในช่วงภาระงานสูงไม่เพียงพอ'),
        toLegacyFishbone('F0026', 'เกณฑ์ Clinical Pathway หรือการเรียกทีมตอบสนองเร็วไม่ชัดเจน'),
        toLegacyFishbone('F0028', 'ข้อมูลสัญญาณชีพและผลวิกฤตไม่พร้อมใช้เพื่อแจ้งเตือนอย่างทันท่วงที'),
      );

      whys.push(
        { level: 1, question: `ทำไมจึงเกิดเหตุการณ์ "${topic || 'ความเสี่ยงทางคลินิก'}" ขึ้น?`, answer: 'การตรวจจับอาการเปลี่ยนแปลงและการรายงานแพทย์เพื่อเริ่มการรักษาเฉพาะทางมีความล่าช้ากว่าเกณฑ์มาตรฐาน' },
        { level: 2, question: 'ทำไมการรายงานแพทย์และการตรวจจับอาการจึงล่าช้า?', answer: 'ผู้ปฏิบัติงานไม่ได้บันทึกและคำนวณคะแนน Early Warning Score (EWS/SOS) อย่างต่อเนื่อง' },
        { level: 3, question: 'ทำไมจึงไม่มีการคำนวณ EWS/SOS และส่งสัญญาณแจ้งเตือนอัตโนมัติ?', answer: 'ระบบสารสนเทศของโรงพยาบาลยังไม่มีระบบ Auto-calculate SOS Score และ Trigger แจ้งเตือนเมื่อคะแนนเข้าเกณฑ์วิกฤต' },
        { level: 4, question: 'ทำไมระบบ Rapid Response Team (RRT) หรือ Fast Track จึงไม่ถูกเปิดใช้งาน?', answer: 'ขาดเกณฑ์การเปิดใช้งาน Fast Track ที่เป็นรูปธรรมและบุคลากรหน้างานยังไม่ได้รับการซักซ้อมระบบ RRT สม่ำเสมอ' },
        { level: 5, question: 'ทำไม (สาเหตุรากเหง้าเชิงระบบ)?', answer: 'ระบบการเฝ้าระวังผู้ป่วยวิกฤตในหอผู้ป่วยทั่วไป (In-hospital Cardiac Arrest & Sepsis Surveillance System) ขาดการบูรณาการระบบแจ้งเตือนเชิงรุกและทีมตอบสนองเร็ว (RRT)' },
      );

      cmps.push(
        {
          observation: 'สัญญาณชีพของผู้ป่วยเริ่มเปลี่ยนแปลงแต่ไม่มีการรายงานแพทย์เวรทันที',
          hypothesis: 'พยาบาลหน้างานประเมินว่าเป็นอาการชั่วคราวและรอการรายงานพร้อมรอบวัดสัญญาณชีพถัดไป',
          comment: 'กำหนด Trigger Criteria ที่ต้องโทรรายงานแพทย์ทันที (Immediate Call Criteria) ติดไว้ทุกเคาน์เตอร์',
        },
        {
          observation: 'การรายงานแพทย์ทางโทรศัพท์ไม่ได้ใช้โครงสร้าง SBAR ทำให้แพทย์ไม่ทราบภาพรวมความเร่งด่วน',
          hypothesis: 'ยังไม่ได้ฝึกอบรมและประเมินทักษะการสื่อสาร SBAR ในบุคลากรใหม่อย่างครบถ้วน',
          comment: 'จัดอบรมเชิงปฏิบัติการ SBAR Communication และจัดทำแผ่นพับสรุปขั้นตอน',
        },
      );

      process_analyses.push({
        process_key: 'กระบวนการประเมินและดูแลผู้ป่วยภาวะวิกฤต (Clinical Assessment & Escalation Process)',
        problem: 'การระบุสัญญาณเตือนและการเรียกทีมแพทย์ช่วยเหลือผู้ป่วยล่าช้า',
        tier1_personnel: 'พยาบาลผู้ดูแลเป็นพยาบาลจบใหม่ ขาดประสบการณ์ในการประเมินภาวะ Severe Sepsis / Deterioration',
        tier2_teamwork: 'การประสานงานระหว่างพยาบาลและแพทย์เวรขาดการยืนยันเป้าหมายและเวลาที่ต้องมาประเมินซ้ำ',
        tier3_environment: 'หอผู้ป่วยมีภาระงานล้น (Bed Occupancy > 100%) ในช่วงเวรบ่าย-ดึก',
        tier4_policy: 'ยังไม่มีนโยบายการจัดตั้งทีมตอบสนองเร็ว (Rapid Response Team : RRT) อย่างเป็นทางการ',
        tier5_external: 'ระบบส่งต่อผู้ป่วยไปยังโรงพยาบาลระดับตติยภูมิมียอดเตียง ICU เต็ม ต้องรอประสานงาน',
        corrective_action: 'จัดตั้งระบบ Fast Track พร้อมทีม RRT และพัฒนาโปรแกรม Auto SOS Alert ในระบบสารสนเทศ',
      });

      swiss_cheeses.push(
        { layer: 'การบริหารองค์กร (Organizational Influences)', hole: 'ขาดนโยบายการจัดตั้งระบบ Rapid Response Team (RRT) และการจัดสรรอัตรากำลังพยาบาลตามภาระความหนักของผู้ป่วย' },
        { layer: 'การนิเทศกำกับ (Unsafe Supervision)', hole: 'หัวหน้าเวรไม่ได้เข้าประเมินร่วม (Joint Assessment) ในผู้ป่วยที่มีสัญญาณชีพเปลี่ยนแปลง' },
        { layer: 'สภาพแวดล้อมและเงื่อนไข (Preconditions)', hole: 'ภาระงานหนาแน่นในเวรดึก และระบบคอมพิวเตอร์ไม่ได้คำนวณคะแนนเตือนภัยวิกฤตอัตโนมัติ' },
        { layer: 'การกระทำหน้างาน (Unsafe Acts)', hole: 'ไม่ได้ใช้หลักการสื่อสาร SBAR ในการรายงานแพทย์ ทำให้แพทย์ไม่ทราบความเร่งด่วนของสถานการณ์' },
      );

      capas.push(
        { action: 'จัดทำระบบ Auto SOS/MEWS Score Calculation พร้อม Warning Alert เด้งเตือนในระบบ HosXP', type: 'systemic', responsible: 'ทีม IT & คณะกรรมการ PCT', due_date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10), status: 'pending' },
        { action: 'จัดตั้งทีม Rapid Response Team (RRT) พร้อมคู่มือเกณฑ์การเปิดใช้และซ้อมแผนรับมือผู้ป่วยทรุดลงในวอร์ด', type: 'preventive', responsible: 'ทีมกู้ชีพ CPR & องค์กรแพทย์/พยาบาล', due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), status: 'pending' },
        { action: 'จัดอบรมและทบทวนทักษะการสื่อสาร SBAR Communication ให้แก่พยาบาลและแพทย์ประจำบ้านทุกคน', type: 'immediate', responsible: 'กลุ่มงานการพยาบาล', due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), status: 'pending' },
      );

      timelines.push(
        { event_time: '14:00 น.', event_description: 'ผู้ป่วยเข้ารับการรักษาในหอผู้ป่วย มีอาการไข้และอ่อนเพลีย สัญญาณชีพแรกรับความดันโลหิตปกติ', is_critical_point: false },
        { event_time: '18:00 น.', event_description: 'ผู้ป่วยเริ่มมีชีพจรเร็วขึ้น 110 ครั้ง/นาที หายใจ 24 ครั้ง/นาที แต่ยังไม่ได้รายงานแพทย์', is_critical_point: true },
        { event_time: '21:30 น.', event_description: 'ผู้ป่วยซึมลง ความดันโลหิตลดลงเหลือ 85/50 mmHg พยาบาลโทรรายงานแพทย์เวร', is_critical_point: true },
        { event_time: '21:45 น.', event_description: 'แพทย์เข้าตรวจรักษา วินิจฉัยภาวะ Septic Shock เริ่มให้สารน้ำ สั่งยาปฏิชีวนะ และเปิด Fast Track ทันที', is_critical_point: true },
      );
    }

    return {
      topic_refined: topic || 'การวิเคราะห์หาสาเหตุที่แท้จริงของอุบัติการณ์ความเสี่ยง',
      what_happened_summary: whatHappened || 'เกิดเหตุการณ์ความคลาดเคลื่อนทางคลินิกที่ส่งผลกระทบต่อความปลอดภัยของผู้ป่วยในโรงพยาบาลวังเจ้า',
      actual_impact_summary: actualImpact || `ผู้ป่วยได้รับผลกระทบในระดับความรุนแรง ${severity} ต้องได้รับการประเมินและดูแลเพิ่มเติม`,
      potential_impact_summary: 'หากไม่มีมาตรการควบคุมเชิงระบบ อาจเกิดเหตุการณ์ซ้ำและส่งผลกระทบต่อชีวิตหรือความพิการของผู้ป่วย',
      contributing_factors: normalizeContributingFactors(
        fishbones.map((factor) => ({
          code: factor.factor.match(/\bF\d{4}\b/)?.[0],
          detail: factor.sub_factor,
        })),
      ),
      fishbones,
      whys,
      cmps,
      process_analyses,
      swiss_cheeses,
      capas,
      timelines,
      rca_team_suggestion: 'คณะกรรมการบริหารความเสี่ยง (RM) ร่วมกับทีมนำทางคลินิก (PCT) และหน่วยงานที่เกิดเหตุ',
      reviewers_suggestion: 'นพ.ประธาน PCT, พยาบาลหัวหน้าตึก, เภสัชกรประจำหอผู้ป่วย, พยาบาลผู้จัดการความเสี่ยง (RM Coordinator)',
    };
  }
}
