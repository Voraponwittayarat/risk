import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  Search, Plus, AlertTriangle, 
  ChevronLeft, ChevronRight,
  Layers, Shield, ShieldAlert, ShieldCheck, X, CheckSquare, Square, Building2
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getStatusInfo, getSeverityBadge, isSentinelEvent } from '../utils/statusAdapter';
import { useAuth } from '../contexts/AuthContext';
import { MiniRcaModal } from './rca/MiniRcaModal';

interface IncidentListProps {
  mode?: 'dept' | 'team' | 'pending';
  defaultTab?: string;
}

const IncidentList = ({ mode = 'dept', defaultTab }: IncidentListProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const requestedTab = searchParams.get('tab');
  const allowedTabs = ['all', 'รายงาน', 'แก้ไข', 'ตรวจสอบ', 'ทบทวน', 'forwarded', 'จำหน่าย', 'ไม่ใช่ความเสี่ยง', 'sentinel'];
  const initialTab = requestedTab && allowedTabs.includes(requestedTab) ? requestedTab : 'all';
  const [activeTab, setActiveTab] = useState<string>(defaultTab || (mode === 'pending' ? 'รายงาน' : initialTab));
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedDept, setSelectedDept] = useState(() => searchParams.get('department_id') || '');
  const [selectedLevel, setSelectedLevel] = useState(() => searchParams.get('level_id') || '');
  const [selectedProgram, setSelectedProgram] = useState(() => searchParams.get('program_id') || '');
  const [selectedNrlsType, setSelectedNrlsType] = useState(() => searchParams.get('nrls_type') || '');
  const [selectedClassification, setSelectedClassification] = useState(() => searchParams.get('classification_status') || '');
  const [programs, setPrograms] = useState<any[]>([]);
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

  const isAdmin = user?.role === 'admin';
  const isRmCommittee = user?.role === 'rm_committee';
  const isHospitalRiskManager = isRmCommittee && user?.rmScope === 'hospital';
  const canViewPendingFilters = isAdmin || isHospitalRiskManager;
  const hasWideRmScope = isRmCommittee && (user?.rmScope === 'hospital' || user?.rmScope === 'group');
  const rmScopeLabel = user?.rmScope === 'hospital'
    ? 'ทุกหน่วยงานทั้งโรงพยาบาล (RM ส่วนกลาง)'
    : 'ทุกหน่วยงานในกลุ่มงานเดียวกัน';
  const hasSecondaryDept = user?.department_id2 && user?.department_id2 !== 0;

  const primaryDeptName = departments.find(d => Number(d.id) === Number(user?.department_id))?.depart_name || 'หน่วยงานหลัก';
  const secondaryDeptName = departments.find(d => Number(d.id) === Number(user?.department_id2))?.depart_name || 'หน่วยงานรอง';

  const teamName = user?.teamName || (user?.teamId ? `ทีมนำรหัส ${user.teamId}` : '');
  const canReviewIncident = (incident: any) => Boolean(
    incident?.permissions?.canReview || incident?.permissions?.canTeamReview,
  );

  // Fetch departments list for filter
  useEffect(() => {
    axios.get('/departments')
      .then(res => setDepartments(res.data || []))
      .catch(console.error);
    axios.get('/incidents/form-data')
      .then(res => setPrograms(res.data.programs || []))
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
    if (selectedProgram) params.program_id = selectedProgram;
    if (selectedNrlsType) params.nrls_type = selectedNrlsType;
    if (selectedClassification) params.classification_status = selectedClassification;
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
  }, [page, activeTab, selectedDept, selectedLevel, selectedProgram, selectedNrlsType, selectedClassification, scopeType, mode, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  // Toggle selection of single incident
  const toggleSelectIncident = (inc: any) => {
    if (inc.status_risk !== 'ทบทวน' || !canReviewIncident(inc)) return;
    if (selectedIncidents.some((item) => item.id === inc.id)) {
      setSelectedIncidents(selectedIncidents.filter((item) => item.id !== inc.id));
    } else {
      setSelectedIncidents([...selectedIncidents, inc]);
    }
  };

  // Toggle select all on page
  const toggleSelectAll = () => {
    const eligibleIncidents = incidents.filter((incident) => incident.status_risk === 'ทบทวน' && canReviewIncident(incident));
    if (selectedIncidents.length === eligibleIncidents.length && eligibleIncidents.length > 0) {
      setSelectedIncidents([]);
    } else {
      setSelectedIncidents(eligibleIncidents);
    }
  };

  const selectableIncidents = incidents.filter((incident) => incident.status_risk === 'ทบทวน' && canReviewIncident(incident));
  const isAllSelected = selectableIncidents.length > 0 && selectedIncidents.length === selectableIncidents.length;

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

  const renderIncidentActions = (inc: any, isSentinel: boolean, compact = false) => {
    const status = inc.status_risk || 'รายงาน';
    const isPending = status === 'รายงาน' || status === 'แก้ไข';
    const isConfirmed = status === 'ตรวจสอบ';
    const isReviewing = status === 'ทบทวน';
    const canManageWorkflow = isPending
      ? Boolean(inc.permissions?.canConfirm)
      : (isConfirmed || isReviewing)
        ? canReviewIncident(inc)
        : false;
    const detailLabel = isPending
      ? (canManageWorkflow ? 'ตรวจสอบ / ยืนยัน' : 'ดูรายละเอียด')
      : isConfirmed
        ? (canManageWorkflow ? 'เริ่มทบทวน' : 'ดูรายละเอียด')
        : isReviewing
          ? (canManageWorkflow ? 'ดำเนินการทบทวน' : 'ดูรายละเอียด')
          : 'ดูประวัติ';
    const detailHash = (isConfirmed || isReviewing) && canManageWorkflow ? '#review-workstation' : '';

    return (
    <div className={`flex items-center ${compact ? 'w-full gap-2' : 'justify-center gap-1.5'}`}>
      <Link
        to={`/incidents/${inc.id}${detailHash}`}
        title="ดูและจัดการความเสี่ยง"
        className={`${compact ? 'flex-1 justify-center py-2.5' : 'px-3 py-1.5'} inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold text-xs shadow-sm transition-all`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>{detailLabel}</span>
      </Link>
      {isReviewing && canManageWorkflow && (isSentinel ? (
        <button
          type="button"
          onClick={() => navigate('/rca/standard/new', { state: { incident: inc } })}
          title="เปิด Standard Full RCA"
          className={`${compact ? 'flex-1 justify-center py-2.5' : 'p-2'} inline-flex items-center gap-1.5 rounded-xl border bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 transition-all font-bold text-xs`}
        >
          <ShieldAlert className="w-4 h-4" />{compact && <span>ทบทวน RCA</span>}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => { setMiniRcaIncident(inc); setIsMiniRcaOpen(true); }}
          title="ทบทวนด่วน Mini RCA"
          className={`${compact ? 'flex-1 justify-center py-2.5' : 'p-2'} inline-flex items-center gap-1.5 rounded-xl border bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 transition-all font-bold text-xs`}
        >
          <Shield className="w-4 h-4" />{compact && <span>ทบทวนด่วน</span>}
        </button>
      ))}
    </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {mode === 'pending'
              ? 'ตรวจสอบ & ยืนยันความเสี่ยง (รายการรอยืนยัน)'
              : mode === 'team' 
                ? `การจัดการความเสี่ยงทีม: ${teamName || 'ทีมดูแล'}`
                : user?.rmScope === 'hospital'
                  ? 'การจัดการความเสี่ยงส่วนกลาง'
                  : user?.rmScope === 'group'
                    ? 'การจัดการความเสี่ยงระดับกลุ่มงาน'
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
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link 
            to="/incidents/new" 
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-blue-500/20 hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            รายงานความเสี่ยงใหม่
          </Link>
        </div>
      </div>

      {mode === 'dept' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-600 p-2 text-white"><Building2 className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-blue-950 dark:text-blue-100">หน่วยงานเป็นผู้จัดการเหตุการณ์ก่อนส่งให้ทีม</h2>
              <div className="mt-2 grid gap-2 text-xs text-blue-800 dark:text-blue-200 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-white/70 p-3 dark:border-blue-900 dark:bg-slate-900/40"><strong>1. ยืนยันข้อมูล</strong><span className="mt-1 block text-[11px] opacity-80">ตรวจ NRLS ระดับความรุนแรง และหน่วยงานรับผิดชอบ</span></div>
                <div className="rounded-xl border border-blue-100 bg-white/70 p-3 dark:border-blue-900 dark:bg-slate-900/40"><strong>2. บันทึกการทบทวนหน่วยงาน</strong><span className="mt-1 block text-[11px] opacity-80">ระบุสาเหตุ การแก้ไขเบื้องต้น และมาตรการที่ทำแล้ว</span></div>
                <div className="rounded-xl border border-blue-100 bg-white/70 p-3 dark:border-blue-900 dark:bg-slate-900/40"><strong>3. ส่งให้ทีมนำ</strong><span className="mt-1 block text-[11px] opacity-80">ส่งได้เมื่อเหตุการณ์อยู่สถานะ “ทบทวน” แล้วเท่านั้น</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoping Selector / Badge - displayed in dept mode for non-admins */}
      {mode === 'dept' && !isAdmin && (
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              หน่วยงานที่กำลังเปิดดู :
            </span>
          </div>

          {hasWideRmScope ? (
            <div className="px-4 py-2 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
              <span>🛡️ ขอบเขต RM:</span>
              <span>{rmScopeLabel}</span>
            </div>
          ) : hasSecondaryDept ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full sm:w-auto bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/50">
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
        <div className="bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
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
      {(mode !== 'pending' || canViewPendingFilters) && (
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
              <option value="clinical_ef">ด้านคลินิก ระดับ E–F</option>
              <option value="clinical_ghi">ด้านคลินิก ระดับ G–I</option>
              <option value="general_45">ด้านองค์กร ระดับ 4–5</option>
              <option value="A">ระดับ A</option>
              <option value="B">ระดับ B</option>
              <option value="C">ระดับ C</option>
              <option value="D">ระดับ D</option>
              <option value="E">ระดับ E</option>
              <option value="F">ระดับ F</option>
              <option value="G">ระดับ G (Sentinel)</option>
              <option value="H">ระดับ H (Sentinel)</option>
              <option value="I">ระดับ I (Sentinel/Death)</option>
              <option value="1">ระดับ 1</option><option value="2">ระดับ 2</option><option value="3">ระดับ 3</option><option value="4">ระดับ 4</option><option value="5">ระดับ 5</option>
            </select>
          </div>

          <select value={selectedProgram} onChange={e => { setSelectedProgram(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <option value="">ทุกโปรแกรม NRLS</option>{programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
          </select>
          <select value={selectedNrlsType} onChange={e => { setSelectedNrlsType(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <option value="">Clinical และ General</option><option value="CLINICAL">Clinical</option><option value="GENERAL">General</option>
          </select>
          <select value={selectedClassification} onChange={e => { setSelectedClassification(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <option value="">ทุกสถานะการยืนยัน</option><option value="PENDING">รอยืนยัน</option><option value="CONFIRMED">ยืนยันแล้ว</option><option value="NEEDS_REVIEW">ต้องตรวจสอบ</option>
          </select>

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
                setSelectedProgram(''); setSelectedNrlsType(''); setSelectedClassification('');
                setPage(1);
              }}
              className="px-3 py-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ล้างค่า
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Incidents Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Compact cards keep the primary action within thumb reach on phones/tablets/laptops. */}
        <div className="xl:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
          {loading ? (
            <div className="px-5 py-14 text-center text-sm text-slate-400">กำลังโหลดรายการข้อมูล...</div>
          ) : incidents.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-slate-400">ไม่พบรายการอุบัติการณ์ที่ตรงกับเงื่อนไข</div>
          ) : incidents.map((inc) => {
            const isChecked = selectedIncidents.some((item) => item.id === inc.id);
            const canSelectForRca = inc.status_risk === 'ทบทวน' && canReviewIncident(inc);
            const statusInfo = getStatusInfo(inc.status_risk);
            const severity = getSeverityBadge(inc.level_id, inc.riskstore_id);
            const isSentinel = isSentinelEvent(inc.level_id, inc.riskstore_id);
            const needsRcaAction = Boolean(inc.rca_required) && inc.rca_status !== 'COMPLETED';
            const dtEvent = inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-';
            return (
              <article key={inc.id} className={`p-4 sm:p-5 ${isChecked ? 'bg-purple-50/50 dark:bg-purple-950/20' : needsRcaAction ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={isChecked} disabled={!canSelectForRca} onChange={() => toggleSelectIncident(inc)} aria-label={`เลือกอุบัติการณ์ ${inc.id} เพื่อทำ RCA`} className="mt-1 w-4 h-4 text-purple-600 rounded cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-30" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-extrabold text-slate-900 dark:text-white">#{inc.id}</span>
                      <span className={`inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-lg font-bold text-xs ${severity.badgeClass}`}>{severity.label}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusInfo.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>{statusInfo.label}
                      </span>
                      {needsRcaAction && (
                        <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow-sm">⚠ ต้องทำ RCA ต่อ</span>
                      )}
                    </div>
                    <h2 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm leading-snug break-words">
                      {inc.nrls_code ? `${inc.nrls_code} : ${inc.nrls_name_snapshot || 'รอตรวจสอบชื่อ NRLS'}` : 'ข้อมูลเดิม—ยังไม่มี NRLS'}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">{inc.detail || inc.problem_basic || 'ไม่มีรายละเอียด'}</p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[11px]">
                      <div className="flex gap-1.5"><dt className="text-slate-400 shrink-0">หน่วยงาน:</dt><dd className="font-medium text-slate-700 dark:text-slate-200 truncate">{inc.department_name || `แผนก ${inc.department_id}`}</dd></div>
                      <div className="flex gap-1.5"><dt className="text-slate-400 shrink-0">วันที่เกิดเหตุ:</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{dtEvent}</dd></div>
                      <div className="flex gap-1.5 sm:col-span-2"><dt className="text-slate-400 shrink-0">ความเสี่ยงเดิม:</dt><dd className="text-slate-600 dark:text-slate-300 truncate">{inc.risk_topic_name || '-'}</dd></div>
                    </dl>
                    <div className="mt-4">{renderIncidentActions(inc, isSentinel, true)}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm text-slate-600 dark:text-slate-300">
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
                <th className="w-[320px] max-w-[320px] px-6 py-4 whitespace-normal">รายละเอียดเหตุการณ์</th>
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
                <th className="px-4 py-4 text-center whitespace-nowrap">ดู / ทบทวน</th>
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
                  const canSelectForRca = inc.status_risk === 'ทบทวน' && canReviewIncident(inc);
                  const statusInfo = getStatusInfo(inc.status_risk);
                  const severity = getSeverityBadge(inc.level_id, inc.riskstore_id);
                  const isSentinel = isSentinelEvent(inc.level_id, inc.riskstore_id);
                  const needsRcaAction = Boolean(inc.rca_required) && inc.rca_status !== 'COMPLETED';
                  const dtEvent = inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-';
                  const dtRecord = inc.register_date ? format(new Date(inc.register_date), 'dd/MM/yyyy') : '-';

                  return (
                    <tr 
                      key={inc.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors align-top ${
                        isChecked ? 'bg-purple-50/40 dark:bg-purple-950/20' : needsRcaAction ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!canSelectForRca}
                          onChange={() => toggleSelectIncident(inc)}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">#{inc.id}</div>
                        <div className="text-xs text-slate-400">IR: {inc.id_risk}</div>
                        {needsRcaAction && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            ต้องทำ RCA ต่อ
                          </span>
                        )}
                      </td>

                      {/* Detail */}
                      <td className="w-[320px] max-w-[320px] px-6 py-4 whitespace-normal">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-1 leading-snug break-words [overflow-wrap:anywhere]">
                          {inc.nrls_code ? `${inc.nrls_code} : ${inc.nrls_name_snapshot || 'รอตรวจสอบชื่อ NRLS'}` : 'ข้อมูลเดิม—ยังไม่มี NRLS'}
                        </div>
                        <div className="text-[11px] text-slate-500 break-words [overflow-wrap:anywhere]">โปรแกรม #{inc.program_id || '-'} • {inc.classification_status || 'PENDING'} • ความเสี่ยงเดิม: {inc.risk_topic_name || '-'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
                        {renderIncidentActions(inc, isSentinel)}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        <div className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 bg-slate-900 text-white px-4 sm:px-6 py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-5">
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
