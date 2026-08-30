import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCapaDto {
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'IMPLEMENTED', 'REWORK', 'COMPLETED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  evidence?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  effectiveness_criteria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  baseline_value?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  target_value?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  effectiveness_due_date?: string;
}
