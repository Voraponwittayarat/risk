import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IncidentsService } from '../incidents/incidents.service';
import { RcaService } from '../rca/rca.service';

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
  risk_confirmed: boolean;
  nrls_code?: string;
  riskstore_id?: number | null;
  department_id?: string;
  findings?: TriggerFindingDto[];
}

export class ConfirmMedicalRecordRiskDto {
  risk_confirmed: boolean;
  nrls_code: string;
  riskstore_id?: number | null;
  severity_level: string;
  ae_description?: string;
  department_id?: string;
}

@Injectable()
export class TriggerToolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incidentsService: IncidentsService,
    private readonly rcaService: RcaService,
  ) {}

  private getUserId(user: any): number | null {
    const value = Number(user?.id || user?.userId || user?.sub);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private async attachLinkedIncidents<T extends Record<string, any>>(reviews: T[]): Promise<Array<T & { incident: any | null }>> {
    if (!reviews.length) return [];
    const incidentIds = reviews
      .map((review) => Number(review.riskregister_id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const linkKeys = reviews.map((review) => `TRIGGER_REVIEW:${review.id}`);
    const incidents = await this.prisma.riskregister.findMany({
      where: {
        OR: [
          ...(incidentIds.length ? [{ id: { in: incidentIds } }] : []),
          { link_key: { in: linkKeys } },
        ],
      },
      select: {
        id: true,
        id_risk: true,
        status_risk: true,
        level_id: true,
        nrls_code: true,
        nrls_name_snapshot: true,
        classification_status: true,
        rca_required: true,
        rca_status: true,
        rca_case_id: true,
        link_key: true,
      },
    });
    const byId = new Map(incidents.map((incident) => [incident.id, incident]));
    const byLinkKey = new Map(incidents.map((incident) => [incident.link_key, incident]));
    return reviews.map((review) => ({
      ...review,
      incident: byId.get(Number(review.riskregister_id)) || byLinkKey.get(`TRIGGER_REVIEW:${review.id}`) || null,
    }));
  }

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

    const reviews = await this.prisma.medical_record_review.findMany({
      where,
      include: {
        findings: true,
      },
      orderBy: { review_date: 'desc' },
    });
    return this.attachLinkedIncidents(reviews);
  }

  async getReviewById(id: number) {
    const review = await this.prisma.medical_record_review.findUnique({
      where: { id },
      include: {
        findings: true,
      },
    });
    if (!review) throw new NotFoundException(`Review #${id} not found`);
    return (await this.attachLinkedIncidents([review]))[0];
  }

  async createReview(data: CreateMedicalRecordReviewDto, user?: any) {
    const nrlsCode = String(data.nrls_code || '').trim().toUpperCase();
    const severity = String(data.severity_level || '').trim().toUpperCase();
    const findings = Array.isArray(data.findings) ? data.findings : [];
    if (data.risk_confirmed !== true) {
      throw new BadRequestException('กรุณายืนยันว่าเป็นความเสี่ยงก่อนบันทึกเป็นรายงานอุบัติการณ์');
    }
    if (!nrlsCode) throw new BadRequestException('กรุณาเลือกหัวข้อความเสี่ยงตามมาตรฐาน NRLS');
    if (!severity) throw new BadRequestException('กรุณาเลือกระดับความรุนแรงของความเสี่ยง');
    if (!findings.length) throw new BadRequestException('กรุณาเลือก Trigger ที่ตรวจพบอย่างน้อย 1 รายการ');
    if (!String(data.ae_description || '').trim()) {
      throw new BadRequestException('กรุณาระบุรายละเอียดเหตุการณ์/ข้อเท็จจริงที่พบจากเวชระเบียน');
    }

    const review = await this.prisma.medical_record_review.create({
      data: {
        reviewer_name: data.reviewer_name,
        department: data.department,
        hn: data.hn,
        an: data.an || null,
        admit_date: data.admit_date ? new Date(data.admit_date) : null,
        discharge_date: data.discharge_date ? new Date(data.discharge_date) : null,
        diagnosis: data.diagnosis || null,
        has_trigger: true,
        has_adverse_event: Boolean(data.has_adverse_event),
        has_error: Boolean(data.has_error),
        severity_level: severity,
        preventability: data.preventability || null,
        ae_description: data.ae_description,
        risk_confirmation_status: 'CONFIRMED',
        risk_confirmed_at: new Date(),
        risk_confirmed_by: this.getUserId(user),
        nrls_code: nrlsCode,
        riskstore_id: data.riskstore_id ? Number(data.riskstore_id) : null,
        findings: {
          create: findings.map((finding) => ({
            trigger_id: finding.trigger_id,
            trigger_name: finding.trigger_name,
            detail: finding.detail,
          })),
        },
      },
      include: {
        findings: true,
      },
    });

    const triggerSummary = findings
      .map((finding) => `${finding.trigger_name}${finding.detail ? ` (${finding.detail})` : ''}`)
      .join(', ');
    const detail = [
      'ค้นพบจากการทบทวนเวชระเบียนด้วย Trigger Tool',
      `HN: ${data.hn}${data.an ? ` / AN: ${data.an}` : ''}`,
      data.diagnosis ? `การวินิจฉัย: ${data.diagnosis}` : null,
      `Trigger ที่ตรวจพบ: ${triggerSummary}`,
      `รายละเอียดเหตุการณ์/ข้อเท็จจริง: ${data.ae_description}`,
    ].filter(Boolean).join('\n');

    let incident: any;
    try {
      const now = new Date();
      incident = await this.incidentsService.create({
        date_report: now.toISOString(),
        time_report: now.toISOString(),
        user_ir_type: 'Trigger Tool',
        level_id: severity,
        riskstore_id: data.riskstore_id ? Number(data.riskstore_id) : null,
        nrls_code: nrlsCode,
        detail,
        problem_basic: String(data.ae_description).trim(),
        affected: 'ผู้ป่วย',
        inform_id: 0,
        department_id: String(data.department_id || user?.departmentId || ''),
        is_potential_harm: Boolean(data.has_error && !data.has_adverse_event),
      }, user, {
        linkKey: `TRIGGER_REVIEW:${review.id}`,
        note: `สร้างจาก Trigger Tool Review #${review.id}`,
        referType: 'T',
      });
    } catch (error) {
      await this.prisma.medical_record_review.delete({ where: { id: review.id } }).catch(() => undefined);
      throw error;
    }

    const linkedReview = await this.prisma.medical_record_review.update({
      where: { id: review.id },
      data: {
        riskregister_id: incident.id,
        riskregister_id_risk: incident.id_risk,
        nrls_code: incident.nrls_code,
        nrls_name_snapshot: incident.nrls_name_snapshot,
        riskstore_id: incident.riskstore_id,
      },
      include: { findings: true },
    });

    return { ...linkedReview, incident };
  }

  async updateReview(id: number, data: Partial<CreateMedicalRecordReviewDto>) {
    await this.getReviewById(id);
    const {
      findings,
      admit_date,
      discharge_date,
      risk_confirmed: _riskConfirmed,
      nrls_code: _nrlsCode,
      riskstore_id: _riskstoreId,
      department_id: _departmentId,
      ...rest
    } = data;

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

  async confirmReviewRisk(id: number, data: ConfirmMedicalRecordRiskDto, user?: any) {
    const review = await this.getReviewById(id);
    if (review.incident) {
      return { ...review, message: 'รายการนี้เชื่อมกับ Incident อยู่แล้ว' };
    }
    const nrlsCode = String(data.nrls_code || '').trim().toUpperCase();
    const severity = String(data.severity_level || '').trim().toUpperCase();
    const description = String(data.ae_description || review.ae_description || '').trim();
    if (data.risk_confirmed !== true) throw new BadRequestException('กรุณายืนยันว่าเป็นความเสี่ยง');
    if (!nrlsCode) throw new BadRequestException('กรุณาเลือกหัวข้อความเสี่ยงตามมาตรฐาน NRLS');
    if (!severity) throw new BadRequestException('กรุณาเลือกระดับความรุนแรงของความเสี่ยง');
    if (!review.findings.length) throw new BadRequestException('รายการนี้ยังไม่มี Trigger ที่ตรวจพบ');
    if (!description) throw new BadRequestException('กรุณาระบุรายละเอียดเหตุการณ์/ข้อเท็จจริงที่พบจากเวชระเบียน');

    const triggerSummary = review.findings
      .map((finding) => `${finding.trigger_name}${finding.detail ? ` (${finding.detail})` : ''}`)
      .join(', ');
    const detail = [
      'ค้นพบจากการทบทวนเวชระเบียนด้วย Trigger Tool',
      `HN: ${review.hn}${review.an ? ` / AN: ${review.an}` : ''}`,
      review.diagnosis ? `การวินิจฉัย: ${review.diagnosis}` : null,
      `Trigger ที่ตรวจพบ: ${triggerSummary}`,
      `รายละเอียดเหตุการณ์/ข้อเท็จจริง: ${description}`,
    ].filter(Boolean).join('\n');
    const now = new Date();
    const incident = await this.incidentsService.create({
      date_report: now.toISOString(),
      time_report: now.toISOString(),
      user_ir_type: 'Trigger Tool',
      level_id: severity,
      riskstore_id: data.riskstore_id ? Number(data.riskstore_id) : null,
      nrls_code: nrlsCode,
      detail,
      problem_basic: description,
      affected: 'ผู้ป่วย',
      inform_id: 0,
      department_id: String(data.department_id || user?.departmentId || ''),
      is_potential_harm: Boolean(review.has_error && !review.has_adverse_event),
    }, user, {
      linkKey: `TRIGGER_REVIEW:${review.id}`,
      note: `สร้างจาก Trigger Tool Review #${review.id}`,
      referType: 'T',
    });

    const linkedReview = await this.prisma.medical_record_review.update({
      where: { id: review.id },
      data: {
        severity_level: severity,
        ae_description: description,
        risk_confirmation_status: 'CONFIRMED',
        risk_confirmed_at: new Date(),
        risk_confirmed_by: this.getUserId(user),
        riskregister_id: incident.id,
        riskregister_id_risk: incident.id_risk,
        nrls_code: incident.nrls_code,
        nrls_name_snapshot: incident.nrls_name_snapshot,
        riskstore_id: incident.riskstore_id,
      },
      include: { findings: true },
    });
    return { ...linkedReview, incident, message: 'ยืนยันความเสี่ยงและสร้าง Incident 1 รายการเรียบร้อยแล้ว' };
  }

  async deleteReview(id: number) {
    const review = await this.getReviewById(id);
    if (review.riskregister_id || review.incident) {
      throw new BadRequestException('รายการนี้เชื่อมเป็นรายงานอุบัติการณ์แล้ว กรุณาจัดการผ่านหน้า Incident เพื่อคงประวัติการตรวจสอบ');
    }
    return this.prisma.medical_record_review.delete({
      where: { id },
    });
  }

  // ================= Forward to Standard RCA =================
  async forwardToRca(reviewId: number, user?: any) {
    const review = await this.getReviewById(reviewId);
    const incident = review.incident;
    if (!incident?.id) {
      throw new BadRequestException('ต้องยืนยันและสร้าง Incident จาก Trigger Tool ก่อนส่งทำ RCA');
    }

    const existing = await this.prisma.standard_rca_case.findFirst({ where: { incident_id: incident.id } });
    if (existing) {
      if (review.standard_rca_id !== existing.id) {
        await this.prisma.medical_record_review.update({ where: { id: reviewId }, data: { standard_rca_id: existing.id } });
      }
      return { message: 'รายการนี้มี Standard RCA อยู่แล้ว', rca_id: existing.id, rca_case: existing };
    }

    const triggerNames = review.findings.map(f => f.trigger_name).join(', ') || 'Trigger Tool Finding';
    const standardRca = await this.rcaService.createStandard({
      incident_id: incident.id,
      incident_id_risk: incident.id_risk,
      source_trigger_review_id: review.id,
      topic: review.nrls_name_snapshot || `[Trigger Tool] ${triggerNames}`,
      rca_team: `ทีมทบทวนเวชระเบียน (${review.reviewer_name}, ${review.department})`,
      what_happened: review.ae_description || undefined,
      actual_impact: review.ae_description || 'ตรวจพบความเสี่ยงจากการทบทวนเวชระเบียน',
      status: 'IN_PROGRESS',
      created_by: this.getUserId(user) || undefined,
      timelines: [{
        event_time: 'การทบทวนเวชระเบียน',
        event_date: review.review_date.toISOString(),
        event_description: `ผู้ทบทวน (${review.reviewer_name}) ตรวจพบ Trigger: ${triggerNames} ระดับความรุนแรง ${review.severity_level || incident.level_id}`,
        is_critical_point: true,
        tag: 'cmp',
        sort_order: 1,
      }],
    }, user);

    // Update review with standard_rca_id
    await this.prisma.medical_record_review.update({
      where: { id: reviewId },
      data: { standard_rca_id: standardRca.id },
    });

    return {
      message: 'ส่งต่อเพื่อเปิดเคส Standard RCA เรียบร้อยแล้ว',
      rca_id: standardRca.id,
      rca_case: standardRca,
    };
  }
}
