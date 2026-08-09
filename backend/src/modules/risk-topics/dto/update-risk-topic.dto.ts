import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateRiskTopicDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsInt()
  groupId?: number | null;

  @IsOptional()
  @IsInt()
  programId?: number | null;

  @IsOptional()
  @IsInt()
  typeId?: number | null;

  @IsOptional()
  @IsInt()
  levelId?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
