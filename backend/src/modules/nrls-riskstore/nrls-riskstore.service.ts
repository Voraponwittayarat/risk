import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NrlsRiskstoreService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.nRLS_riskstore.findMany({
      include: {
        local_risks: true,
        program: true,
      },
    });
  }

  async findOne(nrls_code: string) {
    return this.prisma.nRLS_riskstore.findUnique({
      where: { nrls_code },
      include: {
        local_risks: true,
        program: true,
      },
    });
  }
  async update(nrls_code: string, data: any) {
    return this.prisma.nRLS_riskstore.update({
      where: { nrls_code },
      data,
    });
  }

  async updateMapping(nrls_code: string, riskstore_ids: number[], program_id?: number | null) {
    // Update program_id in NRLS_riskstore if provided
    if (program_id !== undefined) {
      await this.prisma.nRLS_riskstore.update({
        where: { nrls_code },
        data: { program_id },
      });
    }

    // First, unset nrls_code for any riskstore currently mapped to this nrls_code
    await this.prisma.riskstore.updateMany({
      where: { nrls_code },
      data: { nrls_code: null },
    });
    // Then set nrls_code for the provided list
    if (riskstore_ids && riskstore_ids.length > 0) {
      const type_id = nrls_code.startsWith('C') ? 2 : nrls_code.startsWith('G') ? 1 : undefined;
      
      const updateData: any = { nrls_code };
      if (type_id !== undefined) {
        updateData.type_id = type_id;
      }
      
      await this.prisma.riskstore.updateMany({
        where: { riskstore_id: { in: riskstore_ids } },
        data: updateData,
      });
    }
    return { success: true };
  }
}
