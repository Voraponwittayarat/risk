import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  Building2,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Grid3X3,
  PlayCircle,
  Search,
  Square,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRiskMatrixClass } from '../utils/riskMatrix';

type TeamReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

const reviewStatusInfo: Record<TeamReviewStatus, { label: string; className: string }> = {
  PENDING: { label: 'รอทีมรับทบทวน', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  IN_PROGRESS: { label: 'ทีมกำลังทบทวน', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'ทีมสรุปแล้ว', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const severityClass = (level: string) => {
  const value = String(level || '').toUpperCase();
  if (['G', 'H', 'I', '4', '5'].includes(value)) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['E', 'F', '3'].includes(value)) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (['C', 'D', '2'].includes(value)) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

export default function TeamRiskWorkspace() {
  const { user, isAdmin } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchNote, setBatchNote] = useState('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [teamId, setTeamId] = useState(user?.teamId ? String(user.teamId) : '');
  const [fiscalYear, setFiscalYear] = useState('');
  const [page, setPage] = useState(1);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/incidents/team/workspace', {
        params: {
          page,
          limit: 25,
          search: search || undefined,
          team_review_status: reviewStatus || undefined,
          department_id: departmentId || undefined,
          program_id: programId || undefined,
          team_id: teamId || undefined,
          fiscal_year: fiscalYear || undefined,
        },
      });
      setWorkspace(response.data);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ไม่สามารถโหลดพื้นที่ทบทวนของทีมได้');
    } finally {
      setLoading(false);
    }
  }, [page, search, reviewStatus, departmentId, programId, teamId, fiscalYear]);

  useEffect(() => {
    axios.get('/incidents/form-data').then((response) => {
      setDepartments(response.data?.departments || []);
      setPrograms(response.data?.programs || []);
      setTeams(response.data?.teams || []);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const rows = useMemo(() => workspace?.data || [], [workspace]);
  const selectableRows = rows.filter((row: any) => row.status_risk !== 'จำหน่าย' && row.team_review_status !== 'COMPLETED');
  const allVisibleSelected = selectableRows.length > 0 && selectableRows.every((row: any) => selectedIds.includes(row.id));
  const selectedRows = useMemo(() => rows.filter((row: any) => selectedIds.includes(row.id)), [rows, selectedIds]);
  const canBatch = Boolean(user?.teamId || teamId);
  const hasClosedSelection = selectedRows.some((row: any) => row.status_risk === 'จำหน่าย' || row.team_review_status === 'COMPLETED');

  const toggleRow = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !selectableRows.some((row: any) => row.id === id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...selectableRows.map((row: any) => row.id)])]);
    }
  };

  const runBatch = async (action: 'START' | 'COMPLETE') => {
    if (!selectedIds.length) return;
    if (action === 'COMPLETE' && !batchNote.trim()) {
      alert('กรุณาระบุผลสรุปหรือข้อเสนอแนะของทีม');
      return;
    }
    const label = action === 'START' ? 'รับรายการที่เลือกเข้าทบทวน' : 'บันทึกผลสรุปของทีมให้รายการที่เลือก';
    if (!window.confirm(`${label} จำนวน ${selectedIds.length} เรื่อง ใช่หรือไม่?`)) return;
    setSaving(true);
    try {
      const response = await axios.post('/incidents/team/batch-review', {
        incident_ids: selectedIds,
        action,
        note: batchNote.trim() || undefined,
        team_id: teamId ? Number(teamId) : undefined,
      });
      setBatchNote('');
      alert(`ดำเนินการเรียบร้อย ${response.data?.updated || selectedIds.length} เรื่อง`);
      await fetchWorkspace();
    } catch (err: any) {
      alert(err.response?.data?.message || 'ไม่สามารถบันทึกการทบทวนแบบกลุ่มได้');
    } finally {
      setSaving(false);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const summary = workspace?.summary || {};
  const matrix = workspace?.matrix || [];
  const matrixMeta = workspace?.meta || {};
  const teamName = workspace?.team?.team_name || user?.teamName || 'ทีมนำ';

  useEffect(() => {
    if (!fiscalYear && matrixMeta.fiscal_year) setFiscalYear(String(matrixMeta.fiscal_year));
  }, [fiscalYear, matrixMeta.fiscal_year]);

  return (
    <div className="space-y-6 pb-36">
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              <Users className="h-3.5 w-3.5" /> Team Risk Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ภาพรวมความเสี่ยงของ {teamName}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-100">
              เห็นหลายอุบัติการณ์ในภาพเดียว รับงานและสรุปผลเป็นชุด โดยแสดงเฉพาะเรื่องที่หน่วยงานต้นทางบันทึกการทบทวนแล้ว
            </p>
          </div>
          {isAdmin && (
            <label className="min-w-64 text-xs font-semibold text-indigo-100">
              เลือกทีมที่ต้องการตรวจสอบ
              <select value={teamId} onChange={(event) => { setTeamId(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
                <option value="">ทุกทีม (ดูภาพรวมเท่านั้น)</option>
                {teams.map((team: any) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'ทั้งหมด', value: summary.total || 0, icon: Activity, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
          { label: 'รอทีมรับ', value: summary.pending || 0, icon: Clock3, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'กำลังทบทวน', value: summary.in_progress || 0, icon: PlayCircle, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'สรุปแล้ว', value: summary.completed || 0, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'รุนแรงสูง', value: summary.high_severity || 0, icon: AlertTriangle, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{card.label}</span><card.icon className="h-4 w-4" /></div>
            <div className="mt-2 text-2xl font-bold">{Number(card.value).toLocaleString()}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Grid3X3 className="h-5 w-5 text-indigo-600" /> Risk Matrix ของทีม</h2><p className="mt-1 text-xs text-slate-500">หนึ่ง NRLS ต่อหนึ่งความเสี่ยง · Likelihood จากเหตุการณ์สะสม {matrixMeta.observation_months || 0} เดือน</p></div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{summary.mapped_risks || 0} ความเสี่ยง NRLS</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[70px_repeat(5,minmax(78px,1fr))] gap-1 text-center text-[10px] font-semibold text-slate-500">
                <div className="flex items-center justify-center">ผลกระทบ</div>
                {[1, 2, 3, 4, 5].map((value) => <div key={value}>โอกาส {value}</div>)}
                {[5, 4, 3, 2, 1].flatMap((consequence) => [
                  <div key={`label-${consequence}`} className="flex min-h-16 items-center justify-center rounded-lg bg-slate-50 px-1 dark:bg-slate-800">ระดับ {consequence}</div>,
                  ...[1, 2, 3, 4, 5].map((likelihood) => {
                    const cell = matrix?.[consequence - 1]?.[likelihood - 1] || { count: 0, items: [] };
                    return <div key={`${consequence}-${likelihood}`} title={(cell.items || []).map((item: any) => `${item.nrls_code} ${item.name || ''} (${item.incident_count || 0} ครั้ง)`).join('\n')} className={`flex min-h-16 flex-col items-center justify-center rounded-lg border ${getRiskMatrixClass(likelihood, consequence)}`}><span className="text-xl font-black">{cell.count || 0}</span><span className="opacity-80">ความเสี่ยง</span></div>;
                  }),
                ])}
              </div>
              <div className="mt-2 text-center text-[10px] font-semibold text-slate-500">โอกาสเกิดซ้ำ (Likelihood) →</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-bold text-slate-900 dark:text-white">ประเด็นความเสี่ยงที่ทีมพบมาก</h2>
          <p className="mt-1 text-xs text-slate-500">รวมเหตุการณ์ตาม NRLS เพื่อให้ทีมเห็นปัญหาเชิงระบบ</p>
          <div className="mt-4 space-y-2">
            {(workspace?.top_risks || []).length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-400">ยังไม่มีข้อมูลในช่วงที่เลือก</p> : (workspace?.top_risks || []).slice(0, 7).map((risk: any, index: number) => (
              <div key={risk.key} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{index + 1}</span>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-slate-800 dark:text-slate-100"><span className="mr-1 font-mono text-indigo-600">{risk.nrls_code}</span>{risk.name}</div><div className="mt-1 text-[10px] text-slate-500">L{risk.likelihood} × C{risk.consequence} = {risk.risk_score} · เกิด {risk.count} ครั้ง · รอทีม {risk.waiting || 0}</div></div>
                <span className="text-lg font-bold text-slate-800 dark:text-white">{risk.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`rounded-2xl border p-4 text-sm ${matrixMeta.data_quality === 'COMPLETE' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : matrixMeta.data_quality === 'NOT_STARTED' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        <div className="flex items-start gap-3">
          <CalendarRange className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold">Risk Matrix ปีงบประมาณ {matrixMeta.fiscal_year_thai || '-'}</div>
            <div className="mt-1 text-xs leading-5">
              {matrixMeta.data_quality === 'LEGACY_PARTIAL' && `ข้อมูลก่อนเริ่มบังคับใช้ NRLS วันที่ 1 ตุลาคม 2569 อาจไม่ครบถ้วน ระบบจะแสดงเฉพาะรายการที่มีรหัส NRLS เท่าที่มี (${summary.unmapped_incidents || 0} เหตุการณ์ยังไม่มี NRLS)`}
              {matrixMeta.data_quality === 'NOT_STARTED' && 'ปีงบประมาณนี้ยังไม่เริ่ม ระบบเตรียมเกณฑ์ไว้แล้วและจะคำนวณอัตโนมัติเมื่อมีข้อมูล'}
              {matrixMeta.data_quality === 'IN_PROGRESS' && `ข้อมูลสะสม ${matrixMeta.observation_months || 0} เดือน ยังไม่ใช่ผลสรุปครบปี`}
              {matrixMeta.data_quality === 'COMPLETE' && 'ข้อมูลครบช่วงประเมิน 12 เดือนแล้ว'}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_repeat(4,minmax(150px,auto))]">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="ค้นหา NRLS รายละเอียด หรือเลข Incident" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800" /></div>
            <select value={reviewStatus} onChange={(event) => { setReviewStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">สถานะทีมทั้งหมด</option><option value="PENDING">รอทีมรับ</option><option value="IN_PROGRESS">กำลังทบทวน</option><option value="COMPLETED">สรุปแล้ว</option></select>
            <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">ทุกหน่วยงานต้นทาง</option>{departments.map((department: any) => <option key={department.id} value={department.id}>{department.depart_name}</option>)}</select>
            <select value={programId} onChange={(event) => { setProgramId(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">ทุกโปรแกรม</option>{programs.map((program: any) => <option key={program.program_id} value={program.program_id}>{program.program_name}</option>)}</select>
            <select value={fiscalYear} onChange={(event) => { setFiscalYear(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"><option value="">ปีงบประมาณปัจจุบัน</option>{(matrixMeta.available_fiscal_years || []).map((year: number) => <option key={year} value={year}>ปีงบประมาณ {year + 543} ({year - 1}-10-01 ถึง {year}-09-30)</option>)}</select>
          </form>
        </div>

        {error ? <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : loading ? <div className="p-16 text-center text-sm text-slate-400">กำลังโหลดภาพรวมของทีม...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
                <tr><th className="w-12 p-4"><button type="button" onClick={toggleAllVisible}>{allVisibleSelected ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5" />}</button></th><th className="p-4">เหตุการณ์</th><th className="p-4">NRLS / เรื่องความเสี่ยง</th><th className="p-4">หน่วยงานต้นทาง</th><th className="p-4 text-center">ระดับ</th><th className="p-4">การจัดการหน่วยงาน</th><th className="p-4">สถานะทีม</th><th className="p-4 text-center">หลักฐาน</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? <tr><td colSpan={8} className="p-14 text-center text-sm text-slate-400">ไม่พบเหตุการณ์ที่หน่วยงานทบทวนแล้วและส่งให้ทีมนี้</td></tr> : rows.map((row: any) => {
                  const selected = selectedIds.includes(row.id);
                  const status = (row.team_review_status || 'PENDING') as TeamReviewStatus;
                  return <tr key={row.id} className={selected ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'}><td className="p-4"><button type="button" onClick={() => toggleRow(row.id)} disabled={row.status_risk === 'จำหน่าย' || status === 'COMPLETED'} className="disabled:cursor-not-allowed disabled:opacity-30">{selected ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5 text-slate-400" />}</button></td><td className="p-4"><div className="font-bold text-slate-800 dark:text-white">#{row.id}</div><div className="mt-1 text-[10px] text-slate-500">{row.date_report ? format(new Date(row.date_report), 'dd/MM/yyyy') : '-'}</div></td><td className="max-w-sm p-4"><div className="font-mono text-[11px] font-bold text-indigo-600">{row.nrls_code || 'Legacy'}</div><div className="mt-1 line-clamp-2 font-semibold text-slate-800 dark:text-slate-100">{row.nrls_name_snapshot || row.detail || '-'}</div><div className="mt-1 truncate text-[10px] text-slate-500">{row.program_name}</div></td><td className="p-4"><div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200"><Building2 className="h-3.5 w-3.5 text-slate-400" />{row.department_name}</div></td><td className="p-4 text-center"><span className={`inline-flex rounded-lg border px-2.5 py-1 font-bold ${severityClass(row.level_id)}`}>{row.level_id}</span></td><td className="p-4"><span className="font-semibold text-slate-700 dark:text-slate-200">{row.status_risk}</span><div className="mt-1 text-[10px] text-slate-500">ส่งทีม {row.send_date ? format(new Date(row.send_date), 'dd/MM/yyyy') : '-'}</div></td><td className="p-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${reviewStatusInfo[status].className}`}>{reviewStatusInfo[status].label}</span>{row.team_review_completed_at && <div className="mt-1 text-[10px] text-slate-500">{format(new Date(row.team_review_completed_at), 'dd/MM/yyyy')}</div>}</td><td className="p-4 text-center"><Link to={`/incidents/${row.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"><Eye className="h-3.5 w-3.5" /> ดูเหตุการณ์</Link></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800"><span>ทั้งหมด {workspace?.meta?.total || 0} เรื่อง</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button><span>หน้า {workspace?.meta?.page || 1} / {workspace?.meta?.totalPages || 1}</span><button type="button" disabled={page >= (workspace?.meta?.totalPages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>

      {selectedIds.length > 0 && (
        <section className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 rounded-3xl border border-indigo-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-indigo-800 dark:bg-slate-900/95">
          <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="shrink-0"><div className="font-bold text-indigo-700">เลือก {selectedIds.length} เรื่อง</div><div className="text-[10px] text-slate-500">บันทึกครั้งเดียว ระบบสร้างประวัติให้ทุก Incident</div></div>
            <textarea value={batchNote} onChange={(event) => setBatchNote(event.target.value)} rows={2} placeholder="ข้อเสนอแนะ/ผลสรุปของทีม (จำเป็นเมื่อสรุปงาน)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800" />
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => runBatch('START')} disabled={saving || !canBatch || hasClosedSelection} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><PlayCircle className="h-4 w-4" /> รับเข้าทบทวน</button><button type="button" onClick={() => runBatch('COMPLETE')} disabled={saving || !canBatch || hasClosedSelection} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> สรุปผลทีม</button></div>
          </div>
          {!canBatch && <p className="mt-2 text-[10px] text-amber-700">Admin กรุณาเลือกทีมก่อนดำเนินการแบบกลุ่ม</p>}
        </section>
      )}
    </div>
  );
}
