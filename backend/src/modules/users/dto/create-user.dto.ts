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

export const USER_ROLES = ['admin', 'rm_committee', 'head', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

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
}
