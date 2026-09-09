import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CapaService } from './capa.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { CreateEffectivenessReviewDto } from './dto/create-effectiveness-review.dto';
import { DecideCapaClosureDto } from './dto/decide-capa-closure.dto';
import { UpdateCapaDto } from './dto/update-capa.dto';

@Controller('capa')
@UseGuards(JwtAuthGuard)
export class CapaController {
  constructor(private readonly service: CapaService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('nrls_code') nrls_code?: string,
    @Query('due') due?: string,
    @Query('incident_id') incident_id?: string,
  ) {
    return this.service.findMonitoringActions(req.user, {
      status,
      nrls_code,
      due,
      incident_id: incident_id ? Number(incident_id) : undefined,
    });
  }

  @Get('department-response')
  departmentResponse(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.departmentResponse(req.user, from, to);
  }

  @Get('alerts')
  alerts(@Request() req: any) { return this.service.alerts(req.user); }

  @Get('incident/:incidentId')
  findByIncident(@Param('incidentId', ParseIntPipe) incidentId: number, @Request() req: any) {
    return this.service.findByIncident(incidentId, req.user);
  }

  @Post()
  create(@Body() dto: CreateCapaDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Post('process-escalations')
  processEscalations(@Request() req: any) {
    return this.service.processEscalations(req.user);
  }

  @Patch(':id/progress')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCapaDto, @Request() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Post(':id/effectiveness-reviews')
  recordEffectiveness(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEffectivenessReviewDto,
    @Request() req: any,
  ) {
    return this.service.recordEffectiveness(id, dto, req.user);
  }

  @Post(':id/closure-decision')
  decideClosure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideCapaClosureDto,
    @Request() req: any,
  ) {
    return this.service.decideClosure(id, dto, req.user);
  }
}
