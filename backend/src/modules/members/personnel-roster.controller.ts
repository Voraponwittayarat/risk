import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PersonnelRosterService } from './personnel-roster.service';

@Controller('members/roster')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PersonnelRosterController {
  constructor(private readonly service: PersonnelRosterService) {}
  @Get('latest') latest() { return this.service.latest(); }
  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  preview(@UploadedFile() file: any, @Req() req: any) { return this.service.preview(file, req.user); }
  @Post('commit') commit(@Body() body: any, @Req() req: any) { return this.service.commit(body, req.user); }
}
