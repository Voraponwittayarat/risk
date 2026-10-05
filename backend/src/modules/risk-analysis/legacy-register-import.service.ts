import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { riskLevelFor } from '../../common/risk-matrix-policy';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const nameKey = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
function text(value: unknown, maximum: number, required = false): string {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) {
    throw new BadRequestException('ข้อมูลข้อความในไฟล์นำเข้าไม่ถูกต้องหรือยาวเกินกำหนด');
  }
  return value.trim();
}
function dateOnly(value: unknown): Date {
  const valueText = text(value, 10, true);
  const parsed = new Date(`${valueText}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== valueText) {
    throw new BadRequestException('วันที่ต้นฉบับต้องเป็น YYYY-MM-DD ที่ถูกต้อง');
  }
  return parsed;
}
export function normalizeLegacyRegister(input: any) {
  if (input?.format !== 'riskhrms-hospital-register-v1' || !Array.isArray(input.records) || input.records.length < 1 || input.records.length > 100) {
    throw new BadRequestException('รูปแบบไฟล์นำเข้าไม่ถูกต้อง รองรับครั้งละ 1–100 เรื่อง');
  }
  const sourceId = text(input.source_id, 100, true);
  const sheet = text(input.sheet, 100, true);
  const sourceSha = text(input.source_sha256, 64, true);
  if (!/^[a-zA-Z0-9_-]+$/.test(sourceId) || !/^[a-f0-9]{64}$/.test(sourceSha)) throw new BadRequestException('ข้อมูลอ้างอิงต้นฉบับไม่ถูกต้อง');
  const seenTitles = new Set<string>();
  const seenRows = new Set<number>();
  const records = input.records.map((row: any) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new BadRequestException('รายการความเสี่ยงในไฟล์ไม่ถูกต้อง');
    const title = text(row.risk_title, 255, true);
    const key = nameKey(title);
    if (seenTitles.has(key) || !Number.isInteger(row.source_row) || row.source_row < 1 || seenRows.has(row.source_row)) {
      throw new BadRequestException('ไฟล์มีชื่อเรื่องหรือแถวต้นฉบับซ้ำ');
    }
    seenTitles.add(key); seenRows.add(row.source_row);
    const l = row.initial_likelihood; const c = row.initial_consequence;
    if (![l, c].every(v => Number.isInteger(v) && v >= 1 && v <= 5) || row.source_risk_score !== l * c) {
      throw new BadRequestException(`แถว ${row.source_row}: คะแนน L/C ไม่ครบ หรือคะแนนรวมไม่ตรง กรุณาพักเรื่องนี้ไว้ตรวจ`);
    }
    if (row.status !== 'open' || !Number.isInteger(row.review_frequency_months) || row.review_frequency_months < 1 || row.review_frequency_months > 120) {
      throw new BadRequestException('นำเข้าได้เฉพาะเรื่องที่ยังเปิดและมีรอบทบทวนชัดเจน');
    }
    const reviewDate = dateOnly(row.last_reviewed_date);
    // Calendar month addition, clamped to the end of the target month.
    const next = new Date(Date.UTC(reviewDate.getUTCFullYear(), reviewDate.getUTCMonth() + row.review_frequency_months, 1));
    next.setUTCDate(Math.min(reviewDate.getUTCDate(), new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()));
    const owner = text(row.risk_owner_name, 255, true);
    const description = text(row.risk_description, 20000);
    const history = text(row.source_context, 20000);
    const provenance = `ต้นฉบับ: ${sourceId} / ${sheet} / แถว ${row.source_row}\nSHA-256: ${sourceSha}\nยังไม่ได้เชื่อมรหัส NRLS; คงชื่อความเสี่ยงจากทะเบียนเดิม`;
    const combinedDescription = [description, history, provenance].filter(Boolean).join('\n\n');
    if (Buffer.byteLength(combinedDescription, 'utf8') > 60000) throw new BadRequestException('รายละเอียดต้นฉบับยาวเกินพื้นที่จัดเก็บ กรุณาแยกเอกสารประกอบ');
    for (const field of ['risk_prevention', 'risk_monitor', 'risk_mitigation', 'qi_plan']) {
      if (Buffer.byteLength(text(row[field], 20000), 'utf8') > 60000) throw new BadRequestException('มาตรการต้นฉบับยาวเกินพื้นที่จัดเก็บ');
    }
    return {
      sourceRow: row.source_row, titleKey: key,
      data: {
        risk_code: `LEGACY-HOSP-${hash(`${sourceId}\0${sheet}\0${key}`).slice(0, 24)}`,
        nrls_code: null, risk_title: title,
        risk_description: combinedDescription,
        source: 'นำเข้าทะเบียนความเสี่ยงโรงพยาบาลเดิม', scope_level: 'hospital', scope_identifier: 'HOSPITAL',
        risk_owner_name: owner, initial_likelihood: l, initial_consequence: c,
        initial_risk_score: l * c, initial_risk_level: riskLevelFor(l, c),
        residual_risk_level: null, status: 'open', review_frequency_months: row.review_frequency_months,
        last_reviewed_date: reviewDate, next_review_date: next,
        risk_prevention: text(row.risk_prevention, 20000), risk_transfer: '',
        risk_monitor: text(row.risk_monitor, 20000), risk_mitigation: text(row.risk_mitigation, 20000),
        qi_plan: text(row.qi_plan, 20000), category_name: 'ทะเบียนความเสี่ยงโรงพยาบาลเดิม',
      },
    };
  });
  return { sourceId, sheet, sourceSha, records };
}

@Injectable()
export class LegacyRegisterImportService {
  constructor(private readonly prisma: PrismaService) {}
  private authorize(user: any) {
    if (!Number.isInteger(Number(user?.id)) || Number(user.id) < 1 || !(user.role === 'admin' || (user.role === 'rm_committee' && user.rmScope === 'hospital'))) {
      throw new ForbiddenException('เฉพาะ RM ระดับโรงพยาบาลหรือ Admin ที่นำเข้าทะเบียนโรงพยาบาลได้');
    }
  }
  private async prepare(db: any, input: any, user: any) {
    this.authorize(user);
    const batch = normalizeLegacyRegister(input);
    const [existing, members, accounts] = await Promise.all([
      db.riskanalysis.findMany({ where: { scope_level: 'hospital' }, select: { id: true, risk_code: true, risk_title: true } }),
      db.member.findMany({ select: { cid: true, member_name: true } }),
      db.user.findMany({ where: { blocked_at: null }, select: { id: true, cid: true } }),
    ]);
    const rows = batch.records.map((record: any) => {
      const duplicate = existing.find((p: any) => p.risk_code === record.data.risk_code || nameKey(p.risk_title) === record.titleKey);
      const matches = members.filter((m: any) => nameKey(m.member_name) === nameKey(record.data.risk_owner_name));
      const cids = [...new Set(matches.map((m: any) => m.cid))];
      const ownerAccounts = cids.length === 1 ? accounts.filter((a: any) => a.cid === cids[0]) : [];
      return {
        ...record, duplicateId: duplicate?.id ?? null,
        ownerCid: cids.length === 1 ? cids[0] : null,
        ownerUserId: ownerAccounts.length === 1 ? ownerAccounts[0].id : null,
      };
    });
    const digest = hash(JSON.stringify({ userId: Number(user.id), source: [batch.sourceId, batch.sheet, batch.sourceSha], rows }));
    return { batch, rows, digest };
  }
  async preview(input: any, user: any) {
    const prepared = await this.prepare(this.prisma, input, user);
    return {
      preview_hash: prepared.digest,
      total: prepared.rows.length,
      new_count: prepared.rows.filter((r: any) => !r.duplicateId).length,
      duplicate_count: prepared.rows.filter((r: any) => r.duplicateId).length,
      rows: prepared.rows.map((r: any) => ({
        source_row: r.sourceRow, risk_title: r.data.risk_title, risk_code: r.data.risk_code,
        score: r.data.initial_risk_score, risk_level: r.data.initial_risk_level,
        owner_name: r.data.risk_owner_name, owner_linked: Boolean(r.ownerUserId),
        next_review_date: r.data.next_review_date.toISOString().slice(0, 10),
        duplicate_id: r.duplicateId,
      })),
    };
  }
  async commit(input: any, user: any) {
    this.authorize(user);
    if (!/^[a-f0-9]{64}$/.test(String(input?.preview_hash || ''))) throw new BadRequestException('กรุณาตรวจตัวอย่างก่อนนำเข้า');
    // Serializable transaction prevents concurrent imports from both passing the duplicate check.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx: any) => {
          const prepared = await this.prepare(tx, input, user);
          if (prepared.digest !== input.preview_hash) throw new ConflictException('ข้อมูลหรือรายการซ้ำเปลี่ยนไป กรุณาตรวจตัวอย่างอีกครั้ง');
          const ids: number[] = [];
          for (const row of prepared.rows) {
            if (row.duplicateId) continue;
            const created = await tx.riskanalysis.create({ data: {
              ...row.data, department_id: String(user.departmentId || '1'), created_by: Number(user.id),
              risk_owner_member_cid: row.ownerCid, risk_owner_user_id: row.ownerUserId,
            } });
            await tx.workflow_audit.create({ data: {
              entity_type: 'RISK_ANALYSIS', entity_id: String(created.id), action: 'IMPORT_LEGACY_HOSPITAL',
              reason: 'นำเข้าทะเบียนโรงพยาบาลเดิมโดยคงชื่อและมาตรการต้นฉบับ', changed_by: Number(user.id),
              new_value: JSON.stringify({ source_id: prepared.batch.sourceId, sheet: prepared.batch.sheet, source_sha256: prepared.batch.sourceSha, source_row: row.sourceRow, risk_code: row.data.risk_code }),
            } });
            ids.push(created.id);
          }
          return { imported: ids.length, skipped_duplicates: prepared.rows.length - ids.length, ids };
        }, { isolationLevel: 'Serializable', timeout: 20000 });
      } catch (error: any) {
        if (error?.code !== 'P2034' || attempt === 2) throw error;
      }
    }
  }
}
