import RiskWorkflowNav from '../../components/RiskWorkflowNav';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CalendarClock, CheckCircle2, ChevronRight, Clock3, Layers, ListTodo, Plus, RefreshCw, Search, Shield, ShieldAlert } from 'lucide-react';
import { normalizeContributingFactorSelections } from '../../utils/contributingFactors';

interface OverviewStats {
  pending_capas?: number;
  overdue_capas?: number;
  awaiting_effectiveness?: number;
  needs_support?: number;
  risk_register_due?: number;
}

type WorkView = 'center' | 'all' | 'pending' | 'reviewed' | 'source';
type RcaKind = 'standard' | 'concise' | 'mini' | 'review';
type TypeFilter = 'all' | RcaKind;
type UrgencyFilter = 'all' | 'overdue' | 'due_soon' | 'no_due';

interface UnifiedRcaItem {
  id: string;
  kind: RcaKind;
  topic: string;
  detail: string;
  status: string;
  severity?: string;
  nrlsCode?: string;
  rmNo?: string;
  departmentId?: string;
  incidentId?: number;
  dueAt?: string;
  createdAt?: string;
  reviewedAt?: string;
  factorCount: number;
  actionCount: number;
  relatedCount: number;
  hospitalCenter?: boolean;
}

const COMPLETED_STATUSES = new Set(['COMPLETED', 'CLOSED', 'DONE', 'REVIEWED']);
const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELED', 'VOID']);

const RCA_STATUS_PRESENTATION: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'รอเริ่มทบทวน', className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  REQUIRED: { label: 'ต้องทบทวน', className: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300' },
  IN_PROGRESS: { label: 'กำลังทบทวน', className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  COMPLETED: { label: 'ทบทวนเสร็จแล้ว', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CLOSED: { label: 'ทบทวนเสร็จแล้ว', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  REVIEWED: { label: 'บันทึกผลทบทวนแล้ว', className: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300' },
};

const TYPE_PRESENTATION: Record<RcaKind, { label: string; className: string; icon: typeof ShieldAlert }> = {
  standard: { label: 'Standard Full RCA', className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300', icon: ShieldAlert },
  concise: { label: 'Concise RCA', className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300', icon: Layers },
  mini: { label: 'Mini RCA', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300', icon: Shield },
  review: { label: 'ผลทบทวนอุบัติการณ์', className: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300', icon: CheckCircle2 },
};

function normalizeStatus(value: unknown) {
  return String(value || 'PENDING').trim().toUpperCase();
}

function extractArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function dateValue(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatThaiDate(value?: string, fallback = '-') {
  const date = dateValue(value);
  return date
    ? date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
    : fallback;
}

function getDaysUntil(value?: string) {
  const date = dateValue(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function getUrgency(item: UnifiedRcaItem): 'overdue' | 'due_soon' | 'normal' | 'no_due' {
  const days = getDaysUntil(item.dueAt);
  if (days === null) return 'no_due';
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due_soon';
  return 'normal';
}

export default function RcaList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedCaseId = searchParams.get('case')?.trim() || '';
  const [activeView, setActiveView] = useState<WorkView>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'IN_PROGRESS'>('all');
  const [search, setSearch] = useState(focusedCaseId);
  const [stats, setStats] = useState<OverviewStats>({});
  const [standardCases, setStandardCases] = useState<any[]>([]);
  const [miniConciseCases, setMiniConciseCases] = useState<any[]>([]);
  const [incidentReviews, setIncidentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceRows, setSourceRows] = useState<any[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    const responses = await Promise.allSettled([
      axios.get('/rca/overview-stats', { params: { summary: 'true' } }),
      axios.get('/rca/standard'),
      axios.get('/rca/cases'),
      axios.get('/rca/incident-reviews'),
    ]);
    if (responses[0].status === 'fulfilled') setStats(responses[0].value.data || {});
    if (responses[1].status === 'fulfilled') setStandardCases(extractArray(responses[1].value.data));
    if (responses[2].status === 'fulfilled') setMiniConciseCases(extractArray(responses[2].value.data));
    if (responses[3].status === 'fulfilled') setIncidentReviews(extractArray(responses[3].value.data));
    const failed = responses.filter((response) => response.status === 'rejected').length;
    if (failed) setLoadError(`โหลดข้อมูลไม่สำเร็จ ${failed} จาก 4 ส่วน กรุณากดรีเฟรชหรือตรวจสอบการเข้าสู่ระบบ`);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (focusedCaseId) {
      setActiveView('all');
      setTypeFilter('standard');
      setUrgencyFilter('all');
      setSearch(focusedCaseId);
    }
  }, [focusedCaseId]);

  const rcaCases = useMemo<UnifiedRcaItem[]>(() => {
    const standards = standardCases.map((item) => ({
      id: String(item.id),
      kind: 'standard' as const,
      hospitalCenter: item.hospital_center === true,
      topic: (item.hospital_center ? 'ศูนย์ RCA รพ. · ' : '') + (item.topic || item.nrls_name_snapshot || 'Standard RCA'),
      detail: item.what_happened || item.actual_impact || 'ยังไม่มีรายละเอียดการทบทวน',
      status: normalizeStatus(item.status),
      severity: item.severity,
      nrlsCode: item.nrls_code,
      rmNo: item.rm_no,
      departmentId: item.department_id,
      incidentId: item.incident_id,
      dueAt: item.due_at,
      createdAt: item.created_at || item.incident_date,
      reviewedAt: item.completed_at || item.updated_at,
      factorCount: normalizeContributingFactorSelections(item.contributing_factors).length || item.fishbones?.length || 0,
      actionCount: item.capas?.length || 0,
      relatedCount: 1,
    }));
    const compact = miniConciseCases.map((item) => ({
      id: String(item.id),
      kind: (String(item.rca_type).toLowerCase() === 'concise' ? 'concise' : 'mini') as 'concise' | 'mini',
      topic: item.topic || item.nrls_name_snapshot || 'RCA',
      detail: item.incident_detail || item.incidents?.[0]?.detail || 'ยังไม่มีรายละเอียดการทบทวน',
      status: normalizeStatus(item.status),
      severity: item.severity || item.incidents?.[0]?.severity_level,
      nrlsCode: item.nrls_code || item.incidents?.[0]?.nrls_code,
      rmNo: item.incident_id_risk ? String(item.incident_id_risk) : undefined,
      departmentId: item.department_id,
      incidentId: item.incident_id || item.incidents?.[0]?.incident_id,
      dueAt: item.due_at,
      createdAt: item.created_at || item.review_date,
      reviewedAt: item.completed_at || item.updated_at || item.review_date,
      factorCount: normalizeContributingFactorSelections(item.contributing_factors).length,
      actionCount: item.cmps?.length || 0,
      relatedCount: item.incidents?.length || 1,
    }));
    return [...standards, ...compact];
  }, [standardCases, miniConciseCases]);

  const reviewHistory = useMemo<UnifiedRcaItem[]>(() => incidentReviews.map((item) => ({
    id: `RCA-REV-${item.id}`,
    kind: 'review' as const,
    topic: item.risk_name || `อุบัติการณ์ #${item.riskregister_id || item.risk_id || '-'}`,
    detail: item.cause_problem || item.notereview || 'บันทึกผลการทบทวนแล้ว',
    status: 'REVIEWED',
    severity: item.severity_level,
    nrlsCode: item.nrls_code,
    rmNo: item.incident_id_risk ? String(item.incident_id_risk) : undefined,
    departmentId: item.department_id,
    incidentId: item.riskregister_id,
    createdAt: item.review_date,
    reviewedAt: item.review_date,
    factorCount: normalizeContributingFactorSelections(item.contributing_factors).length,
    actionCount: 0,
    relatedCount: 1,
  })), [incidentReviews]);

  const pendingItems = useMemo(() => rcaCases
    .filter((item) => !COMPLETED_STATUSES.has(item.status) && !CANCELLED_STATUSES.has(item.status))
    .sort((a, b) => {
      const rank = { overdue: 0, due_soon: 1, normal: 2, no_due: 3 };
      const urgencyDifference = rank[getUrgency(a)] - rank[getUrgency(b)];
      if (urgencyDifference) return urgencyDifference;
      return (dateValue(a.dueAt)?.getTime() || Number.MAX_SAFE_INTEGER) - (dateValue(b.dueAt)?.getTime() || Number.MAX_SAFE_INTEGER);
    }), [rcaCases]);

  const reviewedItems = useMemo(() => [
    ...rcaCases.filter((item) => COMPLETED_STATUSES.has(item.status)),
    ...reviewHistory,
  ].sort((a, b) => (dateValue(b.reviewedAt)?.getTime() || 0) - (dateValue(a.reviewedAt)?.getTime() || 0)), [rcaCases, reviewHistory]);

  const pendingOverdue = pendingItems.filter((item) => getUrgency(item) === 'overdue').length;
  const currentItems = activeView === 'center' ? [...pendingItems, ...reviewedItems].filter(item => item.hospitalCenter) : activeView === 'pending' ? pendingItems : activeView === 'reviewed' ? reviewedItems : [...pendingItems, ...reviewedItems];
  const query = search.trim().toLowerCase();
  const visibleItems = currentItems.filter((item) => {
    if (departmentFilter && String(item.departmentId) !== departmentFilter) return false;
    if (typeFilter !== 'all' && item.kind !== typeFilter) return false;
    if (activeView === 'pending' && urgencyFilter !== 'all' && getUrgency(item) !== urgencyFilter) return false;
    if (activeView === 'pending' && statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!query) return true;
    return [item.id, item.topic, item.detail, item.nrlsCode, item.rmNo, item.incidentId, item.departmentId, departments.find(d => String(d.id) === String(item.departmentId))?.depart_name, item.severity]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  const openItem = (item: UnifiedRcaItem) => {
    if (item.kind === 'standard') {
      navigate(`/rca/standard/${item.id}`);
      return;
    }
    if (item.incidentId) navigate(`/incidents/${item.incidentId}`);
  };

  const typeOptions: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'standard', label: 'Standard' },
    { value: 'concise', label: 'Concise' },
    { value: 'mini', label: 'Mini' },
    ...(activeView !== 'pending' ? [{ value: 'review' as const, label: 'ผลทบทวนทั่วไป' }] : []),
  ];


  useEffect(() => {
    axios.get('/rca/collaboration-options').then(r => setDepartments(r.data.departments || [])).catch(() => setDepartments([]));
  }, []);
  useEffect(() => {
    if (activeView !== 'source') return;
    let active = true;
    setSourceLoading(true);
    setSourceError('');
    const timer = window.setTimeout(() => {
      axios.get('/rca/standard-candidates', { params: { search: search.trim() || undefined } })
        .then(r => { if (active) setSourceRows(extractArray(r.data)); })
        .catch(() => { if (active) setSourceError('โหลดเหตุการณ์ไม่สำเร็จ กรุณาค้นหาใหม่หรือกลับหน้าทบทวนหน่วยงาน'); })
        .finally(() => { if (active) setSourceLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeView, search]);
  const countsReady = !loading && !loadError;
  const changeView = (view: WorkView) => { setActiveView(view); setTypeFilter('all'); setStatusFilter('all'); setUrgencyFilter('all'); };
  const departmentName = (id?: string) => departments.find(d => String(d.id) === String(id))?.depart_name || id || 'ไม่ระบุ';

  return <div className="space-y-5 pb-12">
    <RiskWorkflowNav current="rca" />
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">ทบทวนและค้นหา RCA</h1>
        <p className="mt-1 text-sm text-slate-500">ค้นหาเรื่องเดิม ทำต่อจากการทบทวนหน่วยงาน และติดตามผลในขอบเขตสิทธิ์ของคุณ</p></div>
      <button onClick={() => changeView('source')} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"><Plus size={18} />เลือกเหตุการณ์เพื่อเริ่ม RCA</button>
    </header>
    <div className="flex flex-wrap gap-2 text-sm">
      <button onClick={() => navigate('/incidents/dept?tab=all')} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">ค้นหาทุกเหตุการณ์ / ทบทวนหน่วยงาน</button>
      {user?.teamId && <button onClick={() => navigate('/incidents/team')} className="rounded-xl border px-4 py-2">งานที่ทีมร่วมทบทวน</button>}
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        { label: 'RCA ที่กำลังทำ', value: pendingItems.length, action: () => changeView('pending'), icon: ListTodo },
        { label: 'เกินกำหนดทบทวน', value: pendingOverdue, action: () => { changeView('pending'); setUrgencyFilter('overdue'); }, icon: Clock3 },
        { label: 'บันทึกผลทบทวนแล้ว', value: reviewedItems.length, action: () => changeView('reviewed'), icon: CheckCircle2 },
        { label: 'มาตรการที่ต้องติดตาม', value: stats.pending_capas || 0, action: () => navigate('/capa'), icon: CalendarClock },
      ].map(card => <button key={card.label} onClick={card.action} className="rounded-xl border border-slate-200 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-900"><card.icon size={19} className="text-blue-600" /><div className="mt-2 text-2xl font-bold">{countsReady ? card.value : '—'}</div><div className="text-sm text-slate-500">{card.label}</div></button>)}
    </div>
    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{loadError} • ไม่สามารถยืนยันจำนวนงานได้</span><button onClick={() => void loadData()} className="rounded-lg bg-white px-3 py-2 font-bold">ลองใหม่</button></div>}
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div role="tablist" aria-label="มุมมองงานทบทวน" className="flex flex-wrap gap-2">
        {([['center', 'ศูนย์ RCA รพ.'], ['all', 'ทั้งหมดและประวัติ'], ['pending', 'กำลังทำ RCA'], ['reviewed', 'ทบทวนแล้ว'], ['source', 'เลือกเหตุการณ์เริ่ม RCA']] as const).map(([value,label]) => <button role="tab" aria-selected={activeView === value} key={value} onClick={() => changeView(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{label}</button>)}
      </div>
      <label className="block"><span className="mb-2 block text-sm font-semibold">ค้นหาเลขเหตุการณ์ / RM / RCA / NRLS / ชื่อเรื่อง</span><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={19} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="เช่น เลขเหตุการณ์ หรือคำสำคัญในเรื่องที่เคยทบทวน" className="w-full rounded-xl border border-slate-300 bg-transparent py-3 pl-10 pr-3 text-sm" /></div></label>
      <p className="text-xs text-slate-500">{activeView === 'source' ? 'ค้นหาเหตุการณ์ที่ยังไม่มี Standard RCA แสดงผลล่าสุดไม่เกิน 50 รายการ — เปิดเหตุการณ์เพื่อเลือกระดับการทบทวน' : 'เลือก “ทั้งหมดและประวัติ” เพื่อค้นหาทั้งงานค้างและงานที่ทบทวนแล้ว จำนวนเป็นบันทึกการทบทวน ไม่ใช่จำนวนเหตุการณ์ไม่ซ้ำ'}</p>
      {activeView !== 'source' && <div className="flex flex-wrap gap-2">
        <select aria-label="ประเภทการทบทวน" value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)} className="rounded-lg border bg-transparent p-2 text-sm">{typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select aria-label="หน่วยงาน" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="max-w-full rounded-lg border bg-transparent p-2 text-sm"><option value="">ทุกหน่วยงานตามสิทธิ์</option>{departments.map(d => <option key={d.id} value={d.id}>{d.depart_name}</option>)}</select>
        {activeView === 'pending' && <select aria-label="กำหนดเวลา" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value as UrgencyFilter)} className="rounded-lg border bg-transparent p-2 text-sm"><option value="all">ทุกกำหนดเวลา</option><option value="overdue">เกินกำหนด</option><option value="due_soon">ครบกำหนดใน 7 วัน</option><option value="no_due">ยังไม่มีกำหนด</option></select>}
        <button onClick={() => { setSearch(''); setDepartmentFilter(''); changeView('all'); }} className="rounded-lg border px-3 py-2 text-sm">ล้างตัวกรอง</button>
        <button aria-label="โหลดข้อมูลใหม่" onClick={() => void loadData()} className="rounded-lg border p-2"><RefreshCw size={18}/></button>
      </div>}
    </section>
    {activeView === 'source' ? <section className="space-y-3">
      {sourceLoading ? <p role="status">กำลังค้นหาเหตุการณ์…</p> : sourceError ? <p role="alert" className="text-rose-700">{sourceError}</p> : sourceRows.length ? sourceRows.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-900">
        <div className="text-sm text-slate-500">เหตุการณ์ #{item.id} · RM {item.id_risk || '-'} · {item.nrls_code}</div><h2 className="mt-2 font-bold">{item.incident_topic}</h2><div className="mt-2 text-sm text-slate-500">{departmentName(item.department_id)} · ระดับ {item.level_id || '-'} · {formatThaiDate(item.date_report)}</div>
        <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => navigate(`/incidents/${item.id}`)} className="rounded-lg border px-3 py-2 text-sm">เปิดเหตุการณ์ / เลือกระดับทบทวน</button><button onClick={() => navigate(`/rca/standard/new?incident_id=${item.id}`)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">เริ่มวิเคราะห์เชิงลึก</button></div>
      </article>) : <p className="rounded-xl border p-6">ไม่พบเหตุการณ์ตามคำค้น ลองเปลี่ยนคำค้นหรือกลับหน้าทบทวนหน่วยงาน</p>}
    </section> : loading ? <p role="status">กำลังโหลดงานทบทวน…</p> : loadError ? <p className="text-sm text-slate-500">รายการยังไม่ครบ กรุณาโหลดข้อมูลใหม่ก่อนใช้อ้างอิง</p> : <section className="space-y-3">
      <p className="text-sm text-slate-500">พบ {visibleItems.length} บันทึก {focusedCaseId && `· ค้นหา ${focusedCaseId}`}</p>
      {!visibleItems.length && <div className="rounded-xl border bg-white p-6 dark:bg-slate-900"><h2 className="font-bold">ไม่พบรายการในมุมมองนี้</h2><p className="mt-2 text-sm text-slate-500">เรื่องที่ยังไม่เปิด RCA อยู่ที่ “เลือกเหตุการณ์เริ่ม RCA” หรือหน้าทบทวนหน่วยงาน</p><button onClick={() => { setSearch(''); setDepartmentFilter(''); changeView('all'); }} className="mt-3 text-sm font-bold text-blue-600">ค้นหาทั้งหมดและประวัติ</button></div>}
      {visibleItems.map(item => <article key={`${item.kind}-${item.id}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-lg border px-2 py-1 ${TYPE_PRESENTATION[item.kind].className}`}>{TYPE_PRESENTATION[item.kind].label}</span><span className="text-slate-500">{item.incidentId ? `เหตุการณ์ #${item.incidentId} · ` : ''}RM {item.rmNo || '-'} · {item.id}</span></div>
        <h2 className="mt-2 font-bold">{item.topic}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.detail}</p>
        <div className="mt-2 text-sm text-slate-500">{departmentName(item.departmentId)} · {item.nrlsCode || 'ไม่ระบุ NRLS'} · ระดับ {item.severity || '-'} · {RCA_STATUS_PRESENTATION[item.status]?.label || item.status}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={() => openItem(item)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">{item.kind === 'standard' ? COMPLETED_STATUSES.has(item.status) ? 'ดูผล RCA' : 'ทำ RCA ต่อ' : 'เปิดผลทบทวน'}<ChevronRight size={16}/></button>
          {item.incidentId && item.kind === 'standard' && <button onClick={() => navigate(`/incidents/${item.incidentId}`)} className="rounded-lg border px-3 py-2 text-sm">เหตุการณ์ต้นทาง</button>}
          <span className="text-xs text-slate-500">{COMPLETED_STATUSES.has(item.status) ? `ทบทวน ${formatThaiDate(item.reviewedAt)}` : `กำหนด ${formatThaiDate(item.dueAt)}`}</span>
        </div>
      </article>)}
    </section>}
  </div>;
}
