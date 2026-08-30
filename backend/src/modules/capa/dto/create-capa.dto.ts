import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCapaDto {
  @IsInt()
  @Min(1)
  incident_id!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  action!: string;

  @IsIn(['CORRECTIVE', 'PREVENTIVE'])
  action_type!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  responsible_user_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  responsible_member_cid?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  responsible_team_id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  responsible_department_id!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  responsible_display_name!: string;

  @IsDateString()
  due_date!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  effectiveness_criteria!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  baseline_value?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  target_value!: string;

  @IsDateString()
  effectiveness_due_date!: string;
}
