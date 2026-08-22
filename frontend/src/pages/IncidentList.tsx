import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  Search, Plus, AlertTriangle, 
  ChevronLeft, ChevronRight,
  Layers, Shield, ShieldAlert, ShieldCheck, X, CheckSquare, Square
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getStatusInfo, getSeverityBadge, isSentinelEvent } from '../utils/statusAdapter';
import { useAuth } from '../contexts/AuthContext';
import { MiniRcaModal } from './rca/MiniRcaModal';

interface IncidentListProps {
  mode?: 'dept' | 'team' | 'pending';
  defaultTab?: string;
}

const IncidentList = ({ mode = 'dept', defaultTab }: IncidentListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-select State for Concise / Batch RCA
  const [selectedIncidents, setSelectedIncidents] = useState<any[]>([]);

  // Mini RCA Modal State
  const [miniRcaIncident, setMiniRcaIncident] = useState<any | null>(null);
  const [isMiniRcaOpen, setIsMiniRcaOpen] = useState(false);

  // Filtering & Pagination State
  const [activeTab, setActiveTab] = useState<string>(defaultTab || (mode === 'pending' ? 'รายงาน' : 'all'));
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

  // Tab Counts State
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

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

  const isAdmin = user?.role === 'admin' || user?.accessrules === '1' || user?.accessrules === 'admin';
  const hasSecondaryDept = user?.department_id2 && user?.department_id2 !== 0;

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

  // Fetch departments list for filter
  useEffect(() => {
    axios.get('/departments')
      .then(res => setDepartments(res.data || []))
      .catch(console.error);
  }, []);

  // Fetch per-tab incident counts
  const fetchTabCounts = () => {
    const token = localStorage.getItem('token');
    const scope = mode === 'team' ? 'team' : scopeType;
    axios.get('/incidents/tab-counts', {
      params: { scope_type: scope },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => setTabCounts(res.data || {}))
      .catch(console.error);
  };

  useEffect(() => {
    fetchTabCounts();
  }, [mode, scopeType]);

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
    if (mode === 'pending') {
      params.status_risk = 'รายงาน';
    } else if (activeTab === 'sentinel') {
      params.level_id = 'sentinel_all';
    } else if (activeTab === 'forwarded') {
      params.is_forwarded = 'true';
    } else if (activeTab !== 'all') {
      params.status_risk = activeTab;
    }

    axios.get('/incidents', {
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

  // Toggle selection of single incident
  const toggleSelectIncident = (inc: any) => {
    if (selectedIncidents.some((item) => item.id === inc.id)) {
      setSelectedIncidents(selectedIncidents.filter((item) => item.id !== inc.id));
    } else {
      setSelectedIncidents([...selectedIncidents, inc]);
    }
  };

  // Toggle select all on page
  const toggleSelectAll = () => {
    if (selectedIncidents.length === incidents.length && incidents.length > 0) {
      setSelectedIncidents([]);
    } else {
      setSelectedIncidents([...incidents]);
    }
  };

  const isAllSelected = incidents.length > 0 && selectedIncidents.length === incidents.length;

  const tabs = [
    { id: 'all', label: 'ทั้งหมด', countKey: 'all' },
    ...(mode === 'dept' || mode === 'team' ? [] : [{ id: 'รายงาน', label: 'รอยืนยัน', countKey: 'pending' }]),
    { id: 'แก้ไข', label: 'ส่งกลับแก้ไข', countKey: 'returnedForEdit' },
    { id: 'ตรวจสอบ', label: 'ยืนยันแล้ว / รอแก้ไข', countKey: 'verified' },
    { id: 'ทบทวน', label: 'อยู่ระหว่างทบทวน / RCA', countKey: 'reviewing' },
    { id: 'forwarded', label: '📤 ส่งต่อร่วมทบทวน (Co-Review)', countKey: 'forwarded' },
    { id: 'จำหน่าย', label: 'ปิดเคส / เสร็จสิ้น', countKey: 'closed' },
    { id: 'ไม่ใช่ความเสี่ยง', label: 'ไม่ใช่ความเสี่ยง / ยกเลิก', countKey: 'notRisk' },
    { id: 'sentinel', label: '⚠️ ความรุนแรงสูง (Sentinel)', countKey: 'sentinel' },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {mode === 'pending'
              ? 'ตรวจสอบ & ยืนยันความเสี่ยง (รายการรอยืนยัน)'
              : mode === 'team' 
                ? `การจัดการความเสี่ยงทีม: ${teamName || 'ทีมดูแล'}`
                : 'การจัดการความเสี่ยงหน่วยงาน'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {mode === 'pending'
              ? `รายการอุบัติการณ์ความเสี่ยงใหม่ที่รอหัวหน้างาน/ผู้รับผิดชอบตรวจสอบและยืนยันข้อเท็จจริง (พบ ${totalCount.toLocaleString()} รายการ)`
              : mode === 'team'
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
      {mode === 'pending' ? (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-bold text-amber-900 dark:text-amber-200 text-sm">
              📌 รายการอุบัติการณ์ความเสี่ยงที่อยู่ระหว่าง "รอยืนยัน" (สถานะ: รายงาน)
            </span>
          </div>
          <span className="px-3.5 py-1.5 bg-amber-200/70 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 rounded-xl font-extrabold text-xs">
            {totalCount.toLocaleString()} รายการรอยืนยัน
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const isSentinelTab = tab.id === 'sentinel';
            const count = tab.countKey ? tabCounts[tab.countKey] : undefined;
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
                {count !== undefined && count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none ${
                    isActive
                      ? isSentinelTab
                        ? 'bg-red-400/40 text-white'
                        : 'bg-blue-400/40 text-white'
                      : isSentinelTab
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาตามรหัส, หัวข้อ, หรือข้อความ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทุกหน่วยงานที่รายงาน</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.depart_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทุกระดับความรุนแรง</option>
              <option value="A">ระดับ A</option>
              <option value="B">ระดับ B</option>
              <option value="C">ระดับ C</option>
              <option value="D">ระดับ D</option>
              <option value="E">ระดับ E</option>
              <option value="F">ระดับ F</option>
              <option value="G">ระดับ G (Sentinel)</option>
              <option value="H">ระดับ H (Sentinel)</option>
              <option value="I">ระดับ I (Sentinel/Death)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors text-center"
            >
              ค้นหา
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedDept('');
                setSelectedLevel('');
                setPage(1);
              }}
              className="px-3 py-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ล้างค่า
            </button>
          </div>
        </form>
      </div>

      {/* Incidents Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                    title={isAllSelected ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมดในหน้านี้'}
                  >
                    {isAllSelected ? <CheckSquare size={16} className="text-purple-600" /> : <Square size={16} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('id')} 
                  className="px-4 py-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัส</span>
                    {renderSortIndicator('id')}
                  </div>
                </th>
                <th className="px-6 py-4 min-w-[260px]">รายละเอียดเหตุการณ์</th>
                <th 
                  onClick={() => handleSort('department_id')} 
                  className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>หน่วยงานที่รายงาน</span>
                    {renderSortIndicator('department_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('sendto_department_id')} 
                  className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>หน่วยงานที่รายงานถึง</span>
                    {renderSortIndicator('sendto_department_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('level_id')} 
                  className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ระดับ</span>
                    {renderSortIndicator('level_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status_risk')} 
                  className="px-6 py-4 min-w-[180px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>สถานะ / วงจร</span>
                    {renderSortIndicator('status_risk')}
                  </div>
                </th>
                <th className="px-4 py-4 text-center">จัดการ / ทบทวน RCA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังโหลดรายการข้อมูล...</span>
                    </div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    ไม่พบรายการอุบัติการณ์ที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const isChecked = selectedIncidents.some((item) => item.id === inc.id);
                  const statusInfo = getStatusInfo(inc.status_risk);
                  const severity = getSeverityBadge(inc.level_id, inc.riskstore_id);
                  const isSentinel = isSentinelEvent(inc.level_id, inc.riskstore_id);
                  const dtEvent = inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-';
                  const dtRecord = inc.register_date ? format(new Date(inc.register_date), 'dd/MM/yyyy') : '-';

                  return (
                    <tr 
                      key={inc.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors align-top ${
                        isChecked ? 'bg-purple-50/40 dark:bg-purple-950/20' : isSentinel ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectIncident(inc)}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-4 py-4 whitespace-nowrap">
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
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        <div className="font-medium text-xs">{inc.department_name || `แผนก ${inc.department_id}`}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{inc.user_ir_type || 'รายงานตนเอง'}</div>
                      </td>

                      {/* Target Department */}
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        <div className="font-medium text-xs text-slate-700 dark:text-slate-200">
                          {inc.sendto_department_name || (inc.sendto_team_id ? 'ส่งต่อทีมนำ' : 'ไม่มีระบุ')}
                        </div>
                        {(inc.sendto_team_id || inc.sendto_department_id) && (() => {
                          const userDept = user?.department_id || (user as any)?.departmentId;
                          const isReceiver = userDept && String(inc.sendto_department_id) === String(userDept);
                          const isSender = userDept && String(inc.department_id) === String(userDept);

                          if (isReceiver && !isSender) {
                            return (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <span>📥 รับเรื่องร่วมทบทวน</span>
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <span>📤 ส่งต่อร่วมทบทวน</span>
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs ${severity.badgeClass}`}>
                          {severity.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${statusInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                          <span>{statusInfo.label}</span>
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-col gap-0.5">
                          <div>เกิดเหตุ: {dtEvent}</div>
                          <div>บันทึก: {dtRecord}</div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Link */}
                          <Link
                            to={`/incidents/${inc.id}`}
                            title="จัดการความเสี่ยง"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-950/50 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold text-xs shadow-2xs transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>จัดการความเสี่ยง</span>
                          </Link>

                          {/* In-App RCA Trigger */}
                          {isSentinel ? (
                            <button
                              onClick={() => navigate('/rca/standard/new', { state: { incident: inc } })}
                              title="เปิด Standard Full RCA สำหรับเหตุการณ์วิกฤต (Sentinel Event)"
                              className="p-2 rounded-xl border bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 transition-all"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setMiniRcaIncident(inc);
                                setIsMiniRcaOpen(true);
                              }}
                              title="ทบทวนด่วน Mini RCA (Swiss Cheese Model)"
                              className="p-2 rounded-xl border bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 transition-all"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Floating Multi-Select Concise RCA Action Bar */}
      {selectedIncidents.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white font-bold text-xs flex items-center justify-center">
              {selectedIncidents.length}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              รายการที่เลือก
            </span>
          </div>

          <button
            onClick={() => navigate('/rca/concise', { state: { incidents: selectedIncidents } })}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all"
          >
            <Layers size={14} /> รวมทบทวนหลายเรื่อง (Concise RCA)
          </button>

          <button
            onClick={() => setSelectedIncidents([])}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
            title="ล้างรายการที่เลือก"
          >
            <X size={14} /> ล้างการเลือก
          </button>
        </div>
      )}

      {/* Mini RCA Modal */}
      {miniRcaIncident && (
        <MiniRcaModal
          isOpen={isMiniRcaOpen}
          onClose={() => {
            setIsMiniRcaOpen(false);
            setMiniRcaIncident(null);
          }}
          incident={miniRcaIncident}
          onSuccess={() => fetchIncidents()}
        />
      )}
    </div>
  );
};

export default IncidentList;
