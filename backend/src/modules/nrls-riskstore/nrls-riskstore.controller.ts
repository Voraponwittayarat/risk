import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NrlsRiskstoreService } from './nrls-riskstore.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('NRLS Riskstore')
@Controller('nrls-riskstore')
export class NrlsRiskstoreController {
  constructor(private readonly nrlsRiskstoreService: NrlsRiskstoreService) {}

  @Get()
  findAll() {
    return this.nrlsRiskstoreService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.nrlsRiskstoreService.findOne(code);
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':code')
  update(@Param('code') code: string, @Body() updateData: any) {
    return this.nrlsRiskstoreService.update(code, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':code/mapping')
  updateMapping(@Param('code') code: string, @Body() body: { riskstore_ids: number[] }) {
    return this.nrlsRiskstoreService.updateMapping(code, body.riskstore_ids);
  }
}
