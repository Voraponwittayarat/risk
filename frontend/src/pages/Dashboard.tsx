import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Activity, ShieldAlert, AlertTriangle, TrendingUp, 
  Clock, AlertOctagon, Plus, ArrowRight, ExternalLink, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ title, value, icon: Icon, colorClass, to }: any) => {
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1 leading-none">{(value || 0).toLocaleString()}</h3>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

const DetailRow = ({ label, count, colorClass, to }: { label: string; count: number; colorClass: string; to?: string }) => {
  const content = (
    <div className="flex justify-between items-center p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
      <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`px-3.5 py-1 rounded-lg text-white font-bold text-xs shadow-sm ${colorClass}`}>
          {(count || 0).toLocaleString()}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

export default function Dashboard() {
  const { user } = useAuth();
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
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/incidents/stats', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      }
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { title: 'อุบัติการณ์ทั้งหมด', value: stats.total, icon: Activity, colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', to: '/incidents' },
    { title: 'รอยืนยัน (รายงาน)', value: stats.pending, icon: Clock, colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', to: '/incidents' },
    { title: 'ยืนยันแล้ว / รอแก้ไข', value: stats.confirmed, icon: AlertTriangle, colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400', to: '/incidents' },
    { title: 'Sentinel Events (E-I, 3-5)', value: stats.sentinelTotal, icon: ShieldAlert, colorClass: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400', to: '/incidents' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
            ความเสี่ยงวันนี้ (Daily Risk Surveillance)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            ศูนย์เกาะติดสถานการณ์และตัวชี้วัดความปลอดภัยโรงพยาบาล (ผู้ใช้งาน: <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'ผู้ดูแลระบบ'}</span>)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            to="/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            ดู Risk Matrix 5x5
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* 2 Main Categorized Monitoring Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ติดตามและเฝ้าระวังตามวงจร 5 สถานะ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-wide">สถานะการดำเนินงานความเสี่ยง (5-Stage Lifecycle)</h2>
                <p className="text-xs text-blue-100">กระบวนการรายงาน &rarr; ยืนยัน &rarr; แก้ไข &rarr; ปิดเคส</p>
              </div>
            </div>
            <Link to="/incidents" className="text-xs text-white/80 hover:text-white flex items-center gap-1 font-medium">
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 space-y-2 flex-1 flex flex-col justify-around">
            <DetailRow label="1. รอยืนยันความเสี่ยง (รายงานใหม่)" count={stats.pending} colorClass="bg-amber-500" to="/incidents" />
            <DetailRow label="2. ยืนยันแล้ว / รอแก้ไข (ตรวจสอบแล้ว)" count={stats.confirmed} colorClass="bg-blue-600" to="/incidents" />
            <DetailRow label="3. อยู่ระหว่างทบทวน / ดำเนินการ RCA" count={stats.reviewing} colorClass="bg-indigo-600" to="/incidents" />
            <DetailRow label="4. ปิดเคสเรียบร้อย (จำหน่าย)" count={stats.closed} colorClass="bg-emerald-600" to="/incidents" />
            <DetailRow label="5. ไม่ใช่ความเสี่ยง / ยกเลิก" count={stats.notRisk} colorClass="bg-slate-500" to="/incidents" />
          </div>
        </div>

        {/* เฝ้าระวังความรุนแรงสูง (Sentinel Event Surveillance) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-wide">เฝ้าระวังอุบัติการณ์ความรุนแรงสูง (Sentinel Alert)</h2>
                <p className="text-xs text-red-100">เกณฑ์เฝ้าระวังพิเศษที่ต้องทบทวนเชิงลึก (RCA)</p>
              </div>
            </div>
            <a 
              href="http://localhost:3001" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-white/90 hover:text-white flex items-center gap-1 font-semibold underline"
            >
              เปิดโปรแกรม RCA <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 space-y-2 flex-1 flex flex-col justify-around">
            <DetailRow label="ความเสี่ยงทางคลินิก ระดับ E, F, G, H, I (Sentinel)" count={stats.sentinelClinical} colorClass="bg-red-600" to="/incidents" />
            <DetailRow label="ความเสี่ยงทั่วไป / องค์กร ระดับ 3, 4, 5 (High Impact)" count={stats.sentinelGeneral} colorClass="bg-orange-500" to="/incidents" />
            
            <div className="mt-2 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>
                ตามมาตรฐาน HA อุบัติการณ์ระดับ E ขึ้นไป และระดับ 3 ขึ้นไป ต้องได้รับการตอบสนองและตั้งทีมทบทวนหาสาเหตุเชิงลึก (Swiss Cheese RCA) ทันที
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
