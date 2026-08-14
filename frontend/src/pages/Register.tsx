import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IdCard, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { WangChaoHospitalLogo } from '../components/WangChaoLogo';
import axios from 'axios';

export default function Register() {
  const [cid, setCid] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    
    if (cid.length !== 13) {
      setError('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
      return;
    }
    
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post('/auth/register', {
        cid: cid.trim(),
        username: username.trim(),
        password,
        email: email.trim(),
      });
      
      setSuccess(response.data.message || 'ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
      
    } catch (requestError: any) {
      const msg = requestError.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'ไม่สามารถลงทะเบียนได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:bg-slate-100/50 dark:bg-slate-950">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <WangChaoHospitalLogo className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">ลงทะเบียนบัญชีใหม่</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">ระบบบริหารจัดการความเสี่ยง โรงพยาบาลวังเจ้า</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}
            
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
                {success}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
                เลขประจำตัวประชาชน 13 หลัก
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={cid}
                  onChange={(e) => setCid(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="กรอกเลข 13 หลัก"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="สำหรับใช้เข้าสู่ระบบ"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
                อีเมล (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="example@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
            >
              {isSubmitting ? 'กำลังลงทะเบียน…' : 'ลงทะเบียน'}
            </button>
            
            <div className="text-center mt-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">มีบัญชีผู้ใช้แล้ว? </span>
              <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                เข้าสู่ระบบ
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
