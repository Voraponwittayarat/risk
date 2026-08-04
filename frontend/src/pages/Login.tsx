import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WangChaoHospitalLogo } from '../components/WangChaoLogo';

export default function Login() {
  const [isMock, setIsMock] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }
    setError('');
    setIsSubmitting(true);
    
    try {
      await login(username.trim(), password.trim());
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'เข้าสู่ระบบล้มเหลว กรุณาตรวจสอบชื่อผู้ใช้งานและรหัสผ่าน'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
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
        <div className="bg-card-light dark:bg-card-dark py-8 px-4 shadow-xl border border-border-light dark:border-border-dark sm:rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-4 bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-sm text-center font-medium">
              {error}
            </div>
          )}

          {!isMock ? (
            // ==========================================
            // REAL LOGIN FORM (Username & Password)
            // ==========================================
            <form onSubmit={handleRealLogin} className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">เข้าสู่ระบบใช้งาน</h3>
                <p className="text-xs text-slate-400 mt-1">กรอกบัญชีผู้ใช้งานระบบโรงพยาบาลวังเจ้า</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น admin, panupong"
                  className="w-full px-4 py-3 border border-border-light dark:border-border-dark rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 border border-border-light dark:border-border-dark rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 shadow-md shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      กำลังเข้าสู่ระบบ...
                    </span>
                  ) : (
                    'เข้าสู่ระบบ'
                  )}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsMock(true);
                    setError('');
                  }}
                  className="text-xs font-semibold text-primary hover:text-indigo-600 transition-colors"
                >
                  ใช้โหมดทดสอบรวดเร็ว (Mock Role Login)
                </button>
              </div>
            </form>
          ) : (
            // ==========================================
            // MOCK ROLE LOGIN SELECTOR
            // ==========================================
            <div className="space-y-4">
              <div className="mb-6 text-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">โหมดทดสอบ (Mock Login)</h3>
                <p className="text-xs text-slate-400 mt-1">เลือกสิทธิ์การใช้งานเพื่อเข้าสู่ระบบทันทีโดยไม่ต้องใช้รหัสผ่าน</p>
              </div>
              
              <div className="space-y-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleLogin(role.id)}
                    disabled={loadingRole !== null}
                    className={`w-full flex flex-col items-center justify-center py-3 px-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-[0.99] ${
                      loadingRole === role.id 
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                        : 'bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 border-border-light dark:border-border-dark hover:border-primary hover:text-primary'
                    } ${loadingRole !== null && loadingRole !== role.id ? 'opacity-50' : ''}`}
                  >
                    <span className="font-semibold text-base">{role.name}</span>
                    <span className={loadingRole === role.id ? "text-white/80 text-xs mt-0.5" : "text-slate-500 dark:text-slate-400 text-xs mt-0.5"}>{role.desc}</span>
                  </button>
                ))}
              </div>

              <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsMock(false);
                    setError('');
                  }}
                  className="text-xs font-semibold text-primary hover:text-indigo-600 transition-colors"
                >
                  กลับสู่หน้าเข้าสู่ระบบปกติ
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
