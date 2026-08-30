import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEffectivenessReviewDto {
  @IsDateString()
  review_date!: string;

  @IsIn(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'])
  result!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  measured_value?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  observation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  evidence?: string;

  @IsOptional()
  @IsBoolean()
  followup_required?: boolean;
}
