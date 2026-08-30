import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { canonicalRole, legacyFieldsForRole } from './role.utils';
import { normalizeRmScope } from './rm-scope.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(username: string, password: string) {
    // 1. Find user in the user table
    const dbUser = await this.prisma.user.findUnique({
      where: { username }
    });

    if (!dbUser) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    if (dbUser.blocked_at) {
      throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    // 2. Validate password (converting PHP's $2y$ prefix to $2a$ for Node.js compatibility)
    const hashToCompare = dbUser.password_hash.replace(/^\$2y\$/, '$2a$');
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);
    if (!isPasswordValid) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // 3. Find corresponding profile in member table by CID
    let member: any = await this.prisma.member.findFirst({
      where: { cid: dbUser.cid || '' }
    });

    // If no member profile exists for this CID, create a fallback or mock one based on user.role
    if (!member) {
      member = {
        id: dbUser.id,
        cid: dbUser.cid || '',
        member_name: dbUser.username,
        department_id1: 1,
        department_id2: 0,
        role: canonicalRole(undefined, dbUser.role),
        rm_scope: null,
        team_id: 1,
      } as any;
    }

    // 4. Find Department Group to determine scope
    let departmentGroup: number | null = null;
    let departmentName: string | null = null;
    let teamName: string | null = null;
    if (member.department_id1) {
      const dept = await this.prisma.department.findUnique({
        where: { id: member.department_id1 }
      });
      if (dept) {
        departmentGroup = dept.depart_group_id;
        departmentName = dept.depart_name;
      }
    }
    if (member.team_id) {
      const team = await this.prisma.team.findUnique({ where: { id: member.team_id } });
      teamName = team?.team_name || null;
    }

    // 5. Create JWT Payload
    const role = canonicalRole(member.role, dbUser.role);
    const rmScope = normalizeRmScope(role, member.rm_scope);

    const payload = {
      sub: dbUser.id,
      username: dbUser.username,
      cid: member.cid,
      name: member.member_name,
      departmentId: member.department_id1,
      departmentName: departmentName,
      departmentId2: member.department_id2,
      departmentGroup: departmentGroup,
      teamId: member.team_id,
      teamName,
      role,
      rmScope,
      require_password_change: (dbUser as any).require_password_change || false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: member.member_name,
        department_id: member.department_id1,
        department_id2: member.department_id2,
        role,
        teamId: member.team_id,
        teamName,
        rmScope,
        require_password_change: (dbUser as any).require_password_change || false,
      }
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      throw new NotFoundException('ไม่พบอีเมลนี้ในระบบ');
    }

    // Generate random password (e.g. 8 characters)
    const tempPassword = Math.random().toString(36).slice(-8);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);
    
    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'รหัสผ่านชั่วคราวสำหรับเข้าสู่ระบบ',
      text: `สวัสดี,\n\nมีการร้องขอรหัสผ่านใหม่สำหรับบัญชีของคุณ\nรหัสผ่านชั่วคราวของคุณคือ: ${tempPassword}\n\nกรุณาเข้าสู่ระบบด้วยรหัสผ่านนี้และระบบจะให้คุณเปลี่ยนรหัสผ่านใหม่ทันที\n\nหากคุณไม่ได้เป็นผู้ขอรหัสผ่านใหม่ กรุณาติดต่อผู้ดูแลระบบ`,
    };

    try {
      await transporter.sendMail(mailOptions);

      // Save to db, updating password_hash and require_password_change flag
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password_hash: hashedPassword,
          require_password_change: true
        } as any
      });

      return { message: 'รหัสผ่านชั่วคราวถูกส่งไปยังอีเมลของคุณแล้ว' };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new BadRequestException('ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบการตั้งค่า SMTP (ระบบยังคงใช้รหัสผ่านเดิม)');
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('ไม่พบบัญชีผู้ใช้');
    }

    const hashToCompare = user.password_hash.replace(/^\$2y\$/, '$2a$');
    const isPasswordValid = await bcrypt.compare(currentPassword, hashToCompare);

    if (!isPasswordValid) {
      throw new UnauthorizedException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Convert the hash back to Yii2 compatible format if necessary
    // Yii2 uses $2y$ prefix
    const yii2HashedPassword = hashedNewPassword.replace(/^\$2a\$/, '$2y$');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: yii2HashedPassword,
        require_password_change: false
      } as any
    });

    return { message: 'เปลี่ยนรหัสผ่านสำเร็จ' };
  }

  async register(username: string, password: string, email: string, cid: string) {
    const member = await this.prisma.member.findFirst({
      where: { cid: cid.trim() },
    });

    if (!member) {
      throw new BadRequestException('ไม่มีเลขรหัสของคุณในระบบกรุณาติดต่อผู้ดูแลระบบ');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { cid: cid.trim() },
          { username: username.trim() },
          { email: email.trim().toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.cid === cid.trim()) {
        throw new ConflictException('เลขบัตรประชาชนนี้มีการลงทะเบียนบัญชีไว้แล้ว');
      }
      throw new ConflictException('ชื่อผู้ใช้หรืออีเมลนี้มีผู้ใช้งานแล้ว');
    }

    const hash = await bcrypt.hash(password, 12);
    const passwordHash = hash.replace(/^\$2b\$/, '$2y$'); // Yii2 compatible
    const now = Math.floor(Date.now() / 1000);
    const crypto = require('crypto');

    const role = canonicalRole(member.role);
    const legacy = legacyFieldsForRole(role);

    const user = await this.prisma.user.create({
      data: {
        username: username.trim(),
        password_hash: passwordHash,
        email: email.trim().toLowerCase(),
        cid: cid.trim(),
        auth_key: crypto.randomBytes(16).toString('hex'),
        confirmed_at: now,
        role: legacy.userRole,
        created_at: now,
        updated_at: now,
      },
    });

    return { id: user.id, message: 'ลงทะเบียนสำเร็จ คุณสามารถเข้าสู่ระบบได้ทันที' };
  }
}
