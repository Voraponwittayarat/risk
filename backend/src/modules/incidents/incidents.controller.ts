import { Controller, Get, Query, Param, Post, Body, Patch, Delete, UseGuards, Request, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { GetIncidentsQueryDto } from './dto/get-incidents-query.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

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
  getRiskMatrixStats(@Query() query: any) {
    return this.incidentsService.getRiskMatrixStats(query);
  }

  @Get('reports/analytics')
  @ApiOperation({ summary: 'Retrieve summary reports and breakdown by program & department' })
  getReportAnalytics(@Query() query: any) {
    return this.incidentsService.getReportAnalytics(query);
  }

  @Get('risk-register/summary')
  @ApiOperation({ summary: 'Retrieve enterprise Risk Register master profile and scores' })
  getRiskRegister(@Query() query: any) {
    return this.incidentsService.getRiskRegister(query);
  }

  @Get('my-reported')
  @ApiOperation({ summary: 'Retrieve incidents reported by the current user with fiscal year filter' })
  getMyReported(@Request() req, @Query('fiscalYear') fiscalYear?: string) {
    return this.incidentsService.getMyReported(req.user, fiscalYear);
  }

  @Get('tab-counts')
  @ApiOperation({ summary: 'Retrieve per-tab incident counts for the current user scope' })
  getTabCounts(@Request() req, @Query('scope_type') scope_type?: string) {
    return this.incidentsService.getTabCounts(req.user, scope_type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single risk incident by ID with review timeline' })
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(+id);
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
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 3 * 1024 * 1024, // 3MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('อนุญาตให้อัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น! (jpg, jpeg, png, webp)'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFiles(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('ไม่พบไฟล์ที่อัปโหลด');
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
  update(@Param('id') id: string, @Body() updateDto: UpdateIncidentDto) {
    return this.incidentsService.update(+id, updateDto);
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
  @ApiOperation({ summary: 'Add a review note or cause analysis log' })
  addReview(
    @Param('id') id: string,
    @Body() reviewDto: any,
    @Request() req
  ) {
    return this.incidentsService.addReview(+id, reviewDto, req.user);
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
  @ApiOperation({ summary: 'Delete a risk incident' })
  remove(@Param('id') id: string) {
    return this.incidentsService.remove(+id);
  }

  @Post('ai-chat')
  @ApiOperation({ summary: 'Chat with AI assistant to extract incident data from natural language' })
  async aiChat(@Body() body: { messages: { role: string; text: string }[] }) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `Role & Persona:
คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับระบบบริหารความเสี่ยงโรงพยาบาล (Hospital Risk Management System - HRMS) หน้าที่หลักของคุณคือการวิเคราะห์ข้อความที่บุคลากรทางการแพทย์รายงานเหตุการณ์ความเสี่ยง (Natural Language) และสกัดข้อมูลเพื่อนำไปกรอกลงในฟอร์มของระบบอัตโนมัติได้อย่างแม่นยำ

Instructions:
เมื่อได้รับข้อความจากผู้ใช้ ให้คุณสกัดข้อมูลออกมาในรูปแบบ JSON เสมอ โดยมีโครงสร้างดังนี้:
{
  "date_report": "YYYY-MM-DD หรือ null",
  "time_report": "HH:MM หรือ null",
  "duration_name": "เช้า หรือ บ่าย หรือ ดึก หรือ null",
  "location_name": "ชื่อสถานที่หรือ null",
  "riskstore_name": "ชื่อความเสี่ยงหรือ null",
  "level_id": "A, B, C, D, E, F, G, H, หรือ I หรือ null",
  "severity": "1, 2, 3, 4, หรือ 5 หรือ null",
  "affected": ["ผู้ป่วย", "เจ้าหน้าที่", "ญาติ"] หรือ null,
  "detail": "สรุปเหตุการณ์ด้วยภาษาทางการแพทย์หรือ null",
  "clarification_question": "คำถามถามผู้ใช้หากข้อมูลไม่ครบ หรือ null ถ้าข้อมูลครบแล้ว"
}

=== ระดับความรุนแรงตามประเภทเหตุการณ์ (level_id: A–I) ===
ระดับ A: เหตุการณ์มีโอกาสที่จะก่อให้เกิดความผิดพลาด (แต่ยังไม่เกิด)
ระดับ B: เกิดความผิดพลาดขึ้นแล้ว แต่ยังไม่ถึงตัวผู้ป่วย
ระดับ C: เกิดความผิดพลาดและถึงตัวผู้ป่วยแล้ว แต่ไม่ทำให้เกิดอันตราย
ระดับ D: เกิดความผิดพลาดและถึงตัวผู้ป่วยแล้ว ต้องมีการเฝ้าระวังหรือติดตามอาการ
ระดับ E: เกิดความผิดพลาด ทำให้ผู้ป่วยได้รับอันตรายชั่วคราวและต้องได้รับการรักษา
ระดับ F: เกิดความผิดพลาด ทำให้ผู้ป่วยได้รับอันตรายชั่วคราวและต้องนอนโรงพยาบาลนานขึ้น
ระดับ G: เกิดความผิดพลาด ทำให้ผู้ป่วยได้รับอันตรายถาวร (เช่น สูญเสียอวัยวะ/การทำงานของอวัยวะ)
ระดับ H: เกิดความผิดพลาด ต้องทำการช่วยฟื้นคืนชีพ (CPR) หรือช่วยชีวิต
ระดับ I: เกิดความผิดพลาดและเป็นเหตุให้ผู้ป่วยเสียชีวิต

=== ระดับความรุนแรงของผลกระทบ (severity: 1–5) ===
1 = รุนแรงน้อยมาก: มีโอกาสเกิดความเสี่ยง/ความผิดพลาด แต่ยังไม่เกิด หรือเกิดแล้วแต่ยังไม่ถึงผู้รับบริการ/บุคลากร/ทรัพย์สิน/ระบบงาน (สอดคล้องกับระดับ A–B)
2 = รุนแรงน้อย: เกิดขึ้นแล้ว ส่งผลถึงผู้รับบริการแต่ไม่ก่อให้เกิดอันตราย หรือก่อให้เกิดอันตรายเล็กน้อย ต้องเฝ้าระวัง ความเสียหายทรัพย์สินไม่เกิน 5,000 บาท (สอดคล้องกับ C–D)
3 = รุนแรงปานกลาง: เกิดความเสียหายชั่วคราวต้องบำบัดแก้ไข ความเสียหายทรัพย์สิน 5,001–10,000 บาท (สอดคล้องกับ E–F)
4 = ค่อนข้างรุนแรง: เกิดความเสียหายร้ายแรง มีการร้องเรียน/สื่อมวลชนเกี่ยวข้อง ความเสียหายทรัพย์สิน 10,001–50,000 บาท (สอดคล้องกับ G)
5 = รุนแรงที่สุด: เกิดความเสียหายถาวร มีความเสี่ยง Sentinel Event มีโอกาสฟ้องร้อง ความเสียหายทรัพย์สินตั้งแต่ 50,000 บาทขึ้นไป (สอดคล้องกับ H–I)

Rules:
- ตอบ ONLY JSON เท่านั้น ไม่มีข้อความอื่น ไม่มี markdown code fence
- วันที่ปัจจุบัน: ${new Date().toISOString().split('T')[0]}
- ประเมิน level_id (A–I) และ severity (1–5) จากเนื้อหาเหตุการณ์ที่ผู้ใช้เล่า
- ถ้าข้อมูลสำคัญขาดหายหรือคลุมเครือ ให้ถามในฟิลด์ clarification_question ด้วยภาษาที่เป็นมิตรและเป็นธรรมชาติ
- ถ้าข้อมูลครบถ้วนแล้ว ให้ clarification_question เป็น null`;

    const history = body.messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
    const lastMessage = body.messages[body.messages.length - 1].text;

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
      return parsed;
    } catch {
      return { clarification_question: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองอีกครั้งนะคะ', raw: cleaned };
    }
  }
}
