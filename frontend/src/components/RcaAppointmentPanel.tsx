import { useEffect, useState } from 'react';
import axios from 'axios';

export default function RcaAppointmentPanel({ caseId, onEditTeam }: { caseId: string; onEditTeam: () => void }) {
  const [record, setRecord] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [starts, setStarts] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    try {
      const [details, meetings] = await Promise.all([axios.get(`/rca/standard/${caseId}`), axios.get(`/rca/standard/${caseId}/appointments`)]);
      setRecord(details.data); setAppointments(meetings.data);
    } catch { setMessage('โหลดนัดหมายไม่สำเร็จ'); }
  }
  useEffect(() => { void load(); }, [caseId]);
  async function save() {
    setBusy(true); setMessage('');
    try {
      if (!starts || !selected.length || !location.trim()) { setMessage('ระบุวันเวลา สถานที่ และเลือกผู้ร่วมทบทวน'); return; }
      await axios.post(`/rca/standard/${caseId}/appointments`, { starts_at: new Date(starts).toISOString(), location, participant_ids: selected });
      setMessage('บันทึกนัดแล้ว กดส่ง Telegram ที่นัดหมายด้านล่าง'); await load();
    } catch (error: any) { setMessage(error.response?.data?.message || 'บันทึกนัดไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  async function notify(appointmentId: string) {
    setBusy(true); setMessage('');
    try { await axios.post(`/rca/standard/${caseId}/appointments/${appointmentId}/notify`); setMessage('ส่งนัดหมายผ่าน Telegram แล้ว'); }
    catch (error: any) { setMessage(error.response?.data?.message || 'ส่งนัดหมายไม่สำเร็จ'); }
    finally { await load(); setBusy(false); }
  }
  if (!record?.hospital_center) return message ? <p role="status">{message}</p> : null;
  const canManage = record.can_manage_team && !['CLOSED', 'CANCELLED', 'COMPLETED'].includes(record.status);
  return <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
    <h4 className="font-bold">นัดทบทวนศูนย์ RCA รพ.</h4>
    <p className="text-xs text-slate-500">บันทึกทีมผู้ร่วมทบทวนด้านล่างก่อน แล้วกดโหลดรายชื่อเพื่อนัดหมาย RM/PCT เห็นเรื่องที่ส่งเข้าศูนย์ได้</p>
    {canManage && <>
      <button type="button" onClick={onEditTeam} className="mr-2 rounded-lg border px-3 py-2 text-sm">เลือก / แก้ไขผู้ร่วมทบทวน</button>
      <button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border px-3 py-2 text-sm">โหลดรายชื่อที่บันทึกแล้ว</button>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">วันเวลานัด<input type="datetime-local" value={starts} onChange={event => setStarts(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" /></label>
        <label className="text-sm">สถานที่ / ห้องประชุม<input maxLength={255} value={location} onChange={event => setLocation(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" /></label>
      </div>
      <fieldset className="space-y-2"><legend className="text-sm font-bold">เลือกผู้ร่วมทบทวน</legend>
        {record.participants.filter((p: any) => p.response_status !== 'DECLINED').map((p: any) => <label key={p.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(p.id)} onChange={event => setSelected(current => event.target.checked ? [...current, p.id] : current.filter(value => value !== p.id))} />{p.display_name}</label>)}
        {!record.participants.length && <p className="text-xs text-amber-700">ยังไม่มีรายชื่อที่บันทึก กรุณาเพิ่มทีมทบทวนและบันทึกแบบร่างก่อน</p>}
      </fieldset>
      <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">บันทึกนัดหมาย</button>
    </>}
    <p role="status" className="text-sm">{message}</p>
    {appointments.map(appointment => <div key={appointment.id} className="space-y-2 rounded-xl border bg-white p-3 dark:bg-slate-900">
      <p className="text-sm font-bold">{new Date(appointment.starts_at).toLocaleString('th-TH')} · {appointment.location}</p>
      <p className="text-xs">ผู้ร่วมทบทวน: {(() => { try { return JSON.parse(appointment.participant_names || '[]').join(', '); } catch { return 'ดูรายชื่อในทีมทบทวน'; } })()}</p>
      <p className="text-xs">{appointment.notification_status === 'SENT' ? 'ส่ง Telegram แล้ว' : appointment.notification_status === 'SENDING' ? 'กำลังส่ง' : appointment.notification_status === 'UNKNOWN' ? 'ยังยืนยันผลส่งไม่ได้ กรุณาตรวจในกลุ่ม Telegram' : appointment.notification_status === 'FAILED' ? 'ส่งไม่สำเร็จ' : 'ยังไม่ได้ส่ง Telegram'}</p>
      {canManage && ['NOT_SENT', 'FAILED'].includes(appointment.notification_status) && new Date(appointment.starts_at) > new Date() && <button type="button" disabled={busy} onClick={() => void notify(appointment.id)} className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700">ส่งนัดผ่าน Telegram</button>}
      <p className="text-xs text-slate-500">ส่งรหัสเคส วันเวลา สถานที่ และลิงก์เข้าระบบ ไปกลุ่มเดียวกับแจ้ง E/3 ขึ้นไป</p>
    </div>)}
  </section>;
}
