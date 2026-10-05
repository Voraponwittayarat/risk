import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export default function Profile() {
  const {user} = useAuth();
  const roles = {admin:'ผู้ดูแลระบบ',rm_committee:'ผู้บริหารความเสี่ยง',head:'หัวหน้าหน่วยงาน',staff:'ผู้ปฏิบัติงาน'};
  return <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:bg-slate-900"><h1 className="text-2xl font-bold">โปรไฟล์ของฉัน</h1><dl className="my-6 space-y-4">{[['ชื่อ',user?.name],['บัญชีผู้ใช้',user?.username],['หน่วยงาน',user?.department_name || user?.departmentName],['บทบาท',user ? roles[user.role] : ''],['ทีม',user?.teamName]].map(([label,value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="font-semibold">{value || 'ไม่ได้ระบุ'}</dd></div>)}</dl><p className="mb-4 text-sm text-slate-500">หากข้อมูลหรือสิทธิ์ไม่ตรง กรุณาติดต่อผู้ดูแลระบบ</p><Link to="/change-password" className="inline-block rounded-xl bg-teal-600 px-4 py-2 text-white">เปลี่ยนรหัสผ่าน</Link></section>;
}
