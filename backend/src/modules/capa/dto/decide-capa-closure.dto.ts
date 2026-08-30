import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DecideCapaClosureDto {
  @IsIn(['APPROVE', 'RETURN'])
  decision!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  note?: string;
}
