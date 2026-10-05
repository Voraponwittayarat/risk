import { Body, Controller, ForbiddenException, Get, Injectable, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { canManageManuals, MAX_MANUAL_BYTES, ManualsService } from './manuals.service';

@Injectable()
export class ManualPublisherGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (!canManageManuals(context.switchToHttp().getRequest().user)) throw new ForbiddenException('ไม่มีสิทธิ์อัปเดตคู่มือ');
    return true;
  }
}

@Controller('manuals')
@UseGuards(JwtAuthGuard)
export class ManualsController {
  constructor(private readonly manuals: ManualsService) {}
  @Get()
  list() { return this.manuals.list(); }
  @Get(':audience/pdf')
  async pdf(@Param('audience') audience: string, @Res() res: Response) {
    const content = await this.manuals.content(audience);
    res.set({'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="riskhrms-manual.pdf"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox"});
    res.send(content);
  }
  @Post(':audience')
  @UseGuards(ManualPublisherGuard)
  @UseInterceptors(FileInterceptor('file', {storage: memoryStorage(), limits: {fileSize: MAX_MANUAL_BYTES, files: 1, fields: 2}}))
  upload(@Param('audience') audience: string, @Body('title') title: string, @Body('version') version: string, @UploadedFile() file: any, @Req() req: any) {
    return this.manuals.upload(audience, title, version, file, req.user);
  }
}
