import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ManualsService } from './manuals.service';

describe('manual publication', () => {
  let service: ManualsService;
  let dir: string;
  let oldDir: string | undefined;
  const admin = {id: 1, role: 'admin'};
  const pdf = {buffer: Buffer.from('%PDF-1.7\nsynthetic test'), size: 23, mimetype: 'application/pdf'};
  beforeEach(async () => {
    oldDir = process.env.UPLOAD_DIR;
    dir = await mkdtemp(join(tmpdir(), 'riskhrms-manual-test-'));
    process.env.UPLOAD_DIR = dir;
    service = new ManualsService();
    pdf.size = pdf.buffer.length;
  });
  afterEach(async () => {
    if (oldDir === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = oldDir;
    await rm(dir, {recursive: true, force: true});
  });
  it('returns two empty audiences and a clear missing-file error', async () => {
    expect(await service.list()).toEqual([{audience:'staff',manual:null},{audience:'risk_manager',manual:null}]);
    await expect(service.content('staff')).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each([{id:2,role:'staff'},{id:2,role:'head'},{id:2,role:'rm_committee',rmScope:'department'}])('rejects unauthorized publication without writing files: %j', async user => {
    await expect(service.upload('staff','Test','1',pdf,user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await readdir(dir)).toEqual([]);
  });
  it('rejects forged PDFs, oversized files, invalid audiences and blank metadata', async () => {
    for (const [audience,title,file] of [['staff','Test',{...pdf,buffer:Buffer.from('HTML'),size:4}],['staff','Test',{...pdf,size:11*1024*1024}],['../../escape','Test',pdf],['staff','',pdf]] as const) {
      await expect(service.upload(audience,title,'1',file,admin)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(await readdir(dir)).toEqual([]);
  });
  it('publishes separately by audience, retains earlier editions and survives restart', async () => {
    const first = await service.upload('staff','Staff','1',pdf,admin);
    await service.upload('risk_manager','RM','1',pdf,{id:3,role:'rm_committee',rmScope:'hospital'});
    // Explicit clock avoids a tie between publications in one millisecond.
    const clock = jest.spyOn(Date.prototype,'toISOString').mockReturnValue('2099-01-01T00:00:00.000Z');
    const latest = await service.upload('staff','Staff updated','2',pdf,admin);
    clock.mockRestore();
    const restarted = new ManualsService();
    expect((await restarted.list())[0].manual?.id).toBe(latest.id);
    expect((await restarted.list())[1].manual?.title).toBe('RM');
    expect(await restarted.content('staff')).toEqual(pdf.buffer);
    expect(await readdir(join(dir,'manuals'))).toContain(`${first.id}.pdf`);
  });
});
