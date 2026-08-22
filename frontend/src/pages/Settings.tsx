import { KeyRound, ListChecks, ShieldCheck, UsersRound, BookOpen, Link as LinkIcon, Send, Save, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function Settings() {
  const { isAdmin } = useAuth();
  
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3000/incidents/telegram/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        setTelegramToken(res.data.botToken || '');
        setTelegramChatId(res.data.chatId || '');
      })
      .catch(err => console.error('Failed to load telegram settings', err));
    }
  }, [isAdmin]);

  const handleSaveTelegramSettings = async () => {
    setIsSaving(true);
    try {
      await axios.post('http://localhost:3000/incidents/telegram/settings', {
        botToken: telegramToken,
        chatId: telegramChatId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      Swal.fire('สำเร็จ', 'บันทึกการตั้งค่า Telegram สำเร็จ', 'success');
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า', 'error');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSummary = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการส่งแจ้งเตือน',
      text: 'คุณต้องการส่งข้อความสรุปยอดค้างไปยัง Telegram ทันทีหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ส่งเลย',
      cancelButtonText: 'ยกเลิก'
    });
    
    if (!result.isConfirmed) return;
    
    setIsSending(true);
    try {
      await axios.post('http://localhost:3000/incidents/telegram/trigger-summary', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      Swal.fire('สำเร็จ', 'ส่งแจ้งเตือนสำเร็จแล้ว', 'success');
    } catch (err) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการส่งแจ้งเตือน', 'error');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">การตั้งค่าระบบและสิทธิ์</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ระบบใช้สิทธิ์จริงจากบัญชีผู้ใช้ ไม่มีโหมดจำลองสิทธิ์หรือการเข้าสู่ระบบโดยไม่ใช้รหัสผ่าน
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'ผู้ดูแลระบบ', text: 'จัดการบัญชี รหัสผ่าน และสิทธิ์การเข้าถึงทั้งหมด' },
          { icon: UsersRound, title: 'สิทธิ์ตามหน้าที่', text: 'รองรับ Admin, RM Committee, หัวหน้าหน่วยงาน และเจ้าหน้าที่' },
          { icon: KeyRound, title: 'ความปลอดภัย', text: 'JWT มีอายุ 8 ชั่วโมง และบัญชีที่ระงับจะเข้าสู่ระบบไม่ได้' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <item.icon className="h-7 w-7 text-blue-600" />
            <h2 className="mt-4 font-bold text-slate-900 dark:text-white">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.text}</p>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Link to="/users" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              <UsersRound className="h-5 w-5" />
              เปิดหน้าจัดการผู้ใช้งาน
            </Link>
            <Link to="/risk-topics" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white hover:bg-rose-700">
              <ListChecks className="h-5 w-5" />
              จัดการชื่อความเสี่ยง
            </Link>
            <Link to="/nrls-topics" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700">
              <BookOpen className="h-5 w-5" />
              จัดการชื่อความเสี่ยง NRLS
            </Link>
            <Link to="/risk-mapping" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
              <LinkIcon className="h-5 w-5" />
              ตั้งค่า Mapping ความเสี่ยง
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">จัดการแจ้งเตือน Telegram (สรุปยอดค้าง)</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">ระบบจะส่งแจ้งเตือนอัตโนมัติทุกวันศุกร์ 08:00 น. หรือกดส่งด้วยตัวเอง</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bot Token</label>
                <input
                  type="text"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="เช่น 8866061704:AAGdyH0MvzUs..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chat ID (ใส่ลบข้างหน้าด้วยถ้าเป็นกลุ่ม)</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="เช่น -5150024996"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleSaveTelegramSettings}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
              
              <button 
                onClick={handleTriggerSummary}
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSending ? 'กำลังส่ง...' : 'กดส่งแจ้งเตือนยอดค้างเดี๋ยวนี้'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
