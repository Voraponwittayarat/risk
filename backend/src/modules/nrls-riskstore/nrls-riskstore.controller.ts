import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NrlsRiskstoreService } from './nrls-riskstore.service';
import { ApiTags } from '@nestjs/swagger';
import { UpdateNrlsMappingDto } from './dto/update-nrls-mapping.dto';

@ApiTags('NRLS Riskstore')
@Controller('nrls-riskstore')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NrlsRiskstoreController {
  constructor(private readonly nrlsRiskstoreService: NrlsRiskstoreService) {}

  @Get()
  findAll() {
    return this.nrlsRiskstoreService.findAll();
  }

  @Get('mapping/context')
  @Roles('admin', 'rm_committee')
  getMappingContext(@Request() req) {
    return this.nrlsRiskstoreService.getMappingContext(req.user);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.nrlsRiskstoreService.findOne(code);
  }

  @Patch(':code')
  @Roles('admin')
  update(@Param('code') code: string, @Body() updateData: any) {
    return this.nrlsRiskstoreService.update(code, updateData);
  }

  @Patch(':code/mapping')
  @Roles('admin', 'rm_committee')
  updateMapping(
    @Param('code') code: string,
    @Body() dto: UpdateNrlsMappingDto,
    @Request() req,
  ) {
    return this.nrlsRiskstoreService.updateMapping(code, dto, req.user);
  }
}
