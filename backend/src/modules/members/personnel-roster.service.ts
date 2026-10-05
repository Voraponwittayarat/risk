import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { basename } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePersonnelName, parsePersonnelRoster, sourceUnitKey } from './personnel-roster.utils';

type SourceRow = ReturnType<typeof parsePersonnelRoster>[number];
type Selection = { row: number; departmentId: number; memberId: number | null };
type Preview = { owner: number; expires: number; source: string; previousId: number; memberVersion: string; rows: SourceRow[] };
const memberVersion = (members: any[]) => createHash('sha256').update(JSON.stringify(members.map(m => [m.id, m.cid, m.member_name, m.department_id1]).sort((a,b) => a[0] - b[0]))).digest('hex');

@Injectable()
export class PersonnelRosterService {
  private previews = new Map<string, Preview>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly prisma: PrismaService) {}
  private assertAdmin(user: any) {
    if (user?.role !== 'admin' || !Number.isInteger(user.id)) throw new ForbiddenException();
  }
  async latest() {
    const batch = await this.prisma.personnel_roster_batch.findFirst({ orderBy: { id: 'desc' }, include: { _count: { select: { entries: true } } } });
    return batch ? { id: batch.id, source: batch.source_name, asOf: batch.as_of, importedAt: batch.imported_at, count: batch._count.entries } : null;
  }
  async preview(file: { originalname: string; buffer: Buffer }, user: any) {
    this.assertAdmin(user);
    if (!file || !/\.csv$/i.test(file.originalname) || file.buffer.length > 5 * 1024 * 1024) throw new BadRequestException('เลือก CSV UTF-8 ไม่เกิน 5 MB');
    let rows: SourceRow[];
    try { rows = parsePersonnelRoster(new TextDecoder('utf-8', { fatal: true }).decode(file.buffer)); }
    catch { throw new BadRequestException('อ่าน CSV ไม่สำเร็จ ต้องมี ลำดับ ชื่อ - สกุล ตำแหน่ง กลุ่มงาน งาน ประเภทการจ้าง และ 1–3,000 รายการ'); }
    const [previous, members, departments] = await Promise.all([
      this.prisma.personnel_roster_batch.findFirst({ orderBy: { id: 'desc' }, include: { entries: true } }),
      this.prisma.member.findMany({ select: { id: true, cid: true, member_name: true, department_id1: true } }),
      this.prisma.department.findMany({ select: { id: true, depart_name: true }, orderBy: { depart_name: 'asc' } }),
    ]);
    const oldByName = new Map((previous?.entries || []).map(e => [e.normalized_name, e]));
    const token = randomUUID();
    for (const [key, value] of this.previews) if (value.expires < Date.now() || value.owner === user.id) this.previews.delete(key);
    if (this.previews.size >= 20) throw new BadRequestException('มีงานนำเข้ามาก กรุณาลองใหม่');
    this.previews.set(token, { owner: user.id, expires: Date.now() + 30 * 60000, source: basename(file.originalname).slice(0,255), previousId: previous?.id || 0, memberVersion: memberVersion(members), rows });
    setTimeout(() => this.previews.delete(token), 30 * 60000).unref();
    const units = [...new Map(rows.map(r => [sourceUnitKey(r), r])).entries()].map(([key, r]) => {
      const sameSource = previous?.entries.filter(e => e.source_group === r.group && e.source_unit === r.unit) || [];
      const oldIds = [...new Set(sameSource.map(e => e.department_id))];
      const match = departments.filter(d => d.depart_name.trim() === (r.unit || r.group).trim());
      const departmentId = oldIds.length === 1 && departments.some(d => d.id === oldIds[0]) ? oldIds[0] : match.length === 1 ? match[0].id : null;
      return { key, group: r.group, unit: r.unit, departmentId };
    });
    const keys = new Set(rows.map(r => r.key));
    return { token, previousId: previous?.id || 0, previousAsOf: previous?.as_of, departments, units,
      members: members.map(m => ({ id: m.id, name: m.member_name, departmentId: m.department_id1 })),
      absent: (previous?.entries || []).filter(e => !keys.has(e.normalized_name)).map(e => ({ name: e.name, unit: e.source_unit || e.source_group })),
      rows: rows.map(r => {
        const old = oldByName.get(r.key);
        const matches = members.filter(m => normalizePersonnelName(m.member_name) === r.key);
        const oldMember = old?.member_id ? members.find(m => m.id === old.member_id && normalizePersonnelName(m.member_name) === r.key) : undefined;
        const match = oldMember || (matches.length === 1 ? matches[0] : undefined);
        const changed = !!old && (old.name !== r.name || old.position !== r.position || old.source_group !== r.group || old.source_unit !== r.unit || old.employment !== r.employment);
        return { ...r, sourceKey: sourceUnitKey(r), memberId: match?.id || null, memberName: match?.member_name || null,
          matchStatus: match ? 'matched' : matches.length > 1 ? 'ambiguous' : 'unmatched',
          status: old ? changed ? 'changed' : 'existing' : match ? 'existing_member' : 'new',
          previous: old ? { name: old.name, position: old.position, group: old.source_group, unit: old.source_unit, employment: old.employment } : null };
      }),
    };
  }
  commit(body: any, user: any) {
    this.assertAdmin(user);
    const job = this.queue.then(() => this.performCommit(body, user));
    this.queue = job.catch(() => undefined);
    return job;
  }
  private async performCommit(body: any, user: any) {
    const preview = this.previews.get(body?.token);
    if (!preview || preview.owner !== user.id || preview.expires <= Date.now()) throw new BadRequestException('ตัวอย่างหมดอายุ กรุณาอ่านไฟล์ใหม่');
    if (preview.rows.some(r => r.errors.length)) throw new BadRequestException('แก้ข้อมูลที่ผิดหรือชื่อซ้ำในไฟล์ก่อนนำเข้า');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body?.asOf || '')) throw new BadRequestException('ระบุวันที่ข้อมูล ณ วันที่');
    const asOf = new Date(`${body.asOf}T00:00:00Z`);
    if (Number.isNaN(asOf.getTime()) || asOf.toISOString().slice(0,10) !== body.asOf) throw new BadRequestException('วันที่ไม่ถูกต้อง');
    if (body.confirmSnapshot !== true) throw new BadRequestException('ยืนยันว่าไฟล์เป็นรายชื่อปัจจุบันครบทั้งโรงพยาบาล');
    if (!Array.isArray(body.rows) || body.rows.length !== preview.rows.length) throw new BadRequestException('ต้องนำเข้าทุกรายการในไฟล์');
    const selections = new Map<number, Selection>();
    const linked = new Set<number>();
    for (const c of body.rows) {
      if (!Number.isInteger(c?.row) || selections.has(c.row) || !Number.isInteger(c.departmentId) || (c.memberId !== null && !Number.isInteger(c.memberId))) throw new BadRequestException('ข้อมูลจับคู่ไม่ถูกต้อง');
      if (c.memberId !== null && linked.has(c.memberId)) throw new BadRequestException('เชื่อมบุคลากรเดิมซ้ำมากกว่าหนึ่งแถว');
      if (c.memberId !== null) linked.add(c.memberId);
      selections.set(c.row, c);
    }
    const result = await this.prisma.$transaction(async tx => {
      const latest = await tx.personnel_roster_batch.findFirst({ orderBy: { id: 'desc' } });
      if ((latest?.id || 0) !== preview.previousId) throw new ConflictException('มีการนำเข้าชุดใหม่แล้ว กรุณาอ่านไฟล์ใหม่เพื่อเทียบล่าสุด');
      const [members, departments] = await Promise.all([
        tx.member.findMany({ select: { id: true, cid: true, member_name: true, department_id1: true } }),
        tx.department.findMany({ select: { id: true } }),
      ]);
      if (memberVersion(members) !== preview.memberVersion) throw new ConflictException('ข้อมูลบุคลากรเดิมเปลี่ยนแล้ว กรุณาอ่านไฟล์ใหม่');
      const validMembers = new Set(members.map(m => m.id)), validDepts = new Set(departments.map(d => d.id));
      const linkedCids = members.filter(m => linked.has(m.id)).map(m => m.cid);
      if (linkedCids.length !== new Set(linkedCids).size) throw new BadRequestException('ทะเบียนที่เลือกมีเลขประจำตัวซ้ำ กรุณาตรวจการเชื่อมโยง');
      const data = preview.rows.map(r => {
        const c = selections.get(r.row);
        if (!c || !validDepts.has(c.departmentId) || (c.memberId !== null && !validMembers.has(c.memberId))) throw new BadRequestException('เลือกหน่วยงานและการเชื่อมโยงให้ครบ');
        return { source_row: r.row, name: r.name, normalized_name: r.key, position: r.position, source_group: r.group, source_unit: r.unit, employment: r.employment, department_id: c.departmentId, member_id: c.memberId };
      });
      const batch = await tx.personnel_roster_batch.create({ data: { source_name: preview.source, as_of: asOf, imported_by: user.id } });
      await tx.personnel_roster_entry.createMany({ data: data.map(r => ({ ...r, batch_id: batch.id })) });
      return { id: batch.id, count: data.length, unlinked: data.filter(r => r.member_id === null).length };
    }, { isolationLevel: 'Serializable', timeout: 30000 });
    this.previews.delete(body.token);
    return result;
  }
}
