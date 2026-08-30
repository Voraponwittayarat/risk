import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamBatchReviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  incident_ids: number[];

  @IsIn(['START', 'COMPLETE'])
  action: 'START' | 'COMPLETE';

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  team_id?: number;
}
