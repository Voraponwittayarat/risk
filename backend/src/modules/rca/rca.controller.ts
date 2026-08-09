import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RcaService, EvaluateCriteriaDto, CreateRcaCaseDto, CreateStandardRcaDto, AiAssistDto } from './rca.service';

@ApiTags('RCA')
@Controller('rca')
export class RcaController {
  constructor(private readonly rcaService: RcaService) {}

  @Post('ai-assist')
  @ApiOperation({ summary: 'Generate comprehensive AI RCA recommendations for hospital incidents' })
  generateAiAssistance(@Body() dto: AiAssistDto) {
    return this.rcaService.generateAiAssistance(dto);
  }

  @Post('evaluate-criteria')
  @ApiOperation({ summary: 'Evaluate if an incident matches Wang Chao Hospital RCA criteria & 9 Standards' })
  evaluateCriteria(@Body() dto: EvaluateCriteriaDto) {
    return this.rcaService.evaluateCriteria(dto);
  }

  @Get('overview-stats')
  @ApiOperation({ summary: 'Get unified statistics for all RCA modes' })
  getOverviewStats() {
    return this.rcaService.getOverviewStats();
  }

  @Get('incident-reviews')
  @ApiOperation({ summary: 'Get list of incident reviews with 4M1E analysis' })
  getIncidentReviews() {
    return this.rcaService.getIncidentReviews();
  }

  @Get('by-incident/:incidentId')
  @ApiOperation({ summary: 'Get RCA cases linked to specific incident ID' })
  getByIncident(@Param('incidentId') incidentId: string) {
    return this.rcaService.getByIncident(Number(incidentId));
  }

  // ================= Mini & Concise RCA =================
  @Get('cases')
  @ApiOperation({ summary: 'Get list of Mini and Concise RCA cases' })
  getMiniConciseList(@Query('type') type?: 'mini' | 'concise') {
    return this.rcaService.getMiniConciseList(type);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get Mini or Concise RCA case by ID' })
  getMiniConciseById(@Param('id') id: string) {
    return this.rcaService.getMiniConciseById(id);
  }

  @Post('cases')
  @ApiOperation({ summary: 'Create Mini or Concise RCA case' })
  createMiniConcise(@Body() data: CreateRcaCaseDto) {
    return this.rcaService.createMiniConcise(data);
  }

  @Patch('cases/:id')
  @ApiOperation({ summary: 'Update Mini or Concise RCA case' })
  updateMiniConcise(@Param('id') id: string, @Body() data: Partial<CreateRcaCaseDto>) {
    return this.rcaService.updateMiniConcise(id, data);
  }

  @Delete('cases/:id')
  @ApiOperation({ summary: 'Delete Mini or Concise RCA case' })
  deleteMiniConcise(@Param('id') id: string) {
    return this.rcaService.deleteMiniConcise(id);
  }

  // ================= Standard Full RCA =================
  @Get('standard')
  @ApiOperation({ summary: 'Get list of Standard Full RCA cases' })
  getStandardList() {
    return this.rcaService.getStandardList();
  }

  @Get('standard/:id')
  @ApiOperation({ summary: 'Get Standard Full RCA case by ID' })
  getStandardById(@Param('id') id: string) {
    return this.rcaService.getStandardById(id);
  }

  @Post('standard')
  @ApiOperation({ summary: 'Create Standard Full RCA case' })
  createStandard(@Body() data: CreateStandardRcaDto) {
    return this.rcaService.createStandard(data);
  }

  @Patch('standard/:id')
  @ApiOperation({ summary: 'Update Standard Full RCA case' })
  updateStandard(@Param('id') id: string, @Body() data: Partial<CreateStandardRcaDto>) {
    return this.rcaService.updateStandard(id, data);
  }

  @Delete('standard/:id')
  @ApiOperation({ summary: 'Delete Standard Full RCA case' })
  deleteStandard(@Param('id') id: string) {
    return this.rcaService.deleteStandard(id);
  }
}
