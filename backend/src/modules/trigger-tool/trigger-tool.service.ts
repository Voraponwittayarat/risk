import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateTriggerMasterDto {
  code: string;
  name: string;
  definition: string;
  source: string;
  reviewer_role: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

export class UpdateTriggerMasterDto {
  code?: string;
  name?: string;
  definition?: string;
  source?: string;
  reviewer_role?: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

export class TriggerFindingDto {
  trigger_id: number;
  trigger_name: string;
  detail?: string;
}

export class CreateMedicalRecordReviewDto {
  reviewer_name: string;
  department: string;
  hn: string;
  an?: string;
  admit_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  has_trigger: boolean;
  has_adverse_event: boolean;
  has_error: boolean;
  severity_level?: string;
  preventability?: string;
  ae_description?: string;
  findings?: TriggerFindingDto[];
}

@Injectable()
export class TriggerToolService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= Master Data CRUD =================
  async getMasterList(onlyActive = false) {
    const where = onlyActive ? { is_active: true } : {};
    return this.prisma.trigger_tool_master.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });
  }

  async getMasterById(id: number) {
    const item = await this.prisma.trigger_tool_master.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException(`Trigger Master #${id} not found`);
    return item;
  }

  async createMaster(data: CreateTriggerMasterDto) {
    return this.prisma.trigger_tool_master.create({
      data: {
        code: data.code,
        name: data.name,
        definition: data.definition,
        source: data.source,
        reviewer_role: data.reviewer_role,
        category: data.category || 'General',
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
      },
    });
  }

  async updateMaster(id: number, data: UpdateTriggerMasterDto) {
    await this.getMasterById(id);
    return this.prisma.trigger_tool_master.update({
      where: { id },
      data,
    });
  }

  async deleteMaster(id: number) {
    await this.getMasterById(id);
    return this.prisma.trigger_tool_master.delete({
      where: { id },
    });
  }

  // ================= Case Reviews =================
  async getReviews(params?: { department?: string; has_adverse_event?: boolean; has_trigger?: boolean }) {
    const where: any = {};
    if (params?.department) where.department = params.department;
    if (params?.has_adverse_event !== undefined) where.has_adverse_event = params.has_adverse_event;
    if (params?.has_trigger !== undefined) where.has_trigger = params.has_trigger;

    return this.prisma.medical_record_review.findMany({
      where,
      include: {
        findings: true,
      },
      orderBy: { review_date: 'desc' },
    });
  }

  async getReviewById(id: number) {
    const review = await this.prisma.medical_record_review.findUnique({
      where: { id },
      include: {
        findings: true,
      },
    });
    if (!review) throw new NotFoundException(`Review #${id} not found`);
    return review;
  }

  async createReview(data: CreateMedicalRecordReviewDto) {
    const { findings, admit_date, discharge_date, ...rest } = data;

    return this.prisma.medical_record_review.create({
      data: {
        ...rest,
        admit_date: admit_date ? new Date(admit_date) : null,
        discharge_date: discharge_date ? new Date(discharge_date) : null,
        findings: findings?.length
          ? {
              create: findings.map((f) => ({
                trigger_id: f.trigger_id,
                trigger_name: f.trigger_name,
                detail: f.detail,
              })),
            }
          : undefined,
      },
      include: {
        findings: true,
      },
    });
  }

  async updateReview(id: number, data: Partial<CreateMedicalRecordReviewDto>) {
    await this.getReviewById(id);
    const { findings, admit_date, discharge_date, ...rest } = data;

    // If findings are provided, replace them
    if (findings) {
      await this.prisma.trigger_finding.deleteMany({
        where: { review_id: id },
      });
    }

    return this.prisma.medical_record_review.update({
      where: { id },
      data: {
        ...rest,
        admit_date: admit_date ? new Date(admit_date) : undefined,
        discharge_date: discharge_date ? new Date(discharge_date) : undefined,
        findings: findings?.length
          ? {
              create: findings.map((f) => ({
                trigger_id: f.trigger_id,
                trigger_name: f.trigger_name,
                detail: f.detail,
              })),
            }
          : undefined,
      },
      include: {
        findings: true,
      },
    });
  }

  async deleteReview(id: number) {
    await this.getReviewById(id);
    return this.prisma.medical_record_review.delete({
      where: { id },
    });
  }

  // ================= Forward to Standard RCA =================
  async forwardToRca(reviewId: number) {
    const review = await this.getReviewById(reviewId);
    
    // Generate unique RCA ID (e.g. RCA-GTT-YYYYMMDD-ID)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rcaId = `RCA-GTT-${dateStr}-${review.id}`;
    const triggerNames = review.findings.map(f => f.trigger_name).join(', ') || 'Trigger Tool Finding';

    // Create Standard RCA Case
    const standardRca = await this.prisma.standard_rca_case.create({
      data: {
        id: rcaId,
        source_trigger_review_id: review.id,
        topic: `[Trigger Tool] ตรวจพบ AE: ${triggerNames} (HN: ${review.hn})`,
        severity: review.severity_level || 'E',
        what_happened: `ตรวจพบจากเวชระเบียน HN: ${review.hn} ${review.an ? `AN: ${review.an}` : ''}\nแผนก: ${review.department}\nการวินิจฉัย: ${review.diagnosis || '-'}\nTrigger ที่พบ: ${triggerNames}\nรายละเอียด AE: ${review.ae_description || '-'}`,
        actual_impact: review.ae_description || 'ตรวจพบ Adverse Event หรือ Error จากการทบทวนเวชระเบียน',
        rca_team: `ทีมทบทวนเวชระเบียน (${review.reviewer_name}, ${review.department})`,
        status: 'pending',
        timelines: {
          create: [
            {
              event_time: 'การทบทวนเวชระเบียน',
              event_date: review.review_date,
              event_description: `ผู้ทบทวน (${review.reviewer_name}) ตรวจพบ Trigger: ${triggerNames} และระบุเป็น Adverse Event/Error ระดับความรุนแรง ${review.severity_level || 'E'}`,
              is_critical_point: true,
              tag: 'cmp',
              sort_order: 1,
            },
          ],
        },
      },
    });

    // Update review with standard_rca_id
    await this.prisma.medical_record_review.update({
      where: { id: reviewId },
      data: { standard_rca_id: rcaId },
    });

    return {
      message: 'ส่งต่อเพื่อเปิดเคส Standard RCA เรียบร้อยแล้ว',
      rca_id: rcaId,
      rca_case: standardRca,
    };
  }
}
