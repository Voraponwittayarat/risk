import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Users, Building, Filter, Calendar, Clock, Search, X, 
  Printer, Download, FileText, UserCheck, Award, 
  Activity, Sparkles, Building2, CheckCircle2, AlertCircle, Target, BarChart2, ShieldCheck, ShieldAlert, Layers, ExternalLink, MessageSquare, Info
} from 'lucide-react';
import { format } from 'date-fns';

export default function IndividualReportStats() {
  // Main Tab State: staff_report | program_matrix | dept_kpi | individual
  const [activeTab, setActiveTab] = useState<'staff_report' | 'program_matrix' | 'dept_kpi' | 'individual'>('program_matrix');

  // Matrix Grouping Mode inside REP1_14: 'risk_title' | 'program'
  const [matrixGroupMode, setMatrixGroupMode] = useState<'risk_title' | 'program'>('risk_title');

  // Selected Risk Title Item for Drill-down Modal
  const [selectedRiskModalItem, setSelectedRiskModalItem] = useState<any | null>(null);

  // Master Data States
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentGroups, setDepartmentGroups] = useState<any[]>([]);
  
  // Shared Filter States
  const [selectedDeptGroup, setSelectedDeptGroup] = useState<string>('all');
  const [selectedDeptForIndividual, setSelectedDeptForIndividual] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedYearType, setSelectedYearType] = useState<'fiscal' | 'calendar'>('fiscal');
  
  // Search Queries
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [deptSearchQuery, setDeptSearchQuery] = useState<string>('');
  const [matrixSearchQuery, setMatrixSearchQuery] = useState<string>('');
  const [individualSearchQuery, setIndividualSearchQuery] = useState<string>('');
  
  // Data Response States
  const [staffStatsData, setStaffStatsData] = useState<any>(null);
  const [deptStatsData, setDeptStatsData] = useState<any>(null);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [individualStatsData, setIndividualStatsData] = useState<any>(null);

  // Loading States
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);
  const [loadingDept, setLoadingDept] = useState<boolean>(true);
  const [loadingMatrix, setLoadingMatrix] = useState<boolean>(true);
  const [loadingIndividual, setLoadingIndividual] = useState<boolean>(true);

  // Initial Master Data Load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      axios.get('/departments', { headers }),
      axios.get('/departments/groups', { headers })
    ])
      .then(([deptRes, groupRes]) => {
        setDepartments(deptRes.data || []);
        setDepartmentGroups(groupRes.data || []);
      })
      .catch(console.error);
  }, []);

  // Fetch Staff Reporting Stats (Excel Format)
  const fetchStaffStats = () => {
    setLoadingStaff(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params: any = {
      year: selectedYear,
      year_type: selectedYearType,
    };
    if (selectedDeptGroup !== 'all') {
      params.department_group_id = selectedDeptGroup;
    }

    axios.get('/incidents/reports/department-staff-stats', { params, headers })
      .then(res => {
        setStaffStatsData(res.data || null);
        if (res.data?.summary?.year) {
          setSelectedYear(res.data.summary.year);
        }
        setLoadingStaff(false);
      })
      .catch(err => {
        console.error('Error fetching staff reporting stats:', err);
        setLoadingStaff(false);
      });
  };

  // Fetch Department KPI Monthly Stats
  const fetchDeptStats = () => {
    setLoadingDept(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params: any = {
      year: selectedYear,
      year_type: selectedYearType,
    };
    if (selectedDeptGroup !== 'all') {
      params.department_group_id = selectedDeptGroup;
    }

    axios.get('/incidents/reports/department-monthly-stats', { params, headers })
      .then(res => {
        setDeptStatsData(res.data || null);
        if (res.data?.summary?.year) {
          setSelectedYear(res.data.summary.year);
        }
        setLoadingDept(false);
      })
      .catch(err => {
        console.error('Error fetching department stats:', err);
        setLoadingDept(false);
      });
  };

  // Fetch REP1_14 Program Severity Matrix Stats
  const fetchProgramMatrixStats = () => {
    setLoadingMatrix(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params: any = {
      year: selectedYear,
      year_type: selectedYearType,
    };

    axios.get('/incidents/reports/program-severity-matrix', { params, headers })
      .then(res => {
        setMatrixData(res.data || null);
        if (res.data?.summary?.year) {
          setSelectedYear(res.data.summary.year);
        }
        setLoadingMatrix(false);
      })
      .catch(err => {
        console.error('Error fetching program matrix stats:', err);
        setLoadingMatrix(false);
      });
  };

  // Fetch Individual Monthly Stats
  const fetchIndividualStats = () => {
    setLoadingIndividual(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params: any = {
      year: selectedYear,
      year_type: selectedYearType,
    };
    if (selectedDeptGroup !== 'all') {
      params.department_group_id = selectedDeptGroup;
    }
    if (selectedDeptForIndividual !== 'all') {
      params.department_id = selectedDeptForIndividual;
    }

    axios.get('/incidents/reports/individual-monthly-stats', { params, headers })
      .then(res => {
        setIndividualStatsData(res.data || null);
        if (res.data?.year) {
          setSelectedYear(res.data.year);
        }
        setLoadingIndividual(false);
      })
      .catch(err => {
        console.error('Error fetching individual stats:', err);
        setLoadingIndividual(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'staff_report') {
      fetchStaffStats();
    } else if (activeTab === 'dept_kpi') {
      fetchDeptStats();
    } else if (activeTab === 'program_matrix') {
      fetchProgramMatrixStats();
    } else {
      fetchIndividualStats();
    }
  }, [activeTab, selectedDeptGroup, selectedDeptForIndividual, selectedYear, selectedYearType]);

  // Print Handler
  const handlePrintTable = () => {
    window.print();
  };

  // Export CSV for Staff Reporting (Excel Format)
  const handleExportStaffCsv = () => {
    if (!staffStatsData?.departmentRows) return;

    const filtered = staffStatsData.departmentRows.filter((d: any) => {
      if (!staffSearchQuery.trim()) return true;
      const q = staffSearchQuery.toLowerCase();
      return (
        d.department_name?.toLowerCase().includes(q) ||
        d.department_group_name?.toLowerCase().includes(q)
      );
    });

    const monthHeaders = selectedYearType === 'fiscal'
      ? ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']
      : ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const monthsOrder = staffStatsData.monthsOrder || [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    let csvContent = '\uFEFF';
    csvContent += `รายงานจำนวนเจ้าหน้าที่ที่รายงานแต่ละเดือน ประจำปี ${selectedYear + 543} (${selectedYearType === 'fiscal' ? 'ปีงบประมาณ' : 'ปีปฏิทิน'})\n`;
    csvContent += `ลำดับ,หน่วยงาน,จำนวนเจ้าหน้าที่ทั้งหมด,${monthHeaders.join(',')}\n`;

    filtered.forEach((d: any, idx: number) => {
      const monthValues = monthsOrder.map((mNum: number) => d.monthly_counts[mNum] || 0);
      csvContent += `"${idx + 1}","${d.department_name || ''}",${d.total_staff || 0},${monthValues.join(',')}\n`;
    });

    const totals = monthsOrder.map((mNum: number) => staffStatsData.monthlyStaffTotals?.[mNum] || 0);
    const pcts = monthsOrder.map((mNum: number) => staffStatsData.monthlyStaffPercentages?.[mNum] || '0.00%');
    csvContent += `,"รวม",${staffStatsData.summary?.totalHospitalStaff || 0},${totals.join(',')}\n`;
    csvContent += `,"ร้อยละ",100%,${pcts.join(',')}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `สถิติการรายงานของเจ้าหน้าที่จำแนกตามหน่วยงาน_${selectedYear + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for Department KPI
  const handleExportDeptCsv = () => {
    if (!deptStatsData?.departmentStats) return;

    const filtered = deptStatsData.departmentStats.filter((d: any) => {
      if (!deptSearchQuery.trim()) return true;
      const q = deptSearchQuery.toLowerCase();
      return (
        d.department_name?.toLowerCase().includes(q) ||
        d.department_group_name?.toLowerCase().includes(q)
      );
    });

    const monthHeaders = selectedYearType === 'fiscal'
      ? ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']
      : ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const monthsOrder = deptStatsData.monthsOrder || [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    let csvContent = '\uFEFF';
    csvContent += `รายงานตัวชี้วัดร้อยละการรายงานความเสี่ยงรายหน่วยงาน ประจำปี ${selectedYear + 543} (${selectedYearType === 'fiscal' ? 'ปีงบประมาณ' : 'ปีปฏิทิน'})\n`;
    csvContent += `ลำดับ,ชื่อหน่วยงาน/แผนก,กลุ่มงาน,${monthHeaders.join(',')},รวมจำนวนอุบัติการณ์ตลอดปี,จำนวนเดือนที่มีการรายงาน\n`;

    filtered.forEach((d: any, idx: number) => {
      const monthValues = monthsOrder.map((mNum: number) => d.monthly_counts[mNum] || 0);
      csvContent += `"${idx + 1}","${d.department_name || ''}","${d.department_group_name || ''}",${monthValues.join(',')},${d.total_incidents || 0},${d.months_with_reports_count || 0}/12 เดือน\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ตัวชี้วัดการรายงานความเสี่ยงรายหน่วยงาน_${selectedYear + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for REP1_14 Program & Risk Title Matrix
  const handleExportMatrixCsv = () => {
    const dataSource = matrixGroupMode === 'risk_title' ? matrixData?.riskTitleMatrix : matrixData?.matrix;
    if (!dataSource) return;

    const filtered = dataSource.filter((m: any) => {
      if (!matrixSearchQuery.trim()) return true;
      const q = matrixSearchQuery.toLowerCase();
      return (
        m.risk_title?.toLowerCase().includes(q) ||
        m.program_name?.toLowerCase().includes(q)
      );
    });

    let csvContent = '\uFEFF';
    csvContent += `REP1_14 : รายงานจำนวนอุบัติการณ์ความเสี่ยงทั้งหมดจำแนกตาม${matrixGroupMode === 'risk_title' ? 'ชื่อเรื่องความเสี่ยง' : 'โปรแกรม'} ประจำปี ${selectedYear + 543} (${selectedYearType === 'fiscal' ? 'ปีงบประมาณ' : 'ปีปฏิทิน'})\n`;
    csvContent += `ลำดับ,${matrixGroupMode === 'risk_title' ? 'ชื่อเรื่องความเสี่ยง,โปรแกรมความเสี่ยง' : 'โปรแกรมความเสี่ยง'},ระดับ A,ระดับ B,ระดับ C,ระดับ D,ระดับ E,ระดับ F,ระดับ G,ระดับ H,ระดับ I,ระดับ 1,ระดับ 2,ระดับ 3,ระดับ 4,ระดับ 5,รวมความเสี่ยงรุนแรง GHI,เวลาเฉลี่ยทำ RCA (วัน),รวมทั้งหมด\n`;

    filtered.forEach((m: any, idx: number) => {
      const nameCol = matrixGroupMode === 'risk_title'
        ? `"${m.risk_title || ''}","${m.program_name || ''}"`
        : `"${m.program_name || ''}"`;

      csvContent += `"${idx + 1}",${nameCol},${m.counts.A || 0},${m.counts.B || 0},${m.counts.C || 0},${m.counts.D || 0},${m.counts.E || 0},${m.counts.F || 0},${m.counts.G || 0},${m.counts.H || 0},${m.counts.I || 0},${m.counts[1] || 0},${m.counts[2] || 0},${m.counts[3] || 0},${m.counts[4] || 0},${m.counts[5] || 0},${m.total_ghi || 0},"${m.avg_rca_days !== null ? m.avg_rca_days + ' วัน' : '-'}",${m.total_all || 0}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `REP1_14_รายงานความเสี่ยง_${matrixGroupMode}_${selectedYear + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for Individual Stats
  const handleExportIndividualCsv = () => {
    if (!individualStatsData?.memberStats) return;

    const filtered = (individualStatsData?.memberStats || []).filter((m: any) => {
      if (!individualSearchQuery.trim()) return true;
      const q = individualSearchQuery.toLowerCase();
      return (
        m.member_name?.toLowerCase().includes(q) ||
        m.position_name?.toLowerCase().includes(q) ||
        m.department_name?.toLowerCase().includes(q) ||
        m.department_group_name?.toLowerCase().includes(q)
      );
    });

    const monthHeaders = selectedYearType === 'fiscal'
      ? ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']
      : ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const monthsOrder = selectedYearType === 'fiscal'
      ? [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let csvContent = '\uFEFF';
    csvContent += `รายงานสถิติการส่งรายงานอุบัติการณ์และความเสี่ยงต่อเดือนแยกรายบุคคล ประจำปี ${selectedYear + 543} (${selectedYearType === 'fiscal' ? 'ปีงบประมาณ' : 'ปีปฏิทิน'})\n`;
    csvContent += `ลำดับ,ชื่อ-นามสกุล,ตำแหน่ง,หน่วยงาน/แผนก,กลุ่มงาน,${monthHeaders.join(',')},รวมทั้งหมดในปีนี้\n`;

    filtered.forEach((m: any, idx: number) => {
      const monthValues = monthsOrder.map((mNum: number) => m.monthly_counts[mNum] || 0);
      csvContent += `"${idx + 1}","${m.member_name || ''}","${m.position_name || ''}","${m.department_name || ''}","${m.department_group_name || ''}",${monthValues.join(',')},${m.total_count || 0}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `สถิติรายงานความเสี่ยงรายบุคคล_${selectedYear + 543}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDepartments = selectedDeptGroup === 'all'
    ? departments
    : departments.filter((d: any) => String(d.depart_group_id) === String(selectedDeptGroup));

  const monthsHeaderList = selectedYearType === 'fiscal'
    ? [
        { num: 10, label: 'ต.ค.' },
        { num: 11, label: 'พ.ย.' },
        { num: 12, label: 'ธ.ค.' },
        { num: 1, label: 'ม.ค.' },
        { num: 2, label: 'ก.พ.' },
        { num: 3, label: 'มี.ค.' },
        { num: 4, label: 'เม.ย.' },
        { num: 5, label: 'พ.ค.' },
        { num: 6, label: 'มิ.ย.' },
        { num: 7, label: 'ก.ค.' },
        { num: 8, label: 'ส.ค.' },
        { num: 9, label: 'ก.ย.' },
      ]
    : [
        { num: 1, label: 'ม.ค.' },
        { num: 2, label: 'ก.พ.' },
        { num: 3, label: 'มี.ค.' },
        { num: 4, label: 'เม.ย.' },
        { num: 5, label: 'พ.ค.' },
        { num: 6, label: 'มิ.ย.' },
        { num: 7, label: 'ก.ค.' },
        { num: 8, label: 'ส.ค.' },
        { num: 9, label: 'ก.ย.' },
        { num: 10, label: 'ต.ค.' },
        { num: 11, label: 'พ.ย.' },
        { num: 12, label: 'ธ.ค.' },
      ];

  const monthsOrderList = selectedYearType === 'fiscal'
    ? [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Staff Rows Filtered
  const filteredStaffRows = (staffStatsData?.departmentRows || []).filter((d: any) => {
    if (!staffSearchQuery.trim()) return true;
    const q = staffSearchQuery.toLowerCase();
    return (
      d.department_name?.toLowerCase().includes(q) ||
      d.department_group_name?.toLowerCase().includes(q)
    );
  });

  // Department Stats Filtered
  const filteredDeptStats = (deptStatsData?.departmentStats || []).filter((d: any) => {
    if (!deptSearchQuery.trim()) return true;
    const q = deptSearchQuery.toLowerCase();
    return (
      d.department_name?.toLowerCase().includes(q) ||
      d.department_group_name?.toLowerCase().includes(q)
    );
  });

  // Program Matrix Filtered
  const filteredMatrix = (matrixData?.matrix || []).filter((m: any) => {
    if (!matrixSearchQuery.trim()) return true;
    const q = matrixSearchQuery.toLowerCase();
    return m.program_name?.toLowerCase().includes(q);
  });

  // Risk Title Matrix Filtered
  const filteredRiskTitleMatrix = (matrixData?.riskTitleMatrix || []).filter((t: any) => {
    if (!matrixSearchQuery.trim()) return true;
    const q = matrixSearchQuery.toLowerCase();
    return (
      t.risk_title?.toLowerCase().includes(q) ||
      t.program_name?.toLowerCase().includes(q)
    );
  });

  // Individual Stats Filtered
  const filteredMemberStats = (individualStatsData?.memberStats || []).filter((m: any) => {
    if (!individualSearchQuery.trim()) return true;
    const q = individualSearchQuery.toLowerCase();
    return (
      m.member_name?.toLowerCase().includes(q) ||
      m.position_name?.toLowerCase().includes(q) ||
      m.department_name?.toLowerCase().includes(q) ||
      m.department_group_name?.toLowerCase().includes(q)
    );
  });

  const availableYearsList = staffStatsData?.yearsList || matrixData?.yearsList || deptStatsData?.yearsList || individualStatsData?.yearsList || [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Tab Navigation Header */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-full lg:w-auto overflow-x-auto">
          {/* TAB 1: EXCEL FORMAT STAFF REPORTING */}
          <button
            onClick={() => setActiveTab('staff_report')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'staff_report'
                ? 'bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>สถิติการรายงานของเจ้าหน้าที่ (แยกตามหน่วยงาน)</span>
          </button>

          {/* TAB 2: REP1_14 PROGRAM & RISK TITLE MATRIX */}
          <button
            onClick={() => setActiveTab('program_matrix')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'program_matrix'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>เรื่องความเสี่ยง & ระดับ (REP1_14 Matrix)</span>
          </button>

          {/* TAB 3: DEPARTMENT KPI COVERAGE */}
          <button
            onClick={() => setActiveTab('dept_kpi')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dept_kpi'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ตัวชี้วัดความครอบคลุม (Department KPI)</span>
          </button>

          {/* TAB 4: INDIVIDUAL STATS */}
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'individual'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>สถิติรายบุคคล (Individual Stats)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={
              activeTab === 'staff_report'
                ? handleExportStaffCsv
                : activeTab === 'program_matrix'
                ? handleExportMatrixCsv
                : activeTab === 'dept_kpi'
                ? handleExportDeptCsv
                : handleExportIndividualCsv
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition cursor-pointer border border-emerald-200 dark:border-emerald-800"
          >
            <Download className="w-4 h-4" />
            ส่งออก CSV
          </button>

          <button
            type="button"
            onClick={handlePrintTable}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 transition cursor-pointer border border-indigo-200 dark:border-indigo-800"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Main Filter Control Card */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {activeTab === 'staff_report' ? (
                  <Users className="w-6 h-6 text-blue-600" />
                ) : activeTab === 'program_matrix' ? (
                  <ShieldAlert className="w-6 h-6 text-rose-600" />
                ) : activeTab === 'dept_kpi' ? (
                  <Building2 className="w-6 h-6 text-blue-600" />
                ) : (
                  <UserCheck className="w-6 h-6 text-indigo-600" />
                )}
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {activeTab === 'staff_report'
                    ? `จำนวนเจ้าหน้าที่ที่รายงานแต่ละเดือน ปี พ.ศ. ${selectedYear + 543}`
                    : activeTab === 'program_matrix'
                    ? 'REP1_14 : รายงานจำนวนอุบัติการณ์ความเสี่ยงทั้งหมดแยกตามเรื่องความเสี่ยง'
                    : activeTab === 'dept_kpi'
                    ? 'สถิติตัวชี้วัดร้อยละการรายงานความเสี่ยงครบทุกหน่วยงาน'
                    : 'สถิติตารางการรายงานความเสี่ยงต่อเดือนแยกรายบุคคล'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeTab === 'staff_report'
                    ? 'รายงานแสดงจำนวนเจ้าหน้าที่ที่ส่งรายงานในแต่ละเดือน (ไฮไลต์สีเขียวเมื่อส่งครบทุกคน / สีแดงเมื่อไม่มีคนส่ง)'
                    : activeTab === 'program_matrix'
                    ? 'จำแนกตามชื่อเรื่องความเสี่ยงและระดับความรุนแรง A-I, 1-5 พร้อมคลิกดูตารางสรุปเรื่องและผลการทบทวน'
                    : activeTab === 'dept_kpi'
                    ? 'แสดงร้อยละความครอบคลุมการรายงานความเสี่ยงรายปีและรายเดือน พร้อมจำนวนอุบัติการณ์ต่อเดือนแยกรายหน่วยงาน'
                    : 'สกัดข้อมูลสถิติการส่งรายงานอุบัติการณ์และความเสี่ยงรายบุคคลต่อเดือน'}
                </p>
              </div>
            </div>
          </div>

          {/* Color Legend (Only for Staff Report Tab) */}
          {activeTab === 'staff_report' && (
            <div className="flex items-center gap-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-500">สัญลักษณ์สี:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-2xs"></span>
                <span className="text-slate-700 dark:text-slate-200">รายงานครบทุกคน (100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-red-600 border border-red-700 inline-block shadow-2xs"></span>
                <span className="text-slate-700 dark:text-slate-200">ไม่มีผู้ส่งรายงาน (0 คน)</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Year Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              ปีที่ต้องการดู
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableYearsList.map((yr: number) => (
                <option key={yr} value={yr}>
                  พ.ศ. {yr + 543} (ค.ศ. {yr})
                </option>
              ))}
            </select>
          </div>

          {/* Year Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              รูปแบบการนับปี
            </label>
            <select
              value={selectedYearType}
              onChange={(e) => setSelectedYearType(e.target.value as 'fiscal' | 'calendar')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fiscal">ปีงบประมาณ (ต.ค. - ก.ย.)</option>
              <option value="calendar">ปีปฏิทิน (ม.ค. - ธ.ค.)</option>
            </select>
          </div>

          {/* Department Group Filter */}
          {activeTab !== 'program_matrix' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                กรองตามกลุ่มงาน
              </label>
              <select
                value={selectedDeptGroup}
                onChange={(e) => {
                  setSelectedDeptGroup(e.target.value);
                  setSelectedDeptForIndividual('all');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">-- ทุกกลุ่มงาน --</option>
                {departmentGroups.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.depart_group_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-rose-600" />
                ค้นหาเรื่องความเสี่ยง
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อเรื่องความเสี่ยง..."
                  value={matrixSearchQuery}
                  onChange={(e) => setMatrixSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {matrixSearchQuery && (
                  <button
                    onClick={() => setMatrixSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search Input for Staff / Individual */}
          {activeTab === 'staff_report' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-fuchsia-600" />
                ค้นหาชื่อหน่วยงาน
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อหน่วยงาน..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {staffSearchQuery && (
                  <button
                    onClick={() => setStaffSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'individual' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                กรองตามหน่วยงาน/แผนก
              </label>
              <select
                value={selectedDeptForIndividual}
                onChange={(e) => setSelectedDeptForIndividual(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">-- ทุกหน่วยงาน/แผนก --</option>
                {filteredDepartments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.depart_name}
                  </option>
                ))}
              </select>
            </div>
          ) : activeTab === 'dept_kpi' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                ค้นหาชื่อหน่วยงาน
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อหน่วยงาน..."
                  value={deptSearchQuery}
                  onChange={(e) => setDeptSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {deptSearchQuery && (
                  <button
                    onClick={() => setDeptSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* TAB 1: EXCEL FORMATTED STAFF REPORTING TABLE */}
      {activeTab === 'staff_report' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800">
            <div>
              <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                จำนวนเจ้าหน้าที่ที่รายงานแต่ละเดือน ปี พ.ศ. {selectedYear + 543}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                สรุปตามหน่วยงาน พร้อมการแสดงสถานะสี (แดง = ไม่มีรายงาน / เขียว = รายงานครบทุกคน)
              </p>
            </div>

            <span className="text-xs font-bold px-3.5 py-1 bg-blue-500/20 text-blue-200 rounded-full backdrop-blur-xs border border-blue-400/30">
              พบ {filteredStaffRows.length} หน่วยงาน (เจ้าหน้าที่รวม {staffStatsData?.summary?.totalHospitalStaff || 0} คน)
            </span>
          </div>

          {loadingStaff ? (
            <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังประมวลผลตารางสถิติเจ้าหน้าที่...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {/* Row 1: Minimal Blue Banner Combined Header */}
                  <tr className="bg-slate-900 text-white font-extrabold border-b border-slate-800">
                    <th className="px-3 py-3 text-center w-[45px] border-r border-slate-700/60">ลำดับ</th>
                    <th className="px-4 py-3 min-w-[220px] border-r border-slate-700/60">หน่วยงาน</th>
                    <th className="px-3 py-3 text-center min-w-[120px] border-r border-slate-700/60">
                      จำนวนเจ้าหน้าที่ทั้งหมด
                    </th>
                    <th colSpan={12} className="px-3 py-3 text-center bg-blue-950 text-blue-100 font-extrabold">
                      จำนวนเจ้าหน้าที่ที่รายงานแต่ละเดือน ปี พ.ศ. {selectedYear + 543}
                    </th>
                  </tr>

                  {/* Row 2: Month Columns Header */}
                  <tr className="bg-slate-800/90 dark:bg-slate-950 text-slate-100 font-bold border-b border-slate-700">
                    <th className="px-3 py-2 border-r border-slate-700/50"></th>
                    <th className="px-4 py-2 border-r border-slate-700/50"></th>
                    <th className="px-3 py-2 border-r border-slate-700/50"></th>

                    {monthsHeaderList.map((m) => (
                      <th key={m.num} className="px-2.5 py-2.5 text-center min-w-[55px] border-r border-slate-700/50 text-slate-200">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStaffRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-6 py-12 text-center text-slate-400 text-sm">
                        ไม่พบข้อมูลหน่วยงานในเงื่อนไขการค้นหานี้
                      </td>
                    </tr>
                  ) : (
                    filteredStaffRows.map((d: any, idx: number) => {
                      const totalStaff = d.total_staff || 0;
                      const rowBgClass =
                        idx % 2 === 0
                          ? 'bg-[#FEFCE8] dark:bg-slate-900/60'
                          : 'bg-[#F0F9FF] dark:bg-slate-850';

                      return (
                        <tr key={d.department_id} className={`${rowBgClass} hover:opacity-90 transition-opacity`}>
                          <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                            {d.department_name}
                          </td>

                          <td className="px-3 py-3 text-center font-extrabold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                            {totalStaff}
                          </td>

                          {/* 12 Monthly Counts with Conditional Cell Background Colors */}
                          {monthsOrderList.map((mNum: number) => {
                            const count = d.monthly_counts[mNum] || 0;
                            const isZero = count === 0;
                            const isFull = totalStaff > 0 && count === totalStaff;

                            return (
                              <td
                                key={mNum}
                                className={`px-2.5 py-3 text-center border-r border-slate-200 dark:border-slate-800 transition-colors ${
                                  isZero
                                    ? 'bg-red-600 text-white font-extrabold'
                                    : isFull
                                    ? 'bg-emerald-500 text-white font-extrabold'
                                    : 'font-semibold text-slate-900 dark:text-white'
                                }`}
                              >
                                {count}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer Rows Matching Excel Exactly */}
                {filteredStaffRows.length > 0 && (
                  <tfoot className="font-extrabold border-t-2 border-slate-300 dark:border-slate-700">
                    <tr className="bg-[#FDBA74] text-slate-950 dark:bg-amber-950 dark:text-white border-b border-amber-300">
                      <td colSpan={2} className="px-4 py-3 text-center border-r border-amber-300 font-extrabold text-sm">
                        รวม
                      </td>

                      <td className="px-3 py-3 text-center border-r border-amber-300 font-black text-sm">
                        {staffStatsData?.summary?.totalHospitalStaff || 0}
                      </td>

                      {monthsOrderList.map((mNum: number) => {
                        const totalMonth = staffStatsData?.monthlyStaffTotals?.[mNum] || 0;
                        return (
                          <td key={mNum} className="px-2.5 py-3 text-center border-r border-amber-300 font-black text-sm">
                            {totalMonth}
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="bg-[#FED7AA] text-slate-900 dark:bg-amber-900 dark:text-amber-100">
                      <td colSpan={2} className="px-4 py-2.5 text-center border-r border-amber-300 font-extrabold text-xs">
                        ร้อยละ
                      </td>

                      <td className="px-3 py-2.5 text-center border-r border-amber-300 font-black text-xs">
                        100%
                      </td>

                      {monthsOrderList.map((mNum: number) => {
                        const pct = staffStatsData?.monthlyStaffPercentages?.[mNum] || '0.00%';
                        return (
                          <td key={mNum} className="px-2.5 py-2.5 text-center border-r border-amber-300 font-extrabold text-xs">
                            {pct}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROGRAM & RISK TITLE MATRIX (REP1_14) + DRILL-DOWN MODAL */}
      {activeTab === 'program_matrix' && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">อุบัติการณ์ทั้งหมด</p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {(matrixData?.summary?.totalIncidents || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">เรื่อง</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">ช่วงวันที่ {matrixData?.summary?.startDate || '-'} ถึง {matrixData?.summary?.endDate || '-'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">ความเสี่ยงทางคลินิก (Level A-I)</p>
                <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {(matrixData?.summary?.totalClinical || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">เรื่อง</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">เหตุการณ์ด้านการดูแลรักษาผู้ป่วย</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">ความเสี่ยงทั่วไป (Level 1-5)</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {(matrixData?.summary?.totalGeneral || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">เรื่อง</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">เหตุการณ์ทางกายภาพ/สิ่งแวดล้อม</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-rose-100/90 text-xs font-bold uppercase tracking-wider">
                  <span>ความเสี่ยงระดับรุนแรงสูง (G, H, I)</span>
                  <ShieldAlert className="w-5 h-5 text-rose-200" />
                </div>
                <h3 className="text-3xl font-black mt-2">
                  {matrixData?.summary?.totalGHI || 0} <span className="text-sm font-semibold text-rose-100">เรื่อง ({matrixData?.summary?.ghiPercentage || 0}%)</span>
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 text-xs text-rose-100 flex items-center justify-between">
                <span>ต้องทบทวน RCA</span>
                <span className="font-bold">Sentinel Event</span>
              </div>
            </div>
          </div>

          {/* SPECIAL HIGHLIGHTED SECTION: G, H, I INCIDENTS & RCA TIMINGS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-50/80 via-amber-50/40 to-slate-50/50 dark:from-rose-950/40 dark:via-amber-950/20 dark:to-slate-900/40 border-b border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-rose-900 dark:text-rose-300 text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                  รายชื่อความเสี่ยงระดับรุนแรงสูง (G, H, I) & ระยะเวลาทบทวน RCA (RCA Timings)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ไฮไลต์เฉพาะรายการระดับรุนแรงสูง พร้อมแสดงระยะเวลาที่ใช้ในการทบทวน RCA (วัน)
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-800">
                พบ {matrixData?.ghiIncidentsList?.length || 0} รายการ
              </span>
            </div>

            {loadingMatrix ? (
              <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-3 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังสกัดข้อมูลความเสี่ยง GHI...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-bold border-b border-rose-200 dark:border-rose-900/40">
                    <tr>
                      <th className="px-3 py-3 text-center w-[45px]">#</th>
                      <th className="px-3 py-3 w-[100px]">รหัส IR</th>
                      <th className="px-4 py-3 min-w-[220px]">หัวข้ออุบัติการณ์ความเสี่ยง</th>
                      <th className="px-3 py-3 min-w-[160px]">โปรแกรมความเสี่ยง</th>
                      <th className="px-3 py-3 text-center w-[90px]">ระดับความรุนแรง</th>
                      <th className="px-3 py-3 text-center w-[110px]">วันที่เกิดเหตุ</th>
                      <th className="px-3 py-3 text-center w-[120px]">สถานะ RCA</th>
                      <th className="px-3 py-3 text-center w-[120px]">วันที่เสร็จสิ้น RCA</th>
                      <th className="px-3 py-3 text-center w-[140px] bg-rose-100/50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-100 font-extrabold">
                        ระยะเวลาทำ RCA
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-rose-100/60 dark:divide-slate-800">
                    {!matrixData?.ghiIncidentsList || matrixData.ghiIncidentsList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-slate-400 text-sm">
                          🎉 ยอดเยี่ยม! ไม่พบอุบัติการณ์ความเสี่ยงระดับรุนแรงสูง (G, H, I) ในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      matrixData.ghiIncidentsList.map((inc: any, idx: number) => {
                        const levelColor =
                          inc.level_id === 'I'
                            ? 'bg-rose-600 text-white'
                            : inc.level_id === 'H'
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-500 text-white';

                        return (
                          <tr key={inc.id} className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-3 text-center font-mono text-slate-400">{idx + 1}</td>

                            <td className="px-3 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                              #{inc.id_risk || inc.id}
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              {inc.risk_title}
                            </td>

                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {inc.program_name}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs ${levelColor}`}>
                                ระดับ {inc.level_id}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400 font-medium">
                              {inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-'}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                {inc.rca_status || 'เสร็จสิ้น'}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400 font-medium">
                              {inc.rca_date ? format(new Date(inc.rca_date), 'dd/MM/yyyy') : '-'}
                            </td>

                            <td className="px-3 py-3 text-center bg-rose-50/40 dark:bg-rose-950/20 font-extrabold text-rose-700 dark:text-rose-300">
                              {inc.rca_duration_days !== null ? (
                                inc.rca_duration_days === 0 ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px]">
                                    เสร็จในวันที่เกิดเหตุ
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-xs border border-rose-300">
                                    {inc.rca_duration_days} วัน
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MAIN REP1_14 MATRIX TABLE WITH MODE TOGGLE (RISK TITLE / PROGRAM) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  ตารางรายงานจำนวนอุบัติการณ์ความเสี่ยงทั้งหมด (REP1_14 Matrix)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {matrixGroupMode === 'risk_title'
                    ? 'แสดงตารางแยกตามชื่อเรื่องความเสี่ยง พร้อมคลิกปุ่มดูตารางสรุปเรื่องและผลการทบทวน'
                    : 'แสดงตารางจำแนกตามโปรแกรมความเสี่ยงหลัก'}
                </p>
              </div>

              {/* Mode Switcher Toggle */}
              <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMatrixGroupMode('risk_title')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    matrixGroupMode === 'risk_title'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📌 ชื่อเรื่องความเสี่ยง (Risk Topics)
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixGroupMode('program')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    matrixGroupMode === 'program'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📁 โปรแกรมความเสี่ยง (Programs)
                </button>
              </div>
            </div>

            {loadingMatrix ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังประมวลผลตาราง REP1_14...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr className="bg-slate-200/50 dark:bg-slate-800">
                      <th colSpan={2} className="px-3 py-2 text-center border-r border-slate-300 dark:border-slate-700"></th>
                      <th colSpan={9} className="px-3 py-2 text-center bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-r border-slate-300 dark:border-slate-700">
                        ความเสี่ยงทางคลินิก (Clinical Risk)
                      </th>
                      <th colSpan={5} className="px-3 py-2 text-center bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-r border-slate-300 dark:border-slate-700">
                        ความเสี่ยงทั่วไป (General Risk)
                      </th>
                      <th colSpan={3} className="px-3 py-2 text-center bg-rose-100/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200">
                        สรุปรวม & ผลทบทวน
                      </th>
                    </tr>

                    <tr>
                      <th className="px-3 py-3 text-center w-[45px] border-r border-slate-200 dark:border-slate-700">#</th>
                      <th className="px-4 py-3 min-w-[280px] border-r border-slate-200 dark:border-slate-700">
                        {matrixGroupMode === 'risk_title' ? 'ชื่อเรื่องความเสี่ยง (Risk Incident Topic)' : 'โปรแกรมความเสี่ยง'}
                      </th>

                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">A</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">B</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">C</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">D</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">E</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">F</th>
                      
                      <th className="px-2.5 py-3 text-center w-[40px] bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-extrabold border-r border-slate-200 dark:border-slate-700">G</th>
                      <th className="px-2.5 py-3 text-center w-[40px] bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-extrabold border-r border-slate-200 dark:border-slate-700">H</th>
                      <th className="px-2.5 py-3 text-center w-[40px] bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-extrabold border-r border-slate-200 dark:border-slate-700">I</th>

                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">1</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">2</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">3</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">4</th>
                      <th className="px-2.5 py-3 text-center w-[40px] border-r border-slate-200 dark:border-slate-700">5</th>

                      <th className="px-3 py-3 text-center w-[75px] bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 font-extrabold border-r border-slate-200 dark:border-slate-700">
                        รวม GHI
                      </th>

                      <th className="px-3 py-3 text-center w-[110px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-extrabold border-r border-slate-200 dark:border-slate-700">
                        เวลาทำ RCA
                      </th>

                      <th className="px-3 py-3 text-center w-[120px] bg-slate-200/80 dark:bg-slate-800 text-slate-950 dark:text-white font-black">
                        {matrixGroupMode === 'risk_title' ? 'ผลการทบทวน' : 'รวมทั้งหมด'}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).length === 0 ? (
                      <tr>
                        <td colSpan={19} className="px-6 py-12 text-center text-slate-400 text-sm">
                          ไม่พบข้อมูลรายการในเงื่อนไขการค้นหานี้
                        </td>
                      </tr>
                    ) : (
                      (matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).map((item: any, idx: number) => {
                        const hasGhi = item.total_ghi > 0;

                        return (
                          <tr key={item.riskstore_id || item.program_id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-3 py-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {idx + 1}
                            </td>

                            {/* Risk Title & Program Name Column */}
                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800">
                              {matrixGroupMode === 'risk_title' ? (
                                <div className="space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRiskModalItem(item)}
                                    className="font-extrabold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 text-left transition cursor-pointer flex items-start gap-1.5 group"
                                  >
                                    <span className="group-hover:underline">{item.risk_title}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-rose-500 opacity-70 group-hover:opacity-100 shrink-0 mt-0.5" />
                                  </button>
                                  <p className="text-[11px] font-medium text-slate-400">
                                    โปรแกรม: {item.program_name}
                                  </p>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-900 dark:text-white">{item.program_name}</span>
                              )}
                            </td>

                            {['A', 'B', 'C', 'D', 'E', 'F'].map((lvl) => (
                              <td key={lvl} className="px-2 py-3 text-center border-r border-slate-100 dark:border-slate-800">
                                {item.counts[lvl] > 0 ? (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.counts[lvl]}</span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                                )}
                              </td>
                            ))}

                            {['G', 'H', 'I'].map((lvl) => (
                              <td key={lvl} className="px-2 py-3 text-center bg-rose-50/50 dark:bg-rose-950/30 border-r border-slate-100 dark:border-slate-800 font-black">
                                {item.counts[lvl] > 0 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[11px] shadow-2xs">
                                    {item.counts[lvl]}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                                )}
                              </td>
                            ))}

                            {['1', '2', '3', '4', '5'].map((lvl) => (
                              <td key={lvl} className="px-2 py-3 text-center border-r border-slate-100 dark:border-slate-800">
                                {item.counts[lvl] > 0 ? (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.counts[lvl]}</span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                                )}
                              </td>
                            ))}

                            <td className="px-3 py-3 text-center font-black border-r border-slate-100 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-950/20">
                              {hasGhi ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100 font-extrabold">
                                  {item.total_ghi}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">0</span>
                              )}
                            </td>

                            <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-800 font-bold text-indigo-700 dark:text-indigo-300">
                              {item.avg_rca_days !== null ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px]">
                                  <Clock className="w-3 h-3 text-indigo-500" /> {item.avg_rca_days} วัน
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>

                            {/* Drill-down Button or Count */}
                            <td className="px-3 py-3 text-center font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800/60">
                              {matrixGroupMode === 'risk_title' ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRiskModalItem(item)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer mx-auto"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>ผลทบทวน ({item.total_all})</span>
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                                  {item.total_all}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).length > 0 && (
                    <tfoot className="bg-slate-200/80 dark:bg-slate-800/90 font-extrabold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right border-r border-slate-300 dark:border-slate-700 font-black">
                          รวมอุบัติการณ์ทั้งหมด:
                        </td>

                        {['A', 'B', 'C', 'D', 'E', 'F'].map((lvl) => (
                          <td key={lvl} className="px-2 py-3 text-center border-r border-slate-300 dark:border-slate-700">
                            {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).reduce((sum: number, m: any) => sum + (m.counts[lvl] || 0), 0)}
                          </td>
                        ))}

                        {['G', 'H', 'I'].map((lvl) => (
                          <td key={lvl} className="px-2 py-3 text-center bg-rose-200/70 dark:bg-rose-950 text-rose-950 dark:text-rose-200 border-r border-slate-300 dark:border-slate-700 font-black">
                            {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).reduce((sum: number, m: any) => sum + (m.counts[lvl] || 0), 0)}
                          </td>
                        ))}

                        {['1', '2', '3', '4', '5'].map((lvl) => (
                          <td key={lvl} className="px-2 py-3 text-center border-r border-slate-300 dark:border-slate-700">
                            {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).reduce((sum: number, m: any) => sum + (m.counts[lvl] || 0), 0)}
                          </td>
                        ))}

                        <td className="px-3 py-3 text-center bg-rose-200 dark:bg-rose-900 text-rose-950 dark:text-white border-r border-slate-300 dark:border-slate-700 font-black">
                          {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).reduce((sum: number, m: any) => sum + (m.total_ghi || 0), 0)}
                        </td>

                        <td className="px-3 py-3 text-center text-slate-500 font-normal border-r border-slate-300 dark:border-slate-700">
                          -
                        </td>

                        <td className="px-3 py-3 text-center bg-rose-600 text-white font-black text-sm">
                          {(matrixGroupMode === 'risk_title' ? filteredRiskTitleMatrix : filteredMatrix).reduce((sum: number, m: any) => sum + (m.total_all || 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENT KPI COVERAGE VIEW */}
      {activeTab === 'dept_kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-blue-100/90 text-xs font-bold uppercase tracking-wider">
                  <span>KPI ตัวชี้วัดภาพรวมรายปี</span>
                  <Target className="w-5 h-5 text-blue-200" />
                </div>
                <h3 className="text-3xl font-black mt-2">
                  {deptStatsData?.summary?.kpiYearlyPercentage || 0}%
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 text-xs text-blue-100 flex items-center justify-between">
                <span>มีรายงานอย่างน้อย 1 ครั้ง</span>
                <span className="font-bold">
                  {deptStatsData?.summary?.reportingDepartmentsTotalYear || 0} / {deptStatsData?.summary?.totalDepartments || 0} แผนก
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">จำนวนหน่วยงานทั้งหมด</p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {deptStatsData?.summary?.totalDepartments || 0} <span className="text-xs font-normal text-slate-500">หน่วยงาน</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">ที่เปิดใช้งานในระบบ</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">จำนวนอุบัติการณ์ที่ถูกรายงานรวม</p>
                <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {(deptStatsData?.summary?.totalIncidentsYear || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">เรื่อง</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">ตลอดทั้งปีงบประมาณ</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">สถานะบรรลุเป้าหมายตัวชี้วัด</p>
                <div className="mt-1">
                  {(deptStatsData?.summary?.kpiYearlyPercentage || 0) >= 100 ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ครบทุกหน่วยงาน 100%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5" /> รายงานแล้ว {deptStatsData?.summary?.kpiYearlyPercentage || 0}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">เป้าหมาย: รายงานความเสี่ยงครบทุกหน่วยงาน</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                สถิติตัวชี้วัดร้อยละความครอบคลุมการรายงานแยกรายเดือน (12 เดือน)
              </h2>
              <span className="text-xs text-slate-400">คำนวณจาก: (จำนวนหน่วยงานที่มีรายงานในเดือน / หน่วยงานทั้งหมด) × 100</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {deptStatsData?.monthlyKpiSummary?.map((m: any) => (
                <div
                  key={m.monthNumber}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/80 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>เดือน {m.monthName}</span>
                    <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                      m.percentage >= 100
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : m.percentage >= 50
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {m.percentage}%
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          m.percentage >= 100 ? 'bg-emerald-500' : m.percentage >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(m.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{m.reportingDeptCount}/{m.totalDepartments} หน่วยงาน</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{m.totalIncidents} เรื่อง</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  ตารางรายชื่อหน่วยงานและจำนวนอุบัติการณ์ที่ถูกรายงานต่อเดือน
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  แสดงสถิติการรายงานของทุกหน่วยงานจำแนกตามเดือน (ประจำปี {selectedYear + 543})
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                พบ {filteredDeptStats.length} หน่วยงาน
              </span>
            </div>

            {loadingDept ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังโหลดข้อมูลตัวชี้วัดรายหน่วยงาน...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-3 text-center min-w-[45px] border-r border-slate-200/60 dark:border-slate-700/60">#</th>
                      <th className="px-4 py-3 min-w-[200px] border-r border-slate-200/60 dark:border-slate-700/60">ชื่อหน่วยงาน/แผนก</th>
                      <th className="px-3 py-3 min-w-[140px] border-r border-slate-200/60 dark:border-slate-700/60">กลุ่มงาน</th>

                      {monthsHeaderList.map((m) => (
                        <th key={m.num} className="px-2 py-3 text-center min-w-[50px] border-r border-slate-200/60 dark:border-slate-700/60">
                          {m.label}
                        </th>
                      ))}

                      <th className="px-3 py-3 text-center min-w-[110px] bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-extrabold border-r border-slate-200 dark:border-slate-700">
                        รวมตลอดปี
                      </th>
                      <th className="px-3 py-3 text-center min-w-[120px]">ความถี่การรายงาน</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDeptStats.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="px-6 py-12 text-center text-slate-400 text-sm">
                          ไม่พบข้อมูลหน่วยงานในเงื่อนไขการค้นหานี้
                        </td>
                      </tr>
                    ) : (
                      filteredDeptStats.map((d: any, idx: number) => {
                        const isFullyReported = d.months_with_reports_count >= 12;

                        return (
                          <tr
                            key={d.department_id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-3 py-3 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {idx + 1}
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                              {d.department_name}
                            </td>

                            <td className="px-3 py-3 text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {d.department_group_name}
                            </td>

                            {monthsOrderList.map((mNum: number) => {
                              const count = d.monthly_counts[mNum] || 0;
                              return (
                                <td
                                  key={mNum}
                                  className="px-2 py-3 text-center border-r border-slate-100 dark:border-slate-800 font-medium"
                                >
                                  {count === 0 ? (
                                    <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">-</span>
                                  ) : count <= 3 ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                                      {count}
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                      {count}
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="px-3 py-3 text-center font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/20 border-r border-slate-100 dark:border-slate-800">
                              {d.total_incidents === 0 ? (
                                <span className="text-slate-300 dark:text-slate-600">0</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
                                  {d.total_incidents} เรื่อง
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {d.months_with_reports_count === 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  0/12 เดือน
                                </span>
                              ) : isFullyReported ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  12/12 เดือน (ครบ)
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {d.months_with_reports_count}/12 เดือน
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {filteredDeptStats.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right border-r border-slate-200 dark:border-slate-700 font-extrabold text-blue-700 dark:text-blue-400">
                          รวมจำนวนอุบัติการณ์ทุกหน่วยงาน:
                        </td>
                        {monthsOrderList.map((mNum: number) => {
                          const totalMonth = filteredDeptStats.reduce((sum: number, d: any) => sum + (d.monthly_counts[mNum] || 0), 0);
                          return (
                            <td key={mNum} className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-black">
                              {totalMonth}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center bg-blue-100/60 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-black border-r border-slate-200 dark:border-slate-700">
                          {filteredDeptStats.reduce((sum: number, d: any) => sum + (d.total_incidents || 0), 0)} เรื่อง
                        </td>
                        <td className="px-3 py-3 text-center text-slate-500 font-normal">
                          ภาพรวมทั้งปี
                        </td>
                      </tr>

                      <tr className="bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <td colSpan={3} className="px-4 py-2.5 text-right border-r border-slate-200 dark:border-slate-700 font-bold text-xs">
                          ร้อยละหน่วยงานที่มีรายงาน (% KPI):
                        </td>
                        {monthsOrderList.map((mNum: number) => {
                          const reportingDeptsCount = filteredDeptStats.filter((d: any) => (d.monthly_counts[mNum] || 0) > 0).length;
                          const totalDepts = filteredDeptStats.length;
                          const pct = totalDepts > 0 ? ((reportingDeptsCount / totalDepts) * 100).toFixed(0) : '0';
                          return (
                            <td key={mNum} className="px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                              {pct}%
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center font-extrabold text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                          {deptStatsData?.summary?.kpiYearlyPercentage || 0}%
                        </td>
                        <td className="px-3 py-2.5 text-center text-[10px] text-slate-400 font-normal">
                          เป้าหมาย 100%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INDIVIDUAL STATS VIEW */}
      {activeTab === 'individual' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                ตารางแสดงจำนวนการส่งรายงานความเสี่ยงรายบุคคล
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                จำแนกตามรายบุคคลและรายเดือน ประจำปี {selectedYear + 543}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ค้นหาชื่อ บุคลากร ตำแหน่ง แผนก..."
                value={individualSearchQuery}
                onChange={(e) => setIndividualSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {loadingIndividual ? (
            <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังสกัดข้อมูลสถิติการส่งรายงานรายบุคคล...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-3 text-center min-w-[45px] border-r border-slate-200/60 dark:border-slate-700/60">#</th>
                    <th className="px-4 py-3 min-w-[180px] border-r border-slate-200/60 dark:border-slate-700/60">ชื่อ-นามสกุล บุคลากร</th>
                    <th className="px-3 py-3 min-w-[140px] border-r border-slate-200/60 dark:border-slate-700/60">ตำแหน่ง</th>
                    <th className="px-3 py-3 min-w-[160px] border-r border-slate-200/60 dark:border-slate-700/60">หน่วยงาน/แผนก</th>
                    <th className="px-3 py-3 min-w-[130px] border-r border-slate-200/60 dark:border-slate-700/60">กลุ่มงาน</th>

                    {monthsHeaderList.map((m) => (
                      <th key={m.num} className="px-2 py-3 text-center min-w-[48px] border-r border-slate-200/60 dark:border-slate-700/60">
                        {m.label}
                      </th>
                    ))}

                    <th className="px-4 py-3 text-center min-w-[100px] bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-extrabold border-r border-slate-200 dark:border-slate-700">
                      รวมทั้งหมด
                    </th>
                    <th className="px-3 py-3 text-center min-w-[130px] no-print">การมีส่วนร่วม</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMemberStats.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="px-6 py-12 text-center text-slate-400 text-sm">
                        ไม่พบข้อมูลสถิติตามเงื่อนไขการค้นหานี้
                      </td>
                    </tr>
                  ) : (
                    filteredMemberStats.map((m: any, idx: number) => {
                      return (
                        <tr
                          key={m.member_id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                            {m.member_name}
                          </td>

                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {m.position_name}
                          </td>

                          <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium border-r border-slate-100 dark:border-slate-800">
                            {m.department_name}
                          </td>

                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {m.department_group_name}
                          </td>

                          {monthsOrderList.map((mNum: number) => {
                            const count = m.monthly_counts[mNum] || 0;
                            return (
                              <td
                                key={mNum}
                                className="px-2 py-2.5 text-center border-r border-slate-100 dark:border-slate-800"
                              >
                                {count === 0 ? (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">-</span>
                                ) : count <= 2 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                                    {count}
                                  </span>
                                ) : count <= 5 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700">
                                    {count}
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-purple-100 text-purple-900 dark:bg-purple-900/80 dark:text-purple-100 border border-purple-300 dark:border-purple-600 shadow-2xs">
                                    {count}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-4 py-2.5 text-center bg-indigo-50/40 dark:bg-indigo-950/30 border-r border-slate-100 dark:border-slate-800">
                            {m.total_count === 0 ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-slate-400 font-semibold text-[11px] bg-slate-100 dark:bg-slate-800">
                                0 ครั้ง
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-emerald-800 dark:text-emerald-300 font-black text-xs bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700">
                                {m.total_count} ครั้ง
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center no-print">
                            {m.total_count === 0 ? (
                              <span className="text-[11px] text-slate-400 font-medium">ยังไม่มีรายงาน</span>
                            ) : m.total_count <= 5 ? (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-center gap-1">
                                <Activity className="w-3 h-3" /> รายงานทั่วไป
                              </span>
                            ) : m.total_count <= 15 ? (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-500" /> มีส่วนร่วมสม่ำเสมอ
                              </span>
                            ) : (
                              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-extrabold flex items-center justify-center gap-1">
                                <Award className="w-3 h-3 text-amber-500" /> Top Contributor
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DRILL-DOWN POPUP MODAL: SUMMARY & REVIEW RESULTS OF RISK TOPIC */}
      {selectedRiskModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    {selectedRiskModalItem.risk_title}
                  </h3>
                  <p className="text-xs text-rose-100/90 mt-0.5">
                    โปรแกรมความเสี่ยง: {selectedRiskModalItem.program_name} | รวมทั้งหมด {selectedRiskModalItem.total_all} รายการ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRiskModalItem(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Badges & Metrics Bar */}
            <div className="bg-rose-50/80 dark:bg-rose-950/40 px-6 py-3 border-b border-rose-100 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 font-semibold text-rose-900 dark:text-rose-200">
                <Info className="w-4 h-4 text-rose-600" />
                <span>ตารางสรุปอุบัติการณ์และความเสี่ยงเฉพาะเรื่องพร้อมผลการทบทวน & RCA</span>
              </div>

              <div className="flex items-center gap-3 font-bold">
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  ทางคลินิก (A-I): {selectedRiskModalItem.total_clinical} เรื่อง
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  ทั่วไป (1-5): {selectedRiskModalItem.total_general} เรื่อง
                </span>
                {selectedRiskModalItem.total_ghi > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-extrabold shadow-2xs">
                    ระดับรุนแรงสูง (GHI): {selectedRiskModalItem.total_ghi} เรื่อง
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body - Incident Items Table */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-3 text-center w-[45px]">#</th>
                      <th className="px-3 py-3 w-[100px]">รหัส IR</th>
                      <th className="px-3 py-3 w-[110px]">วันที่เกิดเหตุ</th>
                      <th className="px-4 py-3 min-w-[150px]">หน่วยงานที่รายงาน</th>
                      <th className="px-3 py-3 text-center w-[90px]">ระดับความรุนแรง</th>
                      <th className="px-4 py-3 min-w-[220px]">รายละเอียดอุบัติการณ์</th>
                      <th className="px-4 py-3 min-w-[240px] bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200">
                        ผลการทบทวน / มาตรการแก้ไข
                      </th>
                      <th className="px-3 py-3 text-center w-[120px]">สถานะ RCA</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {!selectedRiskModalItem.incidents || selectedRiskModalItem.incidents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-slate-400 text-sm">
                          ไม่พบรายการอุบัติการณ์ย่อยในเรื่องนี้
                        </td>
                      </tr>
                    ) : (
                      selectedRiskModalItem.incidents.map((inc: any, idx: number) => {
                        const levelColor =
                          ['G', 'H', 'I'].includes(inc.level_id)
                            ? 'bg-rose-600 text-white font-black'
                            : ['E', 'F'].includes(inc.level_id)
                            ? 'bg-amber-500 text-white font-bold'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold';

                        return (
                          <tr key={inc.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="px-3 py-3 text-center font-mono text-slate-400">{idx + 1}</td>

                            <td className="px-3 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              #{inc.id_risk || inc.id}
                            </td>

                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400 font-medium">
                              {inc.date_report ? format(new Date(inc.date_report), 'dd/MM/yyyy') : '-'}
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                              {inc.department_name}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs shadow-2xs ${levelColor}`}>
                                ระดับ {inc.level_id}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                              {inc.detail}
                            </td>

                            <td className="px-4 py-3 bg-rose-50/30 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                              <div className="flex items-start gap-1.5">
                                <MessageSquare className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{inc.review_result}</span>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                {inc.rca_status || 'เสร็จสิ้น'}
                              </span>
                              {inc.rca_duration_days !== null && (
                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                  {inc.rca_duration_days === 0 ? 'เสร็จในวันที่แจ้ง' : `ทำ RCA ${inc.rca_duration_days} วัน`}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                รวมทั้งหมด {selectedRiskModalItem.incidents?.length || 0} รายการอุบัติการณ์
              </span>

              <button
                type="button"
                onClick={() => setSelectedRiskModalItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
