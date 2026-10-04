import { randomUUID } from 'node:crypto';
import { normalizeAiSwissLayer } from './ai-rca-validation';
import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IncidentRcaPolicyService } from './incident-rca-policy.service';
import { normalizeContributingFactors, serializeContributingFactors, toLegacyFishbone } from './contributing-factor.catalog';
import { CapaService } from '../capa/capa.service';
import { deidentifyIncidentText } from '../incidents/ai-incident-assistant.utils';
import { clampMatrixValue, consequenceFromSeverity, riskLevelFor } from '../../common/risk-matrix-policy';

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
  incident_id?: number;
  topic?: string;
  what_happened?: string;
  actual_impact?: string;
  severity?: string;
  rca_type?: string;
  incident_text?: string;
  analysis_mode?: 'basic' | 'full';
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
  expected_version?: number;
  draft_register?: { risk_analysis_id?: number; risk_description?: string; risk_owner_name?: string; initial_likelihood?: number; review_frequency_months?: number };
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
  review_outcome?: 'IN_PROGRESS' | 'DEPARTMENT_CLOSED' | 'DEPARTMENT_MONITORING' | 'CROSS_FUNCTIONAL_SUPPORT' | 'ORGANIZATION_RCA';
  support_request_purpose?: 'PROCESS_ANALYSIS' | 'SPECIALIST_ADVICE' | 'JOINT_ACTION' | 'POLICY_DECISION';
  support_target_name?: string;
  escalation_reason?: string;
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
    id?: number;
    client_key?: string;
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
  participants?: Array<{
    participant_type: string;
    display_name: string;
    role: string;
    user_id?: number;
    member_cid?: string;
    department_id?: string;
    team_id?: number;
    purpose?: string;
    response_status?: string;
    responded_at?: string;
    is_owner?: boolean;
    sort_order?: number;
  }>;
  voice_of_staff_entries?: Array<{
    interviewee_name?: string;
    interviewee_role?: string;
    interviewee_department?: string;
    interview_date?: string;
    work_context?: string;
    key_points: string;
    contributing_conditions?: string;
    suggestions?: string;
    sort_order?: number;
  }>;
}

export class CompleteStandardRcaDto {
  risk_analysis_id?: number;
  risk_description?: string;
  risk_owner_name?: string;
  initial_likelihood?: number;
  review_frequency_months?: number;
}

@Injectable()
export class RcaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: IncidentRcaPolicyService,
    private readonly capaService: CapaService,
  ) {}

  private async isCenterCoordinator(user: any) {
    if (user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital')) return true;
    if (!user?.teamId) return false;
    const team = await this.prisma.team.findUnique({ where: { id: Number(user.teamId) }, select: { team_name: true } });
    return /(^|[^A-Z])(RM|PCT)([^A-Z]|$)/i.test(team?.team_name || '');
  }

  private async allowedDepartments(user: any): Promise<string[] | null> {
    if (user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital')) return null;
    if (['rm_committee', 'head'].includes(user?.role) && user?.rmScope === 'group' && user?.departmentGroup) {
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
    const where: any = { ...(type ? { rca_type: type } : {}), ...(allowed ? { OR: [{ department_id: { in: allowed } }, { assigned_member_cid: user?.cid || '__unassigned__' }] } : {}) };
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
    if (!['admin', 'head', 'rm_committee'].includes(String(user?.role || ''))) {
      throw new ForbiddenException('เฉพาะผู้มีสิทธิ์ทบทวนเท่านั้นที่เริ่ม RCA ได้');
    }
    const source = data.incidents?.[0];
    if (!source?.incident_id) throw new BadRequestException('ต้องสร้าง RCA จาก incident_id');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: source.incident_id } });
    if (!incident?.nrls_code) throw new BadRequestException('อุบัติการณ์ยังไม่มี NRLS ที่ถูกต้อง');
    await this.assertDepartmentAccess(incident.department_id, user);
    if (!['ตรวจสอบ', 'ทบทวน'].includes(String(incident.status_risk || ''))) {
      throw new BadRequestException('สร้าง RCA ได้เฉพาะความเสี่ยงที่ยืนยันแล้วและยังเปิดอยู่');
    }
    const requiredMode = String(incident.recommended_rca_type || '').toUpperCase();
    if (['STANDARD', 'FULL'].includes(requiredMode) || (data.rca_type === 'mini' && requiredMode === 'CONCISE')) {
      throw new BadRequestException('กรุณาใช้ชนิด RCA ตามเกณฑ์ของเหตุการณ์ ไม่ลดระดับการวิเคราะห์');
    }
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
    const centerCoordinator = await this.isCenterCoordinator(user);
    return this.prisma.standard_rca_case.findMany({
      where: allowed ? {
        OR: [
          ...(centerCoordinator ? [{ hospital_center: true }] : []),
          { department_id: { in: allowed } },
          { assigned_member_cid: user?.cid || '__unassigned__' },
          { participants: { some: { OR: [
            { user_id: Number(user?.id) || -1 },
            { member_cid: user?.cid || '__none__' },
            { department_id: { in: allowed } },
            { team_id: Number(user?.teamId) || -1 },
          ] } } },
        ],
      } : {},
      include: {
        timelines: { orderBy: { sort_order: 'asc' } },
        cmps: { orderBy: { sort_order: 'asc' } },
        whys: { orderBy: { level: 'asc' } },
        fishbones: { orderBy: { sort_order: 'asc' } },
        process_analyses: { orderBy: { sort_order: 'asc' } },
        capas: { orderBy: { sort_order: 'asc' } },
        review_sessions: { orderBy: { sort_order: 'asc' } },
        participants: { orderBy: [{ is_owner: 'desc' }, { sort_order: 'asc' }] },
        risk_analysis: true,
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
        participants: { orderBy: [{ is_owner: 'desc' }, { sort_order: 'asc' }] },
        voice_of_staff_entries: { orderBy: { sort_order: 'asc' } },
        risk_analysis: true,
      },
    });
    if (!stdCase) throw new NotFoundException(`Standard RCA Case #${id} not found`);
    if (user) {
      const allowed = await this.allowedDepartments(user);
      const participantAccess = stdCase.participants.some((participant) =>
        (participant.user_id != null && Number(participant.user_id) === Number(user?.id))
        || (participant.member_cid && String(participant.member_cid) === String(user?.cid || ''))
        || (participant.department_id && Boolean(allowed?.includes(String(participant.department_id))))
        || (participant.team_id != null && Number(participant.team_id) === Number(user?.teamId)),
      );
      const ownerAccess = allowed === null || allowed.includes(String(stdCase.department_id || ''))
        || (stdCase.assigned_member_cid && String(stdCase.assigned_member_cid) === String(user?.cid || ''));
      if (!ownerAccess && !participantAccess && !(stdCase.hospital_center && await this.isCenterCoordinator(user))) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง RCA นอกขอบเขต');
    }

    let incidentDetail = '';
    let actualImpactNeedsReview = false;

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
          const savedImpact = stdCase.actual_impact?.trim();
          actualImpactNeedsReview = Boolean(savedImpact && [riskReg.problem_basic, riskReg.edit].some(value => value?.trim() === savedImpact));
        }
      }
    }

    let canEdit = false, canComplete = false;
    try { await this.assertStandardWriter(stdCase, user); canEdit = true; } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    try { await this.assertStandardWriter(stdCase, user, true); canComplete = true; } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    const scope = await this.allowedDepartments(user);
    const canManageTeam = scope === null || Boolean(scope?.includes(String(stdCase.department_id))) || (stdCase.hospital_center && await this.isCenterCoordinator(user));
    const canViewVoice = canComplete || stdCase.participants.some(p => p.role === 'FACILITATOR'
      && ((p.user_id && Number(p.user_id) === Number(user?.id)) || (p.team_id && Number(p.team_id) === Number(user?.teamId))));
    return {
      ...stdCase,
      can_edit: canEdit && stdCase.status !== 'CANCELLED', can_complete: canComplete && stdCase.status !== 'CANCELLED', can_manage_team: canManageTeam, can_view_voice: canViewVoice,
      voice_of_staff_entries: canViewVoice ? stdCase.voice_of_staff_entries : [],
      what_happened: stdCase.what_happened || incidentDetail,
      incident_detail_raw: incidentDetail,
      actual_impact_needs_review: actualImpactNeedsReview,
    };
  }

  async createStandard(data: CreateStandardRcaDto, user?: any) {
    this.assertDraftStatus(data);
    if (!data.incident_id) throw new BadRequestException('ต้องสร้าง Standard RCA จาก incident_id');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: data.incident_id } });
    if (!incident?.nrls_code) throw new BadRequestException('อุบัติการณ์ยังไม่มี NRLS ที่ถูกต้อง');
    await this.assertDepartmentAccess(incident.department_id, user);
    const duplicate = await this.prisma.standard_rca_case.findFirst({ where: { incident_id: incident.id } });
    if (duplicate) throw new ConflictException('มี Standard RCA สำหรับอุบัติการณ์นี้แล้ว');
    const caseId = `RCA-${randomUUID()}`;

    return this.prisma.$transaction(async (tx) => {
    const created = await tx.standard_rca_case.create({
      data: {
        id: caseId,
        draft_register: data.draft_register ? JSON.stringify(data.draft_register) : null,
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
        review_outcome: data.review_outcome || 'IN_PROGRESS',
        support_request_purpose: data.support_request_purpose,
        support_target_name: data.support_target_name,
        escalation_reason: data.escalation_reason,
        review_decided_by: data.review_outcome && data.review_outcome !== 'IN_PROGRESS' ? Number(user?.id) || data.created_by : null,
        review_decided_at: data.review_outcome && data.review_outcome !== 'IN_PROGRESS' ? new Date() : null,
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
                client_key: c.client_key,
                action: c.action,
                type: c.type,
                responsible: c.responsible,
                due_date: c.due_date ? new Date(c.due_date) : null,
                status: c.status || 'pending',
                evidence: c.evidence,
                effectiveness_criteria: c.effectiveness_criteria,
                baseline_value: c.baseline_value,
                target_value: c.target_value,
                effectiveness_due_date: c.effectiveness_due_date ? new Date(c.effectiveness_due_date) : null,
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
        participants: data.participants?.length
          ? {
              create: data.participants.map((participant, idx) => ({
                participant_type: String(participant.participant_type || 'DEPARTMENT').toUpperCase(),
                display_name: participant.display_name.trim(),
                role: String(participant.role || 'REVIEWER').toUpperCase(),
                user_id: participant.user_id,
                member_cid: participant.member_cid,
                department_id: participant.department_id,
                team_id: participant.team_id,
                purpose: participant.purpose,
                response_status: String(participant.response_status || (participant.is_owner ? 'ACCEPTED' : 'PENDING')).toUpperCase(),
                responded_at: participant.responded_at ? new Date(participant.responded_at) : participant.is_owner ? new Date() : null,
                is_owner: participant.is_owner ?? false,
                sort_order: participant.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        voice_of_staff_entries: data.voice_of_staff_entries?.length
          ? {
              create: data.voice_of_staff_entries.map((voice, idx) => ({
                interviewee_name: voice.interviewee_name,
                interviewee_role: voice.interviewee_role,
                interviewee_department: voice.interviewee_department,
                interview_date: voice.interview_date ? new Date(voice.interview_date) : null,
                work_context: voice.work_context,
                key_points: voice.key_points.trim(),
                contributing_conditions: voice.contributing_conditions,
                suggestions: voice.suggestions,
                sort_order: voice.sort_order ?? idx + 1,
                created_by: Number(user?.id) || data.created_by,
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
        participants: true,
        voice_of_staff_entries: true,
      },
    });

    const createdParticipants = created.participants || [];
    const createdVoices = created.voice_of_staff_entries || [];
    if (createdParticipants.length || createdVoices.length) {
      await tx.workflow_audit.create({
        data: {
          entity_type: 'RCA',
          entity_id: caseId,
          action: 'COLLABORATION_CONFIGURED',
          new_value: JSON.stringify({
            participants: createdParticipants.map((item) => ({ type: item.participant_type, name: item.display_name, role: item.role, status: item.response_status, owner: item.is_owner })),
            voice_of_staff_count: createdVoices.length,
          }),
          reason: 'กำหนดทีมทบทวนและข้อมูล Voice of Staff',
          changed_by: Number(user?.id) || data.created_by,
        },
      });
      await Promise.all(createdParticipants.filter((item) => !item.is_owner && item.response_status === 'PENDING').map((item) =>
        tx.notification_log.upsert({
          where: { notification_key: `RCA:${caseId}:PARTICIPANT:${item.sort_order}` },
          create: {
            notification_key: `RCA:${caseId}:PARTICIPANT:${item.sort_order}`,
            entity_type: 'RCA', entity_id: caseId, notification_type: 'REVIEW_INVITATION',
            recipient_scope: `${item.participant_type}:${item.user_id || item.member_cid || item.department_id || item.team_id || item.display_name}`,
          },
          update: {},
        }),
      ));
    }

    await tx.riskregister.updateMany({
      where: { id: incident.id, id_risk: incident.id_risk },
      data: { rca_status: created.status === 'COMPLETED' && created.completed_at ? 'COMPLETED' : 'IN_PROGRESS', rca_case_id: caseId },
    });

    return created;
    });
  }

  private assertDraftStatus(data: Partial<CreateStandardRcaDto>) {
    const status = String(data.status || 'IN_PROGRESS').toUpperCase();
    if (!['DRAFT', 'IN_PROGRESS'].includes(status) && !(status === 'CLOSED' && data.is_not_risk === true)) {
      throw new BadRequestException('กรุณาสรุป RCA ผ่านขั้นตอนตรวจความครบถ้วน หรือยกเลิกพร้อมเหตุผล');
    }
  }

  private async assertStandardWriter(record: any, user: any, completing = false) {
    const departments = await this.allowedDepartments(user);
    const owner = departments === null || departments.includes(String(record.department_id || ''))
      || (record.assigned_member_cid && record.assigned_member_cid === user?.cid);
    const delegated = (record.participants || []).some((p: any) =>
      p.response_status !== 'DECLINED' && (completing ? ['OWNER', 'APPROVER'] : ['OWNER', 'FACILITATOR', 'ANALYST', 'APPROVER']).includes(p.role)
      && ((p.user_id && Number(p.user_id) === Number(user?.id))
        || (p.member_cid && p.member_cid === user?.cid)
        || (p.team_id && Number(p.team_id) === Number(user?.teamId))
        || (p.department_id && departments?.includes(String(p.department_id)))));
    const accountableOwner = owner && (!completing || ['admin', 'head', 'rm_committee'].includes(user?.role) || Number(record.created_by) === Number(user?.id) || (record.assigned_member_cid && record.assigned_member_cid === user?.cid));
    if (!accountableOwner && !delegated && !(!completing && record.hospital_center && await this.isCenterCoordinator(user))) throw new ForbiddenException('บทบาทนี้ดูหรือให้ข้อมูลได้ แต่ไม่มีสิทธิ์แก้ไขหรือสรุป RCA');
  }

  private async saveDraftMeasures(tx: any, id: string, existing: any, measures: NonNullable<CreateStandardRcaDto['capas']>, user: any) {
    const kept: number[] = [];
    const seenKeys = new Set<string>();
    for (const [index, item] of measures.entries()) {
      if (item.client_key && seenKeys.has(item.client_key)) throw new BadRequestException('รหัสมาตรการซ้ำในแบบร่าง');
      if (item.client_key) seenKeys.add(item.client_key);
      const old = existing.capas.find((c: any) => item.id ? c.id === item.id : item.client_key && c.client_key === item.client_key);
      if (item.id && !old) throw new BadRequestException('มาตรการไม่อยู่ใน RCA นี้');
      if (old && kept.includes(old.id)) throw new BadRequestException('รหัสมาตรการซ้ำในแบบร่าง');
      const fields = {
        client_key: item.client_key || old?.client_key || null,
        action: item.action, type: item.type, responsible: item.responsible,
        due_date: item.due_date ? new Date(item.due_date) : null,
        evidence: item.evidence || null, effectiveness_criteria: item.effectiveness_criteria || null,
        baseline_value: item.baseline_value || null, target_value: item.target_value || null,
        effectiveness_due_date: item.effectiveness_due_date ? new Date(item.effectiveness_due_date) : null,
        sort_order: index + 1,
      };
      const monitoring = old && await tx.capa_action.findFirst({ where: { source_type: 'STANDARD_RCA', source_id: id, source_item_id: old.id } });
      if (monitoring && ['due_date', 'effectiveness_due_date'].some((key) => {
        const date = (value: any) => value ? new Date(value).toISOString().slice(0, 10) : '';
        return date(fields[key]) !== date(old[key]);
      })) throw new BadRequestException('มาตรการเข้าระบบติดตามแล้ว กรุณาปรับกำหนดเวลาผ่านศูนย์ติดตามมาตรการ');
      if (monitoring && !['PENDING', 'IN_PROGRESS'].includes(monitoring.status)) {
        const changed = Object.entries(fields).some(([key, value]) => !['sort_order', 'client_key'].includes(key)
          && String(value instanceof Date ? value.toISOString().slice(0, 10) : value || '') !== String(old[key] instanceof Date ? old[key].toISOString().slice(0, 10) : old[key] || ''));
        if (changed) throw new BadRequestException('มาตรการเริ่มประเมินผลแล้ว กรุณาแก้ผ่านศูนย์ติดตามมาตรการเพื่อรักษาประวัติ');
      }
      const row = old
        ? await tx.standard_rca_capa.update({ where: { id: old.id }, data: fields })
        : await tx.standard_rca_capa.create({ data: { ...fields, standard_rca_case_id: id, status: 'pending' } });
      kept.push(row.id);
      if (monitoring && ['PENDING', 'IN_PROGRESS'].includes(monitoring.status)) {
        const plan = { action: fields.action, action_type: fields.type.toUpperCase(), responsible_display_name: fields.responsible,
          due_date: fields.due_date, effectiveness_criteria: fields.effectiveness_criteria, baseline_value: fields.baseline_value,
          target_value: fields.target_value, effectiveness_due_date: fields.effectiveness_due_date };
        const changed = Object.entries(plan).some(([key, value]) => String(value instanceof Date ? value.toISOString() : value || '') !== String(monitoring[key] instanceof Date ? monitoring[key].toISOString() : monitoring[key] || ''));
        if (changed) {
          await tx.capa_action.update({ where: { id: monitoring.id }, data: { ...plan, revision: { increment: 1 } } });
          await tx.workflow_audit.create({ data: { entity_type: 'CAPA', entity_id: String(monitoring.id), action: 'PLAN_REVISED_FROM_RCA',
            old_value: JSON.stringify(monitoring), new_value: JSON.stringify(plan), changed_by: Number(user?.id), reason: 'ปรับแผนโดยเก็บ ID และประวัติเดิม' } });
        }
      }
    }
    for (const old of existing.capas.filter((c: any) => !kept.includes(c.id))) {
      const monitoring = await tx.capa_action.findFirst({ where: { source_type: 'STANDARD_RCA', source_id: id, source_item_id: old.id } });
      if (monitoring) throw new BadRequestException('มาตรการที่เข้าระบบติดตามแล้วลบจากแบบร่างไม่ได้ กรุณาปรับมาตรการพร้อมเหตุผลในศูนย์ติดตาม');
      await tx.standard_rca_capa.delete({ where: { id: old.id } });
    }
  }

  private async ensureMonitoringMeasures(tx: any, record: any, incident: any, actorId: number) {
    for (const c of record.capas) {
      const existing = await tx.capa_action.findFirst({ where: { source_type: 'STANDARD_RCA', source_id: record.id, source_item_id: c.id } });
      if (existing) continue;
      const row = await tx.capa_action.create({ data: {
        source_type: 'STANDARD_RCA', source_id: record.id, source_item_id: c.id,
        incident_id: incident.id, incident_id_risk: incident.id_risk, nrls_code: incident.nrls_code,
        action: c.action, action_type: String(c.type || 'CORRECTIVE').toUpperCase(),
        responsible_display_name: c.responsible, responsible_department_id: incident.department_id,
        due_date: c.due_date, status: 'PENDING', evidence: c.evidence,
        effectiveness_criteria: c.effectiveness_criteria, baseline_value: c.baseline_value,
        target_value: c.target_value, effectiveness_due_date: c.effectiveness_due_date, created_by: actorId,
      } });
      await this.capaService.initializeMonitoring(row.id, tx);
    }
  }

  async updateStandard(id: string, data: Partial<CreateStandardRcaDto>, user?: any) {
    const existing = await this.getStandardById(id, user);
    if (String(existing.status || '').toUpperCase() === 'COMPLETED') {
      throw new BadRequestException('RCA ที่สรุปแล้วไม่สามารถแก้ไขผ่านแบบร่างได้');
    }

    await this.assertStandardWriter(existing, user);
    if (data.participants !== undefined && !existing.can_manage_team) throw new ForbiddenException('เฉพาะหน่วยงานเจ้าของเรื่องจัดทีมทบทวนได้');
    if (data.voice_of_staff_entries !== undefined && !existing.can_view_voice) throw new ForbiddenException('ไม่มีสิทธิ์แก้ข้อมูลสัมภาษณ์');
    this.assertDraftStatus(data);
    if (!Number.isInteger(data.expected_version) || data.expected_version !== existing.version) {
      throw new ConflictException('ข้อมูลมีการเปลี่ยนแปลงหรือเป็นหน้าจอรุ่นเก่า กรุณาเปิด RCA ใหม่ก่อนบันทึก');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.standard_rca_case.updateMany({
        where: { id, version: data.expected_version, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        data: { version: { increment: 1 } },
      });
      if (locked.count !== 1) throw new ConflictException('มีผู้บันทึกหรือสรุป RCA นี้แล้ว กรุณาโหลดข้อมูลใหม่');
    // Replace draft sections atomically; preserve CAPA identities and monitoring history.

    if (data.timelines) {
      await tx.standard_rca_timeline.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.whys) {
      await tx.standard_rca_why.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.fishbones) {
      await tx.standard_rca_fishbone.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.cmps) {
      await tx.standard_rca_cmp.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.process_analyses) {
      await tx.standard_rca_process_analysis.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.capas) await this.saveDraftMeasures(tx, id, existing, data.capas, user);
    if (data.review_sessions) {
      await tx.standard_rca_review_session.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.participants) {
      await tx.standard_rca_participant.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.voice_of_staff_entries) {
      await tx.standard_rca_voice_of_staff.deleteMany({ where: { standard_rca_case_id: id } });
    }

    const updated = await tx.standard_rca_case.update({
      where: { id },
      data: {
        draft_register: data.draft_register === undefined ? undefined : JSON.stringify(data.draft_register),
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
        review_outcome: data.review_outcome,
        support_request_purpose: data.support_request_purpose,
        support_target_name: data.support_target_name,
        escalation_reason: data.escalation_reason,
        review_decided_by: data.review_outcome && data.review_outcome !== 'IN_PROGRESS' ? Number(user?.id) || data.created_by : undefined,
        review_decided_at: data.review_outcome && data.review_outcome !== 'IN_PROGRESS' ? new Date() : undefined,
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
        participants: data.participants?.length
          ? {
              create: data.participants.map((participant, idx) => ({
                participant_type: String(participant.participant_type || 'DEPARTMENT').toUpperCase(),
                display_name: participant.display_name.trim(),
                role: String(participant.role || 'REVIEWER').toUpperCase(),
                user_id: participant.user_id,
                member_cid: participant.member_cid,
                department_id: participant.department_id,
                team_id: participant.team_id,
                purpose: participant.purpose,
                response_status: String(participant.response_status || (participant.is_owner ? 'ACCEPTED' : 'PENDING')).toUpperCase(),
                responded_at: participant.responded_at ? new Date(participant.responded_at) : participant.is_owner ? new Date() : null,
                is_owner: participant.is_owner ?? false,
                sort_order: participant.sort_order ?? idx + 1,
              })),
            }
          : undefined,
        voice_of_staff_entries: data.voice_of_staff_entries?.length
          ? {
              create: data.voice_of_staff_entries.map((voice, idx) => ({
                interviewee_name: voice.interviewee_name,
                interviewee_role: voice.interviewee_role,
                interviewee_department: voice.interviewee_department,
                interview_date: voice.interview_date ? new Date(voice.interview_date) : null,
                work_context: voice.work_context,
                key_points: voice.key_points.trim(),
                contributing_conditions: voice.contributing_conditions,
                suggestions: voice.suggestions,
                sort_order: voice.sort_order ?? idx + 1,
                created_by: Number(user?.id) || data.created_by,
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
        participants: true,
        voice_of_staff_entries: true,
      },
    });
    if (updated.incident_id) {
      await tx.riskregister.updateMany({
        where: { id: updated.incident_id },
        data: { rca_status: updated.status === 'COMPLETED' && updated.completed_at ? 'COMPLETED' : 'IN_PROGRESS' },
      });
    }
    if (data.participants || data.voice_of_staff_entries) {
      const previousCollaboration = {
        participants: existing.participants.map((item) => ({ type: item.participant_type, name: item.display_name, role: item.role, status: item.response_status, owner: item.is_owner })),
        voice_of_staff_entries: data.voice_of_staff_entries === undefined ? undefined : existing.voice_of_staff_entries,
      };
      const nextCollaboration = {
        participants: updated.participants.map((item) => ({ type: item.participant_type, name: item.display_name, role: item.role, status: item.response_status, owner: item.is_owner })),
        voice_of_staff_entries: data.voice_of_staff_entries === undefined ? undefined : updated.voice_of_staff_entries,
      };
      if (JSON.stringify(previousCollaboration) !== JSON.stringify(nextCollaboration)) {
        await tx.workflow_audit.create({
          data: {
            entity_type: 'RCA', entity_id: id, action: 'COLLABORATION_UPDATED',
            old_value: JSON.stringify(previousCollaboration),
            new_value: JSON.stringify(nextCollaboration),
            reason: 'ปรับผู้ร่วมทบทวนหรือข้อมูล Voice of Staff',
            changed_by: Number(user?.id) || data.created_by,
          },
        });
        await Promise.all(updated.participants.filter((item) => !item.is_owner && item.response_status === 'PENDING').map((item) =>
          tx.notification_log.upsert({
            where: { notification_key: `RCA:${id}:PARTICIPANT:${item.sort_order}` },
            create: {
              notification_key: `RCA:${id}:PARTICIPANT:${item.sort_order}`,
              entity_type: 'RCA', entity_id: id, notification_type: 'REVIEW_INVITATION',
              recipient_scope: `${item.participant_type}:${item.user_id || item.member_cid || item.department_id || item.team_id || item.display_name}`,
            },
            update: {},
          }),
        ));
      }
    }
    if (data.review_outcome && data.review_outcome !== existing.review_outcome) {
      await tx.workflow_audit.create({
        data: {
          entity_type: 'RCA', entity_id: id, action: 'REVIEW_ROUTE_DECIDED',
          old_value: JSON.stringify({ outcome: existing.review_outcome }),
          new_value: JSON.stringify({
            outcome: updated.review_outcome,
            support_request_purpose: updated.support_request_purpose,
            support_target_name: updated.support_target_name,
          }),
          reason: updated.escalation_reason || 'บันทึกผลลัพธ์หลังหน่วยงานทบทวน',
          changed_by: Number(user?.id) || data.created_by,
        },
      });
    }
    return updated;
    });
    return result;
  }

  async getCollaborationOptions() {
    const [departments, teams] = await Promise.all([
      this.prisma.department.findMany({ select: { id: true, depart_name: true }, orderBy: { depart_name: 'asc' } }),
      this.prisma.team.findMany({ select: { id: true, team_name: true }, orderBy: { team_name: 'asc' } }),
    ]);
    return { departments, teams };
  }

  async completeStandard(id: string, data: CompleteStandardRcaDto, user?: any) {
    const standardCase = await this.getStandardById(id, user);
    if (String(standardCase.status).toUpperCase() === 'CANCELLED') throw new BadRequestException('RCA นี้ถูกยกเลิกหรือจำหน่ายแล้ว');
    if (String(standardCase.status || '').toUpperCase() === 'COMPLETED' && standardCase.risk_analysis) {
      return { rca: standardCase, risk_analysis: standardCase.risk_analysis, risk_profile_created: false, already_completed: true };
    }
    await this.assertStandardWriter(standardCase, user, true);
    if (standardCase.is_not_risk) throw new BadRequestException('รายการที่ระบุว่าไม่ใช่ความเสี่ยงไม่สามารถสรุปเป็น RCA ได้');
    if (!standardCase.incident_id) throw new BadRequestException('RCA ต้องเชื่อมกับรายงานอุบัติการณ์ต้นทาง');

    const factors = normalizeContributingFactors(standardCase.contributing_factors);
    const hasAnalysis = factors.length > 0
      || standardCase.cmps.some((item) => item.observation?.trim() || item.hypothesis?.trim())
      || standardCase.whys.some((item) => item.answer?.trim())
      || standardCase.process_analyses.some((item) => item.problem?.trim() || item.corrective_action?.trim());
    const missing: string[] = [];
    if (!standardCase.what_happened?.trim()) missing.push('รายละเอียดเหตุการณ์');
    if (!standardCase.timelines.some((item) => item.event_description?.trim())) missing.push('Timeline');
    if (!hasAnalysis) missing.push('ผลการวิเคราะห์สาเหตุ');
    if (!(standardCase.participants || []).some((item) => item.is_owner && item.display_name?.trim())) missing.push('เจ้าของเรื่องในทีมทบทวน');
    if (standardCase.info_interview && !(standardCase.voice_of_staff_entries || []).some((item) => item.key_points?.trim())) {
      missing.push('ประเด็นสำคัญจาก Voice of Staff');
    }
    const reviewOutcome = String(standardCase.review_outcome || 'IN_PROGRESS').toUpperCase();
    if (reviewOutcome === 'IN_PROGRESS') missing.push('ผลลัพธ์หลังหน่วยงานทบทวน');
    if (['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(reviewOutcome)) {
      if (!standardCase.support_target_name?.trim()) missing.push('ทีมที่ขอให้ช่วยทบทวน');
      if (!standardCase.support_request_purpose?.trim()) missing.push('วัตถุประสงค์การขอความช่วยเหลือ');
      if (!standardCase.escalation_reason?.trim()) missing.push('เหตุผลการยกระดับ');
    }
    if (!standardCase.capas.length) missing.push('มาตรการแก้ไขและป้องกัน');
    standardCase.capas.forEach((capa, index) => {
      if (!capa.action?.trim()) missing.push(`รายละเอียดมาตรการที่ ${index + 1}`);
      if (!capa.responsible?.trim()) missing.push(`ผู้รับผิดชอบมาตรการที่ ${index + 1}`);
      if (!capa.due_date) missing.push(`กำหนดเสร็จมาตรการที่ ${index + 1}`);
      if (!capa.effectiveness_criteria?.trim()) missing.push(`เกณฑ์ประเมินมาตรการที่ ${index + 1}`);
      if (!capa.baseline_value?.trim()) missing.push(`ข้อมูลก่อนปรับปรุงมาตรการที่ ${index + 1}`);
      if (!capa.target_value?.trim()) missing.push(`เป้าหมายมาตรการที่ ${index + 1}`);
      if (!capa.effectiveness_due_date) missing.push(`กำหนดประเมินผลมาตรการที่ ${index + 1}`);
    });
    if (missing.length) {
      throw new BadRequestException(`ยังสรุป RCA ไม่ได้ กรุณากรอก: ${[...new Set(missing)].join(', ')}`);
    }

    const incident = await this.prisma.riskregister.findFirst({ where: { id: standardCase.incident_id } });
    if (!incident?.nrls_code) throw new BadRequestException('อุบัติการณ์ต้นทางยังไม่มี NRLS ที่ถูกต้อง');
    if (!incident.department_id) throw new BadRequestException('อุบัติการณ์ต้นทางยังไม่มีหน่วยงานเจ้าของเรื่อง');
    const nrlsCode = incident.nrls_code;

    let selectedProfile: any = null;
    if (data.risk_analysis_id) {
      selectedProfile = await this.prisma.riskanalysis.findUnique({ where: { id: Number(data.risk_analysis_id) } });
      if (!selectedProfile) throw new NotFoundException('ไม่พบ Risk Register ที่เลือก');
      if (selectedProfile.nrls_code !== incident.nrls_code) {
        throw new BadRequestException('Risk Register ที่เลือกใช้รหัส NRLS ไม่ตรงกับ RCA');
      }
      if (selectedProfile.scope_level === 'hospital') {
        if (!(user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital'))) throw new ForbiddenException('ไม่มีสิทธิ์เชื่อม Risk Register ระดับโรงพยาบาล');
      } else {
        await this.assertDepartmentAccess(selectedProfile.department_id, user);
      }
    }

    let profileCreated = false;
    const actorId = Number(user?.id) || standardCase.created_by || 1;
    const result = await this.prisma.$transaction(async (tx) => {
      let profile = selectedProfile;
      if (!profile) {
        profile = await tx.riskanalysis.findFirst({
          where: {
            nrls_code: nrlsCode,
            scope_level: 'department',
            scope_identifier: String(incident.department_id),
          },
        });
      }

      if (profile && !selectedProfile) throw new ConflictException('มีทะเบียนความเสี่ยง NRLS และขอบเขตนี้แล้ว กรุณาเลือกรายการเดิมและยืนยันการเชื่อม');
      const locked = await tx.standard_rca_case.updateMany({
        where: { id, version: standardCase.version, status: { not: 'COMPLETED' } },
        data: { version: { increment: 1 } },
      });
      if (locked.count !== 1) throw new ConflictException('มีผู้บันทึกหรือสรุป RCA นี้แล้ว กรุณาเปิดข้อมูลใหม่');
      if (!profile) {
        const likelihood = clampMatrixValue(Number(data.initial_likelihood) || 1);
        const consequence = consequenceFromSeverity(incident.level_id);
        const score = likelihood * consequence;
        const nextReview = new Date();
        nextReview.setMonth(nextReview.getMonth() + Math.max(1, Number(data.review_frequency_months) || 3));
        const department = await tx.department.findUnique({ where: { id: Number(incident.department_id) } });
        profile = await tx.riskanalysis.create({
          data: {
            risk_code: nrlsCode,
            nrls_code: nrlsCode,
            nrls_name_snapshot: incident.nrls_name_snapshot || standardCase.topic,
            risk_title: incident.nrls_name_snapshot || standardCase.topic,
            risk_description: data.risk_description?.trim()
              || [standardCase.what_happened, standardCase.potential_impact].filter(Boolean).join(' → '),
            source: 'RCA',
            scope_level: 'department',
            department_id: String(incident.department_id),
            scope_identifier: String(incident.department_id),
            program_id: incident.program_id,
            risk_owner_name: data.risk_owner_name?.trim() || department?.depart_name || standardCase.rca_team,
            risk_owner_user_id: actorId,
            initial_likelihood: likelihood,
            initial_consequence: consequence,
            initial_risk_score: score,
            initial_risk_level: riskLevelFor(likelihood, consequence),
            risk_prevention: standardCase.capas.map((capa) => capa.action).join('\n'),
            review_frequency_months: Math.max(1, Number(data.review_frequency_months) || 3),
            next_review_date: nextReview,
            status: 'open',
            created_by: actorId,
          },
        });
        profileCreated = true;
      }

      await this.ensureMonitoringMeasures(tx, standardCase, incident, actorId);
      const completedAt = new Date();
      const completed = await tx.standard_rca_case.update({
        where: { id },
        data: { status: 'COMPLETED', completed_at: completedAt, risk_analysis_id: profile.id, updated_at: completedAt },
        include: { risk_analysis: true },
      });
      await tx.riskregister.updateMany({
        where: { id: incident.id, id_risk: incident.id_risk },
        data: { rca_status: 'COMPLETED', rca_case_id: id, modify_date: completedAt, updated_by: actorId },
      });
      await tx.capa_action.updateMany({
        where: { source_type: 'STANDARD_RCA', source_id: id },
        data: { risk_analysis_id: profile.id, updated_at: completedAt },
      });
      await tx.workflow_audit.create({
        data: {
          entity_type: 'RCA',
          entity_id: id,
          action: 'COMPLETED_AND_REGISTERED',
          old_value: JSON.stringify({ status: standardCase.status, risk_analysis_id: standardCase.risk_analysis_id || null }),
          new_value: JSON.stringify({ status: 'COMPLETED', risk_analysis_id: profile.id }),
          reason: profileCreated ? 'สรุป RCA และสร้าง Risk Register อัตโนมัติ' : 'สรุป RCA และเชื่อม Risk Register เดิม',
          changed_by: actorId,
        },
      });
      return { rca: completed, risk_analysis: profile };
    }).catch((error) => {
      if (error?.code === 'P2002') throw new ConflictException('มีผู้สร้างทะเบียนความเสี่ยงนี้แล้ว กรุณาโหลดรายการและยืนยันการเชื่อมอีกครั้ง');
      throw error;
    });

    return { ...result, risk_profile_created: profileCreated };
  }

  async dischargeWithoutRca(id: string, data: { reason: string; expected_version: number }, user?: any) {
    const record = await this.getStandardById(id, user);
    await this.assertStandardWriter(record, user, true);
    if (!['admin', 'head', 'rm_committee'].includes(user?.role)) throw new ForbiddenException('ให้หัวหน้าหน่วยงานหรือกรรมการความเสี่ยงยืนยันการจำหน่าย');
    const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
    if (reason.length < 10 || reason.length > 2000) throw new BadRequestException('ระบุเหตุผลที่ไม่ต้องทำ RCA อย่างน้อย 10 และไม่เกิน 2000 ตัวอักษร');
    if (!record.incident_id || ['COMPLETED', 'CANCELLED'].includes(String(record.status).toUpperCase())) throw new BadRequestException('จำหน่ายได้เฉพาะ RCA ที่ยังดำเนินการและเชื่อมกับอุบัติการณ์');
    if (!Number.isInteger(data.expected_version) || data.expected_version !== record.version) throw new ConflictException('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนจำหน่าย');
    const actorId = Number(user?.id || user?.userId || user?.sub);
    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.riskregister.findFirst({ where: { id: record.incident_id! } });
      if (!incident || !['ตรวจสอบ', 'ทบทวน'].includes(String(incident.status_risk))) throw new BadRequestException('อุบัติการณ์ไม่อยู่ในสถานะที่จำหน่ายได้');
      const activeMeasures = await tx.capa_action.count({ where: { incident_id: record.incident_id!, status: { notIn: ['CLOSED', 'CANCELLED'] } } });
      if (activeMeasures) throw new BadRequestException('เคสนี้มีมาตรการที่ยังติดตามอยู่ ให้ดำเนินการตามขั้นตอนปิดมาตรการก่อน');
      const otherRca = await tx.rca_case.count({ where: { incident_id: record.incident_id!, status: { notIn: ['COMPLETED', 'CANCELLED'] } } });
      if (otherRca) throw new BadRequestException('เคสนี้มี RCA อื่นที่ยังดำเนินการอยู่');
      const changed = await tx.standard_rca_case.updateMany({ where: { id, version: data.expected_version, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, data: { status: 'CANCELLED', completed_at: null, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนจำหน่าย');
      const now = new Date();
      const note = `ทบทวนแล้วไม่ต้องทำ RCA/จำหน่ายเคส: ${reason}`;
      await tx.riskreview.create({ data: { riskregister_id: incident.id, risk_id: incident.id_risk, riskvisit: `NR${Date.now().toString().slice(-12)}`, review_date: now, notereview: note, reviewresults_id: 1, status_risk: 'จำหน่าย', discharge: '1', created_by: actorId, create_date: now } });
      const closedIncident = await tx.riskregister.updateMany({ where: { id: incident.id, id_risk: incident.id_risk, status_risk: { in: ['ตรวจสอบ', 'ทบทวน'] } }, data: { status_risk: 'จำหน่าย', rca_required: false, rca_status: 'NONE', rca_due_at: null, operational_closed_at: now, team_review_status: 'COMPLETED', team_review_completed_at: now, modify_date: now, updated_by: actorId } });
      if (closedIncident.count !== 1) throw new ConflictException('สถานะอุบัติการณ์เปลี่ยนแล้ว กรุณาตรวจสอบใหม่');
      await tx.sla_instance.updateMany({ where: { entity_type: 'INCIDENT', entity_id: String(incident.id), status: 'ACTIVE' }, data: { status: 'COMPLETED', completed_at: now } });
      await tx.workflow_audit.create({ data: { entity_type: 'RCA', entity_id: id, action: 'DISCHARGED_WITHOUT_RCA', old_value: JSON.stringify({ status: record.status, incident_status: incident.status_risk }), new_value: JSON.stringify({ status: 'CANCELLED', incident_status: 'จำหน่าย' }), reason, changed_by: actorId } });
      return { incident_id: incident.id, status: 'จำหน่าย' };
    });
  }

  async deleteStandard(id: string, reason?: string, actorId?: number, user?: any) {
    const existing = await this.getStandardById(id, user);
    if (existing.status === 'CANCELLED') throw new BadRequestException('RCA นี้ถูกยกเลิกหรือจำหน่ายแล้ว');
    if (!reason?.trim()) throw new BadRequestException('ต้องระบุเหตุผลการยกเลิก RCA');
    const cancelled = await this.prisma.standard_rca_case.update({ where: { id }, data: { status: 'CANCELLED', completed_at: null } });
    if (existing.incident_id) await this.prisma.riskregister.updateMany({ where: { id: existing.incident_id }, data: { rca_status: 'REQUIRED', rca_case_id: null } });
    await this.prisma.workflow_audit.create({ data: { entity_type: 'RCA', entity_id: id, action: 'CANCELLED', reason, changed_by: actorId } });
    return cancelled;
  }

  // ================= 4. Unified RCA Dashboard / Stats =================
  async getOverviewStats(user?: any, summaryOnly = false) {
    if (summaryOnly) {
      const departments = await this.allowedDepartments(user);
      return { pending_capas: await this.prisma.capa_action.count({ where: {
        ...(departments ? { responsible_department_id: { in: departments } } : {}),
        status: { notIn: ['CLOSED', 'CANCELLED'] },
      } }) };
    }
    const [miniRows, conciseRows, standardRows, reviewRows] = await Promise.all([
      this.getMiniConciseList('mini', user), this.getMiniConciseList('concise', user), this.getStandardList(user), this.getIncidentReviews(user),
    ]);
    const miniCases = miniRows.length, conciseCases = conciseRows.length, standardCases = standardRows.length, incidentReviews = reviewRows.length;

    const departments = await this.allowedDepartments(user);
    const capas = await this.prisma.capa_action.findMany({ where: departments ? { responsible_department_id: { in: departments } } : {} });
    const pendingCapas = capas.filter((c) => !['CLOSED', 'CANCELLED'].includes(c.status.toUpperCase())).length;
    const completedCapas = capas.filter((c) => c.status.toUpperCase() === 'CLOSED').length;
    const implementedCapas = capas.filter((c) => ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'AWAITING_APPROVAL'].includes(c.status.toUpperCase())).length;
    const awaitingEffectiveness = capas.filter((c) => ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS'].includes(c.status.toUpperCase())).length;
    const overdueCapas = capas.filter((c) => c.due_date && c.due_date < new Date() && !['CLOSED', 'CANCELLED'].includes(c.status.toUpperCase())).length;
    const needsSupport = standardRows.filter((item) => ['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(String(item.review_outcome || '').toUpperCase()) && String(item.status || '').toUpperCase() !== 'COMPLETED').length;
    const riskDue = await this.prisma.riskanalysis.count({
      where: {
        ...(departments ? { department_id: { in: departments } } : {}),
        status: { not: 'closed' },
        next_review_date: { lte: new Date(Date.now() + 30 * 86400000) },
      },
    });

    return {
      total_rca: miniCases + conciseCases + standardCases + incidentReviews,
      mini_count: miniCases,
      concise_count: conciseCases,
      standard_count: standardCases,
      review_count: incidentReviews,
      pending_capas: pendingCapas,
      completed_capas: completedCapas,
      implemented_capas: implementedCapas,
      awaiting_effectiveness: awaitingEffectiveness,
      overdue_capas: overdueCapas,
      needs_support: needsSupport,
      risk_register_due: riskDue,
    };
  }

  async getIncidentReviews(user?: any) {
    // The FY2570 RCA queue starts fresh while older incident reviews remain
    // available in the incident record. MySQL stores review_date as DATE.
    const reviewStart = new Date('2026-10-01T00:00:00.000Z');
    const bangkokToday = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const reviewEnd = new Date(Date.UTC(
      bangkokToday.getUTCFullYear(),
      bangkokToday.getUTCMonth(),
      bangkokToday.getUTCDate() + 1,
    ));
    const reviewDateFilter = { review_date: { gte: reviewStart, lt: reviewEnd } };
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
              reviewDateFilter,
              {
                OR: [
                  { riskregister_id: { in: scopedIncidentIds } },
                  { risk_id: { in: scopedLegacyRiskIds } },
                ],
              },
            ],
          }
        : { AND: [reviewContentFilter, reviewDateFilter] },
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
  async generateAiForIncident(dto: AiAssistDto, user: any) {
    if (!['admin', 'head', 'rm_committee'].includes(String(user?.role || ''))) throw new ForbiddenException('เฉพาะผู้มีสิทธิ์ทบทวนเท่านั้นที่ใช้ผู้ช่วย RCA ได้');
    if (!Number.isSafeInteger(dto?.incident_id) || Number(dto.incident_id) < 1) throw new BadRequestException('ต้องระบุ incident_id ที่ถูกต้อง');
    const incident = await this.prisma.riskregister.findFirst({ where: { id: dto.incident_id }, select: { department_id: true, status_risk: true } });
    if (!incident) throw new NotFoundException('ไม่พบอุบัติการณ์');
    await this.assertDepartmentAccess(incident.department_id, user);
    if (!['ตรวจสอบ', 'ทบทวน'].includes(String(incident.status_risk))) throw new BadRequestException('ใช้ผู้ช่วยได้เฉพาะความเสี่ยงที่ยืนยันแล้วและยังเปิดอยู่');
    return this.generateAiAssistance(dto);
  }

  private activeAiRequests = 0;

  async generateAiAssistance(dto: AiAssistDto) {
    if (!dto || typeof dto !== 'object') throw new BadRequestException('ข้อมูลไม่ถูกต้อง');
    for (const key of ['topic', 'what_happened', 'actual_impact', 'severity', 'incident_text', 'rca_type', 'analysis_mode'] as const) {
      const value = dto?.[key];
      if (value !== undefined && (typeof value !== 'string' || value.length > 4000)) {
        throw new BadRequestException('ข้อมูลต้องเป็นข้อความ ความยาวไม่เกิน 4,000 ตัวอักษรต่อช่อง');
      }
    }
    const topic = (dto.topic || '').trim();
    const incidentText = (dto.incident_text || dto.what_happened || '').trim();
    const whatHappened = (dto.what_happened || incidentText).trim();
    const rcaType = dto.rca_type === 'mini' ? 'mini' : 'standard';
    const analysisMode = dto.analysis_mode === 'basic' ? 'basic' : 'full';

    if (!incidentText && !topic) {
      throw new BadRequestException('กรุณาระบุเนื้อหาเหตุการณ์ที่ต้องการให้ AI วิเคราะห์');
    }

    let aiFallbackNotice = '';
    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (process.env.AI_ASSISTANT_ENABLED === 'true' && apiKey) {
      if (this.activeAiRequests >= 2) throw new ServiceUnavailableException('ตัวช่วยกำลังประมวลผล กรุณาลองใหม่ภายหลัง');
      this.activeAiRequests++;
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: String(process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
          generationConfig: { responseMimeType: 'application/json' },
        });
        const safeIncidentText = deidentifyIncidentText(incidentText || `${topic}\n${whatHappened}`);
        const requestedAnalysis = analysisMode === 'full'
          ? 'วิเคราะห์แบบเจาะลึก โดยเติม processAnalyses สำหรับ Standard Full RCA ให้ครบเท่าที่มีหลักฐานรองรับ'
          : 'วิเคราะห์พื้นฐาน โดยเน้นสรุปเหตุการณ์ ผลกระทบ Timeline, CMPs และ CAPA และให้ processAnalyses เป็น []';
        const requestedModel = rcaType === 'mini'
          ? 'เคสนี้เป็น Mini RCA ให้เติม swissCheeses และให้ processAnalyses เป็น []'
          : 'เคสนี้เป็น Standard Full RCA ให้เติม processAnalyses; swissCheeses ให้เป็น []';
        const prompt = `คุณคือผู้เชี่ยวชาญด้านความปลอดภัยทางคลินิก (Clinical Safety) และการวิเคราะห์สาเหตุรากฐาน (Root Cause Analysis - RCA)
จงวิเคราะห์เหตุการณ์ความเสี่ยงต่อไปนี้ และสกัดข้อมูลออกมาในรูปแบบ JSON เท่านั้น โดยไม่ต้องมีคำบรรยายอื่นใด

ข้อกำหนดสำคัญในการวิเคราะห์:

1. ใช้โทนภาษาที่เป็น "วิชาการ" แต่ต้อง "เชิงบวกและเข้าใจผู้ปฏิบัติงาน (Save ใจคนทำงาน)" หลีกเลี่ยงการใช้คำที่จับผิดหรือกล่าวโทษตัวบุคคล
2. ในส่วนของสมมติฐาน (hypothesis) ให้มองในมุมมองเชิงระบบ (System Approach) และต้องมีข้อสันนิษฐานที่เอื้อต่อความเข้าใจในบริบทความยากลำบากของคนทำงานในขณะนั้นแทรกอยู่ด้วยเสมอ (เช่น ภาระงานที่มากเกินไป, ระบบที่ไม่เอื้ออำนวย, หรือข้อจำกัดหน้างาน)
3. แยกข้อเท็จจริงออกจากสมมติฐานอย่างชัดเจน ห้ามแต่งชื่อบุคคล เวลา ผลตรวจ การวินิจฉัย หรือผลกระทบที่ไม่มีในเนื้อหา หากข้อมูลไม่พอให้ใช้ข้อความสั้น ๆ ว่า "ยังไม่มีข้อมูลเพียงพอ"
4. ${requestedAnalysis}
5. ${requestedModel}

โครงสร้าง JSON ที่ต้องการ:
{
  "topic": "สรุปชื่อเรื่อง/หัวข้อปัญหาหลักให้สั้นกระชับและชัดเจน",
  "severity": "clinical หรือ general",
  "whatHappened": "สรุปเหตุการณ์ที่เกิดขึ้นสั้น ๆ ให้ได้ใจความ (ใคร ทำอะไร ที่ไหน เมื่อไหร่ อย่างไร)",
  "actualImpact": "ผลกระทบที่เกิดขึ้นจริงกับผู้ป่วยหรือระบบ",
  "potentialImpact": "ผลกระทบที่อาจเกิดขึ้นได้หากไม่ได้รับการแก้ไขหรือรุนแรงกว่านี้",
  "timelines": [
    { "eventTime": "เวลาหรือช่วงเวลาจากข้อเท็จจริง", "description": "เหตุการณ์", "isCriticalPoint": false }
  ],
  "cmps": [
    { "observation": "สิ่งที่สังเกตพบที่เป็นปัญหา", "hypothesis": "สมมติฐานเชิงระบบและบริบทหน้างาน", "comment": "ข้อคิดเห็นหรือการแก้ไขเฉพาะหน้า" }
  ],
  "processAnalyses": [
    { "processKey": "ชื่อกระบวนการดูแล", "problem": "CMP ของกระบวนการ", "tier1Personnel": "บุคคล/ผู้ป่วย", "tier2Teamwork": "งานและทีม", "tier3Environment": "สิ่งแวดล้อม/เครื่องมือ", "tier4Policy": "การบริหาร/องค์กร", "tier5External": "ปัจจัยภายนอก", "correctiveAction": "เป้าหมายหรือการออกแบบระบบใหม่" }
  ],
  "swissCheeses": [
    { "layer": "org หรือ supervision หรือ precondition หรือ act เท่านั้น", "hole": "ช่องโหว่เชิงระบบ" }
  ],
  "capas": [
    { "action": "มาตรการ", "type": "immediate หรือ preventive หรือ systemic", "responsible": "หน่วยงาน/บทบาทผู้รับผิดชอบ", "dueDate": "YYYY-MM-DD หรือค่าว่าง", "status": "pending" }
  ]
}

วิเคราะห์และสกัดให้ครอบคลุมเหตุการณ์มากที่สุด โดย cmps และ capas สามารถมีได้หลายข้อตามจำนวนปัญหาและมาตรการที่พบในเหตุการณ์
ห้ามใส่ markdown code fence และห้ามมีข้อความใดนอก JSON

เนื้อหาเหตุการณ์:
--- เริ่มเนื้อหา ---
${safeIncidentText}
--- จบเนื้อหา ---`;

        const result = await model.generateContent(prompt, { timeout: 45000 });
        const rawText = result.response.text().trim();
        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        const timelines = Array.isArray(parsed?.timelines)
          ? parsed.timelines.map((item: any) => ({
              event_time: String(item?.eventTime || item?.event_time || '').trim(),
              event_description: String(item?.description || item?.eventDescription || item?.event_description || '').trim(),
              is_critical_point: (item?.isCriticalPoint ?? item?.is_critical_point) === true,
            })).filter((item: any) => item.event_time || item.event_description)
          : [];
        const cmps = Array.isArray(parsed?.cmps)
          ? parsed.cmps.map((item: any) => ({
              observation: String(item?.observation || '').trim(),
              hypothesis: String(item?.hypothesis || '').trim(),
              comment: String(item?.comment || '').trim(),
            })).filter((item: any) => item.observation || item.hypothesis || item.comment)
          : [];
        const processAnalysesRaw = parsed?.processAnalyses || parsed?.process_analyses;
        const process_analyses = analysisMode === 'full' && rcaType === 'standard' && Array.isArray(processAnalysesRaw)
          ? processAnalysesRaw.map((item: any) => ({
              process_key: String(item?.processKey || item?.process_key || '').trim(),
              problem: String(item?.problem || '').trim(),
              tier1_personnel: String(item?.tier1Personnel || item?.tier1_personnel || '').trim(),
              tier2_teamwork: String(item?.tier2Teamwork || item?.tier2_teamwork || '').trim(),
              tier3_environment: String(item?.tier3Environment || item?.tier3_environment || '').trim(),
              tier4_policy: String(item?.tier4Policy || item?.tier4_policy || '').trim(),
              tier5_external: String(item?.tier5External || item?.tier5_external || '').trim(),
              corrective_action: String(item?.correctiveAction || item?.corrective_action || '').trim(),
            })).filter((item: any) => item.process_key || item.problem)
          : [];
        const swissCheesesRaw = parsed?.swissCheeses || parsed?.swiss_cheeses;
        const swiss_cheeses = rcaType === 'mini' && Array.isArray(swissCheesesRaw)
          ? swissCheesesRaw.map((item: any) => ({
              layer: String(item?.layer || '').trim(),
              hole: String(item?.hole || '').trim(),
            })).map((item: any) => ({ ...item, layer: normalizeAiSwissLayer(item.layer) })).filter((item: any) => item.layer && item.hole)
          : [];
        const capas = Array.isArray(parsed?.capas)
          ? parsed.capas.map((item: any) => ({
              action: String(item?.action || '').trim(),
              type: ['immediate', 'preventive', 'systemic'].includes(String(item?.type)) ? String(item.type) : 'preventive',
              responsible: String(item?.responsible || '').trim(),
              due_date: String(item?.dueDate || item?.due_date || '').trim(),
              status: String(item?.status || 'pending').trim(),
            })).filter((item: any) => item.action)
          : [];

        return {
          topic_refined: String(parsed?.topic || parsed?.topic_refined || topic).trim(),
          risk_classification: String(parsed?.severity || '').trim(),
          what_happened_summary: String(parsed?.whatHappened || parsed?.what_happened_summary || '').trim(),
          actual_impact_summary: String(parsed?.actualImpact || parsed?.actual_impact_summary || '').trim(),
          potential_impact_summary: String(parsed?.potentialImpact || parsed?.potential_impact_summary || '').trim(),
          contributing_factors: [],
          fishbones: [],
          whys: [],
          timelines,
          cmps,
          process_analyses,
          swiss_cheeses,
          capas,
          analysis_source: 'gemini',
          analysis_mode: analysisMode,
        };
      } catch (error) {
        void error; // Do not log provider errors containing clinical prompts or credentials.
        aiFallbackNotice = 'การเชื่อมต่อ AI ภายนอกไม่สำเร็จ ระบบหยุดการวิเคราะห์';
      } finally { this.activeAiRequests--; }
    } else {
      aiFallbackNotice = 'ขณะนี้โรงพยาบาลยังไม่ได้เปิดการประมวลผล AI ภายนอก ระบบหยุดการวิเคราะห์';
    }

    throw new BadRequestException(aiFallbackNotice + ' ไม่มีการสร้างข้อมูลทดแทน กรุณากรอกจากข้อเท็จจริง หรือใช้ตัวช่วย Timeline ภายในเครื่อง');
  }
}
