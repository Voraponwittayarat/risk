import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { WangChaoHospitalLogo } from '../components/WangChaoLogo';

export default function Login() {
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRoleLogin = async (role: string) => {
    setError('');
    setLoadingRole(role);
    
    try {
      await login(role);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoadingRole(null);
    }
  };

  const roles = [
    { id: 'user', name: 'พนักงานทั่วไป (User)', desc: 'สิทธิ์แจ้งความเสี่ยงปกติ' },
    { id: 'supervisor', name: 'หัวหน้างาน (Supervisor)', desc: 'ตรวจสอบเบื้องต้น' },
    { id: 'manager', name: 'หัวหน้าแผนก/ผู้จัดการ (Manager)', desc: 'วิเคราะห์และทบทวนความเสี่ยง' },
    { id: 'admin', name: 'ผู้ดูแลระบบ (Admin)', desc: 'จัดการระบบทั้งหมด' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <WangChaoHospitalLogo size={64} className="mx-auto mb-3" />
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          ระบบบริหารความเสี่ยงโรงพยาบาลวังเจ้า
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Wang Chao Hospital Risk Management System (RiskHRMS)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card-light dark:bg-card-dark py-8 px-4 shadow-sm border border-border-light dark:border-border-dark sm:rounded-[12px] sm:px-10">
          <div className="mb-6 text-center">
            <h3 className="text-[18px] font-medium text-slate-900 dark:text-slate-100">โหมดทดสอบ (Mock Login)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เลือกสิทธิ์การใช้งานเพื่อเข้าสู่ระบบทันทีโดยไม่ต้องใช้รหัสผ่าน</p>
          </div>
          
          <div className="space-y-4">
            {error && (
              <div className="bg-danger/10 text-danger p-3 rounded-[8px] text-sm text-center font-medium">
                {error}
              </div>
            )}
            
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleLogin(role.id)}
                disabled={loadingRole !== null}
                className={`w-full flex flex-col items-center justify-center py-3 px-4 border rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors ${
                  loadingRole === role.id 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 border-border-light dark:border-border-dark hover:border-primary hover:text-primary'
                } ${loadingRole !== null && loadingRole !== role.id ? 'opacity-50' : ''}`}
              >
                <span className="font-semibold text-base">{role.name}</span>
                <span className={loadingRole === role.id ? "text-white/80 text-xs mt-1" : "text-slate-500 dark:text-slate-400 text-xs mt-1"}>{role.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
