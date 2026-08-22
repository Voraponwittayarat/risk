import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new program' })
  create(@Body() createDto: { program_name: string }, @Request() req) {
    return this.programsService.create(createDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all programs' })
  findAll() {
    return this.programsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a program by id' })
  findOne(@Param('id') id: string) {
    return this.programsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a program' })
  update(@Param('id') id: string, @Body() updateDto: { program_name: string }, @Request() req) {
    return this.programsService.update(+id, updateDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a program' })
  remove(@Param('id') id: string) {
    return this.programsService.remove(+id);
  }
}
