import { KeyRound, ListChecks, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { isAdmin } = useAuth();
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
        <div className="flex flex-wrap gap-3">
          <Link to="/users" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
            <UsersRound className="h-5 w-5" />
            เปิดหน้าจัดการผู้ใช้งาน
          </Link>
          <Link to="/risk-topics" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white hover:bg-rose-700">
            <ListChecks className="h-5 w-5" />
            จัดการชื่อความเสี่ยง
          </Link>
        </div>
      )}
    </div>
  );
}
