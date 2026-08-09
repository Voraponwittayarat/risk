import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldAlert,
  Shield,
  Layers,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  FileSearch,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';

interface OverviewStats {
  total_rca: number;
  mini_count: number;
  concise_count: number;
  standard_count: number;
  review_count?: number;
  pending_capas: number;
  completed_capas: number;
}

export default function RcaList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'standard' | 'mini_concise' | 'incident_review'>('standard');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<OverviewStats>({
    total_rca: 0,
    mini_count: 0,
    concise_count: 0,
    standard_count: 0,
    review_count: 0,
    pending_capas: 0,
    completed_capas: 0,
  });
  const [standardCases, setStandardCases] = useState<any[]>([]);
  const [miniConciseCases, setMiniConciseCases] = useState<any[]>([]);
  const [incidentReviews, setIncidentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/rca/overview-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load RCA stats', err);
    }
  };

  const fetchStandardCases = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/rca/standard');
      if (Array.isArray(res.data)) {
        setStandardCases(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setStandardCases(res.data.data);
      } else {
        setStandardCases([]);
      }
    } catch (err) {
      console.error('Failed to load standard RCA cases', err);
      setStandardCases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiniConciseCases = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/rca/cases');
      if (Array.isArray(res.data)) {
        setMiniConciseCases(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setMiniConciseCases(res.data.data);
      } else {
        setMiniConciseCases([]);
      }
    } catch (err) {
      console.error('Failed to load Mini/Concise cases', err);
      setMiniConciseCases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentReviews = async () => {
    try {
      const res = await axios.get('/rca/incident-reviews');
      setIncidentReviews(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load incident reviews', err);
      setIncidentReviews([]);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStandardCases();
    fetchMiniConciseCases();
    fetchIncidentReviews();
  }, []);

  const safeStandard = Array.isArray(standardCases) ? standardCases : [];
  const safeMiniConcise = Array.isArray(miniConciseCases) ? miniConciseCases : [];
  const safeIncidentReviews = Array.isArray(incidentReviews) ? incidentReviews : [];

  const filteredStandard = safeStandard.filter(
    (c) =>
      (c?.topic || '').toLowerCase().includes(search.toLowerCase()) ||
      (c?.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (c?.rm_no && c.rm_no.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredMiniConcise = safeMiniConcise.filter(
    (c) =>
      (c?.topic || '').toLowerCase().includes(search.toLowerCase()) ||
      (c?.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredIncidentReviews = safeIncidentReviews.filter(
    (r) =>
      (r?.risk_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r?.cause_problem || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ระบบวิเคราะห์สาเหตุที่แท้จริง (RCA Program)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            ศูนย์จัดการ RCA โรงพยาบาลวังเจ้า (3-Tier RCA Hub)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            ศูนย์รวมการทบทวนเชิงระบบ: Mini RCA (เคสเดี่ยว), Concise RCA (กลุ่มหลายเคส) และ Standard Full RCA ตามเกณฑ์มาตรฐาน 9 ด้าน และ Trigger Tool
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/trigger-tool')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <FileSearch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> ทบทวน Trigger Tool
          </button>

          <button
            onClick={() => navigate('/rca/standard/new')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> เปิด Standard RCA ใหม่
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">RCA ทั้งหมด</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              {stats.total_rca} <span className="text-xs font-normal text-slate-400">เรื่อง</span>
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Standard RCA</p>
            <h4 className="text-xl font-black text-rose-600 dark:text-rose-400 leading-tight">
              {stats.standard_count}
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Concise RCA (กลุ่ม)</p>
            <h4 className="text-xl font-black text-purple-600 dark:text-purple-400 leading-tight">
              {stats.concise_count}
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Mini RCA</p>
            <h4 className="text-xl font-black text-amber-600 dark:text-amber-400 leading-tight">
              {stats.mini_count}
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">มาตรการ CAPA ค้าง</p>
            <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {stats.pending_capas} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('standard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'standard'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Standard Full RCA ({standardCases.length})
        </button>

        <button
          onClick={() => setActiveTab('mini_concise')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'mini_concise'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Mini & Concise RCA ({miniConciseCases.length})
        </button>

        <button
          onClick={() => setActiveTab('incident_review')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'incident_review'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> RCA ทบทวน (4M1E) ({incidentReviews.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาตามรหัสเคส, หัวข้อเรื่อง, หรือเลขที่ RM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchStandardCases();
            fetchMiniConciseCases();
            fetchIncidentReviews();
          }}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          title="รีเฟรช"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Cards List / Grid */}
      {activeTab === 'standard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
              <span>กำลังโหลดข้อมูล Standard RCA...</span>
            </div>
          ) : filteredStandard.length === 0 ? (
            <div className="col-span-2 p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              ไม่พบรายการ Standard RCA
            </div>
          ) : (
            filteredStandard.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/rca/standard/${c.id}`)}
                className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                      {c.id}
                    </span>
                    {c.rm_no && (
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        RM: {c.rm_no}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    ความรุนแรง {c.severity || 'G'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2">
                    {c.topic}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {c.what_happened || c.actual_impact || 'ไม่มีรายละเอียด'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>ไทม์ไลน์: {c.timelines?.length || 0} จุด</span>
                    <span>ก้างปลา: {c.fishbones?.length || 0} ปัจจัย</span>
                    <span>CAPA: {c.capas?.length || 0} ข้อ</span>
                  </div>

                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold group-hover:translate-x-1 transition-transform">
                    เข้าดู / แก้ไข <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: MINI & CONCISE RCA */}
      {activeTab === 'mini_concise' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMiniConcise.length === 0 ? (
            <div className="col-span-2 p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              ไม่พบรายการ Mini หรือ Concise RCA
            </div>
          ) : (
            filteredMiniConcise.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {c.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.rca_type === 'concise'
                          ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {c.rca_type === 'concise' ? 'Concise (รวมหลายเคส)' : 'Mini RCA (เคสเดี่ยว)'}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {new Date(c.review_date).toLocaleDateString('th-TH')}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                  {c.topic}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {c.incident_detail || 'ไม่มีรายละเอียด'}
                </p>

                {/* Swiss cheese & Actions count */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>ช่องโหว่ Swiss Cheese: {c.swiss_cheeses?.length || 0} จุด</span>
                    <span>มาตรการ CMP: {c.cmps?.length || 0} ข้อ</span>
                  </div>

                  <span className="text-slate-500">
                    {c.incidents?.length ? `${c.incidents.length} เหตุการณ์เชื่อมโยง` : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: RCA ทบทวน (4M1E) */}
      {activeTab === 'incident_review' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIncidentReviews.length === 0 ? (
            <div className="col-span-2 p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              ไม่พบรายการ RCA ทบทวน (4M1E)
            </div>
          ) : (
            filteredIncidentReviews.map((r) => (
              <div
                key={r.id}
                onClick={() => r.risk_id && navigate(`/incidents/${r.risk_id}`)}
                className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      RCA-REV-#{r.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                      RCA ทบทวน (4M1E)
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {r.review_date ? new Date(r.review_date).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {r.risk_name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                    {r.cause_problem || 'ไม่มีสาเหตุรากเหง้า'}
                  </p>
                </div>

                {r.notereview && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                    {r.notereview}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>ระดับความรุนแรง: {r.severity_level || '-'}</span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                    เข้าดูเคสอุบัติการณ์ <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
