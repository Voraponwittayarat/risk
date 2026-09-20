import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FileSearch,
  History,
  Layers,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { normalizeContributingFactorSelections } from '../../utils/contributingFactors';

interface OverviewStats {
  pending_capas?: number;
  overdue_capas?: number;
}

type WorkView = 'pending' | 'reviewed';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedCaseId = searchParams.get('case')?.trim() || '';
  const [activeView, setActiveView] = useState<WorkView>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [search, setSearch] = useState(focusedCaseId);
  const [stats, setStats] = useState<OverviewStats>({});
  const [standardCases, setStandardCases] = useState<any[]>([]);
  const [miniConciseCases, setMiniConciseCases] = useState<any[]>([]);
  const [incidentReviews, setIncidentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    const responses = await Promise.allSettled([
      axios.get('/rca/overview-stats'),
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
      setActiveView('pending');
      setTypeFilter('standard');
      setUrgencyFilter('all');
      setSearch(focusedCaseId);
    }
  }, [focusedCaseId]);

  const rcaCases = useMemo<UnifiedRcaItem[]>(() => {
    const standards = standardCases.map((item) => ({
      id: String(item.id),
      kind: 'standard' as const,
      topic: item.topic || item.nrls_name_snapshot || 'Standard RCA',
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
  const pendingInProgress = pendingItems.filter((item) => item.status === 'IN_PROGRESS').length;
  const completedThisMonth = reviewedItems.filter((item) => {
    const date = dateValue(item.reviewedAt);
    const now = new Date();
    return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const typeCounts = (items: UnifiedRcaItem[]) => ({
    all: items.length,
    standard: items.filter((item) => item.kind === 'standard').length,
    concise: items.filter((item) => item.kind === 'concise').length,
    mini: items.filter((item) => item.kind === 'mini').length,
    review: items.filter((item) => item.kind === 'review').length,
  });

  const currentItems = activeView === 'pending' ? pendingItems : reviewedItems;
  const currentTypeCounts = typeCounts(currentItems);
  const query = search.trim().toLowerCase();
  const visibleItems = currentItems.filter((item) => {
    if (typeFilter !== 'all' && item.kind !== typeFilter) return false;
    if (activeView === 'pending' && urgencyFilter !== 'all' && getUrgency(item) !== urgencyFilter) return false;
    if (!query) return true;
    return [item.id, item.topic, item.detail, item.nrlsCode, item.rmNo, item.departmentId, item.severity]
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
    ...(activeView === 'reviewed' ? [{ value: 'review' as const, label: 'ผลทบทวนทั่วไป' }] : []),
  ];

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 p-6 text-white dark:border-slate-800 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-200"><Activity className="h-4 w-4" /> RCA COMMAND CENTER</div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">ศูนย์งานทบทวน RCA</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">เห็นงานที่ยังต้องทบทวนก่อนเป็นลำดับแรก รวม Standard, Concise และ Mini RCA ในคิวเดียว พร้อมติดตามงานเกินกำหนดและดูผลทบทวนย้อนหลัง</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate('/trigger-tool')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-white/20"><FileSearch className="h-4 w-4" /> Trigger Tool</button>
              <button type="button" onClick={() => navigate('/rca/standard/new')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-indigo-800 shadow-lg hover:bg-blue-50"><Plus className="h-4 w-4" /> เปิด Standard RCA</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'งานที่ต้องทบทวน', value: pendingItems.length, note: 'รวม RCA ทั้ง 3 แบบ', icon: ListTodo, color: 'text-blue-600' },
            { label: 'เกินกำหนด', value: pendingOverdue, note: 'ควรดำเนินการทันที', icon: AlertCircle, color: 'text-rose-600' },
            { label: 'กำลังดำเนินการ', value: pendingInProgress, note: 'อยู่ระหว่างทำ RCA', icon: Clock3, color: 'text-amber-600' },
            { label: 'ทบทวนแล้ว', value: reviewedItems.length, note: `เดือนนี้ ${completedThisMonth} รายการ`, icon: CircleCheckBig, color: 'text-emerald-600' },
            { label: 'มาตรการค้าง', value: stats.pending_capas || 0, note: `เกินกำหนด ${stats.overdue_capas || 0}`, icon: CalendarClock, color: 'text-violet-600' },
          ].map((card) => (
            <div key={card.label} className="flex min-h-28 items-center gap-3 bg-white p-4 dark:bg-slate-900 sm:p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 ${card.color}`}><card.icon className="h-5 w-5" /></span>
              <div><div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{card.label}</div><div className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</div><div className="text-[10px] text-slate-400">{card.note}</div></div>
            </div>
          ))}
        </div>
      </header>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{loadError}</span>
          <button type="button" onClick={() => void loadData()} className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white">ลองใหม่</button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
          <button type="button" onClick={() => { setActiveView('pending'); setTypeFilter('all'); }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${activeView === 'pending' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}><ListTodo className="h-4 w-4" /> งานที่ต้องทบทวน <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">{pendingItems.length}</span></button>
          <button type="button" onClick={() => { setActiveView('reviewed'); setTypeFilter('all'); setUrgencyFilter('all'); }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${activeView === 'reviewed' ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}><History className="h-4 w-4" /> สรุปที่ทบทวนแล้ว <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{reviewedItems.length}</span></button>
        </div>

        {activeView === 'reviewed' && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: 'ทบทวนทั้งหมด', value: currentTypeCounts.all, color: 'text-emerald-600' },
              { label: 'Standard RCA', value: currentTypeCounts.standard, color: 'text-rose-600' },
              { label: 'Concise RCA', value: currentTypeCounts.concise, color: 'text-violet-600' },
              { label: 'Mini RCA', value: currentTypeCounts.mini, color: 'text-amber-600' },
              { label: 'ผลทบทวนอุบัติการณ์', value: currentTypeCounts.review, color: 'text-cyan-600' },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><div className="text-[10px] font-bold text-slate-500">{item.label}</div><div className={`mt-1 text-xl font-black ${item.color}`}>{item.value}</div></div>)}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาเลข RCA, RM No., NRLS, หัวข้อ หรือหน่วยงาน..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
            {typeOptions.map((option) => <button key={option.value} type="button" onClick={() => setTypeFilter(option.value)} className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-bold transition ${typeFilter === option.value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>{option.label} ({currentTypeCounts[option.value]})</button>)}
          </div>
          {activeView === 'pending' && <select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value as UrgencyFilter)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><option value="all">ทุกกำหนดเวลา</option><option value="overdue">เกินกำหนด</option><option value="due_soon">ครบกำหนดใน 7 วัน</option><option value="no_due">ยังไม่มีกำหนด</option></select>}
          <button type="button" onClick={() => void loadData()} disabled={loading} title="รีเฟรชข้อมูล" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </section>

      <section className="space-y-4">
        {focusedCaseId && (
          <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200 sm:flex-row sm:items-center sm:justify-between">
            <span><strong>รับเรื่องจากหน้าสรุปการทบทวนแล้ว</strong> กำลังแสดงเคส {focusedCaseId}</span>
            <button type="button" onClick={() => { setSearch(''); setTypeFilter('all'); navigate('/rca/list', { replace: true }); }} className="self-start font-bold text-blue-700 hover:underline dark:text-blue-300">แสดงทุกเคส</button>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className={`mb-1 flex items-center gap-2 text-xs font-black ${activeView === 'pending' ? 'text-blue-600' : 'text-emerald-600'}`}>{activeView === 'pending' ? <ListTodo className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}{activeView === 'pending' ? 'UNFINISHED REVIEW QUEUE' : 'COMPLETED REVIEW SUMMARY'}</div><h2 className="text-xl font-black text-slate-900 dark:text-white">{activeView === 'pending' ? 'รายการงานที่ยังต้องทบทวน' : 'รายการที่ทบทวนแล้ว'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeView === 'pending' ? 'เรียงงานเกินกำหนดและใกล้ครบกำหนดขึ้นก่อน โดยรวม RCA ทั้ง 3 แบบในรายการเดียว' : 'รวมผล Standard, Concise, Mini RCA และบันทึกผลทบทวนอุบัติการณ์ เรียงจากล่าสุด'}</p></div>
          <span className="text-xs font-bold text-slate-500">แสดง {visibleItems.length} จาก {currentItems.length} รายการ</span>
        </div>

        {loading && currentItems.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900"><RefreshCw className="h-5 w-5 animate-spin text-blue-600" />กำลังโหลดข้อมูลงาน RCA...</div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">{activeView === 'pending' && !search && typeFilter === 'all' && urgencyFilter === 'all' ? 'ไม่มีงาน RCA ค้างทบทวน' : 'ไม่พบรายการตามตัวกรอง'}</h3><p className="mt-1 text-xs text-slate-400">ลองเปลี่ยนประเภท กำหนดเวลา หรือคำค้นหา</p></div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item, index) => {
              const type = TYPE_PRESENTATION[item.kind];
              const TypeIcon = type.icon;
              const status = RCA_STATUS_PRESENTATION[item.status] || RCA_STATUS_PRESENTATION.PENDING;
              const urgency = getUrgency(item);
              const daysUntil = getDaysUntil(item.dueAt);
              const canOpen = item.kind === 'standard' || Boolean(item.incidentId);
              return (
                <article key={`${item.kind}-${item.id}`} className={`group relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 sm:p-5 ${item.id === focusedCaseId ? 'border-blue-500 ring-4 ring-blue-100 dark:ring-blue-950' : urgency === 'overdue' && activeView === 'pending' ? 'border-rose-300 dark:border-rose-900' : urgency === 'due_soon' && activeView === 'pending' ? 'border-amber-300 dark:border-amber-900' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className={`absolute inset-y-0 left-0 w-1.5 ${urgency === 'overdue' && activeView === 'pending' ? 'bg-rose-500' : urgency === 'due_soon' && activeView === 'pending' ? 'bg-amber-500' : activeView === 'reviewed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <div className="flex flex-col gap-4 pl-2 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="hidden w-8 shrink-0 pt-1 text-center text-xs font-black text-slate-300 sm:block">{String(index + 1).padStart(2, '0')}</div>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${type.className}`}><TypeIcon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${type.className}`}>{type.label}</span><span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.id}</span>{item.rmNo && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">RM {item.rmNo}</span>}{item.nrlsCode && <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{item.nrlsCode}</span>}</div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-black leading-relaxed text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{item.topic}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.detail}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400"><span>ความรุนแรง: <strong className="text-slate-600 dark:text-slate-300">{item.severity || '-'}</strong></span><span>หน่วยงาน: <strong className="text-slate-600 dark:text-slate-300">{item.departmentId || '-'}</strong></span><span>Factors: <strong className="text-slate-600 dark:text-slate-300">{item.factorCount}</strong></span><span>มาตรการ: <strong className="text-slate-600 dark:text-slate-300">{item.actionCount}</strong></span>{item.relatedCount > 1 && <span>เชื่อมโยง {item.relatedCount} เหตุการณ์</span>}</div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 xl:w-80 xl:justify-end xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                      <div className="mr-auto xl:mr-2 xl:text-right">
                        {activeView === 'pending' ? <><div className={`text-[10px] font-bold ${urgency === 'overdue' ? 'text-rose-600' : urgency === 'due_soon' ? 'text-amber-600' : 'text-slate-400'}`}>{urgency === 'overdue' ? `เกินกำหนด ${Math.abs(daysUntil || 0)} วัน` : urgency === 'due_soon' ? `เหลือ ${daysUntil} วัน` : item.dueAt ? 'กำหนดแล้ว' : 'ยังไม่กำหนดวัน'}</div><div className="mt-0.5 text-xs font-black text-slate-700 dark:text-slate-200">{formatThaiDate(item.dueAt, 'ไม่ระบุ')}</div></> : <><div className="text-[10px] font-bold text-emerald-600">วันที่ทบทวน</div><div className="mt-0.5 text-xs font-black text-slate-700 dark:text-slate-200">{formatThaiDate(item.reviewedAt || item.createdAt)}</div></>}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                      {canOpen && <button type="button" onClick={() => openItem(item)} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-200">{item.kind === 'standard' ? 'เปิด RCA' : 'ดูอุบัติการณ์'} <ChevronRight className="h-3.5 w-3.5" /></button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
