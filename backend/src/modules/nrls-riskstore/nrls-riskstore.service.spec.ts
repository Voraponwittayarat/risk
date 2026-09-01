import { ForbiddenException } from '@nestjs/common';
import { NrlsRiskstoreService } from './nrls-riskstore.service';

describe('NrlsRiskstoreService mapping permissions', () => {
  let prisma: any;
  let service: NrlsRiskstoreService;

  beforeEach(() => {
    prisma = {
      member: { findFirst: jest.fn() },
      nRLS_riskstore: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      riskstore: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      program: { findMany: jest.fn() },
      workflow_audit: { create: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };
    service = new NrlsRiskstoreService(prisma);
  });

  it('denies Mapping when Admin has turned the RM permission off', async () => {
    prisma.member.findFirst.mockResolvedValue({
      role: 'rm_committee',
      mapping_permission: 'none',
    });

    await expect(
      service.getMappingContext({ role: 'rm_committee', cid: '123' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.nRLS_riskstore.findMany).not.toHaveBeenCalled();
  });

  it('defaults existing RM users to full Mapping access', async () => {
    prisma.member.findFirst.mockResolvedValue({
      role: 'rm_committee',
      mapping_permission: null,
    });
    prisma.nRLS_riskstore.findMany.mockResolvedValue([]);
    prisma.riskstore.findMany.mockResolvedValue([]);
    prisma.program.findMany.mockResolvedValue([]);

    const result = await service.getMappingContext({
      role: 'rm_committee',
      cid: '123',
    });

    expect(result.permissions).toMatchObject({
      permission_level: 'full',
      can_full_edit: true,
      can_edit_program: true,
    });
  });

  it('allows a department RM with full permission to remove, reassign and change program', async () => {
    prisma.member.findFirst.mockResolvedValue({
      role: 'rm_committee',
      mapping_permission: 'full',
    });
    prisma.nRLS_riskstore.findUnique.mockResolvedValue({
      nrls_code: 'C101',
      program_id: 1,
    });
    prisma.riskstore.findMany
      .mockResolvedValueOnce([
        { riskstore_id: 1, nrls_code: 'C101', status: '1' },
      ])
      .mockResolvedValueOnce([
        { riskstore_id: 3, nrls_code: 'G202', status: '1' },
      ]);

    const result = await service.updateMapping(
      'C101',
      { riskstore_ids: [3], program_id: 2, reason: 'ปรับตามผลทบทวน' },
      {
        id: 9,
        cid: '123',
        role: 'rm_committee',
        rmScope: 'department',
        departmentId: 5,
      },
    );

    expect(result).toEqual({
      success: true,
      added: 1,
      removed: 1,
      reassigned: 1,
    });
    expect(prisma.nRLS_riskstore.update).toHaveBeenCalledWith({
      where: { nrls_code: 'C101' },
      data: { program_id: 2 },
    });
    expect(prisma.riskstore.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { nrls_code: 'C101', riskstore_id: { in: [1] } },
        data: expect.objectContaining({ nrls_code: null, updated_by: 9 }),
      }),
    );
    expect(prisma.workflow_audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity_type: 'NRLS_MAPPING',
        entity_id: 'C101',
        action: 'MAPPING_UPDATED',
        reason: 'ปรับตามผลทบทวน',
        changed_by: 9,
      }),
    });
  });

  it('keeps contribute-only RM from removing or moving existing Mapping', async () => {
    prisma.member.findFirst.mockResolvedValue({
      role: 'rm_committee',
      mapping_permission: 'contribute',
    });
    prisma.nRLS_riskstore.findUnique.mockResolvedValue({
      nrls_code: 'C101',
      program_id: 1,
    });
    prisma.riskstore.findMany
      .mockResolvedValueOnce([
        { riskstore_id: 1, nrls_code: 'C101', status: '1' },
      ])
      .mockResolvedValueOnce([
        { riskstore_id: 2, nrls_code: null, status: '1' },
      ]);

    const result = await service.updateMapping(
      'C101',
      { riskstore_ids: [2], reason: 'เพิ่มชื่อเดิม' },
      { id: 8, cid: '456', role: 'rm_committee', rmScope: 'hospital' },
    );

    expect(result).toMatchObject({
      success: true,
      added: 1,
      removed: 0,
      reassigned: 0,
    });
    expect(prisma.nRLS_riskstore.update).not.toHaveBeenCalled();
    expect(prisma.riskstore.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.riskstore.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { riskstore_id: { in: [1, 2] } },
      }),
    );
  });

  it('rejects reassignment for contribute-only RM', async () => {
    prisma.member.findFirst.mockResolvedValue({
      role: 'rm_committee',
      mapping_permission: 'contribute',
    });
    prisma.nRLS_riskstore.findUnique.mockResolvedValue({
      nrls_code: 'C101',
      program_id: 1,
    });
    prisma.riskstore.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { riskstore_id: 3, nrls_code: 'G202', status: '1' },
      ]);

    await expect(
      service.updateMapping(
        'C101',
        { riskstore_ids: [3], reason: 'ขอย้ายรายการ' },
        { id: 8, cid: '456', role: 'rm_committee' },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
