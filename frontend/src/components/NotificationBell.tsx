import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, RefreshCw, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
type Group='co_review'|'rca'|'due'|'overdue';
type Notice={key:string;group:Group;label:string;href:string;at:string|null;dueAt?:string;dateOnly?:boolean};
type Bucket={group:Group;items:Notice[];total:number;limited:boolean};
const labels:Record<Group,string>={co_review:'ส่งมาร่วมทบทวน',rca:'ส่งมาทำ RCA',due:'ถึงกำหนด / ภายใน 7 วัน',overdue:'เกินกำหนด'};
export default function NotificationBell() {
  const {user}=useAuth();
  const [open,setOpen]=useState(false);
  const [groups,setGroups]=useState<Bucket[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [seen,setSeen]=useState<string[]>([]);
  const root=useRef<HTMLDivElement>(null);
  const button=useRef<HTMLButtonElement>(null);
  const key=`riskhrms-notifications-seen:${user?.id || 0}`;
  useEffect(()=>{try{const data=JSON.parse(localStorage.getItem(key)||'[]');setSeen(Array.isArray(data)?data.filter(v=>typeof v==='string'):[]);}catch{setSeen([]);}},[key]);
  const acknowledge=(keys:string[])=>setSeen(old=>{const next=[...new Set([...old,...keys])].slice(-2000);try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Notifications still work if storage is unavailable. */}return next;});
  const load=useCallback(async(signal?:AbortSignal)=>{
    setLoading(true);
    try{const {data}=await axios.get('/notifications',{signal,headers:{Authorization:`Bearer ${localStorage.getItem('token') || ''}`}});setGroups(data.groups);setError(false);}
    catch(err){if(!axios.isCancel(err))setError(true);}finally{if(!signal?.aborted)setLoading(false);}
  },[user?.id]);
  useEffect(()=>{
    let controller=new AbortController();
    const refresh=()=>{if(document.visibilityState==='hidden')return;controller.abort();controller=new AbortController();void load(controller.signal);};
    refresh();const timer=window.setInterval(refresh,60000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[load]);
  useEffect(()=>{const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);},[]);
  const isNew=(item:Notice)=>!seen.includes(item.key);
  const count=groups.reduce((sum,bucket)=>sum+(['due','overdue'].includes(bucket.group)?bucket.total:bucket.items.filter(isNew).length),0);
  return <div ref={root} className="relative" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);button.current?.focus();}}}>
    <button ref={button} aria-label={`การแจ้งเตือน${error?' โหลดไม่สำเร็จ':loading?' กำลังโหลด':` ${count} รายการ`}`} aria-expanded={open} aria-controls="notification-panel" onClick={()=>setOpen(value=>!value)} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-teal-50 dark:text-slate-200"><Bell size={22}/>{(count>0||error)&&<span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{error?'!':count>99?'99+':count}</span>}</button>
    {open&&<section id="notification-panel" aria-label="การแจ้งเตือนงานที่เกี่ยวข้องกับฉัน" className="fixed right-3 top-[72px] z-50 max-h-[calc(100dvh-88px)] w-[calc(100vw-24px)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:right-0 sm:top-12 sm:w-[420px]">
      <div className="flex items-center justify-between"><h2 className="font-bold">การแจ้งเตือนของฉัน</h2><div className="flex gap-2"><button aria-label="โหลดการแจ้งเตือนใหม่" disabled={loading} onClick={()=>load()} className="rounded-lg p-2"><RefreshCw size={16}/></button><button aria-label="ปิดการแจ้งเตือน" onClick={()=>{setOpen(false);button.current?.focus();}} className="rounded-lg p-2"><X size={16}/></button></div></div>
      <p className="mb-3 text-xs text-slate-500">งานของคุณ หน่วยงาน และทีม · อัปเดตทุก 1 นาที</p>
      {loading&&<p role="status" className="py-2 text-sm">กำลังตรวจสอบ…</p>}
      {error&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">โหลดการแจ้งเตือนไม่สำเร็จ ข้อมูลที่แสดงอาจยังไม่อัปเดต กรุณากดโหลดใหม่</p>}
      {!error&&groups.map(bucket=><div key={bucket.group} className="mt-4"><h3 className={`mb-2 text-sm font-bold ${bucket.group==='overdue'?'text-red-700':'text-slate-700 dark:text-slate-200'}`}>{labels[bucket.group]} <span className="rounded-full bg-slate-100 px-2 text-slate-600">{bucket.total}</span></h3>{bucket.items.length===0?<p className="text-xs text-slate-500">ไม่มีรายการ</p>:bucket.items.map(item=><Link key={item.key} to={item.href} onClick={()=>{acknowledge([item.key]);setOpen(false);}} className="mb-2 block rounded-xl border border-slate-200 p-3 hover:bg-teal-50 dark:border-slate-700 dark:hover:bg-slate-800"><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{item.label}</span>{['co_review','rca'].includes(bucket.group)&&isNew(item)&&<span className="rounded-full bg-blue-100 px-2 text-xs text-blue-700">ยังไม่อ่าน</span>}</div>{item.dueAt&&<p className="mt-1 text-xs text-slate-500">กำหนด {item.dateOnly ? new Date(item.dueAt).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'}) : new Date(item.dueAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})}</p>}</Link>)}{bucket.limited&&<p className="text-xs text-amber-700">แสดง 50 จาก {bucket.total} รายการ เปิดหน้ารายการเพื่อดูทั้งหมด</p>}</div>)}
      {!!groups.length&&<button className="mt-3 text-xs text-teal-700 underline" onClick={()=>acknowledge(groups.flatMap(bucket=>bucket.items.map(item=>item.key)))}>ทำเครื่องหมายรายการที่แสดงว่าอ่านแล้ว</button>}
      <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-teal-700"><Link onClick={()=>setOpen(false)} to="/incidents/team">งานร่วมทบทวน</Link><Link onClick={()=>setOpen(false)} to="/rca/list">งาน RCA</Link><Link onClick={()=>setOpen(false)} to="/reports?view=register">Risk Register</Link><Link onClick={()=>setOpen(false)} to="/capa">มาตรการ</Link></div>
    </section>}
  </div>;
}
