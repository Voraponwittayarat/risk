import { Controller, Get, Patch, Param, Body, UseGuards, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all departments for dropdowns' })
  @ApiResponse({ status: 200, description: 'Successful retrieval of departments.' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get('groups')
  @ApiOperation({ summary: 'Retrieve a list of all department groups (กลุ่มงาน)' })
  @ApiResponse({ status: 200, description: 'Successful retrieval of department groups.' })
  findGroups() {
    return this.departmentsService.findGroups();
  }

  @Patch(':id/telegram')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Telegram settings for a department' })
  updateTelegram(
    @Param('id') id: string,
    @Body() body: { telegram_token: string; telegram_chat_id: string }
  ) {
    return this.departmentsService.updateTelegram(+id, body.telegram_token, body.telegram_chat_id);
  }

  @Post(':id/telegram/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test Telegram message to the department' })
  testTelegram(@Param('id') id: string) {
    return this.departmentsService.testTelegram(+id);
  }
}

