import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ description: 'Date of the incident report' })
  @IsNotEmpty()
  @IsDateString()
  date_report: string;

  @ApiProperty({ description: 'Time of the incident report' })
  @IsNotEmpty()
  @IsDateString()
  time_report: string;

  @ApiPropertyOptional({ description: 'Duration ID' })
  @IsOptional()
  @IsInt()
  duration_id?: number;

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsInt()
  location_id?: number;

  @ApiProperty({ description: 'User IR Type' })
  @IsNotEmpty()
  @IsString()
  user_ir_type: string;

  @ApiPropertyOptional({ description: 'User IR' })
  @IsOptional()
  @IsInt()
  user_ir?: number;

  @ApiPropertyOptional({ description: 'Program ID' })
  @IsOptional()
  @IsInt()
  program_id?: number;

  @ApiProperty({ description: 'Severity level ID' })
  @IsNotEmpty()
  @IsString()
  level_id: string;

  @ApiProperty({ description: 'Risk store ID' })
  @IsNotEmpty()
  @IsInt()
  riskstore_id: number;

  @ApiPropertyOptional({ description: 'Detailed description of the incident' })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ description: 'HOSxP detail' })
  @IsOptional()
  @IsString()
  detail_hosxp?: string;

  @ApiPropertyOptional({ description: 'Who or what is affected (string or array of strings)' })
  @IsOptional()
  affected?: string | string[];


  @ApiPropertyOptional({ description: 'Edit status' })
  @IsOptional()
  @IsString()
  edit?: string;

  @ApiPropertyOptional({ description: 'Basic problem summary' })
  @IsOptional()
  @IsString()
  problem_basic?: string;

  @ApiPropertyOptional({ description: 'Inform ID' })
  @IsOptional()
  @IsInt()
  inform_id?: number;

  @ApiPropertyOptional({ description: 'Current status of the risk' })
  @IsOptional()
  @IsString()
  status_risk?: string;

  @ApiProperty({ description: 'Department ID' })
  @IsNotEmpty()
  @IsString()
  department_id: string;
}
