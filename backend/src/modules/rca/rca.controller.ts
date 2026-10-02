import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RcaService, EvaluateCriteriaDto, CreateRcaCaseDto, CreateStandardRcaDto, CompleteStandardRcaDto, AiAssistDto } from './rca.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RCA')
@Controller('rca')
@UseGuards(JwtAuthGuard)
export class RcaController {
  constructor(private readonly rcaService: RcaService) {}

  @Post('ai-assist')
  @ApiOperation({ summary: 'Generate comprehensive AI RCA recommendations for hospital incidents' })
  generateAiAssistance(@Body() dto: AiAssistDto) {
    return this.rcaService.generateAiAssistance(dto);
  }

  @Post('evaluate-criteria')
  @ApiOperation({ summary: 'Evaluate if an incident matches Wang Chao Hospital RCA criteria & 9 Standards' })
  evaluateCriteria(@Body() dto: EvaluateCriteriaDto, @Request() req: any) {
    return this.rcaService.evaluateCriteria(dto, req.user);
  }

  @Post('incidents/:incidentId/reevaluate')
  reevaluate(@Param('incidentId') incidentId: string, @Body() body: { reason: string }, @Request() req: any) {
    if (!['admin', 'rm_committee'].includes(req.user?.role)) throw new ForbiddenException('เฉพาะ RM/Admin เท่านั้นที่ประเมิน RCA ซ้ำได้');
    return this.rcaService.reevaluateIncident(Number(incidentId), Number(req.user?.id), body.reason, req.user);
  }

  @Get('overview-stats')
  @ApiOperation({ summary: 'Get unified statistics for all RCA modes' })
  getOverviewStats(@Request() req: any, @Query('summary') summary?: string) {
    return this.rcaService.getOverviewStats(req.user, summary === 'true');
  }

  @Get('incident-reviews')
  @ApiOperation({ summary: 'Get list of incident reviews with 4M1E analysis' })
  getIncidentReviews(@Request() req: any) {
    return this.rcaService.getIncidentReviews(req.user);
  }

  @Get('by-incident/:incidentId')
  @ApiOperation({ summary: 'Get RCA cases linked to specific incident ID' })
  getByIncident(@Param('incidentId') incidentId: string, @Request() req: any) {
    return this.rcaService.getByIncident(Number(incidentId), req.user);
  }

  // ================= Mini & Concise RCA =================
  @Get('cases')
  @ApiOperation({ summary: 'Get list of Mini and Concise RCA cases' })
  getMiniConciseList(@Request() req: any, @Query('type') type?: 'mini' | 'concise') {
    return this.rcaService.getMiniConciseList(type, req.user);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get Mini or Concise RCA case by ID' })
  getMiniConciseById(@Param('id') id: string, @Request() req: any) {
    return this.rcaService.getMiniConciseById(id, req.user);
  }

  @Post('cases')
  @ApiOperation({ summary: 'Create Mini or Concise RCA case' })
  createMiniConcise(@Body() data: CreateRcaCaseDto, @Request() req: any) {
    return this.rcaService.createMiniConcise({ ...data, created_by: Number(req.user?.id) }, req.user);
  }

  @Patch('cases/:id')
  @ApiOperation({ summary: 'Update Mini or Concise RCA case' })
  updateMiniConcise(@Param('id') id: string, @Body() data: Partial<CreateRcaCaseDto>, @Request() req: any) {
    return this.rcaService.updateMiniConcise(id, data, req.user);
  }

  @Delete('cases/:id')
  @ApiOperation({ summary: 'Delete Mini or Concise RCA case' })
  deleteMiniConcise(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: any) {
    return this.rcaService.deleteMiniConcise(id, body.reason, Number(req.user?.id), req.user);
  }

  // ================= Standard Full RCA =================
  @Get('standard-candidates')
  @ApiOperation({ summary: 'Search incidents that can be used to open a new Standard Full RCA' })
  getStandardCandidates(@Request() req: any, @Query('search') search?: string) {
    return this.rcaService.getStandardCandidates(search, req.user);
  }

  @Get('collaboration-options')
  @ApiOperation({ summary: 'Get departments and cross-functional teams available for RCA collaboration' })
  getCollaborationOptions() {
    return this.rcaService.getCollaborationOptions();
  }

  @Get('standard')
  @ApiOperation({ summary: 'Get list of Standard Full RCA cases' })
  getStandardList(@Request() req: any) {
    return this.rcaService.getStandardList(req.user);
  }

  @Get('standard/:id')
  @ApiOperation({ summary: 'Get Standard Full RCA case by ID' })
  getStandardById(@Param('id') id: string, @Request() req: any) {
    return this.rcaService.getStandardById(id, req.user);
  }

  @Post('standard')
  @ApiOperation({ summary: 'Create Standard Full RCA case' })
  createStandard(@Body() data: CreateStandardRcaDto, @Request() req: any) {
    return this.rcaService.createStandard({ ...data, created_by: Number(req.user?.id) }, req.user);
  }

  @Patch('standard/:id')
  @ApiOperation({ summary: 'Update Standard Full RCA case' })
  updateStandard(@Param('id') id: string, @Body() data: Partial<CreateStandardRcaDto>, @Request() req: any) {
    return this.rcaService.updateStandard(id, data, req.user);
  }

  @Post('standard/:id/complete')
  @ApiOperation({ summary: 'Complete Standard RCA and create or link its Risk Register profile' })
  completeStandard(@Param('id') id: string, @Body() data: CompleteStandardRcaDto, @Request() req: any) {
    return this.rcaService.completeStandard(id, data, req.user);
  }

  @Post('standard/:id/discharge-without-rca')
  dischargeWithoutRca(@Param('id') id: string, @Body() data: { reason: string; expected_version: number }, @Request() req: any) {
    return this.rcaService.dischargeWithoutRca(id, data, req.user);
  }

  @Delete('standard/:id')
  @ApiOperation({ summary: 'Delete Standard Full RCA case' })
  deleteStandard(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: any) {
    return this.rcaService.deleteStandard(id, body.reason, Number(req.user?.id), req.user);
  }
}
