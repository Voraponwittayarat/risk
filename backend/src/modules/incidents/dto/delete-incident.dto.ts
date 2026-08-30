import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class DeleteIncidentDto {
  @IsInt()
  @Min(1)
  duplicate_of_incident_id: number;

  @IsString()
  @MinLength(10)
  reason: string;
}
