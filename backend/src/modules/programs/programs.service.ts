import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.program.findMany({
      orderBy: { program_id: 'asc' },
    });
  }

  async findOne(id: number) {
    const program = await this.prisma.program.findUnique({
      where: { program_id: id },
    });
    if (!program) {
      throw new NotFoundException(`Program #${id} not found`);
    }
    return program;
  }

  async create(data: { program_name: string }, user?: any) {
    return this.prisma.program.create({
      data: {
        program_name: data.program_name,
        create_date: new Date(),
        modify_date: new Date(),
        created_by: user?.id || 1,
      },
    });
  }

  async update(id: number, data: { program_name: string }, user?: any) {
    const program = await this.prisma.program.findUnique({ where: { program_id: id } });
    if (!program) {
      throw new NotFoundException(`Program #${id} not found`);
    }
    return this.prisma.program.update({
      where: { program_id: id },
      data: {
        program_name: data.program_name,
        modify_date: new Date(),
        updated_by: user?.id || 1,
      },
    });
  }

  async remove(id: number) {
    const program = await this.prisma.program.findUnique({ where: { program_id: id } });
    if (!program) {
      throw new NotFoundException(`Program #${id} not found`);
    }
    return this.prisma.program.delete({
      where: { program_id: id },
    });
  }
}
