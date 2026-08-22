import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 8 * * 5') // Every Friday at 8:00 AM
  async handleWeeklySummaryAlert() {
    this.logger.log('Running weekly Telegram summary alert job...');
    await this.sendSummaryAlert();
  }

  async sendSummaryAlert() {
    const botApiToken = process.env.TELEGRAM_BOT_TOKEN || '8866061704:AAGdyH0MvzUsnzVWrSqh0V5wZLgCO4iJq6Q';
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!chatId) {
      this.logger.warn('TELEGRAM_CHAT_ID is not set in .env. Skipping summary alert.');
      return;
    }

    try {
      // Find all risks that are pending or reviewing
      const pendingRisks = await this.prisma.riskregister.findMany({
        where: {
          status_risk: { in: ['รายงาน', 'ทบทวน'] },
        },
        select: {
          department_id: true,
          sendto_department_id: true,
          status_risk: true,
        },
      });

      if (pendingRisks.length === 0) {
        this.logger.log('No pending or reviewing risks found. Skipping alert.');
        return;
      }

      // Group by department_id
      const deptCounts = new Map<string, { pending: number; reviewing: number }>();

      let totalPending = 0;
      let totalReviewing = 0;

      for (const risk of pendingRisks) {
        // Increment Grand Totals (Only once per risk)
        if (risk.status_risk === 'รายงาน') {
          totalPending += 1;
        } else if (risk.status_risk === 'ทบทวน') {
          totalReviewing += 1;
        }

        // Add to Primary Department
        const deptId = risk.department_id ? risk.department_id.toString() : 'UNKNOWN';
        if (!deptCounts.has(deptId)) {
          deptCounts.set(deptId, { pending: 0, reviewing: 0 });
        }
        
        if (risk.status_risk === 'รายงาน') {
          deptCounts.get(deptId)!.pending += 1;
        } else if (risk.status_risk === 'ทบทวน') {
          deptCounts.get(deptId)!.reviewing += 1;
        }

        // Add to Secondary Department (Co-Reviewer)
        if (risk.sendto_department_id) {
          const targetDeptId = risk.sendto_department_id.toString();
          // Prevent double counting if primary and secondary are the same somehow
          if (targetDeptId !== deptId) {
            if (!deptCounts.has(targetDeptId)) {
              deptCounts.set(targetDeptId, { pending: 0, reviewing: 0 });
            }
            if (risk.status_risk === 'รายงาน') {
              deptCounts.get(targetDeptId)!.pending += 1;
            } else if (risk.status_risk === 'ทบทวน') {
              deptCounts.get(targetDeptId)!.reviewing += 1;
            }
          }
        }
      }

      // Fetch department names
      const deptIds = Array.from(deptCounts.keys()).filter(id => id !== 'UNKNOWN').map(id => Number(id));
      const departments = await this.prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, depart_name: true },
      });

      const deptMap = new Map(departments.map(d => [d.id.toString(), d.depart_name]));

      // Build message string
      const totalRisks = totalPending + totalReviewing;
      
      let message = `🔔 <b>แจ้งเตือนสรุปสถานการณ์ความเสี่ยง</b> 🔔\n\n`;
      message += `ตอนนี้มีความเสี่ยงที่รอการยืนยันและรอทบทวนในระบบอยู่ <b>${totalRisks}</b> เรื่อง\n`;
      message += `ขอความร่วมมือแกนนำและหัวหน้างานทุกหน่วยเข้าไปตรวจสอบและทบทวนด้วยนะคะ หากเรื่องไหนแก้ไขแล้ว ก็สามารถจำหน่ายได้เลยค่ะ\n\n`;

      message += `📊 <b>สรุปยอดรวม:</b>\n`;
      message += `- รอยืนยัน <b>${totalPending}</b> เรื่อง\n`;
      message += `- รอทบทวน <b>${totalReviewing}</b> เรื่อง\n\n`;

      message += `🏥 <b>แยกตามหน่วยงานที่ค้าง:</b>\n`;

      for (const [deptId, counts] of deptCounts.entries()) {
        const deptName = deptMap.get(deptId) || 'ไม่ระบุหน่วยงาน';
        message += `\n🔸 <b>${deptName}</b>\n`;
        if (counts.pending > 0) message += `   • รอยืนยัน: ${counts.pending} เรื่อง\n`;
        if (counts.reviewing > 0) message += `   • รอทบทวน: ${counts.reviewing} เรื่อง\n`;
      }

      message += `\n<i>ตรวจสอบได้ที่ระบบ HRMS</i>`;

      const url = `https://api.telegram.org/bot${botApiToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Failed to send Telegram summary alert: ${response.status} ${errorData}`);
      } else {
        this.logger.log('Successfully sent Telegram summary alert.');
      }
    } catch (error) {
      this.logger.error('Error in sendSummaryAlert:', error);
      throw error;
    }
  }

  getTelegramSettings() {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '8866061704:AAGdyH0MvzUsnzVWrSqh0V5wZLgCO4iJq6Q',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    };
  }

  async updateTelegramSettings(botToken: string, chatId: string) {
    // Write to .env file safely
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or append TELEGRAM_BOT_TOKEN
    if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
      envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*/g, `TELEGRAM_BOT_TOKEN=${botToken}`);
    } else {
      envContent += `\nTELEGRAM_BOT_TOKEN=${botToken}`;
    }

    // Update or append TELEGRAM_CHAT_ID
    if (envContent.includes('TELEGRAM_CHAT_ID=')) {
      envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/g, `TELEGRAM_CHAT_ID=${chatId}`);
    } else {
      envContent += `\nTELEGRAM_CHAT_ID=${chatId}`;
    }

    fs.writeFileSync(envPath, envContent);

    // Update process.env in memory for immediate effect
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.TELEGRAM_CHAT_ID = chatId;

    return { success: true };
  }
}
