import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetIncidentsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', minimum: 1, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by start date (YYYY-MM-DD)' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (YYYY-MM-DD)' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Filter by severity level ID' })
  @IsOptional()
  level_id?: string;

  @ApiPropertyOptional({ description: 'Filter by risk status' })
  @IsOptional()
  status_risk?: string;

  @ApiPropertyOptional({ description: 'Search term for keyword in detail or id' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by program ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  program_id?: number;

  @ApiPropertyOptional({ description: 'Filter by scope type (primary, secondary, team)' })
  @IsOptional()
  scope_type?: string;

  @ApiPropertyOptional({ description: 'Filter by sendto team ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sendto_team_id?: number;

  @ApiPropertyOptional({ description: 'Field to sort by (id, level_id, status_risk, date_report, register_date, department_id, sendto_department_id)' })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction (asc, desc)', enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
