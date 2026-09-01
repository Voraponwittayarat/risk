import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CANONICAL_ROLES } from '../../auth/role.utils';
import type { CanonicalRole } from '../../auth/role.utils';
import { RM_SCOPES } from '../../auth/rm-scope.utils';
import type { RmScope } from '../../auth/rm-scope.utils';
import { MAPPING_PERMISSIONS } from '../../auth/mapping-permission.utils';
import type { MappingPermission } from '../../auth/mapping-permission.utils';

export const USER_ROLES = CANONICAL_ROLES;
export type UserRole = CanonicalRole;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72)
  password: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @Length(13, 13, { message: 'เลขประจำตัวประชาชนต้องมี 13 หลัก' })
  cid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsInt()
  departmentId: number;

  @IsOptional()
  @IsInt()
  departmentId2?: number;

  @IsInt()
  positionId: number;

  @IsOptional()
  @IsInt()
  teamId?: number | null;

  @IsIn(USER_ROLES)
  role: UserRole;

  @IsOptional()
  @IsIn(RM_SCOPES)
  rmScope?: RmScope | null;

  @IsOptional()
  @IsIn(MAPPING_PERMISSIONS)
  mappingPermission?: MappingPermission;
}
