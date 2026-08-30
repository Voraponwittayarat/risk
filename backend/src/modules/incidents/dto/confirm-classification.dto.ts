import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmClassificationDto {
  @ApiPropertyOptional({ description: 'เหตุผลหรือหมายเหตุการยืนยัน/จัดประเภทใหม่' })
  @IsOptional()
  @IsString()
  reason?: string;
}
