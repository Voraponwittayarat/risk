import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
export default function AccountMenu() {
  const {user,logout} = useAuth();
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(()=>{setOpen(false);},[location.pathname,location.search]);
  useEffect(()=>{
    const dismiss = (event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node)) setOpen(false);};
    document.addEventListener('pointerdown',dismiss);
    return ()=>document.removeEventListener('pointerdown',dismiss);
  },[]);
  return <div ref={ref} className="relative" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);button.current?.focus();}}}>
    <button ref={button} aria-label="เปิดเมนูบัญชี" aria-expanded={open} aria-controls="account-panel" onClick={()=>setOpen(value=>!value)} className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-teal-100 bg-teal-600 font-bold text-white hover:ring-2 hover:ring-teal-300">{user?.name?.charAt(0) || 'U'}</button>
    {open && <div id="account-panel" className="absolute right-0 top-12 z-50 w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"><div className="border-b p-2 pb-3"><p className="truncate font-bold">{user?.name}</p><p className="truncate text-xs text-slate-500">{user?.department_name || user?.departmentName}</p></div><nav aria-label="บัญชีและคู่มือ" className="mt-2 space-y-1">{[{to:'/profile',label:'โปรไฟล์ของฉัน',icon:UserRound},{to:'/manuals',label:'คู่มือการใช้งาน (PDF)',icon:BookOpen},{to:'/change-password',label:'ตั้งค่าบัญชีของฉัน',icon:Settings}].map(item=><Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-teal-50 dark:hover:bg-slate-800"><item.icon size={18}/>{item.label}</Link>)}<button onClick={()=>{logout();navigate('/login');}} className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-red-600 hover:bg-red-50"><LogOut size={18}/>ออกจากระบบ</button></nav></div>}
  </div>;
}
