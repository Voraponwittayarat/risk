import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      member: { findFirst: jest.fn() },
      department: { findUnique: jest.fn() },
      team: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a token and canonical user after valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7, username: 'tester', cid: '1234567890123', role: 99,
      password_hash: await bcrypt.hash('correct-password', 4), blocked_at: null,
      require_password_change: false,
    });
    prisma.member.findFirst.mockResolvedValue({
      cid: '1234567890123', member_name: 'ผู้ใช้ทดสอบ', department_id1: 2,
      department_id2: 0, role: 'staff', rm_scope: null, team_id: null,
    });
    prisma.department.findUnique.mockResolvedValue({ id: 2, depart_name: 'หน่วยงานทดสอบ', depart_group_id: 1 });

    await expect(service.login('tester', 'correct-password')).resolves.toMatchObject({
      access_token: 'signed-token',
      user: { id: 7, username: 'tester', role: 'staff', department_id: 2 },
    });
  });
});
