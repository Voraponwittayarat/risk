import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateRiskAnalysisDto {
  risk_code: string;
  risk_title: string;
  risk_description?: string;
  source?: string;
  scope_level?: 'hospital' | 'department';
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
  risk_title?: string;
  risk_description?: string;
  source?: string;
  scope_level?: 'hospital' | 'department';
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

  private calculateRiskLevel(score: number): 'green' | 'yellow' | 'orange' | 'red' {
    if (score >= 15) return 'red'; // Extreme
    if (score >= 9) return 'orange'; // High
    if (score >= 4) return 'yellow'; // Medium
    return 'green'; // Low
  }

  async findAll(query: {
    scope_level?: string;
    department_id?: string;
    program_id?: number;
    status?: string;
    risk_level?: string;
    search?: string;
    due_soon?: boolean;
  }) {
    const where: any = {};

    if (query.scope_level && query.scope_level !== 'all') {
      where.scope_level = query.scope_level;
    }

    if (query.department_id && query.department_id !== 'all') {
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

  async findOne(id: number) {
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

    const department = await this.prisma.department.findUnique({
      where: { id: Number(risk.department_id) || 1 },
    });

    // Count related reported incidents from riskregister
    // Matching by keywords or department
    const keywords = risk.risk_title.split(' ').filter((w) => w.length > 3);
    const orConditions: any[] = [];
    if (keywords.length > 0) {
      keywords.forEach((kw) => {
        orConditions.push({ detail: { contains: kw } });
        orConditions.push({ problem_basic: { contains: kw } });
      });
    }

    let linkedIncidents: any[] = [];
    if (orConditions.length > 0) {
      linkedIncidents = await this.prisma.riskregister.findMany({
        where: {
          OR: orConditions,
        },
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

  async getStats(query: { scope_level?: string; department_id?: string }) {
    const where: any = {};
    if (query.scope_level && query.scope_level !== 'all') {
      where.scope_level = query.scope_level;
    }
    if (query.department_id && query.department_id !== 'all') {
      where.department_id = query.department_id;
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

  async create(dto: CreateRiskAnalysisDto, userId?: number) {
    const l = Math.min(5, Math.max(1, Number(dto.initial_likelihood) || 1));
    const c = Math.min(5, Math.max(1, Number(dto.initial_consequence) || 1));
    const score = l * c;
    const level = this.calculateRiskLevel(score);

    const freq = Number(dto.review_frequency_months) || 3;
    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + freq);

    return this.prisma.riskanalysis.create({
      data: {
        risk_code: dto.risk_code,
        risk_title: dto.risk_title,
        risk_description: dto.risk_description || '',
        source: dto.source || 'มาตรฐานสำคัญ 9 ด้าน',
        scope_level: dto.scope_level || 'department',
        department_id: String(dto.department_id || '1'),
        program_id: dto.program_id ? Number(dto.program_id) : null,
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
        created_by: userId || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async update(id: number, dto: UpdateRiskAnalysisDto) {
    const existing = await this.prisma.riskanalysis.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }

    const l = dto.initial_likelihood !== undefined ? Number(dto.initial_likelihood) : existing.initial_likelihood;
    const c = dto.initial_consequence !== undefined ? Number(dto.initial_consequence) : existing.initial_consequence;
    const score = l * c;
    const level = this.calculateRiskLevel(score);

    const updateData: any = {
      ...dto,
      initial_likelihood: l,
      initial_consequence: c,
      initial_risk_score: score,
      initial_risk_level: level,
      updated_at: new Date(),
    };

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

  async remove(id: number) {
    const existing = await this.prisma.riskanalysis.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }
    return this.prisma.riskanalysis.delete({ where: { id } });
  }

  async addReview(id: number, dto: CreateRiskReviewDto) {
    const risk = await this.prisma.riskanalysis.findUnique({
      where: { id },
      include: { reviews: true },
    });

    if (!risk) {
      throw new NotFoundException(`Risk profile with ID ${id} not found`);
    }

    const curL = Math.min(5, Math.max(1, Number(dto.current_likelihood) || 1));
    const curC = Math.min(5, Math.max(1, Number(dto.current_consequence) || 1));
    const curScore = curL * curC;
    const curLevel = this.calculateRiskLevel(curScore);

    const reviewDate = new Date(dto.review_date);
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
        incident_count_in_period: Number(dto.incident_count_in_period) || 0,
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
      },
    });

    return review;
  }

  async getNineStandards() {
    return this.prisma.nine_standards.findMany({
      orderBy: { std_number: 'asc' },
    });
  }
}
