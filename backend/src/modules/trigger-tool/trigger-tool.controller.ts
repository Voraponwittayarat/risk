import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TriggerToolService, CreateTriggerMasterDto, UpdateTriggerMasterDto, CreateMedicalRecordReviewDto } from './trigger-tool.service';

@ApiTags('Trigger Tools')
@Controller('trigger-tools')
export class TriggerToolController {
  constructor(private readonly triggerToolService: TriggerToolService) {}

  // ================= Master Data =================
  @Get('master')
  @ApiOperation({ summary: 'Get all trigger tool master items' })
  getMasterList(@Query('onlyActive') onlyActive?: string) {
    return this.triggerToolService.getMasterList(onlyActive === 'true');
  }

  @Get('master/:id')
  @ApiOperation({ summary: 'Get trigger tool master item by ID' })
  getMasterById(@Param('id', ParseIntPipe) id: number) {
    return this.triggerToolService.getMasterById(id);
  }

  @Post('master')
  @ApiOperation({ summary: 'Create a new trigger tool master item' })
  createMaster(@Body() data: CreateTriggerMasterDto) {
    return this.triggerToolService.createMaster(data);
  }

  @Patch('master/:id')
  @ApiOperation({ summary: 'Update a trigger tool master item' })
  updateMaster(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateTriggerMasterDto) {
    return this.triggerToolService.updateMaster(id, data);
  }

  @Delete('master/:id')
  @ApiOperation({ summary: 'Delete a trigger tool master item' })
  deleteMaster(@Param('id', ParseIntPipe) id: number) {
    return this.triggerToolService.deleteMaster(id);
  }

  // ================= Reviews =================
  @Get('reviews')
  @ApiOperation({ summary: 'Get medical record reviews' })
  getReviews(
    @Query('department') department?: string,
    @Query('has_adverse_event') hasAdverseEvent?: string,
    @Query('has_trigger') hasTrigger?: string,
  ) {
    return this.triggerToolService.getReviews({
      department,
      has_adverse_event: hasAdverseEvent !== undefined ? hasAdverseEvent === 'true' : undefined,
      has_trigger: hasTrigger !== undefined ? hasTrigger === 'true' : undefined,
    });
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get single medical record review' })
  getReviewById(@Param('id', ParseIntPipe) id: number) {
    return this.triggerToolService.getReviewById(id);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Create medical record review' })
  createReview(@Body() data: CreateMedicalRecordReviewDto) {
    return this.triggerToolService.createReview(data);
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Update medical record review' })
  updateReview(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<CreateMedicalRecordReviewDto>) {
    return this.triggerToolService.updateReview(id, data);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete medical record review' })
  deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.triggerToolService.deleteReview(id);
  }

  @Post('reviews/:id/forward-to-rca')
  @ApiOperation({ summary: 'Forward finding to Standard RCA' })
  forwardToRca(@Param('id', ParseIntPipe) id: number) {
    return this.triggerToolService.forwardToRca(id);
  }
}
