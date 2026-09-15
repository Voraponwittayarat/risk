import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const RCA_POLICY_VERSION = 'WC-RCA-2026.08-NRLS-1';

export interface RcaPolicyIncident {
  id?: number;
  nrls_code?: string | null;
  level_id?: string | null;
  riskstore_id?: number | null;
  is_sec41?: boolean | null;
  is_potential_harm?: boolean | null;
  source_trigger?: boolean | null;
}

export interface RcaPolicyResult {
  rca_required: boolean;
  criteria_matches: string[];
  recommended_rca_type: 'MINI' | 'CONCISE' | 'STANDARD';
  due_at: Date | null;
  policy_version: string;
  explanation: string;
  mapping_review_required: boolean;
}

@Injectable()
export class IncidentRcaPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(incident: RcaPolicyIncident, evaluatedAt = new Date()): Promise<RcaPolicyResult> {
    const matches: string[] = [];
    const level = String(incident.level_id || '').toUpperCase();
    const high = ['G', 'H', 'I', '4', '5'].includes(level);
    const moderate = ['C', 'D', 'E', 'F', '2', '3'].includes(level);
    let standardMapping = false;
    let mappingReviewRequired = false;

    // Preserve the hospital's existing nine-standard rule, but never use a local id
    // as the decision key. Unconverted rows are explicitly queued for RM mapping.
    if (incident.nrls_code) {
      const standards = await this.prisma.nine_standards.findMany({ select: { std_number: true, std_name: true, risk_codes: true } });
      const tokens = standards.flatMap((s) => String(s.risk_codes || '').split(',').map((v) => v.trim()).filter(Boolean));
      const directCodes = tokens.filter((value) => !/^\d+$/.test(value)).map((value) => value.toUpperCase());
      const localIds = tokens.filter((value) => /^\d+$/.test(value)).map((value) => Number(value));
      standardMapping = directCodes.includes(incident.nrls_code.toUpperCase());
      if (!standardMapping && localIds.length) {
        const mapped = await this.prisma.riskstore.findMany({
          where: { riskstore_id: { in: localIds }, nrls_code: incident.nrls_code },
          select: { riskstore_id: true },
        });
        standardMapping = mapped.length > 0;
      }
      if (standardMapping && (moderate || high)) {
        matches.push(`มาตรฐานสำคัญจำเป็น 9 ด้านที่ผูกกับ NRLS ${incident.nrls_code} ระดับ ${level}`);
      }
    } else if (incident.riskstore_id) {
      mappingReviewRequired = true;
    }

    if (high) matches.push(`ความรุนแรงระดับสูง (${level})`);
    if (incident.source_trigger || incident.is_sec41) matches.push('Trigger Tool หรือข้อร้องเรียน ม.41');
    if (incident.is_potential_harm) matches.push('Near Miss ที่มีโอกาสเกิดอันตรายรุนแรง');

    const required = matches.length > 0;
    const type: RcaPolicyResult['recommended_rca_type'] =
      high || incident.source_trigger || incident.is_sec41 ? 'STANDARD' : required ? 'MINI' : 'MINI';
    const slaHours = type === 'STANDARD' ? 24 : 72;
    const dueAt = required ? new Date(evaluatedAt.getTime() + slaHours * 60 * 60 * 1000) : null;
    const explanation = required
      ? `เข้าเกณฑ์ RCA: ${matches.join('; ')}`
      : mappingReviewRequired
        ? 'ยังประเมินมาตรฐานสำคัญจาก local risk ไม่ได้ ต้องให้ RM ผูก NRLS ก่อน โดยระบบไม่เดา mapping'
        : 'ไม่พบเกณฑ์ RCA ตามนโยบายเดิมที่รวบรวมไว้';

    return {
      rca_required: required,
      criteria_matches: matches,
      recommended_rca_type: type,
      due_at: dueAt,
      policy_version: RCA_POLICY_VERSION,
      explanation,
      mapping_review_required: mappingReviewRequired,
    };
  }

  async evaluateAndPersist(incidentId: number, actorId?: number, reason = 'AUTO_POLICY_EVALUATION') {
    const incident = await this.prisma.riskregister.findFirst({ where: { id: incidentId } });
    if (!incident) return null;
    const result = await this.evaluate(incident);
    const snapshot = JSON.stringify({ ...result, evaluated_at: new Date().toISOString(), reason });
    await this.prisma.$transaction([
      this.prisma.riskregister.updateMany({
        where: { id: incident.id, id_risk: incident.id_risk },
        data: {
          rca_required: result.rca_required,
          rca_criteria_match: result.criteria_matches.join(' | ').slice(0, 100),
          recommended_rca_type: result.recommended_rca_type,
          rca_due_at: result.due_at,
          rca_policy_version: result.policy_version,
          rca_evaluation_snapshot: snapshot,
          rca_status: result.rca_required && (!incident.rca_status || incident.rca_status === 'NONE') ? 'REQUIRED' : incident.rca_status,
        },
      }),
      this.prisma.workflow_audit.create({
        data: { entity_type: 'INCIDENT', entity_id: `${incident.id}:${incident.id_risk}`, action: 'RCA_EVALUATED', new_value: snapshot, reason, changed_by: actorId },
      }),
    ]);
    return result;
  }
}
