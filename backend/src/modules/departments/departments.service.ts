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

  async updateTelegram(id: number, telegram_token: string, telegram_chat_id: string) {
    return this.prisma.department.update({
      where: { id },
      data: {
        telegram_token: telegram_token || null,
        telegram_chat_id: telegram_chat_id || null,
      },
    });
  }

  async testTelegram(id: number) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept || !dept.telegram_token || !dept.telegram_chat_id) {
      throw new Error('Telegram settings are missing for this department.');
    }

    const message = `✅ <b>ทดสอบการแจ้งเตือนสำเร็จ!</b>\n\nข้อความนี้ส่งจากการตั้งค่าบอทของ <b>${dept.depart_name}</b> (ระบบ HRMS)\nหากได้รับข้อความนี้แสดงว่าบอทพร้อมใช้งานแล้วครับ`;
    const url = `https://api.telegram.org/bot${dept.telegram_token}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: dept.telegram_chat_id,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.description || 'Failed to send telegram message');
      }
      return { success: true };
    } catch (e: any) {
      throw new Error(`Telegram API Error: ${e.message}`);
    }
  }
}

