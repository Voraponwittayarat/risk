import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readdir, readFile, writeFile, rename } from 'fs/promises';
import { resolve, join } from 'path';
import { randomUUID } from 'crypto';

export type Audience = 'staff' | 'risk_manager';
export type Manual = { id: string; audience: Audience; title: string; version: string; uploadedAt: string; uploadedBy: number; size: number };
export const MAX_MANUAL_BYTES = 10 * 1024 * 1024;
export function canManageManuals(user: any) {
  return user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital');
}
export function manualAudience(value: string): Audience {
  if (value !== 'staff' && value !== 'risk_manager') throw new BadRequestException('กลุ่มคู่มือไม่ถูกต้อง');
  return value;
}
@Injectable()
export class ManualsService {
  private readonly dir = resolve(process.env.UPLOAD_DIR || './uploads', 'manuals');
  private async versions(): Promise<Manual[]> {
    let names: string[];
    try { names = await readdir(this.dir); } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const rows = await Promise.all(names.filter(n => /^[a-f0-9-]{36}\.json$/.test(n)).map(async n => JSON.parse(await readFile(join(this.dir, n), 'utf8')) as Manual));
    return rows.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.id.localeCompare(a.id));
  }
  async list() {
    const rows = await this.versions();
    return (['staff', 'risk_manager'] as Audience[]).map(audience => ({ audience, manual: rows.find(m => m.audience === audience) || null }));
  }
  async upload(audienceValue: string, titleValue: string, versionValue: string, file: {buffer: Buffer; size: number; mimetype: string} | undefined, user: any) {
    if (!canManageManuals(user)) throw new ForbiddenException('เฉพาะ Admin หรือ RM ระดับโรงพยาบาลที่อัปเดตคู่มือได้');
    const audience = manualAudience(audienceValue);
    const title = String(titleValue || '').trim();
    const version = String(versionValue || '').trim();
    if (!title || title.length > 150 || !version || version.length > 50) throw new BadRequestException('กรอกชื่อคู่มือและฉบับให้ครบ');
    if (!file || file.size > MAX_MANUAL_BYTES || file.buffer.length !== file.size || file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('เลือกไฟล์ PDF ขนาดไม่เกิน 10 MB');
    }
    await mkdir(this.dir, {recursive: true, mode: 0o700});
    const id = randomUUID();
    const manual: Manual = {id, audience, title, version, uploadedAt: new Date().toISOString(), uploadedBy: Number(user.id), size: file.size};
    await writeFile(join(this.dir, `${id}.pdf`), file.buffer, {flag: 'wx', mode: 0o600});
    // Publish metadata only after the complete PDF is stored. Old editions remain intact.
    await writeFile(join(this.dir, `${id}.tmp`), JSON.stringify(manual), {flag: 'wx', mode: 0o600});
    await rename(join(this.dir, `${id}.tmp`), join(this.dir, `${id}.json`));
    return manual;
  }
  async content(audienceValue: string) {
    const audience = manualAudience(audienceValue);
    const manual = (await this.versions()).find(m => m.audience === audience);
    if (!manual) throw new NotFoundException('ยังไม่มีคู่มือสำหรับกลุ่มนี้');
    return readFile(join(this.dir, `${manual.id}.pdf`));
  }
}
