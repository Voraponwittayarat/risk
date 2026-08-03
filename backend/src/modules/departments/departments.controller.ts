import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';

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
}
