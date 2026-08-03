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
} from '@nestjs/common';
import {
  RiskAnalysisService,
  CreateRiskAnalysisDto,
  UpdateRiskAnalysisDto,
  CreateRiskReviewDto,
} from './risk-analysis.service';

@Controller('risk-analysis')
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
  ) {
    return this.riskAnalysisService.findAll({
      scope_level,
      department_id,
      program_id: program_id ? Number(program_id) : undefined,
      status,
      risk_level,
      search,
      due_soon: due_soon === 'true',
    });
  }

  @Get('stats')
  getStats(
    @Query('scope_level') scope_level?: string,
    @Query('department_id') department_id?: string,
  ) {
    return this.riskAnalysisService.getStats({
      scope_level,
      department_id,
    });
  }

  @Get('nine-standards')
  getNineStandards() {
    return this.riskAnalysisService.getNineStandards();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.riskAnalysisService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRiskAnalysisDto) {
    return this.riskAnalysisService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRiskAnalysisDto,
  ) {
    return this.riskAnalysisService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.riskAnalysisService.remove(id);
  }

  @Post(':id/reviews')
  addReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRiskReviewDto,
  ) {
    return this.riskAnalysisService.addReview(id, dto);
  }
}
