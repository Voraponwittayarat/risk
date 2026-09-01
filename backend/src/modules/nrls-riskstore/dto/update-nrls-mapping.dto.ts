import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateNrlsMappingDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  riskstore_ids!: number[];

  @IsOptional()
  @IsInt()
  program_id?: number | null;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
