import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  RiskAnalysisService,
  CreateRiskAnalysisDto,
  UpdateRiskAnalysisDto,
  CreateRiskReviewDto,
} from './risk-analysis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('risk-analysis')
@UseGuards(JwtAuthGuard)
export class RiskAnalysisController {
  constructor(private readonly riskAnalysisService: RiskAnalysisService) {}

  @Get()
  findAll(
    @Query('scope_level') scope_level?: string,
    @Query('department_id') department_id?: string,
    @Query('program_id') program_id?: string,
    @Query('status') status?: string,
    @Query('risk_level') risk_level?: string,
    @Query('search') search?: string,
    @Query('due_soon') due_soon?: string,
    @Request() req?: any,
  ) {
    return this.riskAnalysisService.findAll({
      scope_level,
      department_id,
      program_id: program_id ? Number(program_id) : undefined,
      status,
      risk_level,
      search,
      due_soon: due_soon === 'true',
    }, req?.user);
  }

  @Get('stats')
  getStats(
    @Query('scope_level') scope_level?: string,
    @Query('department_id') department_id?: string,
    @Query('due_soon') due_soon?: string,
    @Request() req?: any,
  ) {
    return this.riskAnalysisService.getStats({
      scope_level,
      department_id,
      due_soon: due_soon === 'true',
    }, req?.user);
  }

  @Get('nine-standards')
  getNineStandards(@Query('department_id') department_id: string, @Request() req: any) {
    return this.riskAnalysisService.getNineStandards({ department_id }, req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.riskAnalysisService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateRiskAnalysisDto, @Request() req: any) {
    return this.riskAnalysisService.create(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRiskAnalysisDto,
    @Request() req: any,
  ) {
    return this.riskAnalysisService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.riskAnalysisService.remove(id, req.user);
  }

  @Post(':id/reviews')
  addReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRiskReviewDto,
    @Request() req: any,
  ) {
    return this.riskAnalysisService.addReview(id, dto, req.user);
  }
}
