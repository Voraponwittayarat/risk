import { Controller, Get, Query, Param, Post, Body, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { GetIncidentsQueryDto } from './dto/get-incidents-query.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve a paginated and filtered list of risk incidents' })
  @ApiResponse({ status: 200, description: 'Successful retrieval of incidents.' })
  findAll(@Query() query: GetIncidentsQueryDto, @Request() req) {
    return this.incidentsService.findAll(query, req.user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Retrieve statistics and KPIs for Dashboard' })
  getStats(@Request() req) {
    return this.incidentsService.getStats(req.user);
  }

  @Get('form-data')
  @ApiOperation({ summary: 'Retrieve master lookup data for incident form' })
  getFormData() {
    return this.incidentsService.getFormData();
  }

  @Get('matrix/stats')
  @ApiOperation({ summary: 'Retrieve 5x5 Risk Matrix data for confirmed incidents' })
  getRiskMatrixStats(@Query() query: any) {
    return this.incidentsService.getRiskMatrixStats(query);
  }

  @Get('reports/analytics')
  @ApiOperation({ summary: 'Retrieve summary reports and breakdown by program & department' })
  getReportAnalytics(@Query() query: any) {
    return this.incidentsService.getReportAnalytics(query);
  }

  @Get('risk-register/summary')
  @ApiOperation({ summary: 'Retrieve enterprise Risk Register master profile and scores' })
  getRiskRegister(@Query() query: any) {
    return this.incidentsService.getRiskRegister(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single risk incident by ID with review timeline' })
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new risk incident' })
  create(@Body() createDto: CreateIncidentDto, @Request() req) {
    return this.incidentsService.create(createDto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing risk incident' })
  update(@Param('id') id: string, @Body() updateDto: UpdateIncidentDto) {
    return this.incidentsService.update(+id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition risk incident status across lifecycle' })
  updateStatus(
    @Param('id') id: string, 
    @Body() body: { status_risk: string; note?: string },
    @Request() req
  ) {
    return this.incidentsService.updateStatus(+id, body.status_risk, req.user, body.note);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Add a review note or cause analysis log' })
  addReview(
    @Param('id') id: string,
    @Body() reviewDto: any,
    @Request() req
  ) {
    return this.incidentsService.addReview(+id, reviewDto, req.user);
  }

  @Post(':id/forward')
  @ApiOperation({ summary: 'Forward incident to Lead Team or Department for joint co-review' })
  forwardIncident(
    @Param('id') id: string,
    @Body() forwardDto: { sendto_team_id?: number; sendto_department_id?: string; refer_type?: string; note?: string },
    @Request() req
  ) {
    return this.incidentsService.forwardIncident(+id, forwardDto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a risk incident' })
  remove(@Param('id') id: string) {
    return this.incidentsService.remove(+id);
  }
}
