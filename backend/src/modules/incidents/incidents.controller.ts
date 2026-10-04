import { Controller, Get, Query, Param, Post, Body, Patch, Delete, UseGuards, Request, UseInterceptors, UploadedFiles, BadRequestException, Res, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { GetIncidentsQueryDto } from './dto/get-incidents-query.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { ConfirmClassificationDto } from './dto/confirm-classification.dto';
import { TeamBatchReviewDto } from './dto/team-batch-review.dto';
import { DeleteIncidentDto } from './dto/delete-incident.dto';
import { CreateIncidentReviewDto } from './dto/create-incident-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { readFile, unlink } from 'fs/promises';

import { TelegramService } from './telegram.service';
import { deidentifyIncidentText, normalizeAiRiskSuggestions } from './ai-incident-assistant.utils';
import { MAX_REVIEW_ATTACHMENT_BYTES, MAX_REVIEW_ATTACHMENT_FILES, REVIEW_ATTACHMENT_EXTENSIONS } from './review-attachments';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly telegramService: TelegramService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve a paginated and filtered list of risk incidents' })
  @ApiResponse({ status: 200, description: 'Successful retrieval of incidents.' })
  findAll(@Query() query: GetIncidentsQueryDto, @Request() req) {
    return this.incidentsService.findAll(query, req.user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Retrieve statistics and KPIs for Dashboard' })
  getStats(@Request() req) {
    return this.incidentsService.getStats(req.user);
  }

  @Get('form-data')
  @ApiOperation({ summary: 'Retrieve master lookup data for incident form' })
  getFormData() {
    return this.incidentsService.getFormData();
  }

  @Get('matrix/stats')
  @ApiOperation({ summary: 'Retrieve 5x5 Risk Matrix data for confirmed incidents' })
  getRiskMatrixStats(@Query() query: any, @Request() req) {
    return this.incidentsService.getRiskMatrixStats(query, req.user);
  }

  @Get('reports/decision-support')
  getDecisionSupport(@Query() query: any, @Request() req) {
    return this.incidentsService.getDecisionSupport(query, req.user);
  }

  @Get('reports/analytics')
  @ApiOperation({ summary: 'Retrieve summary reports and breakdown by program & department' })
  getReportAnalytics(@Query() query: any, @Request() req) {
    return this.incidentsService.getReportAnalytics(query, req.user);
  }

  @Get('reports/individual-monthly-stats')
  @ApiOperation({ summary: 'Retrieve monthly risk reporting stats per individual person by department/group' })
  getIndividualMonthlyStats(
    @Query('department_group_id') department_group_id?: string,
    @Query('department_id') department_id?: string,
    @Query('year') year?: string,
    @Query('year_type') year_type?: string,
    @Request() req?: any,
  ) {
    return this.incidentsService.getIndividualMonthlyStats({
      department_group_id: department_group_id ? Number(department_group_id) : undefined,
      department_id: department_id ? Number(department_id) : undefined,
      year: year ? Number(year) : undefined,
      year_type: year_type || 'calendar',
    }, req?.user);
  }

  @Get('reports/department-monthly-stats')
  @ApiOperation({ summary: 'Retrieve KPI percentage of risk reporting across all departments monthly and yearly' })
  getDepartmentMonthlyStats(
    @Query('department_group_id') department_group_id?: string,
    @Query('year') year?: string,
    @Query('year_type') year_type?: string,
    @Request() req?: any,
  ) {
    return this.incidentsService.getDepartmentMonthlyStats({
      department_group_id: department_group_id ? Number(department_group_id) : undefined,
      year: year ? Number(year) : undefined,
      year_type: year_type || 'fiscal',
    }, req?.user);
  }

  @Get('reports/program-severity-matrix')
  @ApiOperation({ summary: 'Retrieve REP1_14 Program Severity Matrix with GHI extraction and RCA timings' })
  getProgramSeverityMatrix(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year') year?: string,
    @Query('year_type') year_type?: string,
    @Request() req?: any,
  ) {
    return this.incidentsService.getProgramSeverityMatrix({
      startDate,
      endDate,
      year: year ? Number(year) : undefined,
      year_type: year_type || 'fiscal',
    }, req?.user);
  }

  @Get('reports/department-staff-stats')
  @ApiOperation({ summary: 'Retrieve count of reporting staff members per department monthly (Excel format)' })
  getDepartmentStaffReportingStats(
    @Query('department_group_id') department_group_id?: string,
    @Query('year') year?: string,
    @Query('year_type') year_type?: string,
    @Request() req?: any,
  ) {
    return this.incidentsService.getDepartmentStaffReportingStats({
      department_group_id: department_group_id ? Number(department_group_id) : undefined,
      year: year ? Number(year) : undefined,
      year_type: year_type || 'fiscal',
    }, req?.user);
  }


  @Get('telegram/settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Retrieve telegram settings' })
  getTelegramSettings() {
    return this.telegramService.getTelegramSettings();
  }

  @Post('telegram/settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Update telegram settings' })
  updateTelegramSettings(@Body() body: { botToken: string; chatId: string; rcaAppointmentsEnabled?: boolean }) {
    return this.telegramService.updateTelegramSettings(body.botToken, body.chatId, body.rcaAppointmentsEnabled);
  }

  @Post('telegram/trigger-summary')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger telegram summary alert' })
  async triggerSummaryAlert() {
    try {
      await this.telegramService.sendSummaryAlert();
      return { 
        success: true, 
        chatId: process.env.TELEGRAM_CHAT_ID, 
        token: process.env.TELEGRAM_BOT_TOKEN 
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @Get('risk-register/summary')
  @ApiOperation({ summary: 'Retrieve enterprise Risk Register master profile and scores' })
  getRiskRegister(@Query() query: any, @Request() req) {
    return this.incidentsService.getRiskRegister(query, req.user);
  }

  @Get('my-reported')
  @ApiOperation({ summary: 'Retrieve incidents reported by the current user with fiscal year filter' })
  getMyReported(@Request() req, @Query('fiscalYear') fiscalYear?: string, @Query('summary') summary?: string) {
    return this.incidentsService.getMyReported(req.user, fiscalYear, summary === 'true');
  }

  @Get('tab-counts')
  @ApiOperation({ summary: 'Retrieve per-tab incident counts for the current user scope' })
  getTabCounts(@Request() req, @Query('scope_type') scope_type?: string) {
    return this.incidentsService.getTabCounts(req.user, scope_type);
  }

  @Get('team/workspace')
  @ApiOperation({ summary: 'Retrieve the assigned team portfolio, grouped risk signals, and scoped risk matrix' })
  getTeamWorkspace(@Query() query: any, @Request() req) {
    return this.incidentsService.getTeamWorkspace(req.user, query);
  }

  @Post('team/batch-review')
  @ApiOperation({ summary: 'Start or complete a review for multiple incidents assigned to the same team' })
  batchReviewTeam(@Body() dto: TeamBatchReviewDto, @Request() req) {
    return this.incidentsService.batchReviewTeam(dto, req.user);
  }

  @Get(':id/attachments/:filename')
  @ApiOperation({ summary: 'Download an incident attachment after record-level authorization' })
  async getAttachment(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const filePath = await this.incidentsService.getAttachmentPath(+id, filename, req.user);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(filePath);
  }

  @Get(':id/reviews/:reviewId/attachments/:filename')
  @ApiOperation({ summary: 'Download a review attachment after record-level authorization' })
  async getReviewAttachment(
    @Param('id') id: string,
    @Param('reviewId') reviewId: string,
    @Param('filename') filename: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const filePath = await this.incidentsService.getReviewAttachmentPath(+id, +reviewId, filename, req.user);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(filePath);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single risk incident by ID with review timeline' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.incidentsService.findOne(+id, req.user);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload up to 3 images (max 3MB each) for an incident' })
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, process.env.UPLOAD_DIR || './uploads');
        },
        filename: (req, file, cb) => {
          const uploaderId = Number((req as any).user?.id || (req as any).user?.userId || 0);
          if (!Number.isInteger(uploaderId) || uploaderId <= 0) {
            return cb(new BadRequestException('ไม่พบตัวตนผู้ใช้อัปโหลด'), '');
          }
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extensionByMime: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
          };
          cb(null, `${uploaderId}-${uniqueSuffix}${extensionByMime[file.mimetype] || extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: {
        fileSize: 3 * 1024 * 1024, // 3MB
      },
      fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          return cb(new BadRequestException('อนุญาตให้อัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น! (jpg, jpeg, png, webp)'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFiles(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('ไม่พบไฟล์ที่อัปโหลด');
    }
    const hasValidSignature = (file: any, bytes: Buffer): boolean => {
      if (file.mimetype === 'image/jpeg') {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      }
      if (file.mimetype === 'image/png') {
        return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      }
      if (file.mimetype === 'image/webp') {
        return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
          && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
      }
      return false;
    };
    const validations = await Promise.all(files.map(async (file) => {
      const bytes = await readFile(file.path);
      return hasValidSignature(file, bytes);
    }));
    if (validations.some((valid) => !valid)) {
      await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
      throw new BadRequestException('เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพที่อนุญาต');
    }
    return files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new risk incident' })
  create(@Body() createDto: CreateIncidentDto, @Request() req) {
    return this.incidentsService.create(createDto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing risk incident' })
  update(@Param('id') id: string, @Body() updateDto: UpdateIncidentDto, @Request() req) {
    return this.incidentsService.update(+id, updateDto, req.user);
  }

  @Patch(':id/classification')
  @ApiOperation({ summary: 'Validate and confirm NRLS classification' })
  confirmClassification(@Param('id') id: string, @Body() dto: ConfirmClassificationDto, @Request() req) {
    return this.incidentsService.confirmClassification(+id, dto.reason, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition risk incident status across lifecycle' })
  updateStatus(
    @Param('id') id: string, 
    @Body() body: { status_risk: string; note?: string; department_id?: string; sendto_department_id?: string; user_ir_type?: string },
    @Request() req
  ) {
    return this.incidentsService.updateStatus(+id, body.status_risk, req.user, body.note, body.department_id, body.sendto_department_id, body.user_ir_type);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Add a review note with optional image/PDF evidence (10 MB combined)' })
  @UseInterceptors(FilesInterceptor('files', MAX_REVIEW_ATTACHMENT_FILES, {
    storage: memoryStorage(),
    limits: { fileSize: MAX_REVIEW_ATTACHMENT_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!REVIEW_ATTACHMENT_EXTENSIONS[file.mimetype]) {
        return cb(new BadRequestException('รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF'), false);
      }
      cb(null, true);
    },
  }))
  addReview(
    @Param('id') id: string,
    @Body() reviewDto: CreateIncidentReviewDto,
    @UploadedFiles() files: any[],
    @Request() req
  ) {
    if (typeof reviewDto.contributing_factors === 'string') {
      try {
        reviewDto.contributing_factors = JSON.parse(reviewDto.contributing_factors);
      } catch {
        throw new BadRequestException('ข้อมูล Contributing Factor ไม่ถูกต้อง');
      }
    }
    return files?.length
      ? this.incidentsService.addReviewWithAttachments(+id, reviewDto, files, req.user)
      : this.incidentsService.addReview(+id, reviewDto, req.user);
  }

  @Patch(':id/review/outcome')
  @ApiOperation({ summary: 'Record the department outcome selected from the review summary' })
  updateReviewOutcome(
    @Param('id') id: string,
    @Body() body: { review_id: number; structured_review_id: number; department_outcome: string },
    @Request() req,
  ) {
    return this.incidentsService.updateReviewOutcome(+id, body, req.user);
  }

  @Post(':id/review/send-rca')
  @ApiOperation({ summary: 'Queue a reviewed incident in the RCA center' })
  sendReviewToRca(@Param('id') id: string, @Request() req, @Body() body: { direct?: boolean; reason?: string }) {
    return this.incidentsService.sendReviewToRca(+id, req.user, body);
  }

  @Post(':id/forward')
  @ApiOperation({ summary: 'Forward incident to Lead Team or Department for joint co-review' })
  forwardIncident(
    @Param('id') id: string,
    @Body() forwardDto: { sendto_team_id?: number; sendto_department_id?: string; refer_type?: string; note?: string },
    @Request() req
  ) {
    return this.incidentsService.forwardIncident(+id, forwardDto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Safely delete a duplicate incident with a retained audit record' })
  remove(@Param('id') id: string, @Body() dto: DeleteIncidentDto, @Request() req) {
    return this.incidentsService.remove(+id, dto, req.user);
  }

  @Post('ai-chat')
  @ApiOperation({ summary: 'Chat with AI assistant to extract incident data from natural language' })
  async aiChat(@Body() body: { messages: { role: string; text: string }[] }) {
    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (process.env.AI_ASSISTANT_ENABLED !== 'true' || !apiKey) {
      throw new ServiceUnavailableException('AI assistant is disabled until the hospital explicitly enables its external data-processing policy');
    }
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      throw new BadRequestException('กรุณาระบุข้อความเหตุการณ์');
    }

    const safeMessages = body.messages.slice(-10).map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      text: deidentifyIncidentText(message.text),
    }));
    const riskCandidates = await this.incidentsService.getAiRiskCandidates(
      safeMessages.map((message) => message.text).join('\n'),
    );

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: String(process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
    });

    const systemPrompt = `Role & Persona:
คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับระบบบริหารความเสี่ยงโรงพยาบาล (Hospital Risk Management System - HRMS) หน้าที่หลักของคุณคือการวิเคราะห์ข้อความหรือเสียงสนทนาที่บุคลากรทางการแพทย์รายงานเหตุการณ์ความเสี่ยง (Natural Language) และสกัดข้อมูลเพื่อนำไปเตรียมกรอกลงในฟอร์มของระบบอัตโนมัติได้อย่างแม่นยำ

Instructions:
เมื่อได้รับข้อความรายงานเหตุการณ์จากผู้ใช้ ให้คุณวิเคราะห์และสกัดข้อมูลออกมาในรูปแบบ JSON เท่านั้น โดยอ้างอิงคีย์และฟิลด์ข้อมูลให้สอดคล้องกับโครงสร้างฐานข้อมูล (Table: riskregister) ดังต่อไปนี้:

1. ข้อมูลเบื้องต้น (Basic Information)
- "date_report": (วันรายงาน/วันที่เกิดเหตุ) สกัดวันที่จากบริบท ให้อยู่ในรูปแบบ YYYY-MM-DD (หากผู้ใช้ใช้คำว่า "เมื่อวาน", "วันนี้" ให้คำนวณเปรียบเทียบจากวันที่ปัจจุบัน หากไม่ระบุให้ปล่อยเป็น null) — วันที่ปัจจุบัน: ${new Date().toISOString().split('T')[0]}
- "time_report": (เวลารายงาน/เวลาที่เกิดเหตุ) สกัดเวลาที่เกิดเหตุ ให้อยู่ในรูปแบบ HH:MM (หากไม่ระบุ ให้ปล่อยเป็น null)
- "duration_name": (เวรที่เกิดเหตุ) วิเคราะห์จากเวลาที่เกิดเหตุหรือสกัดจากสิ่งที่ผู้ใช้ระบุโดยตรง (เช้า=08:00-15:59, บ่าย=16:00-23:59, ดึก=00:00-07:59) เพื่อให้ระบบนำไปจับคู่กับ duration_id
- "location_name": (สถานที่เกิดความเสี่ยง) สกัดชื่อวอร์ด, แผนก, หรือบริเวณที่เกิดเหตุ (เช่น ER, OPD, IPD, ห้องจ่ายยา) เพื่อให้ระบบนำไปจับคู่กับ location_id

2. ข้อมูลความเสี่ยง (Risk Details)
- "riskstore_name": (ชื่อความเสี่ยง) วิเคราะห์เหตุการณ์และสรุปชื่อความเสี่ยงที่สอดคล้องกับเหตุการณ์มากที่สุด (เช่น ผู้ป่วยหกล้ม, จ่ายยาผิดพลาด, อุปกรณ์ชำรุด) เพื่อให้ระบบนำไปจับคู่กับ riskstore_id
- "risk_suggestions": เสนอหัวข้อความเสี่ยง 1–3 ตัวเลือก โดยเลือกได้เฉพาะรหัสจากรายการมาตรฐานของโรงพยาบาลด้านล่าง ห้ามสร้างรหัสหรือชื่อขึ้นเอง เรียงจากสอดคล้องมากที่สุด หากข้อมูลยังไม่พอให้ส่ง []
- "level_id": (ระดับความรุนแรง) ประเมินระดับความรุนแรงเบื้องต้นตามบริบท โดยใช้ตาราง A–I สำหรับอุบัติการณ์ทางคลินิก หรือ 1–5 สำหรับอุบัติการณ์ทั่วไป:

  === ระดับความรุนแรง ===
  [คลินิก] A:ยังไม่เกิด B:เกิดแต่ไม่ถึงผู้ป่วย C:ถึงผู้ป่วยแต่ไม่อันตราย D:ต้องเฝ้าระวัง E:อันตรายชั่วคราว/ต้องรักษา F:นอนรพ.นานขึ้น G:อันตรายถาวร H:CPR I:เสียชีวิต
  [ทั่วไป] 1:ยังไม่เกิด/ไม่ถึงเป้าหมาย 2:ไม่เสียหาย/เสียหาย<5k 3:เสียหายชั่วคราว/5k-10k 4:เสียหายร้ายแรง/ร้องเรียนภายนอก/10k-50k 5:เสียหายถาวร/ฟ้องร้อง/>50k
  (หากข้อมูลไม่เพียงพอให้ระบุเป็น null)

- "affected": (ผู้เสียหาย/ได้รับผลกระทบ) สกัดข้อมูลผู้ที่ได้รับผลกระทบจากเหตุการณ์ เป็น Array เช่น ["ผู้ป่วย"], ["เจ้าหน้าที่"], ["ผู้ป่วย", "ญาติ"] หากไม่ระบุให้เป็น null ห้ามคาดเดา
- "detail": เรียบเรียงรายละเอียดเป็นภาษาไทยทางการแบบบันทึกอุบัติการณ์ 2–5 ประโยค โดยเรียง เหตุการณ์ → การช่วยเหลือ/แก้ไขทันที → ผลลัพธ์ เท่าที่ผู้ใช้ให้ข้อมูล ใช้ถ้อยคำเป็นกลาง ไม่กล่าวโทษ ไม่เติมข้อเท็จจริง การวินิจฉัย ผลกระทบ หรือการรักษาที่ผู้ใช้ไม่ได้ระบุ และไม่ใส่ชื่อ HN AN เลขบัตร หรือเบอร์โทร

รายการหัวข้อความเสี่ยงมาตรฐานที่อนุญาตให้เสนอ (ข้อมูลจริงจากระบบ):
${JSON.stringify(riskCandidates)}

Rules for Output:
- แสดงผลลัพธ์เป็นโครงสร้าง JSON Format เท่านั้น ห้ามพิมพ์ข้อความอธิบายใดๆ นอกเหนือจาก JSON และห้ามใช้ markdown code fence (ห้ามใส่ \`\`\`json)
- Smart Clarification & Conversational AI:
  1. สร้างฟิลด์ "reply_message" เสมอ เพื่อตอบกลับผู้ใช้แบบเป็นธรรมชาติและเห็นอกเห็นใจ
  2. ใน "reply_message" ให้สรุปทวนข้อมูลที่ได้รับมาแล้วร้อยเรียงเป็นเรื่องราวให้ต่อเนื่อง (เช่น "บันทึกข้อมูลว่าวันนี้เวลา 8.00 น. มีเหตุการณ์พบงูในแผนกนะคะ...")
  3. หากข้อมูลสำคัญ (date_report, time_report, location_name, riskstore_name) ยังขาดหายไป ให้นำคำถาม 1 ข้อไปต่อท้ายใน "reply_message" อย่างแนบเนียน และนำคำถามเดียวกันนั้นไปใส่ในฟิลด์ "clarification_question" ด้วย
  4. หากข้อมูลครบแล้ว ให้ "clarification_question" เป็น null แต่ "reply_message" เป็นคำอธิบายสรุปเหตุการณ์ทั้งหมดสั้นๆ

โครงสร้าง JSON ที่ต้องส่งกลับ:
{
  "date_report": "YYYY-MM-DD หรือ null",
  "time_report": "HH:MM หรือ null",
  "duration_name": "เช้า หรือ บ่าย หรือ ดึก หรือ null",
  "location_name": "ชื่อสถานที่หรือ null",
  "riskstore_name": "ชื่อความเสี่ยงหรือ null",
  "risk_suggestions": [
    { "nrls_code": "รหัสจากรายการที่ให้เท่านั้น", "confidence": 0-100, "reason": "เหตุผลสั้นๆ ที่เชื่อมกับข้อเท็จจริงในเหตุการณ์" }
  ],
  "level_id": "A–I หรือ 1–5 หรือ null",
  "severity": "1–5 หรือ null",
  "affected": ["ผู้ป่วย"] หรือ null,
  "detail": "สรุปเหตุการณ์ด้วยภาษาทางการแพทย์หรือ null",
  "reply_message": "ข้อความตอบกลับผู้ใช้ (สรุปสิ่งที่ทราบ + คำถามที่ต้องการถาม)",
  "clarification_question": "คำถามหากข้อมูลไม่ครบ หรือ null"
}`;

    const history = safeMessages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
    const lastMessage = safeMessages[safeMessages.length - 1].text;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '{"clarification_question": "สวัสดีค่ะ! กรุณาเล่าเหตุการณ์ความเสี่ยงที่เกิดขึ้นได้เลยค่ะ"}' }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(lastMessage);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if any
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      const riskSuggestions = normalizeAiRiskSuggestions(parsed?.risk_suggestions, riskCandidates);
      return {
        ...parsed,
        risk_suggestions: riskSuggestions,
      };
    } catch {
      return { clarification_question: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองอีกครั้งนะคะ', raw: cleaned };
    }
  }
}
