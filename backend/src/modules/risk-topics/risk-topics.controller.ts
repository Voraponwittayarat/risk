import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateRiskTopicDto } from './dto/create-risk-topic.dto';
import { UpdateRiskTopicDto } from './dto/update-risk-topic.dto';
import { RiskTopicsService } from './risk-topics.service';

@Controller('risk-topics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RiskTopicsController {
  constructor(private readonly riskTopicsService: RiskTopicsService) {}

  @Get()
  findAll() {
    return this.riskTopicsService.findAll();
  }

  @Get('metadata')
  metadata() {
    return this.riskTopicsService.metadata();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.riskTopicsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRiskTopicDto) {
    return this.riskTopicsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRiskTopicDto) {
    return this.riskTopicsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.riskTopicsService.remove(id);
  }
}
