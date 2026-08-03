import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Check, Server
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState(user?.role || 'admin');
  const [rcaUrl, setRcaUrl] = useState('http://localhost:3001/rca');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const roles = [
    {
      id: 'admin',
      name: 'ผู้ดูแลระบบ (System Admin)',
      description: 'จัดการโครงสร้างพื้นฐาน Master Data และตั้งค่าระบบ (ไม่ก้าวก่ายการยืนยันเคสคลินิก)',
      badge: 'Admin Role',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    },
    {
      id: 'rm_committee',
      name: 'กรรมการบริหารความเสี่ยง (RM Committee)',
      description: 'กำกับดูแลอุบัติการณ์ทั่วทั้งองค์กร, ส่งต่อทบทวน RCA, ติดตามมาตรการ และปิดเคส',
      badge: 'RM Committee',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
    },
    {
      id: 'head',
      name: 'หัวหน้ากลุ่มงาน / หน่วยงาน (Head of Unit)',
      description: 'ตรวจสอบข้อเท็จจริง, ยืนยันความเสี่ยง และบันทึกผลการแก้ไขภายในหน่วยงาน',
      badge: 'Department Head',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    },
    {
      id: 'staff',
      name: 'เจ้าหน้าที่ผู้ปฏิบัติงาน (General Staff)',
      description: 'บันทึกรายงานอุบัติการณ์ความเสี่ยง และติดตามสถานะเคสของตนเอง',
      badge: 'Staff User',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    }
  ];

  const handleRoleSwitch = (roleId: string) => {
    setActiveRole(roleId);
    // Simulate updating user in AuthContext / localStorage
    const updatedUser = {
      ...user,
      role: roleId,
      accessrules: roleId === 'admin' ? '1' : '0',
      rmStatus: roleId === 'rm_committee' ? '1' : '0',
      priority: roleId === 'head' ? '1' : '0',
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          การตั้งค่าระบบและกำหนดสิทธิ์ (Settings & RBAC)
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          จำลองสิทธิ์การเข้าถึง และจัดการการเชื่อมโยงระบบบริหารความเสี่ยงโรงพยาบาล
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>บันทึกและสลับสิทธิ์การใช้งานเรียบร้อยแล้ว</span>
        </div>
      )}

      {/* Role Simulator */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            จำลองสิทธิ์การใช้งาน (Role-Based Access Simulation)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            เลือกสิทธิ์เพื่อทดสอบมุมมองและฟังก์ชันการทำงานของแต่ละระดับผู้ใช้งานตามมาตรฐาน สรพ.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {roles.map(r => {
            const isSelected = activeRole === r.id;
            return (
              <div
                key={r.id}
                onClick={() => handleRoleSwitch(r.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.badgeColor}`}>
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.description}</p>
                </div>

                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External Integration Config */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            การเชื่อมต่อระบบ RCA และ API ภายนอก
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ระบุที่อยู่ของโปรแกรมวิเคราะห์ Root Cause Analysis (Swiss Cheese Model)
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">RCA System Base URL</label>
            <input
              type="text"
              value={rcaUrl}
              onChange={(e) => setRcaUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono dark:text-white"
            />
          </div>
          <p className="text-xs text-slate-400">
            ระบบจะส่งผู้ใช้งานไปยัง <code className="text-indigo-600 dark:text-indigo-400">{rcaUrl}/new?riskId=&#123;id&#125;</code> เมื่อคลิกปุ่ม "ส่งทบทวน RCA"
          </p>
        </div>
      </div>
    </div>
  );
}
