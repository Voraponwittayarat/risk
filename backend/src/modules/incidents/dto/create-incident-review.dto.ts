import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIncidentReviewDto {
  @IsOptional()
  @IsIn(['IN_PROGRESS', 'RESOLVED', 'UNRESOLVED'])
  department_outcome?: string;

  @IsOptional()
  @IsIn(['NONE', 'INFORM', 'CO_REVIEW', 'ADDITIONAL_ACTION', 'TRANSFER_OWNER'])
  forwarding_purpose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  forwarded_department_id?: string;

  @IsOptional()
  @IsIn(['NO_NEW_MEASURE', 'SEND_RCA', 'REQUEST_CO_REVIEW'])
  learning_action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  co_review_department_id?: string;

  @IsOptional()
  @IsIn(['OWNER', 'CO_REVIEW', 'RM'])
  review_role?: string;

  @IsOptional()
  @IsDateString()
  review_date?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  findings?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  recommendation?: string;

  @IsOptional()
  @IsIn(['SUBMIT', 'ACCEPT', 'RETURN'])
  decision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  returned_reason?: string;

  // Kept for compatibility with the existing review form.
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notereview?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cause_problem?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reviewresults_id?: number;

  @IsOptional()
  contributing_factors?: unknown;
}
