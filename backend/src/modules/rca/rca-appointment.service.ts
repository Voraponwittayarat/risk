import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RcaService } from './rca.service';

@Injectable()
export class RcaAppointmentService {
  constructor(private readonly prisma: PrismaService, private readonly rca: RcaService) {}

  private async assertManager(id: string, user: any) {
    const record = await this.rca.getStandardById(id, user);
    if (!record.hospital_center || !record.can_manage_team) throw new ForbiddenException('ไม่มีสิทธิ์จัดนัดของศูนย์ RCA รพ.');
    if (['COMPLETED', 'CANCELLED', 'CLOSED'].includes(record.status || '')) throw new BadRequestException('เคสสิ้นสุดแล้ว');
    return record;
  }

  async list(id: string, user: any) {
    await this.rca.getStandardById(id, user);
    return this.prisma.standard_rca_appointment.findMany({ where: { case_id: id }, orderBy: { starts_at: 'desc' }, take: 20 });
  }

  async create(id: string, data: { starts_at: string; location: string; participant_ids: number[] }, user: any) {
    const record = await this.assertManager(id, user);
    const starts = new Date(data.starts_at);
    const location = String(data.location || '').trim();
    if (!Array.isArray(data.participant_ids)) throw new BadRequestException('เลือกผู้ร่วมทบทวน');
    const selected = [...new Set(data.participant_ids)];
    if (!Number.isFinite(starts.getTime()) || starts.getTime() <= Date.now() || !location || location.length > 255 || !selected.length || selected.some(item => !Number.isInteger(item) || !record.participants.some(p => p.id === item && p.response_status !== 'DECLINED'))) {
      throw new BadRequestException('ระบุเวลาในอนาคต สถานที่ และผู้ร่วมทบทวนที่บันทึกไว้แล้ว');
    }
    return this.prisma.$transaction(async tx => {
      const appointment = await tx.standard_rca_appointment.create({ data: { id: randomUUID(), case_id: id, starts_at: starts, location, participant_ids: JSON.stringify(selected), participant_names: JSON.stringify(record.participants.filter(p => selected.includes(p.id)).map(p => p.display_name)), created_by: Number(user.id) } });
      await tx.workflow_audit.create({ data: { entity_type: 'STANDARD_RCA', entity_id: id, action: 'RCA_APPOINTMENT_CREATED', new_value: JSON.stringify({ appointment_id: appointment.id, starts_at: starts, participant_ids: selected }), changed_by: Number(user.id) } });
      return appointment;
    });
  }

  async notify(id: string, appointmentId: string, user: any) {
    await this.assertManager(id, user);
    const appointment = await this.prisma.standard_rca_appointment.findFirst({ where: { id: appointmentId, case_id: id } });
    if (!appointment || appointment.starts_at <= new Date()) throw new BadRequestException('ไม่พบนัดหมายในอนาคต');
    if (appointment.notification_status === 'SENT') return { sent: true, already_sent: true };
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (process.env.RCA_TELEGRAM_APPOINTMENTS_ENABLED === 'false' || !token || !chatId) throw new BadRequestException('เปิดการแจ้งนัด RCA และตั้งค่า Bot/กลุ่มเดียวกับแจ้งระดับ E/3 ก่อน');
    const claimed = await this.prisma.standard_rca_appointment.updateMany({ where: { id: appointmentId, notification_status: { in: ['NOT_SENT', 'FAILED'] } }, data: { notification_status: 'SENDING' } });
    if (!claimed.count) throw new ConflictException('กำลังส่งนัดหมายนี้ กรุณารอตรวจสถานะ');
    let deliveryStatus = 'UNKNOWN';
    try {
      const text = `นัดทบทวน RCA รพ.\nรหัสเคส: ${id}\nวันเวลา: ${appointment.starts_at.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\nสถานที่: ${appointment.location}\nผู้ร่วมทบทวน: ดูในระบบ\nhttps://riskhrms.dpdns.org/rca/standard/${encodeURIComponent(id)}`;
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }), signal: AbortSignal.timeout(10000) });
      const result = await response.json() as { ok?: boolean };
      if (!response.ok || !result.ok) { deliveryStatus = 'FAILED'; throw new Error('delivery failed'); }
      deliveryStatus = 'SENT';
      await this.prisma.standard_rca_appointment.update({ where: { id: appointmentId }, data: { notification_status: 'SENT' } });
      return { sent: true };
    } catch {
      await this.prisma.standard_rca_appointment.update({ where: { id: appointmentId }, data: { notification_status: deliveryStatus } });
      throw new BadRequestException(deliveryStatus === 'FAILED' ? 'Telegram ปฏิเสธข้อความ นัดหมายยังอยู่ กรุณาตรวจการตั้งค่าก่อนลองใหม่' : 'ยังยืนยันผลส่งไม่ได้ กรุณาตรวจกลุ่ม Telegram ก่อน เพื่อป้องกันการส่งซ้ำ');
    }
  }
}
