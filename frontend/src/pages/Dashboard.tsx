import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Activity, ShieldAlert, AlertTriangle,
  Clock, AlertOctagon, Plus, ExternalLink, ChevronRight,
  FileText, CheckCircle2, HeartHandshake,
  LayoutGrid, PlusCircle, ClipboardList, ShieldCheck, Sparkles, 
  BarChart3, PieChart, Users, UserCheck, FolderKanban, Settings, FileCheck, Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStatusInfo, getSeverityBadge } from '../utils/statusAdapter';
import { format } from 'date-fns';

const greetings = [
  "🌱 ทุกความเสี่ยงที่เรามองเห็น คือโอกาสที่เราจะทำให้โรงพยาบาลปลอดภัยขึ้น",
  "💚 ขอบคุณที่ช่วยกันมองเห็นความเสี่ยง เพราะการเห็นเร็ว ทำให้เราแก้ได้เร็ว",
  "🛡️ เราไม่ได้มองหาความผิด เรากำลังมองหาวิธีทำให้ระบบดีขึ้น",
  "🌱 ทุกการรายงาน คืออีกหนึ่งก้าวของการเรียนรู้และพัฒนา",
  "🤝 ความปลอดภัยไม่ได้เป็นหน้าที่ของใครคนหนึ่ง แต่เกิดจากการช่วยกันของพวกเราทุกคน",
  "💡 ความเสี่ยงที่ถูกรายงานวันนี้ อาจช่วยป้องกันเหตุการณ์ในวันพรุ่งนี้",
  "❤️ ขอบคุณทุกคนที่กล้าบอกสิ่งที่อาจเกิดขึ้น เพราะการพูดออกมาคือการดูแลผู้ป่วย",
  "🔎 มองเห็นความเสี่ยง ไม่ใช่เรื่องน่ากลัว แต่คือจุดเริ่มต้นของการพัฒนา",
  "🌤️ วันนี้อาจยังไม่มีเหตุการณ์ แต่เราสามารถเตรียมระบบให้ปลอดภัยกว่าเดิมได้"
];

const StatCard = ({ title, value, icon: Icon, colorClass, to }: any) => {
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700/80 flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wide">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5 leading-none">{(value || 0).toLocaleString()}</h3>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

const DetailRow = ({ label, count, colorClass, to }: { label: string; count: number; colorClass: string; to?: string }) => {
  const content = (
    <div className="flex justify-between items-center p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700/60">
      <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`px-3.5 py-1 rounded-lg text-white font-bold text-xs shadow-xs ${colorClass}`}>
          {(count || 0).toLocaleString()}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

type DonutSegment = { label: string; value: number; color: string };

const SeverityDonut = ({ title, subtitle, segments }: { title: string; subtitle: string; segments: DonutSegment[] }) => {
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const total = visibleSegments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const stops = visibleSegments.map((segment) => {
    const start = cursor;
    cursor += total > 0 ? (segment.value / total) * 360 : 0;
    return `${segment.color} ${start}deg ${cursor}deg`;
  });
  const background = total > 0 ? `conic-gradient(${stops.join(', ')})` : '#e2e8f0';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-blue-500/20 bg-blue-600 px-5 py-3 text-white">
        <h3 className="font-bold">{title}</h3>
        <p className="mt-0.5 text-[11px] text-blue-100">{subtitle}</p>
      </div>
      <div className="p-5">
        <div className="mb-4 flex flex-wrap justify-center gap-x-3 gap-y-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: segment.color }} />
              <span>{segment.label}</span>
            </div>
          ))}
        </div>
        <div className="relative mx-auto flex h-48 w-48 items-center justify-center rounded-full" style={{ background }}>
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner dark:bg-slate-800">
            <strong className="text-3xl text-slate-900 dark:text-white">{total.toLocaleString()}</strong>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">เหตุการณ์</span>
          </div>
        </div>
        {total === 0 && <p className="mt-4 text-center text-xs text-slate-400">ยังไม่มีข้อมูลในขอบเขตที่คุณดูแล</p>}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [reportSearch, setReportSearch] = useState('');
  const [randomGreeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    reviewing: 0,
    closed: 0,
    notRisk: 0,
    sentinelClinical: 0,
    sentinelGeneral: 0,
    sentinelTotal: 0,
    byLevel: {} as Record<string, number>,
    activeSeverityByGoal: {
      clinical: {},
      patient: {},
      personnel: {},
      organization: {},
    } as Record<string, Record<string, number>>,
  });

  // State for My Reported Incidents
  const [myReportedData, setMyReportedData] = useState<any>({
    reportedThisMonth: 0,
    incidents: [],
    fiscalYearsList: [],
    selectedFiscalYear: new Date().getFullYear(),
  });
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');
  const [loadingMyReported, setLoadingMyReported] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/incidents/stats', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setStats((current) => ({
          ...current,
          ...response.data,
          byLevel: response.data?.byLevel || {},
          activeSeverityByGoal: response.data?.activeSeverityByGoal || current.activeSeverityByGoal,
        }));
      } catch (error) {
        console.error('Failed to fetch stats', error);
      }
    };
    
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchMyReported = async () => {
      setLoadingMyReported(true);
      try {
        const token = localStorage.getItem('token');
        const params: any = {};
        if (selectedFiscalYear) params.fiscalYear = selectedFiscalYear;
        const response = await axios.get('/incidents/my-reported', {
          params,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setMyReportedData(response.data);
        if (!selectedFiscalYear && response.data.selectedFiscalYear) {
          setSelectedFiscalYear(response.data.selectedFiscalYear.toString());
        }
      } catch (error) {
        console.error('Failed to fetch my reported incidents', error);
      } finally {
        setLoadingMyReported(false);
      }
    };
    fetchMyReported();
  }, [selectedFiscalYear]);

  const statCards = [
    { title: 'เรื่องทั้งหมดที่ดูแลอยู่', value: stats.total, icon: Activity, colorClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400', to: '/incidents/dept?tab=all' },
    { title: 'รอการยืนยัน', value: stats.pending, icon: Clock, colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', to: '/incidents/pending' },
    { title: 'กำลังดำเนินการแก้ไข', value: stats.confirmed, icon: AlertTriangle, colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400', to: '/incidents/dept?tab=ตรวจสอบ' },
    { title: 'เรื่องที่ต้องดูแลพิเศษ', value: stats.sentinelTotal, icon: ShieldAlert, colorClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400', to: '/incidents/dept?tab=sentinel' },
  ];

  const clinicalColors: Record<string, string> = {
    A: '#06b6d4', B: '#14b8a6', C: '#22c55e', D: '#84cc16', E: '#eab308',
    F: '#f59e0b', G: '#f97316', H: '#ef4444', I: '#b91c1c',
  };
  const generalColors: Record<string, string> = {
    '1': '#0f9f9a', '2': '#22c55e', '3': '#facc15', '4': '#f97316', '5': '#dc2626',
  };
  const goalSegments = (goal: string, levels: string[], colors: Record<string, string>): DonutSegment[] =>
    levels.map((level) => ({
      label: level,
      value: stats.activeSeverityByGoal?.[goal]?.[level] || 0,
      color: colors[level],
    }));
  const clinicalSegments = goalSegments('clinical', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], clinicalColors);
  const patientSegments = goalSegments('patient', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], clinicalColors);
  const personnelSegments = goalSegments('personnel', ['1', '2', '3', '4', '5'], generalColors);
  const organizationSegments = goalSegments('organization', ['1', '2', '3', '4', '5'], generalColors);
  const clinicalEF = (stats.byLevel.E || 0) + (stats.byLevel.F || 0);
  const clinicalGHI = (stats.byLevel.G || 0) + (stats.byLevel.H || 0) + (stats.byLevel.I || 0);
  const general45 = (stats.byLevel['4'] || 0) + (stats.byLevel['5'] || 0);

  const handleReportSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = reportSearch.trim();
    navigate(query ? `/incidents/dept?search=${encodeURIComponent(query)}` : '/incidents/dept');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></span>
            อัปเดตความปลอดภัยประจำวัน (Daily Summary)
          </h1>
          <div className="mt-2.5 mb-1.5 inline-block">
            <p className="text-base font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800/50 shadow-xs transition-all hover:shadow-md">
              {randomGreeting}
            </p>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            ผู้ใช้งาน: <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'ผู้ดูแลระบบ'}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            to="/my-reported"
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 shadow-xs transition-all"
          >
            <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ติดตามความเสี่ยงของฉัน
          </Link>
          <Link 
            to="/incidents/new" 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-blue-500/20 hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            รายงานความเสี่ยงใหม่
          </Link>
        </div>
      </div>

      {/* Quick Status Reassurance Banner */}
      <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-2xl px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm text-sky-900 dark:text-sky-300">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>
            {stats.pending === 0 ? (
              <strong>ยอดเยี่ยมมาก! ไม่มีรายการค้างที่รอการยืนยันในขณะนี้ ทุกอย่างอยู่ในเกณฑ์ปลอดภัย</strong>
            ) : (
              <span>ภาพรวมระบบเรียบร้อยดี มี <strong>{stats.pending} รายการ</strong> ที่รอการยืนยันสั้นๆ</span>
            )}
          </span>
        </div>
        <Link to="/incidents/pending" className="text-sky-700 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1 shrink-0 ml-2">
          ดูรายการรอ <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Report search, inspired by the legacy HRMS home screen */}
      <form onSubmit={handleReportSearch} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder="ค้นหารหัสรายงาน รหัสอุบัติการณ์ หรือคำสำคัญในรายงาน"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
            <Search className="h-4 w-4" /> ค้นหา
          </button>
        </div>
      </form>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Monitoring summary and safety-goal charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xs dark:border-emerald-900 dark:bg-slate-800">
            <div className="flex items-center justify-between bg-emerald-600 px-5 py-3 text-white">
              <div>
                <h2 className="font-bold">ติดตามและเฝ้าระวังรายงานอุบัติการณ์ความเสี่ยง</h2>
                <p className="text-[11px] text-emerald-100">สถานะล่าสุดในขอบเขตที่คุณรับผิดชอบ</p>
              </div>
              <Activity className="h-5 w-5" />
            </div>
            <div className="space-y-1 p-4">
              <DetailRow label="อุบัติการณ์ทั้งหมดในขอบเขต" count={stats.total} colorClass="bg-slate-500" to="/incidents/dept?tab=all" />
              <DetailRow label="อุบัติการณ์รอยืนยัน" count={stats.pending} colorClass="bg-blue-500" to="/incidents/pending" />
              <DetailRow label="ยืนยันแล้ว / รอดำเนินการ" count={stats.confirmed} colorClass="bg-emerald-500" to="/incidents/dept?tab=ตรวจสอบ" />
              <DetailRow label="อยู่ระหว่างทบทวน / RCA" count={stats.reviewing} colorClass="bg-amber-500" to="/incidents/dept?tab=ทบทวน" />
              <DetailRow label="ปิดเคสเรียบร้อยแล้ว" count={stats.closed} colorClass="bg-indigo-500" to="/incidents/dept?tab=จำหน่าย" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-xs dark:border-orange-900 dark:bg-slate-800">
            <div className="flex items-center justify-between bg-orange-500 px-5 py-3 text-white">
              <div>
                <h2 className="font-bold">เฝ้าระวังอุบัติการณ์ความเสี่ยงรุนแรง</h2>
                <p className="text-[11px] text-orange-100">รายการที่ต้องได้รับการดูแลเป็นพิเศษ</p>
              </div>
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div className="space-y-1 p-4">
              <DetailRow label="ด้านคลินิก ระดับ E–F" count={clinicalEF} colorClass="bg-orange-500" to="/incidents/dept?tab=all&level_id=clinical_ef" />
              <DetailRow label="ด้านคลินิก ระดับ G–I" count={clinicalGHI} colorClass="bg-rose-500" to="/incidents/dept?tab=all&level_id=clinical_ghi" />
              <DetailRow label="ด้านองค์กร ระดับ 4–5" count={general45} colorClass="bg-red-500" to="/incidents/dept?tab=all&level_id=general_45" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:col-span-7">
          <SeverityDonut title="Clinical Safety Goals" subtitle="อยู่ระหว่างการแก้ไข • ระดับ A–I" segments={clinicalSegments} />
          <SeverityDonut title="Patient Safety Goals" subtitle="อยู่ระหว่างการแก้ไข • รหัส CP • ระดับ A–I" segments={patientSegments} />
          <SeverityDonut title="Personnel Safety Goals" subtitle="อยู่ระหว่างการแก้ไข • รหัส GP • ระดับ 1–5" segments={personnelSegments} />
          <SeverityDonut title="Organization Safety Goals" subtitle="อยู่ระหว่างการแก้ไข • รหัส GO • ระดับ 1–5" segments={organizationSegments} />
        </div>
      </div>

      {/* Quick Navigation Shortcuts Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">🚀 ทางลัดเข้าใช้งานเมนูต่างๆ (Quick Navigation)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">เข้าถึงทุกส่วนของระบบบริหารความเสี่ยงได้อย่างรวดเร็ว</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. รายงานความเสี่ยงใหม่ */}
          <Link
            to="/incidents/new"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 to-sky-50/30 dark:from-blue-950/20 dark:to-sky-950/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                รายงานความเสี่ยงใหม่
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                ลงข้อมูลอุบัติการณ์ความเสี่ยงใหม่
              </p>
            </div>
          </Link>

          {/* 2. รายการความเสี่ยงทั้งหมด */}
          <Link
            to="/incidents/dept"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                รายการความเสี่ยงทั้งหมด
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                ค้นหา ทบทวน และจัดการอุบัติการณ์
              </p>
            </div>
          </Link>

          {/* 3. รายการรอยืนยันความเสี่ยง */}
          <Link
            to="/incidents/pending"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-amber-50/40 dark:bg-amber-950/10 hover:border-amber-300 dark:hover:border-amber-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  รายการรอยืนยัน
                </h3>
                {stats.pending > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                    {stats.pending}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                ตรวจสอบและยืนยันความเสี่ยง
              </p>
            </div>
          </Link>

          {/* 4. ประวัติรายงานของฉัน */}
          <Link
            to="/my-reported"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-emerald-50/40 dark:bg-emerald-950/10 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                ประวัติรายงานของฉัน
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                ติดตามเรื่องที่ฉันเป็นผู้แจ้งไว้
              </p>
            </div>
          </Link>

          {/* 5. การวิเคราะห์สาเหตุ (RCA) */}
          <Link
            to="/rca/list"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-purple-50/40 dark:bg-purple-950/10 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                วิเคราะห์สาเหตุ (RCA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Root Cause Analysis & แผนแก้ไข
              </p>
            </div>
          </Link>

          {/* 6. เครื่องมือ Trigger Tool */}
          <Link
            to="/trigger-tool"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-rose-50/40 dark:bg-rose-950/10 hover:border-rose-300 dark:hover:border-rose-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Trigger Tool Review
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                ค้นหาเหตุการณ์ไม่พึงประสงค์
              </p>
            </div>
          </Link>

          {/* 7. สรุปรายงาน & Risk Matrix */}
          <Link
            to="/reports"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-cyan-50/40 dark:bg-cyan-950/10 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                รายงาน & Risk Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                สรุปสถิติ & เมทริกซ์ความเสี่ยง 5x5
              </p>
            </div>
          </Link>

          {/* 8. สถิติการรายงานบุคคล */}
          <Link
            to="/reporting-stats"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-teal-50/40 dark:bg-teal-950/10 hover:border-teal-300 dark:hover:border-teal-700 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                สถิติการรายงานบุคคล
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                ดูผลงานการรายงานแยกรายบุคคล
              </p>
            </div>
          </Link>

          {/* 9-11. สำหรับ Admin / ผู้ดูแลระบบ */}
          {isAdmin && (
            <>
              <Link
                to="/personnel"
                className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors flex items-center gap-1">
                    จัดการบุคลากร
                    <span className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded-full">Admin</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    รายชื่อบุคลากรและหน่วยงาน
                  </p>
                </div>
              </Link>

              <Link
                to="/users"
                className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 hover:border-violet-300 dark:hover:border-violet-600 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors flex items-center gap-1">
                    จัดการผู้ใช้งาน
                    <span className="text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 font-bold px-1.5 py-0.2 rounded-full">Admin</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    สิทธิ์ รหัสผ่าน และสถานะบัญชี
                  </p>
                </div>
              </Link>

              <Link
                to="/risk-topics"
                className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 hover:border-orange-300 dark:hover:border-orange-600 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors flex items-center gap-1">
                    หัวข้อความเสี่ยง
                    <span className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 font-bold px-1.5 py-0.2 rounded-full">Admin</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    หมวดหมู่และระดับความรุนแรง
                  </p>
                </div>
              </Link>
            </>
          )}

          {/* 12. ตั้งค่าระบบ */}
          <Link
            to="/settings"
            className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:-translate-y-0.5 hover:shadow-md flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                ตั้งค่าระบบ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                การตั้งค่าทั่วไปและโปรไฟล์
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* My Reported Incidents Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/80 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50/70 dark:bg-slate-900/40 px-6 py-4 border-b border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white text-base">📝 อัปเดตเรื่องที่คุณแจ้งไว้</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">เรากำลังดูแลเรื่องเหล่านี้ให้คุณอยู่ครับ</p>
            </div>
          </div>

          {/* Fiscal Year Filter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">ปีงบประมาณ :</span>
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              {myReportedData.fiscalYearsList?.map((yr: number) => (
                <option key={yr} value={yr}>ปีงบประมาณ {yr + 543} (ค.ศ. {yr})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Counter Box */}
          <div className="lg:col-span-4 bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 text-white rounded-2xl p-6 flex flex-col justify-between shadow-md shadow-blue-500/10 min-h-[180px]">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium uppercase tracking-wider text-blue-100/90">your contribution</span>
                <HeartHandshake className="w-5 h-5 text-blue-200/90" />
              </div>
              <h3 className="text-lg font-bold mt-2 leading-snug">ผลงานดูแลความปลอดภัยของคุณ</h3>
              <p className="text-xs text-blue-100/80 mt-1">ประจำเดือนนี้</p>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight">
                {myReportedData.reportedThisMonth}
              </span>
              <span className="text-sm font-semibold text-blue-100/90">เรื่อง</span>
            </div>

            <p className="text-[10px] text-blue-200/80 mt-3 pt-3 border-t border-white/10">
              * ข้อมูลอัปเดตตามรอบเดือนปัจจุบัน
            </p>
          </div>

          {/* Reported Incidents List/Table */}
          <div className="lg:col-span-8 flex flex-col min-h-[180px]">
            {loadingMyReported ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังโหลดข้อมูลรายงานของคุณ...</span>
              </div>
            ) : myReportedData.incidents?.length === 0 ? (
              <Link 
                to="/my-reported" 
                className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 transition-all group cursor-pointer"
              >
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 mb-2 transition-colors" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  ตอนนี้ยังไม่มีเรื่องแจ้งเข้ามา
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">ในรอบปีงบประมาณ {Number(selectedFiscalYear) + 543}</span>
              </Link>
            ) : (
              <div className="flex-1 overflow-x-auto border border-slate-100 dark:border-slate-700/60 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/40 text-slate-550 font-semibold border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">รหัส</th>
                      <th className="px-4 py-3 min-w-[200px]">หัวข้อความเสี่ยง</th>
                      <th className="px-4 py-3 text-center">ระดับ</th>
                      <th className="px-4 py-3">วันที่รายงาน</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3 text-center">เปิดดู</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {myReportedData.incidents.slice(0, 5).map((inc: any) => {
                      const statusInfo = getStatusInfo(inc.status_risk);
                      const severity = getSeverityBadge(inc.level_id, inc.riskstore_id);
                      const isSentinel = Boolean(inc.rca_required);
                      return (
                        <tr 
                          key={inc.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors ${
                            isSentinel ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">#{inc.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={inc.riskstore_name}>
                            {inc.riskstore_name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${severity.badgeClass}`}>
                              {severity.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {inc.register_date ? format(new Date(inc.register_date), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.badgeClass}`}>
                              <span className={`w-1 h-1 rounded-full ${statusInfo.dotClass}`}></span>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link 
                              to={`/incidents/${inc.id}?from=my-reported`}
                              className="inline-flex p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {myReportedData.incidents.length > 5 && (
                  <div className="p-2 bg-slate-50/30 dark:bg-slate-900/10 text-center border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400">
                      แสดง 5 รายการล่าสุดจากทั้งหมด {myReportedData.incidents.length} รายการของปีงบนี้
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
