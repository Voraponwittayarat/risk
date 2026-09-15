import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { maxWithNrlsCutover, NRLS_CUTOVER_DATE, NRLS_CUTOVER_DATE_THAI } from '../incidents/nrls-cutover-policy';
import { clampMatrixValue, riskLevelFor, RiskLevel } from '../../common/risk-matrix-policy';

export class CreateRiskAnalysisDto {
  risk_code: string;
  nrls_code: string;
  risk_title: string;
  risk_description?: string;
  source?: string;
  scope_level?: 'hospital' | 'group' | 'department';
  scope_identifier?: string;
  department_id: string;
  program_id?: number;
  category_name?: string;
  safety_goal?: string;
  essential_std?: string;
  risk_owner_name?: string;
  is_never_event?: number;
  initial_likelihood: number;
  initial_consequence: number;
  risk_prevention?: string;
  risk_transfer?: string;
  risk_monitor?: string;
  risk_mitigation?: string;
  qi_plan?: string;
  review_frequency_months?: number;
  status?: 'open' | 'monitoring' | 'closed';
}

export class UpdateRiskAnalysisDto {
  risk_code?: string;
  nrls_code?: string;
  risk_title?: string;
  risk_description?: string;
  source?: string;
  scope_level?: 'hospital' | 'group' | 'department';
  scope_identifier?: string;
  department_id?: string;
  program_id?: number;
  category_name?: string;
  safety_goal?: string;
  essential_std?: string;
  risk_owner_name?: string;
  is_never_event?: number;
  initial_likelihood?: number;
  initial_consequence?: number;
  risk_prevention?: string;
  risk_transfer?: string;
  risk_monitor?: string;
  risk_mitigation?: string;
  qi_plan?: string;
  review_frequency_months?: number;
  status?: 'open' | 'monitoring' | 'closed';
  last_reviewed_date?: string;
  next_review_date?: string;
  residual_risk_level?: string;
}

export class CreateRiskReviewDto {
  review_date: string;
  period_start?: string;
  period_end?: string;
  result_of_review: string;
  incident_count_in_period?: number;
  current_likelihood: number;
  current_consequence: number;
  updated_prevention?: string;
  is_escalated?: number;
  escalation_target?: string;
  reviewed_by?: string;
}

@Injectable()
export class RiskAnalysisService {
  constructor(private prisma: PrismaService) {}

  private calculateRiskLevel(likelihood: number, consequence: number): RiskLevel {
    return riskLevelFor(likelihood, consequence);
  }

  private async scopeDepartments(user: any): Promise<string[] | null> {
    if (user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital')) return null;
    if (['rm_committee', 'head'].includes(user?.role) && user?.rmScope === 'group') {
      if (!user?.departmentGroup) return [];
      const rows = await this.prisma.department.findMany({ where: { depart_group_id: Number(user?.departmentGroup) }, select: { id: true } });
      return rows.map((r) => String(r.id));
    }
    return [user?.departmentId, user?.departmentId2].filter(Boolean).map(String);
  }

  private async assertProfileScope(profile: any, user: any) {
    const allowed = await this.scopeDepartments(user);
    if (allowed && profile.scope_level !== 'hospital' && !allowed.includes(String(profile.department_id))) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง Risk Profile นอกขอบเขต');
    }
  }

  async findAll(query: {
    scope_level?: string;
    department_id?: string;
    program_id?: number;
    status?: string;
    risk_level?: string;
    search?: string;
    due_soon?: boolean;
  }, user?: any) {
    const where: any = {};
    const allowed = await this.scopeDepartments(user);
    if (allowed) where.department_id = { in: allowed };

    if (query.scope_level && query.scope_level !== 'all') {
      where.scope_level = query.scope_level;
    }

    if (query.department_id && query.department_id !== 'all') {
      if (allowed && !allowed.includes(String(query.department_id))) throw new ForbiddenException('ไม่มีสิทธิ์ดูหน่วยงานนี้');
      where.department_id = query.department_id;
    }

    if (query.program_id) {
      where.program_id = Number(query.program_id);
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.risk_level && query.risk_level !== 'all') {
      where.initial_risk_level = query.risk_level;
    }

    if (query.search) {
      where.OR = [
        { risk_code: { contains: query.search } },
        { risk_title: { contains: query.search } },
        { risk_owner_name: { contains: query.search } },
        { safety_goal: { contains: query.search } },
        { essential_std: { contains: query.search } },
      ];
    }

    if (query.due_soon) {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      where.next_review_date = {
        lte: nextMonth,
      };
      where.status = { not: 'closed' };
    }

    const items = await this.prisma.riskanalysis.findMany({
      where,
      include: {
        reviews: {
          orderBy: { review_date: 'desc' },
        },
      },
      orderBy: [
        { is_never_event: 'desc' },
        { initial_risk_score: 'desc' },
        { id: 'asc' },
      ],
    });

    // Also enrich with live department names
    const departments = await this.prisma.department.findMany();
    const deptMap = new Map(departments.map((d) => [String(d.id), d.depart_name]));

    return items.map((item) => ({
      ...item,
      department_name: deptMap.get(item.department_id) || `แผนกที่ ${item.department_id}`,
      latest_review: item.reviews[0] || null,
    }));
  }

  async findOne(id: number, user?: any) {
    const risk = await this.prisma.riskanalysis.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { review_date: 'desc' },
        },
      },
    });

    if (!risk) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }
    await this.assertProfileScope(risk, user);

    const department = await this.prisma.department.findUnique({
      where: { id: Number(risk.department_id) || 1 },
    });

    let linkedIncidents: any[] = [];
    if (risk.nrls_code) {
      const scopeWhere = risk.scope_level === 'department' ? { department_id: risk.department_id } : {};
      linkedIncidents = await this.prisma.riskregister.findMany({
        where: { nrls_code: risk.nrls_code, ...scopeWhere },
        take: 10,
        orderBy: { date_report: 'desc' },
        select: {
          id: true,
          date_report: true,
          detail: true,
          level_id: true,
          status_risk: true,
          department_id: true,
        },
      });
    }

    return {
      ...risk,
      department_name: department?.depart_name || `แผนกที่ ${risk.department_id}`,
      linked_incidents: linkedIncidents,
      incident_count: linkedIncidents.length,
    };
  }

  async getStats(query: { scope_level?: string; department_id?: string; due_soon?: boolean }, user?: any) {
    const where: any = {};
    if (query.scope_level && query.scope_level !== 'all') {
      where.scope_level = query.scope_level;
    }
    if (query.department_id && query.department_id !== 'all') {
      where.department_id = query.department_id;
    }

    const allowed = await this.scopeDepartments(user);
    if (allowed) {
      if (query.department_id && query.department_id !== 'all' && !allowed.includes(query.department_id)) throw new ForbiddenException('ไม่มีสิทธิ์ดูหน่วยงานนี้');
      if (!query.department_id || query.department_id === 'all') where.department_id = { in: allowed };
    }
    if (query.due_soon) {
      const until = new Date();
      until.setDate(until.getDate() + 30);
      where.next_review_date = { lte: until };
      where.status = { not: 'closed' };
    }
    const allRisks = await this.prisma.riskanalysis.findMany({ where });

    const total = allRisks.length;
    const extremeCount = allRisks.filter((r) => r.initial_risk_level === 'red').length;
    const highCount = allRisks.filter((r) => r.initial_risk_level === 'orange').length;
    const mediumCount = allRisks.filter((r) => r.initial_risk_level === 'yellow').length;
    const lowCount = allRisks.filter((r) => r.initial_risk_level === 'green').length;
    const neverEventCount = allRisks.filter((r) => r.is_never_event === 1).length;

    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    const dueSoonCount = allRisks.filter(
      (r) => r.status !== 'closed' && r.next_review_date && new Date(r.next_review_date) <= nextMonth,
    ).length;

    const hospitalScopeCount = allRisks.filter((r) => r.scope_level === 'hospital').length;
    const departmentScopeCount = allRisks.filter((r) => r.scope_level === 'department').length;

    // 5x5 Matrix count mapping
    const matrixGrid: { [key: string]: number } = {};
    for (let l = 1; l <= 5; l++) {
      for (let c = 1; c <= 5; c++) {
        matrixGrid[`${l}-${c}`] = 0;
      }
    }
    allRisks.forEach((r) => {
      const key = `${r.initial_likelihood}-${r.initial_consequence}`;
      if (matrixGrid[key] !== undefined) {
        matrixGrid[key]++;
      }
    });

    return {
      total,
      extremeCount,
      highCount,
      mediumCount,
      lowCount,
      neverEventCount,
      dueSoonCount,
      hospitalScopeCount,
      departmentScopeCount,
      matrixGrid,
    };
  }

  async create(dto: CreateRiskAnalysisDto, user?: any) {
    if (!dto.nrls_code) throw new BadRequestException('Risk Profile ใหม่ต้องระบุ nrls_code');
    if (dto.scope_level === 'hospital' && !['admin', 'rm_committee'].includes(user?.role)) {
      throw new ForbiddenException('Risk Profile ระดับโรงพยาบาลสร้างได้เฉพาะ RM/Admin');
    }
    const nrls = await this.prisma.nRLS_riskstore.findUnique({ where: { nrls_code: dto.nrls_code } });
    if (!nrls) throw new BadRequestException('ไม่พบ nrls_code ใน master');
    await this.assertProfileScope({ scope_level: dto.scope_level || 'department', department_id: String(dto.department_id || '1') }, user);
    const l = clampMatrixValue(dto.initial_likelihood);
    const c = clampMatrixValue(dto.initial_consequence);
    const score = l * c;
    const level = this.calculateRiskLevel(l, c);

    const freq = Number(dto.review_frequency_months) || 3;
    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + freq);

    return this.prisma.riskanalysis.create({
      data: {
        risk_code: dto.risk_code || dto.nrls_code,
        nrls_code: dto.nrls_code,
        nrls_name_snapshot: nrls.name,
        risk_title: nrls.name,
        risk_description: dto.risk_description || '',
        source: dto.source || 'มาตรฐานสำคัญ 9 ด้าน',
        scope_level: dto.scope_level || 'department',
        department_id: String(dto.department_id || '1'),
        scope_identifier: dto.scope_identifier || (dto.scope_level === 'hospital' ? 'HOSPITAL' : String(dto.department_id || '1')),
        program_id: nrls.program_id,
        category_name: dto.category_name || 'Clinical Risk (ทางคลินิก)',
        safety_goal: dto.safety_goal || '',
        essential_std: dto.essential_std || '',
        risk_owner_name: dto.risk_owner_name || '',
        is_never_event: dto.is_never_event ? 1 : 0,
        initial_likelihood: l,
        initial_consequence: c,
        initial_risk_score: score,
        initial_risk_level: level,
        risk_prevention: dto.risk_prevention || '',
        risk_transfer: dto.risk_transfer || '',
        risk_monitor: dto.risk_monitor || '',
        risk_mitigation: dto.risk_mitigation || '',
        qi_plan: dto.qi_plan || '',
        review_frequency_months: freq,
        next_review_date: nextReview,
        residual_risk_level: level,
        status: dto.status || 'open',
        created_by: Number(user?.id) || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async update(id: number, dto: UpdateRiskAnalysisDto, user?: any) {
    const existing = await this.prisma.riskanalysis.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }
    await this.assertProfileScope(existing, user);

    const l = clampMatrixValue(dto.initial_likelihood !== undefined ? dto.initial_likelihood : existing.initial_likelihood);
    const c = clampMatrixValue(dto.initial_consequence !== undefined ? dto.initial_consequence : existing.initial_consequence);
    const score = l * c;
    const level = this.calculateRiskLevel(l, c);

    const allowedFields = ['risk_description','source','scope_level','department_id','scope_identifier','category_name','safety_goal','essential_std','risk_owner_name','is_never_event','risk_prevention','risk_transfer','risk_monitor','risk_mitigation','qi_plan','review_frequency_months','status','residual_risk_level'];
    const updateData: any = {
      initial_likelihood: l,
      initial_consequence: c,
      initial_risk_score: score,
      initial_risk_level: level,
      updated_at: new Date(),
    };
    for (const field of allowedFields) if ((dto as any)[field] !== undefined) updateData[field] = (dto as any)[field];
    if (dto.nrls_code && dto.nrls_code !== existing.nrls_code) {
      const nrls = await this.prisma.nRLS_riskstore.findUnique({ where: { nrls_code: dto.nrls_code } });
      if (!nrls) throw new BadRequestException('ไม่พบ nrls_code ใน master');
      updateData.nrls_code = nrls.nrls_code; updateData.nrls_name_snapshot = nrls.name;
      updateData.risk_code = nrls.nrls_code; updateData.risk_title = nrls.name; updateData.program_id = nrls.program_id;
    }

    if (dto.next_review_date) {
      updateData.next_review_date = new Date(dto.next_review_date);
    }
    if (dto.last_reviewed_date) {
      updateData.last_reviewed_date = new Date(dto.last_reviewed_date);
    }

    return this.prisma.riskanalysis.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number, user?: any) {
    const existing = await this.prisma.riskanalysis.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }
    await this.assertProfileScope(existing, user);
    if (user?.role !== 'admin') throw new ForbiddenException('เฉพาะ Admin เท่านั้นที่ลบ Risk Profile ได้');
    return this.prisma.riskanalysis.delete({ where: { id } });
  }

  async addReview(id: number, dto: CreateRiskReviewDto, user?: any) {
    const risk = await this.prisma.riskanalysis.findUnique({
      where: { id },
      include: { reviews: true },
    });

    if (!risk) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }
    await this.assertProfileScope(risk, user);
    if (!risk.nrls_code) throw new BadRequestException('Legacy profile ยังไม่มี NRLS; ต้องจัดประเภทก่อนนับเหตุการณ์');

    const curL = clampMatrixValue(dto.current_likelihood);
    const curC = clampMatrixValue(dto.current_consequence);
    const curScore = curL * curC;
    const curLevel = this.calculateRiskLevel(curL, curC);

    const reviewDate = new Date(dto.review_date);
    const requestedPeriodStart = dto.period_start ? new Date(dto.period_start) : (risk.last_reviewed_date || new Date(reviewDate.getFullYear(), reviewDate.getMonth() - 3, reviewDate.getDate()));
    const periodStart = maxWithNrlsCutover(requestedPeriodStart);
    const periodEnd = dto.period_end ? new Date(dto.period_end) : reviewDate;
    if (periodStart > periodEnd) throw new BadRequestException(`Monitoring NRLS เริ่ม ${NRLS_CUTOVER_DATE_THAI}; period_end ต้องไม่ก่อนวันนี้`);
    const scopeWhere = risk.scope_level === 'department' ? { department_id: risk.department_id } : {};
    const incidents = await this.prisma.riskregister.findMany({
      where: { nrls_code: risk.nrls_code, date_report: { gte: periodStart, lte: periodEnd }, classification_status: 'CONFIRMED', ...scopeWhere },
      select: { id: true, level_id: true, rca_required: true, rca_status: true, date_report: true, department_id: true, repeat_code: true },
    });
    const capas = await this.prisma.capa_action.findMany({ where: { nrls_code: risk.nrls_code, risk_analysis_id: id } });
    const snapshot = {
      nrls_cutover_date: NRLS_CUTOVER_DATE,
      requested_period_start: requestedPeriodStart.toISOString(),
      effective_period_start: periodStart.toISOString(),
      total: incidents.length,
      by_severity: incidents.reduce((a: Record<string, number>, i) => ({ ...a, [i.level_id]: (a[i.level_id] || 0) + 1 }), {}),
      repeat_count: incidents.filter((i) => Boolean(i.repeat_code)).length,
      rca: incidents.reduce((a: Record<string, number>, i) => ({ ...a, [i.rca_status || 'NONE']: (a[i.rca_status || 'NONE'] || 0) + 1 }), {}),
      capa: capas.reduce((a: Record<string, number>, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {}),
      latest_incident_at: incidents.map((i) => i.date_report).sort((a, b) => b.getTime() - a.getTime())[0] || null,
    };
    const nextReview = new Date(reviewDate);
    nextReview.setMonth(nextReview.getMonth() + (risk.review_frequency_months || 3));

    // Create review cycle log
    const cycleNo = risk.reviews.length + 1;
    const review = await this.prisma.riskanalysis_review.create({
      data: {
        risk_analysis_id: id,
        review_date: reviewDate,
        review_cycle_no: cycleNo,
        result_of_review: dto.result_of_review,
        incident_count_in_period: incidents.length,
        period_start: periodStart,
        period_end: periodEnd,
        calculation_snapshot: JSON.stringify(snapshot),
        current_likelihood: curL,
        current_consequence: curC,
        current_risk_score: curScore,
        current_risk_level: curLevel,
        updated_prevention: dto.updated_prevention || '',
        is_escalated: dto.is_escalated ? 1 : 0,
        escalation_target: dto.escalation_target || '',
        reviewed_by: dto.reviewed_by || '',
        created_at: new Date(),
      },
    });

    // Update main risk profile
    await this.prisma.riskanalysis.update({
      where: { id },
      data: {
        last_reviewed_date: reviewDate,
        next_review_date: nextReview,
        residual_risk_level: curLevel,
        status: curLevel === 'green' ? 'monitoring' : 'open',
        updated_at: new Date(),
        period_start: periodStart,
        period_end: periodEnd,
        last_calculated_at: new Date(),
      },
    });

    return review;
  }

  async getNineStandards(query: { department_id?: string } = {}, user?: any) {
    const [standards, localRisks, profiles] = await Promise.all([
      this.prisma.nine_standards.findMany({ orderBy: { std_number: 'asc' } }),
      this.prisma.riskstore.findMany({ select: { riskstore_id: true, nrls_code: true } }),
      this.findAll({ department_id: query.department_id }, user),
    ]);
    const codeMap = new Map(localRisks.map(r => [String(r.riskstore_id), r.nrls_code]));
    const resolvedStandards = standards.map(standard => {
      // Accept legacy local risk IDs and canonical direct NRLS codes during the migration period.
      const codes = String(standard.risk_codes || '').split(',').map(v => v.trim()).filter(Boolean)
        .map(v => /^\d+$/.test(v) ? codeMap.get(v) : v).filter((v): v is string => !!v);
      return { standard, codes: [...new Set(codes)] };
    });
    const allCodes = [...new Set(resolvedStandards.flatMap(item => item.codes))];
    const catalogue = allCodes.length
      ? await this.prisma.nRLS_riskstore.findMany({
        where: { nrls_code: { in: allCodes } },
        select: { nrls_code: true, name: true },
      })
      : [];
    const nameMap = new Map(catalogue.map(item => [item.nrls_code, item.name]));

    return resolvedStandards.map(({ standard, codes }) => {
      const matched = profiles.filter(p => p.nrls_code && codes.includes(p.nrls_code));
      return { id: standard.id, number: standard.std_number, name: standard.std_name,
        category: standard.safety_category, mappedCodes: codes,
        incidents: codes.map(code => ({ code, name: nameMap.get(code) || code })),
        total: matched.length,
        withMeasures: matched.filter(p => p.risk_prevention?.trim() || p.risk_mitigation?.trim()).length,
        profiles: matched.map(p => ({ id: p.id, title: p.risk_title, department: p.department_name })),
      };
    });
  }
}
