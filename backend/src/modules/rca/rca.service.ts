import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  // ================= 1. Criteria Evaluation with 9 Standards =================
  async evaluateCriteria(dto: EvaluateCriteriaDto) {
    const matchedCriteria: string[] = [];
    let rcaRequired = false;
    let recommendedMode: 'mini' | 'concise' | 'standard' = 'mini';

    const level = (dto.level_id || '').toUpperCase();
    const isHighLevel = ['G', 'H', 'I', '4', '5'].includes(level);
    const isModerateLevel = ['C', 'D', 'E', 'F', '2', '3'].includes(level);

    // 1. Check Nine Standards
    if (dto.riskstore_id) {
      const nineStandards = await this.prisma.nine_standards.findMany();
      const matchedStd = nineStandards.find((std) => {
        if (!std.risk_codes) return false;
        const codes = std.risk_codes.split(',').map((c) => c.trim());
        return codes.includes(String(dto.riskstore_id));
      });

      if (matchedStd && (isModerateLevel || isHighLevel)) {
        matchedCriteria.push(`เกณฑ์ข้อ 1: มาตรฐานสำคัญจำเป็น 9 ด้าน (ข้อ ${matchedStd.std_number}: ${matchedStd.std_name}) ระดับ ${level}`);
        rcaRequired = true;
      }
    }

    // 2. High Severity G-H-I
    if (isHighLevel) {
      matchedCriteria.push(`เกณฑ์ข้อ 2: ความรุนแรงระดับสูง (${level}) ส่งผลต่อชีวิตหรือทุพพลภาพ`);
      rcaRequired = true;
      recommendedMode = 'standard';
    }

    // 3. Trigger Tool Finding or Sec 41 Complaint
    if (dto.source_trigger || dto.is_sec41) {
      matchedCriteria.push(`เกณฑ์ข้อ 3: ตรวจพบจาก Trigger Tool หรือเป็นข้อร้องเรียน ม.41 สปสช.`);
      rcaRequired = true;
      recommendedMode = 'standard';
    }

    // 4. Sentinel / Near Miss with High Potential Harm
    if (dto.is_potential_harm) {
      matchedCriteria.push(`เกณฑ์ข้อ 6: Near Miss ที่อาจก่อให้เกิดอันตรายรุนแรง (High Potential Harm)`);
      rcaRequired = true;
    }

    if (matchedCriteria.length > 0 && recommendedMode !== 'standard') {
      recommendedMode = 'mini';
    }

    return {
      rca_required: rcaRequired,
      matched_criteria: matchedCriteria,
      recommended_mode: recommendedMode,
    };
  }

  // ================= 2. Mini & Concise RCA =================
  async getMiniConciseList(type?: 'mini' | 'concise') {
    const where = type ? { rca_type: type } : {};
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

  async getMiniConciseById(id: string) {
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
    return rcaCase;
  }

  async createMiniConcise(data: CreateRcaCaseDto) {
    const caseId = data.id || `RCA-${data.rca_type.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    
    const created = await this.prisma.rca_case.create({
      data: {
        id: caseId,
        topic: data.topic,
        rca_type: data.rca_type,
        review_date: new Date(data.review_date),
        incident_date: data.incident_date ? new Date(data.incident_date) : null,
        incident_detail: data.incident_detail,
        created_by: data.created_by,
        incidents: data.incidents?.length
          ? {
              create: data.incidents.map((inc) => ({
                incident_id: inc.incident_id,
                incident_id_risk: inc.incident_id_risk || 0,
                risk_name: inc.risk_name,
                report_date: inc.report_date ? new Date(inc.report_date) : null,
                severity_level: inc.severity_level,
                department_id: inc.department_id,
                detail: inc.detail,
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

    // Update RCA status on linked incidents
    if (data.incidents?.length) {
      for (const inc of data.incidents) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE riskregister SET rca_status = ?, rca_case_id = ? WHERE id = ?`,
          'COMPLETED',
          caseId,
          inc.incident_id,
        );
      }
    }

    return created;
  }

  async updateMiniConcise(id: string, data: Partial<CreateRcaCaseDto>) {
    await this.getMiniConciseById(id);

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

    return this.prisma.rca_case.update({
      where: { id },
      data: {
        topic: data.topic,
        review_date: data.review_date ? new Date(data.review_date) : undefined,
        incident_date: data.incident_date ? new Date(data.incident_date) : undefined,
        incident_detail: data.incident_detail,
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
  }

  async deleteMiniConcise(id: string) {
    await this.getMiniConciseById(id);
    return this.prisma.rca_case.delete({
      where: { id },
    });
  }

  // ================= 3. Standard Full RCA =================
  async getStandardList() {
    return this.prisma.standard_rca_case.findMany({
      include: {
        timelines: { orderBy: { sort_order: 'asc' } },
        whys: { orderBy: { level: 'asc' } },
        fishbones: { orderBy: { sort_order: 'asc' } },
        process_analyses: { orderBy: { sort_order: 'asc' } },
        capas: { orderBy: { sort_order: 'asc' } },
        review_sessions: { orderBy: { sort_order: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStandardById(id: string) {
    const stdCase = await this.prisma.standard_rca_case.findUnique({
      where: { id },
      include: {
        timelines: { orderBy: { sort_order: 'asc' } },
        whys: { orderBy: { level: 'asc' } },
        fishbones: { orderBy: { sort_order: 'asc' } },
        process_analyses: { orderBy: { sort_order: 'asc' } },
        capas: { orderBy: { sort_order: 'asc' } },
        review_sessions: { orderBy: { sort_order: 'asc' } },
      },
    });
    if (!stdCase) throw new NotFoundException(`Standard RCA Case #${id} not found`);

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

  async createStandard(data: CreateStandardRcaDto) {
    const caseId = data.id || `RCA-FULL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const created = await this.prisma.standard_rca_case.create({
      data: {
        id: caseId,
        rm_no: data.rm_no,
        incident_id: data.incident_id,
        incident_id_risk: data.incident_id_risk,
        source_trigger_review_id: data.source_trigger_review_id,
        topic: data.topic,
        incident_date: data.incident_date ? new Date(data.incident_date) : null,
        rca_team: data.rca_team,
        severity: data.severity,
        is_not_risk: data.is_not_risk ?? false,
        what_happened: data.what_happened,
        actual_impact: data.actual_impact,
        potential_impact: data.potential_impact,
        info_interview: data.info_interview ?? false,
        info_cctv: data.info_cctv ?? false,
        info_document: data.info_document ?? false,
        info_inspection: data.info_inspection ?? false,
        status: data.status || 'pending',
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
        whys: true,
        fishbones: true,
        process_analyses: true,
        capas: true,
        review_sessions: true,
      },
    });

    if (data.incident_id) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE riskregister SET rca_status = ?, rca_case_id = ? WHERE id = ?`,
        'COMPLETED',
        caseId,
        data.incident_id,
      );
    }

    return created;
  }

  async updateStandard(id: string, data: Partial<CreateStandardRcaDto>) {
    await this.getStandardById(id);

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
    if (data.process_analyses) {
      await this.prisma.standard_rca_process_analysis.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.capas) {
      await this.prisma.standard_rca_capa.deleteMany({ where: { standard_rca_case_id: id } });
    }
    if (data.review_sessions) {
      await this.prisma.standard_rca_review_session.deleteMany({ where: { standard_rca_case_id: id } });
    }

    return this.prisma.standard_rca_case.update({
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
        info_interview: data.info_interview,
        info_cctv: data.info_cctv,
        info_document: data.info_document,
        info_inspection: data.info_inspection,
        status: data.status,
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
        whys: true,
        fishbones: true,
        process_analyses: true,
        capas: true,
        review_sessions: true,
      },
    });
  }

  async deleteStandard(id: string) {
    await this.getStandardById(id);
    return this.prisma.standard_rca_case.delete({
      where: { id },
    });
  }

  // ================= 4. Unified RCA Dashboard / Stats =================
  async getOverviewStats() {
    const [miniCases, conciseCases, standardCases, incidentReviews] = await Promise.all([
      this.prisma.rca_case.count({ where: { rca_type: 'mini' } }),
      this.prisma.rca_case.count({ where: { rca_type: 'concise' } }),
      this.prisma.standard_rca_case.count(),
      this.prisma.riskreview.count({ where: { cause_problem: { not: null } } }),
    ]);

    const capas = await this.prisma.standard_rca_capa.findMany();
    const cmpActions = await this.prisma.rca_cmp.findMany();

    const pendingCapas = capas.filter((c) => c.status === 'pending').length + cmpActions.filter((c) => c.status === 'pending').length;
    const completedCapas = capas.filter((c) => c.status === 'completed').length + cmpActions.filter((c) => c.status === 'completed').length;

    return {
      total_rca: miniCases + conciseCases + standardCases + incidentReviews,
      mini_count: miniCases,
      concise_count: conciseCases,
      standard_count: standardCases,
      review_count: incidentReviews,
      pending_capas: pendingCapas,
      completed_capas: completedCapas,
    };
  }

  async getIncidentReviews() {
    const reviews = await this.prisma.riskreview.findMany({
      where: {
        cause_problem: { not: null },
      },
      orderBy: { review_date: 'desc' },
      take: 100,
    });

    const riskIds = reviews.map((r) => r.risk_id).filter((id): id is number => Boolean(id));
    const risks = await this.prisma.risk.findMany({
      where: { id: { in: riskIds } },
      select: { id: true, detail: true, level_id: true, department_id: true },
    });
    const riskMap = new Map(risks.map((r) => [r.id, r]));

    return reviews.map((r) => ({
      id: r.id,
      risk_id: r.risk_id,
      review_date: r.review_date,
      cause_problem: r.cause_problem,
      notereview: r.notereview,
      risk_name: r.risk_id ? riskMap.get(r.risk_id)?.detail || `อุบัติการณ์ #${r.risk_id}` : 'อุบัติการณ์ทั่วไป',
      severity_level: r.risk_id ? riskMap.get(r.risk_id)?.level_id || '-' : '-',
      department_id: r.risk_id ? riskMap.get(r.risk_id)?.department_id || '-' : '-',
    }));
  }

  // ================= 5. Get RCA Cases By Incident ID =================
  async getByIncident(incidentId: number) {
    const standardCases = await this.prisma.standard_rca_case.findMany({
      where: { incident_id: incidentId },
      include: {
        timelines: true,
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

    // Dynamic 6M Factors
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
        { category: 'man', factor: 'บุคลากรมีความเหนื่อยล้าจากเวรดึกและภาระงานหนาแน่น', sub_factor: 'ขาดการ Double-check ตามขั้นตอนมาตรฐาน' },
        { category: 'method', factor: 'กระบวนการส่งต่อคำสั่งแพทย์และคัดกรองใบสั่งยายังไม่มีระบบแจ้งเตือนอัตโนมัติ', sub_factor: 'ขาด Check-list สำหรับยา High Alert Drug (HAD)' },
        { category: 'machine', factor: 'ระบบคอมพิวเตอร์และโปรแกรมสั่งยาไม่มีระบบ Block ป้องกันขนาดยาเกินขนาด', sub_factor: 'จอภาพห้องยาแสดงผลอักษรเล็ก' },
        { category: 'material', factor: 'รูปลักษณ์ซองยาและฉลากยาที่มีชื่อคล้ายกัน (LASA) จัดวางใกล้กัน', sub_factor: 'สติกเกอร์เตือนยา HAD สีซีดจาง' },
        { category: 'measurement', factor: 'การประเมินและการส่งตรวจทางห้องปฏิบัติการก่อนปรับขนาดยาล่าช้า', sub_factor: 'ขาดเกณฑ์การติดตามผลข้างเคียงเฉพาะราย' },
        { category: 'environment', factor: 'ห้องจ่ายยาและเคาน์เตอร์พยาบาลมีเสียงรบกวนและแสงสว่างไม่เพียงพอ', sub_factor: 'มีการขัดจังหวะขณะเตรียมยาฉีด' },
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
        { category: 'man', factor: 'ผู้ป่วยมีภาวะสับสน/กล้ามเนื้ออ่อนแรง และญาติไม่อยู่ดูแลชั่วคราว', sub_factor: 'เจ้าหน้าที่ประเมินความเสี่ยง Fall Risk ซ้ำไม่ทันเวลา' },
        { category: 'method', factor: 'การสื่อสารส่งต่อระดับความเสี่ยงการพลัดตกหกล้มไม่เด่นชัด', sub_factor: 'ขาดป้ายเตือนสีเหลือง/สัญลักษณ์ High Fall Risk หัวเตียง' },
        { category: 'machine', factor: 'เตียงผู้ป่วยไม่ได้ปรับระดับลงต่ำสุดและระบบล็อกล้อเตียงฝืด', sub_factor: 'กริ่งเรียกพยาบาล (Call bell) อยู่ไกลมือผู้ป่วย' },
        { category: 'material', factor: 'รองเท้าผู้ป่วยไม่มีแผ่นกันลื่น', sub_factor: 'ไม้เท้า/อุปกรณ์ช่วยพยุงไม่พอดีกับสรีระ' },
        { category: 'measurement', factor: 'แบบประเมิน Morse Fall Scale ทำเพียงแรกรับ ไม่ได้ประเมินซ้ำหลังได้ยานอนหลับ', sub_factor: 'ขาดการตรวจติดตามหลังให้ยา Sedation' },
        { category: 'environment', factor: 'พื้นห้องน้ำเปียกน้ำ แสงสว่างทางเดินช่วงกลางคืนสลัว', sub_factor: 'ไม่มีราวจับข้างเตียงตลอดแนว' },
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
        { category: 'man', factor: 'บุคลากรขาดความชำนาญในการประเมินสัญญาณเตือนวิกฤต (Early Warning Signs: MEWS/SOS Score)', sub_factor: 'ไม่ได้ตระหนักถึงความรุนแรงของอาการเปลี่ยนแปลงแบบค่อยเป็นค่อยไป' },
        { category: 'method', factor: 'กระบวนการส่งต่อข้อมูลและการสื่อสาร SBAR ไม่ชัดเจน ขาดการยืนยันแผนการรักษา (Read back)', sub_factor: 'ไม่มี Clinical Pathway ชัดเจนสำหรับภาวะแทรกซ้อนฉุกเฉิน' },
        { category: 'machine', factor: 'อุปกรณ์ตรวจวัดสัญญาณชีพอัตโนมัติส่งข้อมูลเข้าสู่ระบบช้า ขาดระบบ Real-time telemetry', sub_factor: 'ระบบเครือข่ายสัญญาณโทรศัพท์ติดต่อแพทย์เวรติดขัด' },
        { category: 'material', factor: 'แบบฟอร์มบันทึกและเวชระเบียนไม่ได้เน้นช่อง Alert สัญญาณชีพวิกฤต', sub_factor: 'เอกสารผลตรวจทางห้องปฏิบัติการรายงานผลวิกฤต (Critical Value) ล่าช้า' },
        { category: 'measurement', factor: 'การวัดสัญญาณชีพไม่ถี่ตามเกณฑ์มาตรฐานเมื่อผู้ป่วยมีอาการทรุดลง', sub_factor: 'ขาดการคำนวณคะแนนเตือนภัยวิกฤตทุก 4 ชั่วโมง' },
        { category: 'environment', factor: 'หน่วยงานมีผู้ป่วยวิกฤตพร้อมกันหลายราย ทำให้การจัดสรรบุคลากรดูแลไม่สมดุล', sub_factor: 'พื้นที่คัดกรองมีความแออัด' },
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

