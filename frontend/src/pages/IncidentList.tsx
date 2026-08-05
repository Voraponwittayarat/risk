import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  Search, Plus, FileSearch, AlertTriangle, 
  ChevronLeft, ChevronRight, Eye, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStatusInfo, getSeverityBadge, isSentinelEvent } from '../utils/statusAdapter';
import { useAuth } from '../contexts/AuthContext';

interface IncidentListProps {
  mode?: 'dept' | 'team';
}

const IncidentList = ({ mode = 'dept' }: IncidentListProps) => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Pagination State
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting State
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // RM Committee Scoping States
  const [scopeType, setScopeType] = useState<string>('primary');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return <span className="text-slate-350 dark:text-slate-650 ml-1 select-none text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">⇅</span>;
    }
    return sortOrder === 'asc' 
      ? <span className="text-blue-600 dark:text-blue-400 ml-1 select-none text-[10px]">▲</span> 
      : <span className="text-blue-600 dark:text-blue-400 ml-1 select-none text-[10px]">▼</span>;
  };

  const isRmCommittee = user?.rmStatus === '1' || user?.role === 'rm_committee' || user?.accessrules === 'rm_committee';
  const isAdmin = user?.role === 'admin' || user?.accessrules === '1' || user?.accessrules === 'admin';
  const hasSecondaryDept = user?.department_id2 && user?.department_id2 !== 0;
  const hasTeam = user?.teamId != null;

  const primaryDeptName = departments.find(d => Number(d.id) === Number(user?.department_id))?.depart_name || 'หน่วยงานหลัก';
  const secondaryDeptName = departments.find(d => Number(d.id) === Number(user?.department_id2))?.depart_name || 'หน่วยงานรอง';

  const getTeamName = (teamId: number) => {
    switch (teamId) {
      case 1: return 'ทีมดูแลรักษาผู้ป่วย (PCT / PT)';
      case 2: return 'ทีมระบบข้อมูลสารสนเทศและเวชระเบียน (IT)';
      case 3: return 'ทีมเฝ้าระวังและควบคุมการติดเชื้อ (IC)';
      case 4: return 'ทีมดูแลสิทธิผู้ป่วย จริยธรรม และข้อร้องเรียน';
      case 5: return 'ทีมบริหารจัดการองค์กรและความปลอดภัยทั่วไป';
      case 6: return 'ทีมเครื่องมือและอุปกรณ์ทางการแพทย์';
      case 8: return 'ทีมสิ่งแวดล้อม สาธารณูปโภค และความปลอดภัย (ENV)';
      case 10: return 'ทีมระบบยาและความปลอดภัย (Medication)';
      default: return `ทีมดูแลระบบ (ทีม ${teamId})`;
    }
  };
  const teamName = user?.teamId ? getTeamName(user.teamId) : '';

  // Quick Action Confirm Loading
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Fetch departments list for filter
  useEffect(() => {
    axios.get('http://localhost:3000/departments')
      .then(res => setDepartments(res.data || []))
      .catch(console.error);
  }, []);

  const fetchIncidents = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params: any = {
      page,
      limit: 15,
    };

    if (search.trim()) params.search = search.trim();
    if (selectedDept) params.department_id = selectedDept;
    if (selectedLevel) params.level_id = selectedLevel;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    // Apply scoping parameter based on mode
    if (mode === 'team') {
      params.scope_type = 'team';
    } else {
      params.scope_type = scopeType;
    }

    // Handle Tab Mapping
    if (activeTab === 'sentinel') {
      params.level_id = 'sentinel_all';
    } else if (activeTab === 'forwarded') {
      params.is_forwarded = 'true';
    } else if (activeTab !== 'all') {
      params.status_risk = activeTab;
    }

    axios.get('http://localhost:3000/incidents', {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        setIncidents(res.data.data || []);
        setTotalPages(res.data.meta?.totalPages || 1);
        setTotalCount(res.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, activeTab, selectedDept, selectedLevel, scopeType, mode, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const handleQuickConfirm = async (id: number) => {
    if (!window.confirm('ยืนยันอุบัติการณ์ความเสี่ยงนี้ใช่หรือไม่?')) return;
    setConfirmingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:3000/incidents/${id}/status`,
        { status_risk: 'ตรวจสอบ', note: 'ยืนยันเหตุการณ์จากหน้ารายการ' },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchIncidents();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirmingId(null);
    }
  };

  const tabs = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'รายงาน', label: 'รอยืนยัน' },
    { id: 'ตรวจสอบ', label: 'ยืนยันแล้ว / รอแก้ไข' },
    { id: 'ทบทวน', label: 'อยู่ระหว่างทบทวน / RCA' },
    { id: 'forwarded', label: '📤 ส่งต่อร่วมทบทวน (Co-Review)' },
    { id: 'จำหน่าย', label: 'ปิดเคส / เสร็จสิ้น' },
    { id: 'sentinel', label: '⚠️ ความรุนแรงสูง (Sentinel)' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {mode === 'team' 
              ? `การจัดการความเสี่ยงทีม: ${teamName || 'ทีมดูแล'}`
              : 'การจัดการความเสี่ยงหน่วยงาน'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {mode === 'team'
              ? `เฝ้าระวังและร่วมทบทวนอุบัติการณ์สำหรับ${teamName || 'ทีมประสานงาน'} (พบ ${totalCount.toLocaleString()} รายการ)`
              : `บริหารจัดการความเสี่ยงและขั้นตอนติดตามงานระดับหน่วยงาน (พบ ${totalCount.toLocaleString()} รายการ)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/incidents/new" 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-blue-500/20 hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            รายงานความเสี่ยงใหม่
          </Link>
        </div>
      </div>

      {/* Scoping Selector / Badge - displayed in dept mode for non-admins */}
      {mode === 'dept' && !isAdmin && (
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              หน่วยงานที่กำลังเปิดดู :
            </span>
          </div>

          {hasSecondaryDept ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/50">
              <button
                onClick={() => {
                  setScopeType('primary');
                  setPage(1);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scopeType === 'primary'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                🏢 {primaryDeptName} (หน่วยงานหลัก - Primary)
              </button>
              <button
                onClick={() => {
                  setScopeType('secondary');
                  setPage(1);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scopeType === 'secondary'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                🏢 {secondaryDeptName} (หน่วยงานรอง - Secondary)
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900/50 flex items-center gap-2">
              <span>🏢 หน่วยงานหลัก (Primary):</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{primaryDeptName}</span>
            </div>
          )}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isSentinelTab = tab.id === 'sentinel';
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? isSentinelTab
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : isSentinelTab
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
        <form onSubmit={handleSearchSubmit} className={`${isAdmin ? 'sm:col-span-6' : 'sm:col-span-8'} relative`}>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาข้อความ, อาการ, หรือเลขที่อุบัติการณ์..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </form>

        {isAdmin && (
          <div className="sm:col-span-3">
            <select
              value={selectedDept}
              disabled={isRmCommittee && scopeType === 'team'}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white ${
                isRmCommittee && scopeType === 'team' ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <option value="">
                {isRmCommittee && scopeType === 'team' 
                  ? 'กรองตามทีมที่ดูแล (ทุกแผนก)' 
                  : 'ทุกกลุ่ม / หน่วยงาน'}
              </option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.depart_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={`${isAdmin ? 'sm:col-span-3' : 'sm:col-span-4'} flex gap-2`}>
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            <option value="">ทุกระดับความรุนแรง</option>
            <optgroup label="คลินิก (Clinical)">
              <option value="A">ระดับ A (Near miss)</option>
              <option value="B">ระดับ B</option>
              <option value="C">ระดับ C</option>
              <option value="D">ระดับ D</option>
              <option value="E">ระดับ E (Sentinel)</option>
              <option value="F">ระดับ F (Sentinel)</option>
              <option value="G">ระดับ G (Sentinel)</option>
              <option value="H">ระดับ H (Sentinel)</option>
              <option value="I">ระดับ I (Sentinel)</option>
            </optgroup>
            <optgroup label="ทั่วไป (General)">
              <option value="1">ระดับ 1</option>
              <option value="2">ระดับ 2</option>
              <option value="3">ระดับ 3 (Sentinel)</option>
              <option value="4">ระดับ 4 (Sentinel)</option>
              <option value="5">ระดับ 5 (Sentinel)</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th 
                  onClick={() => handleSort('id')} 
                  className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัส</span>
                    {renderSortIndicator('id')}
                  </div>
                </th>
                <th className="px-6 py-4 min-w-[280px]">รายละเอียดเหตุการณ์</th>
                <th 
                  onClick={() => handleSort('department_id')} 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>หน่วยงานที่รายงาน</span>
                    {renderSortIndicator('department_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('sendto_department_id')} 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>หน่วยงานที่รายงานถึง</span>
                    {renderSortIndicator('sendto_department_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('level_id')} 
                  className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ระดับ</span>
                    {renderSortIndicator('level_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status_risk')} 
                  className="px-6 py-4 min-w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>สถานะ / วงจร</span>
                    {renderSortIndicator('status_risk')}
                  </div>
                </th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังโหลดรายการข้อมูล...</span>
                    </div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    ไม่พบรายการอุบัติการณ์ที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const statusInfo = getStatusInfo(inc.status_risk);
                  const severity = getSeverityBadge(inc.level_id, inc.riskstore_id);
                  const isSentinel = isSentinelEvent(inc.level_id, inc.riskstore_id);
                  const dtEvent = inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-';
                  const dtRecord = inc.register_date ? format(new Date(inc.register_date), 'dd/MM/yyyy') : '-';

                  return (
                    <tr 
                      key={inc.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors align-top ${
                        isSentinel ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">#{inc.id}</div>
                        <div className="text-xs text-slate-400">IR: {inc.id_risk}</div>
                        {isSentinel && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Sentinel
                          </span>
                        )}
                      </td>

                      {/* Detail */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-1 leading-snug">
                          {inc.risk_topic_name || 'ไม่มีระบุหัวข้อความเสี่ยง'}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {inc.detail || inc.problem_basic || 'ไม่มีรายละเอียด'}
                        </div>
                        {inc.detail_hosxp && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                            <span>ผู้ป่วย/HN:</span> {inc.detail_hosxp}
                          </div>
                        )}
                        {inc.edit && inc.edit !== 'ยังไม่สามารถแก้ไขได้' && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 line-clamp-1 italic">
                            แก้ไขเบื้องต้น: {inc.edit}
                          </div>
                        )}
                      </td>

                      {/* Reporting Department */}
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <div className="font-medium">{inc.department_name || `แผนก ${inc.department_id}`}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{inc.user_ir_type || 'รายงานตนเอง'}</div>
                      </td>

                      {/* Target Department */}
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <div className="font-medium text-slate-700 dark:text-slate-200">{inc.sendto_department_name || 'ไม่มีระบุ'}</div>
                        {(inc.sendto_team_id || inc.sendto_department_id) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <span>📤 ส่งต่อร่วมทบทวน</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold text-sm ${severity.badgeClass}`}>
                          {severity.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border-2 shadow-xs ${statusInfo.badgeClass}`}>
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`}></span>
                          <span>{statusInfo.label}</span>
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1.5 flex flex-col gap-0.5">
                          <div>เกิดเหตุ: {dtEvent}</div>
                          <div>บันทึก: {dtRecord}</div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Link */}
                          <Link
                            to={`/incidents/${inc.id}`}
                            title="ดูรายละเอียดเคส / ประวัติ"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Quick Confirm Button if pending */}
                          {inc.status_risk === 'รายงาน' && (
                            <button
                              onClick={() => handleQuickConfirm(inc.id)}
                              disabled={confirmingId === inc.id}
                              title="ยืนยันความเสี่ยง (โดยหัวหน้างาน)"
                              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* External RCA Deep link */}
                          <a
                            href={`http://localhost:3001/rca/new?riskId=${inc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="ส่งทบทวน RCA (Swiss Cheese Model)"
                            className={`p-2 rounded-xl border transition-all ${
                              isSentinel
                                ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                            }`}
                          >
                            <FileSearch className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            แสดงหน้า <span className="font-semibold text-slate-700 dark:text-slate-200">{page}</span> จากทั้งหมด <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span> หน้า
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 font-medium text-slate-600 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentList;
