import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateIncidentDto } from './create-incident.dto';

export class UpdateIncidentDto extends PartialType(PickType(CreateIncidentDto, [
  'date_report', 'time_report', 'duration_id', 'location_id', 'user_ir_type', 'user_ir',
  'level_id', 'riskstore_id', 'nrls_code', 'detail', 'detail_hosxp', 'affected', 'edit',
  'problem_basic', 'inform_id', 'department_id', 'image',
] as const)) {
  @ApiPropertyOptional({ description: 'เหตุผลในการเปลี่ยนการจัดประเภท NRLS' })
  @IsOptional()
  @IsString()
  classification_reason?: string;
}
