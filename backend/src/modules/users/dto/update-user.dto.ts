import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { USER_ROLES } from './create-user.dto';
import type { UserRole } from './create-user.dto';
import { RM_SCOPES } from '../../auth/rm-scope.utils';
import type { RmScope } from '../../auth/rm-scope.utils';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(13, 13, { message: 'เลขประจำตัวประชาชนต้องมี 13 หลัก' })
  cid?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsInt()
  departmentId2?: number;

  @IsOptional()
  @IsInt()
  positionId?: number;

  @IsOptional()
  @IsInt()
  teamId?: number | null;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsIn(RM_SCOPES)
  rmScope?: RmScope | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
