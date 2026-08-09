import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRiskTopicDto } from './dto/create-risk-topic.dto';
import { UpdateRiskTopicDto } from './dto/update-risk-topic.dto';

@Injectable()
export class RiskTopicsService {
  constructor(private readonly prisma: PrismaService) {}

  private splitName(value: string) {
    const text = value.trim();
    const spaceIndex = text.indexOf(' ');
    return {
      code: spaceIndex > 0 ? text.slice(0, spaceIndex) : text,
      name: spaceIndex > 0 ? text.slice(spaceIndex + 1).trim() : text,
    };
  }

  private fullName(code: string, name: string) {
    return `${code.trim()} ${name.trim()}`.trim();
  }

  private toView(topic: any, references = 0) {
    const parsed = this.splitName(topic.riskstore_name);
    return {
      id: topic.riskstore_id,
      code: parsed.code,
      name: parsed.name,
      fullName: topic.riskstore_name,
      groupId: topic.group_id,
      programId: topic.program_id,
      typeId: topic.type_id,
      levelId: topic.level_id,
      active: topic.status !== '0',
      references,
    };
  }

  async findAll() {
    const topics = await this.prisma.riskstore.findMany({
      orderBy: { riskstore_name: 'asc' },
    });
    return topics.map((topic) => this.toView(topic));
  }

  async findOne(id: number) {
    const topic = await this.prisma.riskstore.findUnique({
      where: { riskstore_id: id },
    });
    if (!topic) throw new NotFoundException('ไม่พบชื่อความเสี่ยง');
    const [riskCount, riskCopyCount, registerCount, registerCopyCount] = await Promise.all([
      this.prisma.risk.count({ where: { riskstore_id: id } }),
      this.prisma.risk_copy.count({ where: { riskstore_id: id } }),
      this.prisma.riskregister.count({ where: { riskstore_id: id } }),
      this.prisma.riskregister_copy.count({ where: { riskstore_id: id } }),
    ]);
    return this.toView(topic, riskCount + riskCopyCount + registerCount + registerCopyCount);
  }

  async metadata() {
    const [groups, programs, levels] = await Promise.all([
      this.prisma.riskgroup.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.program.findMany({ orderBy: { program_name: 'asc' } }),
      this.prisma.level.findMany({ orderBy: { level_code: 'asc' } }),
    ]);
    return {
      groups: groups.map((item) => ({ id: item.id, name: item.name })),
      programs: programs.map((item) => ({ id: item.program_id, name: item.program_name })),
      levels: levels.map((item) => ({ id: item.level_id, code: item.level_code, name: item.level_name })),
    };
  }

  async create(dto: CreateRiskTopicDto) {
    const riskstoreName = this.fullName(dto.code, dto.name);
    const duplicate = await this.prisma.riskstore.findFirst({
      where: { riskstore_name: riskstoreName },
    });
    if (duplicate) throw new ConflictException('มีชื่อความเสี่ยงนี้อยู่แล้ว');

    const topic = await this.prisma.riskstore.create({
      data: {
        riskstore_name: riskstoreName,
        group_id: dto.groupId ?? null,
        program_id: dto.programId ?? null,
        type_id: dto.typeId ?? null,
        level_id: dto.levelId ?? null,
        status: dto.active === false ? '0' : '1',
        create_date: new Date(),
        modify_date: new Date(),
      },
    });
    return { id: topic.riskstore_id, message: 'เพิ่มชื่อความเสี่ยงเรียบร้อยแล้ว' };
  }

  async update(id: number, dto: UpdateRiskTopicDto) {
    const current = await this.prisma.riskstore.findUnique({
      where: { riskstore_id: id },
    });
    if (!current) throw new NotFoundException('ไม่พบชื่อความเสี่ยง');
    const currentName = this.splitName(current.riskstore_name);
    const riskstoreName = this.fullName(dto.code ?? currentName.code, dto.name ?? currentName.name);
    const duplicate = await this.prisma.riskstore.findFirst({
      where: { riskstore_id: { not: id }, riskstore_name: riskstoreName },
    });
    if (duplicate) throw new ConflictException('มีชื่อความเสี่ยงนี้อยู่แล้ว');

    await this.prisma.riskstore.update({
      where: { riskstore_id: id },
      data: {
        riskstore_name: riskstoreName,
        ...(dto.groupId !== undefined ? { group_id: dto.groupId } : {}),
        ...(dto.programId !== undefined ? { program_id: dto.programId } : {}),
        ...(dto.typeId !== undefined ? { type_id: dto.typeId } : {}),
        ...(dto.levelId !== undefined ? { level_id: dto.levelId } : {}),
        ...(dto.active !== undefined ? { status: dto.active ? '1' : '0' } : {}),
        modify_date: new Date(),
      },
    });
    return { message: 'แก้ไขชื่อความเสี่ยงเรียบร้อยแล้ว' };
  }

  async remove(id: number) {
    const topic = await this.prisma.riskstore.findUnique({
      where: { riskstore_id: id },
    });
    if (!topic) throw new NotFoundException('ไม่พบชื่อความเสี่ยง');
    const [riskCount, riskCopyCount, registerCount, registerCopyCount] = await Promise.all([
      this.prisma.risk.count({ where: { riskstore_id: id } }),
      this.prisma.risk_copy.count({ where: { riskstore_id: id } }),
      this.prisma.riskregister.count({ where: { riskstore_id: id } }),
      this.prisma.riskregister_copy.count({ where: { riskstore_id: id } }),
    ]);
    const references = riskCount + riskCopyCount + registerCount + registerCopyCount;
    if (references > 0) {
      await this.prisma.riskstore.update({
        where: { riskstore_id: id },
        data: { status: '0', modify_date: new Date() },
      });
      return {
        deleted: false,
        disabled: true,
        references,
        message: `รายการนี้ถูกใช้งานแล้ว ${references} ครั้ง จึงปิดใช้งานแทนการลบถาวร`,
      };
    }
    await this.prisma.riskstore.delete({ where: { riskstore_id: id } });
    return { deleted: true, disabled: false, references: 0, message: 'ลบชื่อความเสี่ยงเรียบร้อยแล้ว' };
  }
}
