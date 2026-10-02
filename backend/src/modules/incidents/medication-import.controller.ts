import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { medicationDate, parseMedicationCsv } from './medication-import.utils';

@Injectable()
export class MedicationImportService {
  private previews = new Map<string, { owner: number; expires: number; rows: ReturnType<typeof parseMedicationCsv> }>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly prisma: PrismaService, private readonly incidents: IncidentsService) {}
  async context(user: any) {
    if (user.role !== 'admin' && !(user.role === 'rm_committee' && user.rmScope === 'hospital')) throw new ForbiddenException();
    const departments = await this.prisma.department.findMany({ select: { id: true, depart_name: true, depart_group_id: true } });
    return {
      departments: departments.filter(d => user.role === 'admin' || user.rmScope === 'hospital' || (user.rmScope === 'group' && user.departmentGroup && d.depart_group_id === Number(user.departmentGroup)) || [user.departmentId, user.departmentId2].map(Number).includes(d.id)),
      locations: await this.prisma.location.findMany({ select: { id: true, name: true } }),
      durations: await this.prisma.duration.findMany({ select: { id: true, duration_name: true } }),
      topics: await this.prisma.nRLS_riskstore.findMany({ where: { nrls_code: { startsWith: 'C' }, program_id: { not: null } }, select: { nrls_code: true, name: true } }),
    };
  }
  async preview(file: { originalname: string; buffer: Buffer }, user: any) {
    await this.context(user);
    if (!file || !/\.csv$/i.test(file.originalname)) throw new BadRequestException('กรุณาเลือกไฟล์ CSV');
    let rows: ReturnType<typeof parseMedicationCsv>;
    try { rows = parseMedicationCsv(new TextDecoder('utf-8', { fatal: true }).decode(file.buffer)); }
    catch { throw new BadRequestException('ไฟล์ต้องเป็น CSV UTF-8 ตามแบบฟอร์ม Medication Error และมี 1–500 รายการ'); }
    const existing = await this.prisma.riskregister.findMany({ where: { link_key: { in: rows.map(r => r.key) } }, select: { link_key: true } });
    const seen = new Set(existing.map(r => r.link_key));
    const result = rows.map(r => { const duplicate = seen.has(r.key); seen.add(r.key); return { ...r, duplicate }; });
    for (const [key, value] of this.previews) if (value.expires < Date.now() || value.owner === user.id) this.previews.delete(key);
    if (this.previews.size >= 20) throw new BadRequestException('มีงานนำเข้าจำนวนมาก กรุณาลองอีกครั้ง');
    const token = randomUUID();
    this.previews.set(token, { owner: user.id, expires: Date.now() + 30 * 60000, rows });
    setTimeout(() => this.previews.delete(token), 30 * 60000).unref();
    return { token, rows: result };
  }
  commit(body: any, user: any) {
    const job = this.queue.then(() => this.performCommit(body, user));
    this.queue = job.catch(() => undefined);
    return job;
  }
  private async performCommit(body: any, user: any) {
    const context = await this.context(user);
    const preview = this.previews.get(body?.token);
    if (!preview || preview.owner !== user.id || preview.expires < Date.now()) throw new BadRequestException('ตัวอย่างหมดอายุ กรุณาอัปโหลดใหม่');
    if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 500) throw new BadRequestException('กรุณาเลือกรายการ');
    const selected = new Set<number>();
    const prepared = body.rows.map((choice: any) => {
      if (!choice || typeof choice !== 'object') throw new BadRequestException('รายการไม่ถูกต้อง');
      const source = preview.rows.find(r => r.row === choice.row);
      if (!source || selected.has(choice.row)) throw new BadRequestException('รายการไม่ถูกต้องหรือซ้ำ');
      selected.add(choice.row);
      if (!context.departments.some(d => d.id === Number(choice.department_id)) || !context.locations.some(l => l.id === Number(choice.location_id)) || !context.durations.some(d => d.id === Number(choice.duration_id))) throw new BadRequestException(`แถว ${choice.row}: กรุณาเลือกหน่วยงาน สถานที่ และเวรในขอบเขตบัญชี`);
      if (!context.topics.some(t => t.nrls_code === choice.nrls_code) || typeof choice.level_id !== 'string' || !/^[A-I]$/.test(choice.level_id) || typeof choice.date_report !== 'string' || !medicationDate(choice.date_report) || typeof choice.time_report !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(choice.time_report)) throw new BadRequestException(`แถว ${choice.row}: ตรวจวันที่ เวลา ระดับ และหัวข้อ NRLS`);
      return { source, data: { date_report: choice.date_report, time_report: `1970-01-01T${choice.time_report}:00Z`, level_id: choice.level_id, nrls_code: choice.nrls_code, department_id: String(choice.department_id), location_id: Number(choice.location_id), duration_id: Number(choice.duration_id), detail: source.detail, problem_basic: source.problem_basic, user_ir_type: 'นำเข้าข้อมูลยา' } };
    });
    const results: { row: number; status: string; id?: number }[] = [];
    for (const item of prepared) {
      const existing = await this.prisma.riskregister.findFirst({ where: { link_key: item.source.key }, select: { id: true } });
      if (existing) { results.push({ row: item.source.row, status: 'duplicate' }); continue; }
      try {
        const incident = await this.incidents.create(item.data, user, { linkKey: item.source.key, note: `Medication CSV; ผู้รายงานต้นฉบับ: ${item.source.reporter}`, suppressNotification: true, medicationImport: true });
        results.push({ row: item.source.row, status: 'created', id: incident.id });
      } catch {
        const saved = await this.prisma.riskregister.findFirst({ where: { link_key: item.source.key }, select: { id: true } });
        results.push({ row: item.source.row, status: saved ? 'created' : 'failed', ...(saved ? { id: saved.id } : {}) });
      }
    }
    return { results };
  }
}

@Controller('medication-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('rm_committee', 'admin')
export class MedicationImportController {
  constructor(private readonly service: MedicationImportService) {}
  @Get('context') context(@Request() req) { return this.service.context(req.user); }
  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  preview(@UploadedFile() file: { originalname: string; buffer: Buffer }, @Request() req) { return this.service.preview(file, req.user); }
  @Post('commit') commit(@Body() body: any, @Request() req) { return this.service.commit(body, req.user); }
}

