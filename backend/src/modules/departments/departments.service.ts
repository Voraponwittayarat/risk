import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: {
        depart_name: 'asc',
      },
    });
  }

  async findGroups() {
    return this.prisma.departmentgroup.findMany({
      orderBy: {
        depart_group_name: 'asc',
      },
    });
  }
}

