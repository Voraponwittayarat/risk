import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
type Audience = 'staff' | 'risk_manager';
type Manual = {title:string; version:string; uploadedAt:string};
const groups = [{id:'staff' as Audience,label:'ผู้ปฏิบัติงานทั่วไป'}, {id:'risk_manager' as Audience,label:'ผู้บริหารความเสี่ยง'}];
export default function Manuals({manage = false}: {manage?:boolean}) {
  const {user} = useAuth();
  const canManage = user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital');
  const [rows,setRows] = useState<{audience:Audience;manual:Manual|null}[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [opening,setOpening] = useState<Audience|null>(null);
  const [reader,setReader] = useState<{url:string;name:string}|null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if (reader) dialog.current?.showModal(); else dialog.current?.close();
    return ()=>{if(reader) URL.revokeObjectURL(reader.url);};
  },[reader]);
  const [audience,setAudience] = useState<Audience>('staff');
  const [title,setTitle] = useState('');
  const [version,setVersion] = useState('');
  const [file,setFile] = useState<File|null>(null);
  const config = () => ({headers:{Authorization:`Bearer ${localStorage.getItem('token') || ''}`}});
  const load = async () => {
    setLoading(true); setError('');
    try { setRows((await axios.get('/manuals',config())).data); } catch {setError('โหลดคู่มือไม่สำเร็จ กรุณาลองใหม่');} finally {setLoading(false);}
  };
  useEffect(() => {void load();},[]);
  const open = async (id:Audience) => {
    setOpening(id); setError('');
    try {
      const {data} = await axios.get(`/manuals/${id}/pdf`,{...config(),responseType:'blob'});
      const url = URL.createObjectURL(new Blob([data],{type:'application/pdf'}));
      setReader({url,name:`riskhrms-manual-${id}.pdf`});
    } catch {setError('เปิดคู่มือไม่สำเร็จ กรุณาลองใหม่');} finally {setOpening(null);}
  };
  const upload = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(''); setError('');
    if (!file || file.type !== 'application/pdf' || file.size > 10*1024*1024) {setError('เลือก PDF ขนาดไม่เกิน 10 MB'); return;}
    const form = event.currentTarget;
    const body = new FormData(); body.append('file',file);body.append('title',title);body.append('version',version);
    setBusy(true);
    try {await axios.post(`/manuals/${audience}`,body,config());setMessage('อัปเดตคู่มือสำเร็จ ผู้ใช้จะเห็นฉบับใหม่');setFile(null);setTitle('');setVersion('');form.reset();await load();}
    catch {setError('อัปโหลดไม่สำเร็จ ตรวจไฟล์และสิทธิ์แล้วลองใหม่');} finally {setBusy(false);}
  };
  return <div className="mx-auto max-w-4xl space-y-5"><dialog ref={dialog} onCancel={()=>setReader(null)} onClose={()=>setReader(null)} className="m-auto h-[90vh] w-[95vw] max-w-5xl rounded-xl border border-slate-200 bg-white p-4 backdrop:bg-black/60"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">คู่มือ PDF</h2><div className="flex gap-4">{reader && <a href={reader.url} download={reader.name} className="text-teal-700 underline">ดาวน์โหลด PDF</a>}<button autoFocus onClick={()=>setReader(null)} className="rounded-lg border px-3 py-1">ปิด</button></div></div>{reader && <iframe title="อ่านคู่มือ PDF" src={reader.url} className="h-[85%] w-full"/>}</dialog><h1 className="text-2xl font-bold">{manage ? 'ตั้งค่าคู่มือการใช้งาน' : 'คู่มือการใช้งาน'}</h1><p className="text-sm text-slate-500">เลือกคู่มือตามหน้าที่ของคุณ ทุกบัญชีเปิดอ่านได้ทั้งสองกลุ่ม</p>{error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}<button className="ml-3 underline" onClick={load}>ลองโหลดใหม่</button></div>}{message && <p role="status" className="text-teal-700">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{groups.map(group => {const manual=rows.find(row=>row.audience===group.id)?.manual;return <section key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><h2 className="text-lg font-bold">{group.label}</h2>{loading ? <p role="status">กำลังโหลด…</p> : manual ? <><p className="mt-3">{manual.title}</p><p className="my-2 text-sm text-slate-500">ฉบับ {manual.version} · อัปเดต {new Date(manual.uploadedAt).toLocaleDateString('th-TH')}</p><button disabled={opening!==null} onClick={()=>open(group.id)} className="rounded-xl bg-teal-600 px-4 py-2 text-white disabled:opacity-50">{opening===group.id ? 'กำลังเปิด…' : 'เปิดอ่านคู่มือ PDF'}</button></> : <p className="mt-3 text-slate-500">ยังไม่มีคู่มือที่อัปโหลด</p>}</section>;})}</div>
    {manage && (canManage ? <form onSubmit={upload} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><h2 className="text-lg font-bold">อัปโหลดคู่มือฉบับใหม่</h2><p className="text-sm text-slate-500">PDF ไม่เกิน 10 MB ฉบับใหม่จะแสดงแทนฉบับเดิม โดยเก็บไฟล์ฉบับเดิมไว้</p><label className="block">กลุ่มผู้อ่าน<select disabled={busy} value={audience} onChange={e=>setAudience(e.target.value as Audience)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:bg-slate-800">{groups.map(group=><option key={group.id} value={group.id}>{group.label}</option>)}</select></label><label className="block">ชื่อคู่มือ<input required maxLength={150} disabled={busy} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:bg-slate-800"/></label><label className="block">ฉบับ / เวอร์ชัน<input required maxLength={50} disabled={busy} value={version} onChange={e=>setVersion(e.target.value)} placeholder="เช่น 1.0 / ตุลาคม 2569" className="mt-1 block w-full rounded-lg border border-slate-300 p-2 dark:bg-slate-800"/></label><label className="block">ไฟล์ PDF<input required type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e=>setFile(e.target.files?.[0] || null)} className="mt-2 block w-full"/></label><button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'กำลังอัปโหลด…' : 'อัปโหลดและเผยแพร่คู่มือ'}</button></form> : <p className="text-slate-500">เฉพาะ Admin หรือ RM ระดับโรงพยาบาลที่อัปเดตคู่มือได้</p>)}
  </div>;
}
