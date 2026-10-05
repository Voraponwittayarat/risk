import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ManualsModule } from './manuals.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('authenticated manual API', () => {
  let app: INestApplication;
  let dir: string;
  let previous: string | undefined;
  beforeAll(async () => {
    previous = process.env.UPLOAD_DIR;
    dir = await mkdtemp(join(tmpdir(),'riskhrms-manual-api-'));
    process.env.UPLOAD_DIR = dir;
    const module = await Test.createTestingModule({imports:[ManualsModule]}).overrideGuard(JwtAuthGuard).useValue({canActivate(context:any){
      const req = context.switchToHttp().getRequest();
      const role = req.headers['x-test-role'];
      if (!role) throw new UnauthorizedException();
      req.user = {id:1,role};return true;
    }}).compile();
    app = module.createNestApplication();await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if(previous===undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR=previous;
    await rm(dir,{recursive:true,force:true});
  });
  it('requires authentication to list and read PDFs', async () => {
    await request(app.getHttpServer()).get('/manuals').expect(401);
    await request(app.getHttpServer()).get('/manuals/staff/pdf').expect(401);
  });
  it('rejects publication by staff before accepting multipart content', async () => {
    await request(app.getHttpServer()).post('/manuals/staff').set('x-test-role','staff').expect(403);
  });
  it('accepts multipart PDF publication and returns the bytes to an authenticated reader', async () => {
    const pdf = Buffer.from('%PDF-1.7\nSynthetic test PDF\n%%EOF');
    await request(app.getHttpServer()).post('/manuals/staff').set('x-test-role','admin').field('title','API test').field('version','1').attach('file',pdf,{filename:'test.pdf',contentType:'application/pdf'}).expect(201);
    const list = await request(app.getHttpServer()).get('/manuals').set('x-test-role','staff').expect(200);
    expect(list.body[0].manual.title).toBe('API test');
    const response = await request(app.getHttpServer()).get('/manuals/staff/pdf').set('x-test-role','staff').expect(200).expect('Content-Type',/application\/pdf/).expect('Cache-Control','private, no-store');
    expect(response.body).toEqual(pdf);
    await request(app.getHttpServer()).get('/manuals/other/pdf').set('x-test-role','staff').expect(400);
  });
});
