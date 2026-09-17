import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  FileText, Calendar, ExternalLink, Search, 
  ArrowLeft, ShieldAlert
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStatusInfo, getSeverityBadge } from '../utils/statusAdapter';
import { getImprovementProgress } from '../utils/incidentProgress';

export default function MyReportedIncidents() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>({
    reportedThisMonth: 0,
    incidents: [],
    fiscalYearsList: [],
    selectedFiscalYear: new Date().getFullYear(),
  });
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(() => /^20\d{2}$/.test(searchParams.get('fiscalYear') || '') ? searchParams.get('fiscalYear')! : '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [followupFilter, setFollowupFilter] = useState(() => ['returned', 'monitoring', 'closed'].includes(searchParams.get('followup') || '') ? searchParams.get('followup')! : 'all');

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const token = localStorage.getItem('token');
        const params: any = {};
        if (selectedFiscalYear) params.fiscalYear = selectedFiscalYear;
        const response = await axios.get('/incidents/my-reported', {
          signal: controller.signal,
          params,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (controller.signal.aborted) return;
        setData(response.data);
        if (!selectedFiscalYear && response.data.selectedFiscalYear) {
          setSelectedFiscalYear(response.data.selectedFiscalYear.toString());
        }
      } catch (error) {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedFiscalYear, user?.id, attempt]);

  const ready = !loading && !failed;
  const countLabel = (value: number) => ready ? value.toLocaleString() : '—';

  // Local filter for search term
  const filteredIncidents = data.incidents?.filter((inc: any) => {
    if (followupFilter === 'returned' && inc.status_risk !== 'แก้ไข') return false;
    if (followupFilter === 'monitoring' && inc.improvement_status !== 'MONITORING') return false;
    if (followupFilter === 'closed' && inc.improvement_status !== 'CLOSED') return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inc.id.toString().includes(term) ||
      (inc.nrls_code && inc.nrls_code.toLowerCase().includes(term)) ||
      (inc.riskstore_name && inc.riskstore_name.toLowerCase().includes(term)) ||
      (inc.detail && inc.detail.toLowerCase().includes(term))
    );
  }) || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1.5">
            <Link to="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> แดชบอร์ด
            </Link>
            <span>/</span>
            <span>ความเสี่ยงที่คุณรายงาน</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            ประวัติการส่งรายงานความเสี่ยงของคุณ
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            รายการความเสี่ยงทั้งหมดที่ล็อกอินด้วยบัญชี: <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name}</span> (พบ {countLabel(filteredIncidents.length)} รายการ)
          </p>
        </div>

        {/* Fiscal Year Filter Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">ปีงบประมาณ :</span>
          <select
            value={selectedFiscalYear}
            onChange={(e) => setSelectedFiscalYear(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            {data.fiscalYearsList?.map((yr: number) => (
              <option key={yr} value={yr}>ปีงบประมาณ {yr + 543} (ค.ศ. {yr})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Returned for edit alert banner */}
      {ready && data.incidents?.some((inc: any) => inc.status_risk === 'แก้ไข') && (
        <div className="bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border-l-4 border-orange-500 p-4 rounded-2xl flex items-center justify-between gap-4 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-sm shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-orange-950 dark:text-orange-200 text-sm">
                ⚠️ มีอุบัติการณ์ถูกส่งกลับมาให้คุณแก้ไขจำนวน {data.incidents?.filter((inc: any) => inc.status_risk === 'แก้ไข').length} เรื่อง
              </h3>
              <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5">
                กรุณาคลิก "ดู/แก้ไขเคส" ในตารางด้านล่างเพื่อทำการปรับปรุงข้อมูลและส่งกลับเข้าสู่ระบบอีกครั้ง
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">รายงานทั้งหมดของปีงบนี้</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{countLabel(data.incidents?.length || 0)} เรื่อง</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">รายงานในเดือนนี้</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{countLabel(data.reportedThisMonth || 0)} เรื่อง</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ส่งกลับมาให้แก้ไข</p>
            <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
              {countLabel(data.incidents?.filter((inc: any) => inc.status_risk === 'แก้ไข').length || 0)} เรื่อง
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">เข้าเกณฑ์ทบทวน RCA</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {countLabel(data.incidents?.filter((inc: any) => Boolean(inc.rca_required)).length || 0)} เรื่อง
            </h3>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <h2 className="font-semibold">เรื่องที่รายงานไปถึงไหนแล้ว</h2>
        <p className="mt-1">ดูสถานะเหตุการณ์ควบคู่กับการติดตามมาตรการ แม้ปิดเหตุการณ์แล้ว งานปรับปรุงอาจยังดำเนินต่อ เปิดรายละเอียดเพื่ออ่านการทบทวนและผลประเมินที่ทีมบันทึกไว้</p>
      </section>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Bar header */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="ค้นหารายงานของฉัน"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาตามรหัสเสี่ยง หรือคำอธิบาย..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          <select aria-label="กรองความคืบหน้ารายงานของฉัน" value={followupFilter} onChange={event => setFollowupFilter(event.target.value)} className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value="all">ทุกความคืบหน้า</option>
            <option value="returned">ส่งกลับให้ฉันแก้ไข</option>
            <option value="monitoring">กำลังติดตามมาตรการ</option>
            <option value="closed">ปิดการติดตามมาตรการแล้ว</option>
          </select>
          <button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-blue-700 disabled:opacity-50 dark:text-blue-300">โหลดรายงานใหม่</button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังดึงข้อมูลประวัติรายงานของคุณ...</span>
              </div>
            </div>
          ) : failed ? (
            <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">โหลดรายงานของคุณไม่สำเร็จ กรุณากดโหลดรายงานใหม่</p>
          ) : filteredIncidents.length === 0 ? (
            <div className="py-20 text-center text-slate-450 dark:text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-semibold text-slate-600 dark:text-slate-400 text-sm">ไม่พบประวัติการรายงานความเสี่ยง</p>
              <p className="text-xs text-slate-450 mt-1">ที่ค้นหาในรอบปีงบประมาณ {Number(selectedFiscalYear) + 543}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-650 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">รหัส</th>
                  <th className="px-6 py-4 min-w-[280px]">หัวข้อความเสี่ยง / อาการ</th>
                  <th className="px-6 py-4 text-center">ระดับ</th>
                  <th className="px-6 py-4">หน่วยงานที่รายงาน</th>
                  <th className="px-6 py-4">หน่วยงานที่รายงานถึง</th>
                  <th className="px-6 py-4">วันที่เกิดเหตุ</th>
                  <th className="px-6 py-4">สถานะเหตุการณ์ / การติดตาม</th>
                  <th className="px-6 py-4 text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredIncidents.map((inc: any) => {
                  const statusInfo = getStatusInfo(inc.status_risk);
                  const severity = getSeverityBadge(inc.level_id, inc.riskstore_id);
                  const needsRca = Boolean(inc.rca_required);
                  const improvement = getImprovementProgress(inc.improvement_status);
                  const isReturnedForEdit = inc.status_risk === 'แก้ไข';
                  return (
                    <tr 
                      key={inc.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors align-top ${
                        isReturnedForEdit
                          ? 'bg-orange-50/40 dark:bg-orange-950/20'
                          : needsRca
                            ? 'bg-red-50/20 dark:bg-red-950/5'
                            : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        #{inc.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{inc.riskstore_name}</div>
                        {inc.detail && (
                          <div className="text-xs text-slate-450 dark:text-slate-400 mt-1 line-clamp-2 max-w-[400px]">
                            {inc.detail}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${severity.badgeClass}`}>
                          {severity.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-350 font-medium">
                        {inc.department_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-650 dark:text-slate-400">
                        {inc.sendto_department_name || 'ไม่มีระบุ'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-650 dark:text-slate-400">
                        {inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                          {statusInfo.label}
                        </span>
                        <div className={`mt-2 min-w-[200px] text-xs ${improvement.className}`}>
                          <p className="font-semibold">{improvement.label}</p>
                          <p className="mt-1">{improvement.detail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Link 
                          to={`/incidents/${inc.id}?from=my-reported`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isReturnedForEdit
                              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{isReturnedForEdit ? 'ดู/แก้ไขเคส' : 'ดูความคืบหน้า'}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
