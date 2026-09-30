import RiskWorkflowNav from '../components/RiskWorkflowNav';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { 
  Grid, Building,
  Printer, ShieldAlert, FileSpreadsheet,
  AlertTriangle, Search, Eye, Activity,
  Target, RefreshCw, X, Clock, Edit3, Trash2,
  ShieldCheck, Flame, Layers, Sparkles,
  Info, Check, BookmarkCheck, FileText, Lock, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRiskMatrixLevel } from '../utils/riskMatrix';
import { OfficialPrintFooter, OfficialPrintHeader } from '../components/OfficialPrintLayout';
import { printOfficialReport } from '../utils/officialPrint';
import RiskDecisionSupport from '../components/RiskDecisionSupport';
import NineStandardsDashboard from '../components/NineStandardsDashboard';
import { buildCsv, getMatrixCell, matrixCsvRows, standardsCsvRows } from '../utils/reportCsv';
import type { CsvValue, IncidentMatrix } from '../utils/reportCsv';

// =========================================================================
// Department presets remain local; the nine essential standards come from the backend catalogue.
// =========================================================================
const RISK_PRESET_TEMPLATES = [
  {
    id: 'ER-01',
    name: '12. การคัดแยกความเร่งด่วนผู้ป่วยผิดพลาด (Under-Triage in Emergency Department)',
    badge: 'ER',
    category: 'ความเสี่ยงเฉพาะหน่วยงาน (Department)',
    data: {
      risk_code: 'ER-01',
      risk_title: 'การคัดแยกความเร่งด่วนผู้ป่วยฉุกเฉินผิดพลาดหรือต่ำกว่าระดับจริง (Under-Triage)',
      risk_description: 'ผู้ป่วยที่มีภาวะฉุกเฉินวิกฤต (เช่น Sepsis, Acute Coronary Syndrome) ได้รับการคัดแยกเป็นระดับไม่เร่งด่วน ทำให้รอตรวจนานจนอาการทรุดหนัก',
      source: 'เรื่องที่หน่วยงานให้ความสำคัญ',
      scope_level: 'department',
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Emergency Care & Patient Safety',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 9: การคัดแยกผู้ป่วยที่ห้องฉุกเฉิน',
      risk_owner_name: 'หัวหน้ากลุ่มงานอุบัติเหตุและฉุกเฉิน (ER)',
      is_never_event: 1,
      initial_likelihood: 3,
      initial_consequence: 5,
      risk_prevention: '1. บังคับใช้เกณฑ์คัดแยก ESI 5 ระดับ โดยพยาบาลผู้ผ่านการอบรม Triage Nurse\n2. วัดสัญญาณชีพและระดับออกซิเจนปลายนิ้วในผู้ป่วยทุกรายทันทีที่มาถึง\n3. ติดตาม Re-Triage ผู้ป่วยที่รอตรวจทุก 30 นาที',
      risk_transfer: 'เรียกแพทย์เวรฉุกเฉินหรือแพทย์เฉพาะทางมาร่วมประเมินทันที',
      risk_monitor: 'อัตรา Under-Triage (< 2%), ระยะเวลารอคอยของผู้ป่วยฉุกเฉินวิกฤต (ESI 1-2 ต้องตรวจทันที)',
      risk_mitigation: 'ย้ายเข้าห้องกู้ชีพ (Resuscitation Room) ทันที พร้อมให้ออกซิเจนและเปิดเส้นเลือดดำ',
      qi_plan: 'โครงการ Smart AI Triage Assistant & Vital Signs Monitor Integration',
      review_frequency_months: 1,
    }
  },
  {
    id: 'LR-01',
    name: '13. ภาวะตกเลือดหลังคลอด (Postpartum Hemorrhage - PPH Prevention)',
    badge: 'ห้องคลอด',
    category: 'ความเสี่ยงเฉพาะหน่วยงาน (Department)',
    data: {
      risk_code: 'LR-01',
      risk_title: 'ภาวะตกเลือดหลังคลอดเฉียบพลัน (Early Postpartum Hemorrhage: PPH)',
      risk_description: 'มารดาหลังคลอดมีเลือดออกทางช่องคลอดมากกว่า 500 ml จากมดลูกไม่หดรัดตัว รกค้าง หรือแผลฉีกขาดในช่องคลอด นำไปสู่ภาวะ Hypovolemic Shock',
      source: 'เรื่องที่หน่วยงานให้ความสำคัญ',
      scope_level: 'department',
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Maternal & Child Safety (Maternal Hemorrhage)',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 1: การดูแลผู้ป่วยวิกฤตและป้องกันการบาดเจ็บ',
      risk_owner_name: 'หัวหน้าห้องคลอดและสูตินรีแพทย์',
      is_never_event: 1,
      initial_likelihood: 3,
      initial_consequence: 5,
      risk_prevention: '1. ปฏิบัติตามแนวทาง Active Management of Third Stage of Labor (AMTSL)\n2. ให้ยา Oxytocin 10 units ทันทีหลังทารกคลอด\n3. วัดปริมาณเลือดที่ออกอย่างแม่นยำด้วยแผ่นรองซับตรวจวัดปริมาตร (V-Drape)',
      risk_transfer: 'เปิดระบบ PPH Fast Track และเตรียมเลือดด่วน (Emergency Blood Call) ภายใน 15 นาที',
      risk_monitor: 'อัตราการเกิด Severe PPH (> 1,000 ml) < 1%, อัตรามารดาเสียชีวิตจาก PPH = 0',
      risk_mitigation: 'คลึงมดลูกทันที, ให้ยาร่วม (Misoprostol, Tranexamic Acid), ใส่สายสวน Balloon Tamponade',
      qi_plan: 'โครงการ PPH Safety Box และการซ้อมเสมือนจริง PPH Simulation Drill',
      review_frequency_months: 1,
    }
  },
  {
    id: 'LAB-01',
    name: '14. การรายงานผลแล็บวิกฤตล่าช้า (Delayed Critical Value Reporting)',
    badge: 'LAB',
    category: 'ความเสี่ยงเฉพาะหน่วยงาน (Department)',
    data: {
      risk_code: 'LAB-01',
      risk_title: 'ความล่าช้าในการรายงานผลการตรวจวิเคราะห์ทางห้องปฏิบัติการที่มีค่าวิกฤต (Critical Value)',
      risk_description: 'ผลตรวจแล็บที่ชี้ถึงภาวะอันตรายถึงชีวิต (เช่น Potassium > 6.0, Troponin-T บวก, Platelet < 20,000) ไม่ได้รับการโทรแจ้งแพทย์หรือพยาบาลเจ้าของไข้ภายในเวลาที่กำหนด',
      source: 'เรื่องที่หน่วยงานให้ความสำคัญ',
      scope_level: 'department',
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: 'Diagnostic Excellence & Laboratory Safety',
      essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 8: การบริการตรวจวินิจฉัยและห้องปฏิบัติการ',
      risk_owner_name: 'หัวหน้ากลุ่มงานเทคนิคการแพทย์ (LAB)',
      is_never_event: 0,
      initial_likelihood: 2,
      initial_consequence: 4,
      risk_prevention: '1. ตั้งค่าระบบ LIS ให้ส่งสัญญาณเสียงและหน้าต่างเตือนสีแดงเมื่อพบผล Critical Value\n2. กำหนดให้โทรแจ้งผลและบันทึกการอ่านทวนกลับ (Read-back) ภายใน 15 นาที\n3. จัดทำบัญชีรายชื่อผลแล็บวิกฤต (Critical Value List) ชัดเจนทุกแผนก',
      risk_transfer: 'ส่งต่อรายงานไปยังหัวหน้าเวรหรือแพทย์เวรทันทีหากโทรติดต่อพยาบาลเจ้าของไข้ไม่ได้',
      risk_monitor: 'อัตราการรายงานผลค่าวิกฤตสำเร็จภายใน 15 นาที (> 98%), อัตรา Read-Back ถูกต้อง 100%',
      risk_mitigation: 'มีระบบ SMS/Line Alert อัตโนมัติไปยังโทรศัพท์ของแพทย์เจ้าของไข้ควบคู่กับการโทรศัพท์',
      qi_plan: 'โครงการพัฒนาระบบ Auto-Critical Alert via Hospital Line Official Account',
      review_frequency_months: 3,
    }
  }
];

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'hospital' | 'department' | 'matrix' | 'due' | 'standards'>(user?.role === 'admin' || user?.rmScope === 'hospital' ? 'hospital' : 'department');

  // Data States
  const [risks, setRisks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [matrixData, setMatrixData] = useState<IncidentMatrix | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [dataRevision, setDataRevision] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);


  // Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [onlyNeverEvents, setOnlyNeverEvents] = useState(false);

  // Modals & Assistant States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModeTab, setCreateModeTab] = useState<'template' | 'incident' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRiskItem, setSelectedRiskItem] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<{ y: number; x: number; count: number; items: any[] } | null>(null);

  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrRm = ['admin', 'rm_committee'].includes(userRole);

  // ตรวจสอบสิทธิ์การแก้ไข:
  // 1. Admin / RM Board / Superuser -> แก้ไขได้ทุกรายการ
  // 2. ความเสี่ยงระดับโรงพยาบาล (scope_level === 'hospital') -> แก้ไข / ทบทวนได้
  // 3. ความเสี่ยงระดับหน่วยงาน -> แก้ไขได้เฉพาะรายการของหน่วยงานตนเอง (department_id ตรงกับ user.department_id)
  // 4. รายการของหน่วยงานอื่น -> ดูรายละเอียดได้ทั้งหมด แต่ปุ่มแก้ไข/ทบทวน/ลบ จะถูกปิด (Read-Only)
  const canEditRisk = (item: any) => {
    if (!user) return false;

    if (user.role === 'admin' || (user.role === 'rm_committee' && user.rmScope === 'hospital')) return true;

    // ความเสี่ยงระดับโรงพยาบาล สามารถร่วมทบทวน/แก้ไขได้
    if (item.scope_level === 'hospital') return true;

    // ความเสี่ยงระดับหน่วยงาน: ต้องตรงกับหน่วยงานของผู้ใช้งาน
    if ([user.department_id, user.department_id2].filter(Boolean).some(id => String(item.department_id) === String(id))) {
      return true;
    }

    if (['head', 'rm_committee'].includes(user.role) && user.rmScope === 'group' && user.departmentGroup) {
      const department = departments.find(d => String(d.id) === String(item.department_id));
      return String(department?.depart_group_id) === String(user.departmentGroup);
    }

    return false;
  };

  // Form State for Create / Edit
  const [formData, setFormData] = useState<any>({
    nrls_code: '',
    risk_code: '',
    risk_title: '',
    risk_description: '',
    source: 'มาตรฐานสำคัญ 9 ด้าน',
    scope_level: 'hospital',
    department_id: '1',
    program_id: 2,
    category_name: 'Clinical Risk (ทางคลินิก)',
    safety_goal: '',
    essential_std: '',
    risk_owner_name: '',
    is_never_event: 0,
    initial_likelihood: 3,
    initial_consequence: 3,
    risk_prevention: '',
    risk_transfer: '',
    risk_monitor: '',
    risk_mitigation: '',
    qi_plan: '',
    review_frequency_months: 3,
    status: 'open',
  });

  // Review Form State
  const [reviewFormData, setReviewFormData] = useState<any>({
    review_date: new Date().toISOString().split('T')[0],
    period_start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    result_of_review: '',
    incident_count_in_period: 0,
    current_likelihood: 2,
    current_consequence: 3,
    updated_prevention: '',
    is_escalated: 0,
    escalation_target: 'ทีมนำ/ทีมคร่อมสายงานที่เกี่ยวข้อง',
    reviewed_by: '',
    lifecycle_decision: 'KEEP',
    effectiveness_evidence: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.get('/departments', { headers })
      .then(res => setDepartments(res.data || []))
      .catch(console.error);

    // Fetch recent incidents for smart import
    axios.get('/incidents?limit=25', { headers })
      .then(res => setRecentIncidents(res.data?.data || res.data || []))
      .catch(console.error);
  }, []);

  const fetchRiskAnalysisData = () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setLoadErrors([]);
    setLoadedAt(null);
    setRisks([]);
    setStats(null);
    setMatrixData(null);
    setStandards([]);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params: any = {};
    if (activeTab === 'hospital') {
      params.scope_level = 'hospital';
    } else if (activeTab === 'department') {
      params.scope_level = 'department';
    } else if (activeTab === 'due') {
      params.due_soon = 'true';
    }

    if (selectedDept !== 'all') params.department_id = selectedDept;
    const config = { headers, signal: controller.signal };
    Promise.allSettled([
      axios.get('/risk-analysis', { ...config, params }),
      axios.get('/risk-analysis/stats', { ...config, params }),
      axios.get('/incidents/matrix/stats', { ...config, params: { department_id: params.department_id } }),
      axios.get('/risk-analysis/nine-standards', { ...config, params: { department_id: params.department_id } }),
    ])
      .then(results => {
        if (controller.signal.aborted) return;
        const labels = ['ทะเบียนความเสี่ยง', 'สรุปทะเบียน', 'Incident Matrix', 'มาตรฐานความปลอดภัย'];
        const setters = [setRisks, setStats, setMatrixData, setStandards];
        const errors: string[] = [];
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') setters[index](result.value.data);
          else errors.push(labels[index]);
        });
        setLoadErrors(errors);
        setLoadedAt(new Date());
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRiskAnalysisData();
    return () => requestRef.current?.abort();
  }, [activeTab, selectedDept, dataRevision]);


  // Open Create Modal with default scope matching tab
  const handleOpenCreateModal = () => {
    setSelectedTemplateId('');
    setSelectedIncidentId('');
    setCreateModeTab('template');

    // กำหนดหน่วยงานเริ่มต้นตามสิทธิ์ของผู้ใช้งาน
    const defaultDept = user?.department_id ? String(user.department_id) : (selectedDept !== 'all' ? selectedDept : '1');

    setFormData({
      nrls_code: '',
      risk_code: '',
      risk_title: '',
      risk_description: '',
      source: 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: activeTab === 'department' || !isAdminOrRm ? 'department' : 'hospital',
      department_id: defaultDept,
      program_id: 2,
      category_name: 'Clinical Risk (ทางคลินิก)',
      safety_goal: '',
      essential_std: '',
      risk_owner_name: user?.name ? `${user.name}` : '',
      is_never_event: 0,
      initial_likelihood: 3,
      initial_consequence: 3,
      risk_prevention: '',
      risk_transfer: '',
      risk_monitor: '',
      risk_mitigation: '',
      qi_plan: '',
      review_frequency_months: 3,
      status: 'open',
    });
    setIsCreateModalOpen(true);
  };

  // Smart Fill from Template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId.startsWith('NRLS:')) {
      const [, standardNumber, nrlsCode] = templateId.split(':');
      const standard = standards.find(item => String(item.number) === standardNumber);
      const incident = standard?.incidents?.find((item: any) => item.code === nrlsCode);
      if (standard && incident) {
        setFormData((prev: any) => ({
          ...prev,
          nrls_code: incident.code,
          risk_code: incident.code,
          risk_title: incident.name,
          risk_description: '',
          source: 'มาตรฐานสำคัญ 9 ด้าน',
          essential_std: `มาตรฐานสำคัญจำเป็นข้อที่ ${standard.number}: ${standard.name}`,
          safety_goal: standard.category || '',
          department_id: prev.department_id || '1',
        }));
      }
      return;
    }
    const t = RISK_PRESET_TEMPLATES.find(tpl => tpl.id === templateId);
    if (t) {
      setFormData((prev: any) => ({
        ...prev,
        ...t.data,
        department_id: prev.department_id || '1',
      }));
    }
  };

  // Smart Fill from Real Incident
  const handleSelectIncident = (incIdStr: string) => {
    setSelectedIncidentId(incIdStr);
    const inc = recentIncidents.find(i => String(i.id) === String(incIdStr));
    if (inc) {
      // Estimate consequence from severity level string (e.g. A->1, C->2, E->3, G->4, I->5)
      let estC = 3;
      const lvl = (inc.level_id || '').toUpperCase();
      if (['A', 'B', '1'].includes(lvl)) estC = 1;
      else if (['C', 'D', '2'].includes(lvl)) estC = 2;
      else if (['E', 'F', '3'].includes(lvl)) estC = 3;
      else if (['G', 'H', '4'].includes(lvl)) estC = 4;
      else if (['I', '5'].includes(lvl)) estC = 5;

      setFormData((prev: any) => ({
        ...prev,
        nrls_code: inc.nrls_code || '',
        risk_code: inc.nrls_code || '',
        risk_title: inc.nrls_name_snapshot || inc.nrls_name || 'Legacy: รอจัดประเภท NRLS',
        risk_description: `เหตุการณ์ที่เกิดขึ้นจริง: ${inc.detail || '-'}\nการแก้ไขเบื้องต้นที่ทำแล้ว: ${inc.first_aid || inc.action_taken || '-'}`,
        source: 'รายงานอุบัติการณ์',
        scope_level: 'department',
        department_id: inc.department_id ? String(inc.department_id) : prev.department_id,
        initial_likelihood: 3,
        initial_consequence: estC,
        is_never_event: estC >= 4 ? 1 : 0,
        risk_prevention: `กำหนด CPG / Checklist สำหรับป้องกันการเกิดซ้ำของเคส #${inc.id}`,
        risk_monitor: `ติดตามรายงานอุบัติการณ์ซ้ำในแผนก (เป้าหมาย 0 เคสใน 3 เดือน)`,
        risk_mitigation: `ทบทวนแนวทางการแก้ไขเบื้องต้นและการรายงานผู้บังคับบัญชา`,
        qi_plan: `โครงการปรับปรุงกระบวนการทำงานเพื่อลดความเสี่ยงจากเคส #${inc.id}`,
        review_frequency_months: estC >= 4 ? 1 : 3,
      }));
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setSelectedRiskItem(item);
    setFormData({
      nrls_code: item.nrls_code || '',
      risk_code: item.risk_code,
      risk_title: item.risk_title,
      risk_description: item.risk_description || '',
      source: item.source || 'มาตรฐานสำคัญ 9 ด้าน',
      scope_level: item.scope_level,
      department_id: item.department_id,
      program_id: item.program_id || 2,
      category_name: item.category_name || 'Clinical Risk (ทางคลินิก)',
      safety_goal: item.safety_goal || '',
      essential_std: item.essential_std || '',
      risk_owner_name: item.risk_owner_name || '',
      is_never_event: item.is_never_event ? 1 : 0,
      initial_likelihood: item.initial_likelihood,
      initial_consequence: item.initial_consequence,
      risk_prevention: item.risk_prevention || '',
      risk_transfer: item.risk_transfer || '',
      risk_monitor: item.risk_monitor || '',
      risk_mitigation: item.risk_mitigation || '',
      qi_plan: item.qi_plan || '',
      review_frequency_months: item.review_frequency_months || 3,
      status: item.status || 'open',
    });
    setIsEditModalOpen(true);
  };

  // Open Review Modal
  const handleOpenReviewModal = (item: any) => {
    setSelectedRiskItem(item);
    setReviewFormData({
      review_date: new Date().toISOString().split('T')[0],
      period_start: item.period_start ? String(item.period_start).slice(0, 10) : new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      result_of_review: '',
      incident_count_in_period: 0,
      current_likelihood: item.initial_likelihood,
      current_consequence: item.initial_consequence,
      updated_prevention: item.risk_prevention || '',
      is_escalated: 0,
      escalation_target: 'PCT Committee',
      reviewed_by: '',
    });
    setIsReviewModalOpen(true);
  };

  // Open Detail Drill-Down Modal
  const handleOpenDetailModal = (item: any) => {
    setLoading(true);
    axios.get(`/risk-analysis/${item.id}`)
      .then(res => {
        setSelectedRiskItem(res.data);
        setIsDetailModalOpen(true);
        setLoading(false);
      })
      .catch(err => {
        alert('เปิดรายละเอียดไม่สำเร็จ: ' + (err.response?.data?.message || 'กรุณาลองใหม่'));
        setLoading(false);
      });
  };

  // Submit Create Risk
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await axios.post('/risk-analysis', formData);
      setIsCreateModalOpen(false);
      setDataRevision(value => value + 1);
    } catch (err: any) {
      alert('บันทึกล้มเหลว: ' + (err.response?.data?.message || err.message));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Submit Edit Risk
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRiskItem || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await axios.patch(`/risk-analysis/${selectedRiskItem.id}`, formData);
      setIsEditModalOpen(false);
      setDataRevision(value => value + 1);
    } catch (err: any) {
      alert('แก้ไขล้มเหลว: ' + (err.response?.data?.message || err.message));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Submit Periodic Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRiskItem || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await axios.post(`/risk-analysis/${selectedRiskItem.id}/reviews`, reviewFormData);
      setIsReviewModalOpen(false);
      setDataRevision(value => value + 1);
    } catch (err: any) {
      alert('บันทึกการทบทวนล้มเหลว: ' + (err.response?.data?.message || err.message));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Delete Risk
  const handleDeleteRisk = async (id: number, code: string) => {
    if (!confirm(`คุณต้องการลบทะเบียนความเสี่ยง "${code}" ใช่หรือไม่?`)) return;
    try {
      await axios.delete(`/risk-analysis/${id}`);
      setDataRevision(value => value + 1);
    } catch (err: any) {
      alert('ลบล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };

  // Print function
  const handlePrintTable = () => {
    if (!reportReady) return;
    printOfficialReport();
  };

  // Color helper
  const getRiskBadge = (level: string, score: number) => {
    if (level === 'red' || score >= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-300">
          <Flame className="w-3 h-3 text-red-600 print:hidden" />
          <span className="font-mono">วิกฤต ({score})</span>
        </span>
      );
    }
    if (level === 'orange' || score >= 9) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
          <AlertTriangle className="w-3 h-3 text-orange-600 print:hidden" />
          <span className="font-mono">สูง ({score})</span>
        </span>
      );
    }
    if (level === 'yellow' || score >= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Activity className="w-3 h-3 text-amber-600 print:hidden" />
          <span className="font-mono">ปานกลาง ({score})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
        <ShieldCheck className="w-3 h-3 text-emerald-600 print:hidden" />
        <span className="font-mono">ต่ำ ({score})</span>
      </span>
    );
  };

  // Filtered Risks
  const filteredRisks = risks.filter((item) => {
    const matchesSearch = searchQuery === '' ||
      (item.risk_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.risk_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.risk_owner_name && item.risk_owner_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.safety_goal && item.safety_goal.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.source && item.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.essential_std && item.essential_std.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDept === 'all' || String(item.department_id) === String(selectedDept);
    const matchesSource = selectedSource === 'all' || item.source === selectedSource;
    const matchesCategory = selectedCategory === 'all' || (item.category_name && item.category_name.includes(selectedCategory));
    const matchesLevel = selectedRiskLevel === 'all' || item.initial_risk_level === selectedRiskLevel;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesNever = !onlyNeverEvents || item.is_never_event === 1;

    return matchesSearch && matchesDept && matchesSource && matchesCategory && matchesLevel && matchesStatus && matchesNever;
  });

  // Calculate dynamic matrix score in forms
  const calculatedScore = (formData.initial_likelihood || 1) * (formData.initial_consequence || 1);
  const reviewScore = (reviewFormData.current_likelihood || 1) * (reviewFormData.current_consequence || 1);

  // Selected department label for dynamic table header
  const currentDeptObj = departments.find(d => String(d.id) === String(selectedDept));
  const currentDeptName = selectedDept === 'all' 
    ? (activeTab === 'hospital' ? 'ทุกหน่วยงาน (ระดับโรงพยาบาล)' : 'ทุกหน่วยงาน (All Departments)') 
    : (currentDeptObj?.depart_name || `แผนกที่ ${selectedDept}`);
  const printReportTitle: Record<typeof activeTab, string> = {
    hospital: 'ทะเบียนความเสี่ยงระดับโรงพยาบาล',
    department: 'ทะเบียนความเสี่ยงระดับหน่วยงาน',
    due: 'รายงานรายการความเสี่ยงถึงกำหนดทบทวน',
    matrix: 'รายงานวิเคราะห์เมทริกซ์ความเสี่ยง 5 × 5',
    standards: 'รายงานความเสี่ยงตามมาตรฐานสำคัญ 9 ด้าน',
  };

  const isRegisterTab = ['hospital', 'department', 'due'].includes(activeTab);
  const reportError = activeTab === 'matrix' ? 'Incident Matrix' : activeTab === 'standards' ? 'มาตรฐานความปลอดภัย' : 'ทะเบียนความเสี่ยง';
  const reportReady = !loading && !loadErrors.includes(reportError);
  const reportCount = activeTab === 'matrix' ? matrixData?.totalConfirmed ?? 0 : activeTab === 'standards' ? standards.length : filteredRisks.length;
  const filterDescription = isRegisterTab ? [
    searchQuery && `ค้นหา: ${searchQuery}`,
    selectedSource !== 'all' && `แหล่งที่มา: ${selectedSource}`,
    selectedCategory !== 'all' && `ประเภท: ${selectedCategory}`,
    selectedRiskLevel !== 'all' && `ระดับเริ่มต้น: ${selectedRiskLevel}`,
    selectedStatus !== 'all' && `สถานะ: ${selectedStatus}`,
    onlyNeverEvents && 'เฉพาะ Never Events',
  ].filter(Boolean).join(' · ') || 'ไม่มีตัวกรองเพิ่มเติม' : 'ตามหน่วยงานและสิทธิ์การเข้าถึง';

  // Export CSV
  const exportToCSV = () => {
    if (!reportReady) return;
    const headers = [
      'ลำดับ',
      'วันที่นำเข้า',
      'แหล่งที่มาของความเสี่ยง',
      'รหัสความเสี่ยง',
      'ชื่อความเสี่ยง',
      'รายละเอียดความเสี่ยง',
      'ผู้รับผิดชอบ',
      'ทบทวนทุก (เดือน)',
      'วันที่ทบทวนล่าสุด',
      'วันนัดทบทวนถัดไป',
      'ผลการทบทวน / RCA / มาตรการใหม่',
      'โอกาสเกิด (L 1-5)',
      'ความรุนแรง (C 1-5)',
      'คะแนนความเสี่ยง (L*C)',
      'ระดับความเสี่ยง',
      'ความเสี่ยงคงเหลือ',
      'มาตรการป้องกันและถ่ายโอน',
      'การติดตามเฝ้าระวัง (Monitor)',
      'แนวทางบรรเทาความเสียหาย (Mitigation)',
      'แผนพัฒนาคุณภาพ (QI Plan)',
      'สถานะ',
    ];

    const thaiDate = (value: string) => value ? new Date(value).toLocaleDateString('th-TH') : '-';
    const rows: CsvValue[][] = filteredRisks.map((r, idx) => [
      idx + 1,
      thaiDate(r.created_at), r.source, r.risk_code, r.risk_title, r.risk_description,
      r.risk_owner_name, r.review_frequency_months ?? 3,
      thaiDate(r.last_reviewed_date), thaiDate(r.next_review_date),
      r.latest_review?.result_of_review,
      r.initial_likelihood,
      r.initial_consequence,
      r.initial_risk_score,
      r.initial_risk_level,
      r.latest_review?.current_risk_level ?? r.initial_risk_level,
      `${r.risk_prevention || ''} ${r.risk_transfer || ''}`,
      r.risk_monitor, r.risk_mitigation, r.qi_plan, r.status,
    ]);

    const reportRows = activeTab === 'matrix' && matrixData ? matrixCsvRows(matrixData)
      : activeTab === 'standards' ? standardsCsvRows(standards) : [headers, ...rows];
    const csvContent = buildCsv([
      ['รายงาน', printReportTitle[activeTab]],
      ['หน่วยงาน', currentDeptName],
      ['ช่วงข้อมูล', 'ข้อมูลสะสมตามสิทธิ์การเข้าถึง'],
      ['เงื่อนไข', filterDescription],
      ['จำนวน', reportCount, activeTab === 'matrix' ? 'อุบัติการณ์ยืนยันแล้ว' : activeTab === 'standards' ? 'มาตรฐาน' : 'ทะเบียน'],
      ['โหลดข้อมูลเมื่อ', loadedAt?.toLocaleString('th-TH')],
      ['จัดทำเมื่อ', new Date().toLocaleString('th-TH')],
      [], ...reportRows,
    ]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Risk_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="official-print-document official-print-report-wide space-y-6">
      {/* ========================================================================= */}
      {/* PRINT-SPECIFIC CSS STYLESHEET */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 8.5pt !important;
          }
          header, aside, nav, .no-print, button, .print-hide {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .print-table-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 7.5pt !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #475569 !important;
            padding: 3px 4px !important;
            line-height: 1.2 !important;
            color: #0f172a !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .print-table-row {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <RiskWorkflowNav current="register" />
      <OfficialPrintHeader
        title={printReportTitle[activeTab]}
        subtitle="Hospital Risk Register & Risk Analysis Report"
        documentCode="RM-RP-01"
        referenceNo={`${activeTab.toUpperCase()}-${new Date().getFullYear() + 543}`}
        orientation="landscape"
        metadata={[
          { label: 'หน่วยงาน', value: currentDeptName },
          { label: 'ขอบเขต', value: activeTab === 'hospital' ? 'ระดับโรงพยาบาล' : activeTab === 'department' ? 'ระดับหน่วยงาน' : 'ตามเงื่อนไขรายงาน' },
          { label: 'จำนวนรายการ', value: reportReady ? reportCount : 'ข้อมูลไม่พร้อม' },
          { label: 'เงื่อนไข', value: filterDescription },
          { label: 'ช่วงข้อมูล', value: 'ข้อมูลสะสมตามสิทธิ์การเข้าถึง' },
          { label: 'โหลดข้อมูลเมื่อ', value: loadedAt?.toLocaleString('th-TH') || '-' },
          { label: 'ผู้จัดทำ', value: user?.name || 'ผู้ใช้งานระบบ' },
        ]}
      />

      {/* Top Header Banner (Relaxing & Positive) */}
      <div className="no-print bg-gradient-to-br from-indigo-50 via-white to-emerald-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all relative overflow-hidden border border-white/50 dark:border-slate-700/50">
        <div className="absolute -top-12 -right-10 w-48 h-48 bg-emerald-100/40 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 text-indigo-600 dark:text-indigo-300 text-xs font-semibold tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            ทะเบียน • เมทริกซ์ • มาตรฐานความปลอดภัย
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2.5">
            ติดตามความเสี่ยง
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
            เชื่อมสัญญาณจากอุบัติการณ์กับทะเบียนความเสี่ยง งานทบทวน และผลของมาตรการ เพื่อวางแผนความปลอดภัยร่วมกัน
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 text-white font-medium text-xs sm:text-sm rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <span className="text-lg leading-none">+</span>
            เพิ่มรายการใหม่
          </button>

          <button
            onClick={exportToCSV}
            disabled={!reportReady}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-slate-700/60 backdrop-blur hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm rounded-full border border-slate-200 dark:border-slate-600 shadow-sm transition-all cursor-pointer"
            title="ส่งออกเป็นไฟล์ Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ส่งออก CSV
          </button>

          <button
            onClick={handlePrintTable}
            disabled={!reportReady}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-slate-700/60 backdrop-blur hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm rounded-full border border-slate-200 dark:border-slate-600 shadow-sm transition-all cursor-pointer"
            title="พิมพ์ตารางรายงานออกทางเครื่องพิมพ์"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            พิมพ์
          </button>
        </div>
      </div>

      <details className="no-print rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <summary className="cursor-pointer text-sm font-semibold text-indigo-700 dark:text-indigo-300">ดูแนวโน้มและงานติดตามเพื่อวางแผนความปลอดภัย</summary>
        <div className="mt-4"><RiskDecisionSupport departments={departments} department={selectedDept} onDepartmentChange={setSelectedDept} refreshKey={dataRevision} onOpenRisk={id => handleOpenDetailModal({ id })} /></div>
      </details>
      <h2 className="no-print text-xl font-bold text-slate-800 dark:text-white">ทะเบียนความเสี่ยงและเครื่องมือทบทวน</h2>
      <div className="no-print flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span>ขอบเขต: {currentDeptName} · {printReportTitle[activeTab]} · ข้อมูลสะสมตามสิทธิ์{loadedAt && ` · โหลดล่าสุด ${loadedAt.toLocaleString('th-TH')}`}</span>
        <select
          aria-label="หน่วยงานของรายงาน" value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
        >
          <option value="all">ทุกหน่วยงานตามสิทธิ์</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.depart_name}</option>
          ))}
        </select>
        <button type="button" disabled={loading} onClick={() => setDataRevision(value => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">โหลดข้อมูลใหม่</button>
      </div>
      {loadErrors.length > 0 && <div role="alert" className="no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">โหลด {loadErrors.join(', ')} ไม่สำเร็จ กรุณากดโหลดข้อมูลใหม่ ข้อมูลส่วนที่โหลดไม่สำเร็จจะไม่แสดงเป็นยอดศูนย์</div>}
      {/* KPI Cards Overview */}
      {stats && (
        <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm transition hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">รายการทั้งหมด</span>
              <div className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</span>
              <span className="text-xs text-slate-400 font-medium">รายการ</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">ทะเบียนตามขอบเขตที่เลือก</div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 border border-rose-100 dark:border-rose-900/30 shadow-sm transition hover:shadow-md hover:border-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">ต้องจัดการด่วน (Extreme)</span>
              <div className="p-1.5 rounded-full bg-rose-50/50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.extremeCount}</span>
              <span className="text-xs text-rose-400 font-medium">15-25 คะแนน</span>
            </div>
            <div className="mt-1 text-[11px] text-rose-500/80 dark:text-rose-400/80 font-medium">รอการแก้ไข</div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 border border-amber-100 dark:border-amber-900/30 shadow-sm transition hover:shadow-md hover:border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">ควรให้ความสนใจ (High)</span>
              <div className="p-1.5 rounded-full bg-amber-50/50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.highCount}</span>
              <span className="text-xs text-amber-400 font-medium">9-14 คะแนน</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">เฝ้าระวัง</div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30 shadow-sm transition hover:shadow-md hover:border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">ความเสี่ยงปานกลาง (Medium)</span>
              <div className="p-1.5 rounded-full bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.mediumCount}</span>
              <span className="text-xs text-emerald-400 font-medium">4-8 คะแนน</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-500/80 dark:text-emerald-400/80 font-medium">ติดตามตามแผนควบคุม</div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 border border-purple-100 dark:border-purple-900/30 shadow-sm transition hover:shadow-md hover:border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">ทะเบียน Never Events</span>
              <div className="p-1.5 rounded-full bg-purple-50/50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.neverEventCount}</span>
              <span className="text-xs text-purple-400 font-medium">ทะเบียน</span>
            </div>
            <div className="mt-1 text-[11px] text-purple-500/80 dark:text-purple-400/80 font-medium">ต้องติดตามมาตรการป้องกัน</div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 border border-blue-100 dark:border-blue-900/30 shadow-sm transition hover:shadow-md hover:border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">กำหนดทบทวน</span>
              <div className="p-1.5 rounded-full bg-blue-50/50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.dueSoonCount}</span>
              <span className="text-xs text-blue-400 font-medium">ใน 30 วัน</span>
            </div>
            <div className="mt-1 text-[11px] text-blue-500/80 dark:text-blue-400/80 font-medium">จัดสรรเวลาได้</div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="no-print bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('hospital')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'hospital'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Building className="w-4 h-4" />
          ระดับโรงพยาบาล (Hospital-wide)
        </button>

        <button
          onClick={() => setActiveTab('department')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'department'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Building className="w-4 h-4" />
          ระดับหน่วยงาน (Departmental)
        </button>

        <button
          onClick={() => setActiveTab('due')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition relative cursor-pointer ${
            activeTab === 'due'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          แจ้งเตือนกำหนดทบทวน
          {stats?.dueSoonCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {stats.dueSoonCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Grid className="w-4 h-4" />
          เมทริกซ์ 5x5 (Risk Matrix Heatmap)
        </button>

        <button
          onClick={() => setActiveTab('standards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'standards'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Target className="w-4 h-4" />
          มาตรฐานสำคัญ 9 ด้าน (HA Goals)
        </button>
      </div>

      {/* User Permission & Department Scope Info Bar (Hidden on Print) */}
      {(activeTab === 'hospital' || activeTab === 'department' || activeTab === 'due') && (
        <div className="no-print bg-slate-900 text-slate-100 border border-slate-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <UserCheck className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300">เข้าสู่ระบบ:</span>
                <span className="text-white font-bold">{user?.name || 'ผู้ใช้งานระบบ (ทั่วไป)'}</span>
                {user?.department_id && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold text-[11px]">
                    🏢 {departments.find(d => String(d.id) === String(user.department_id))?.depart_name || `แผนกรหัส ${user.department_id}`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ข้อมูลแสดงตามหน่วยงานที่เลือกและสิทธิ์ของบัญชี · การลบทะเบียนสงวนสำหรับ Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user?.department_id && (
              <button
                onClick={() => {
                  setSelectedDept(String(user.department_id));
                  setActiveTab('department');
                  setSearchQuery(''); setSelectedSource('all'); setSelectedCategory('all');
                  setSelectedRiskLevel('all'); setSelectedStatus('all'); setOnlyNeverEvents(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <span>📍 ดูเฉพาะแผนกของฉัน</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedDept('all');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition"
            >
              ดูทั้งหมด
            </button>
          </div>
        </div>
      )}

      {/* FILTER TOOLBAR FOR RISK REGISTERS */}
      {(activeTab === 'hospital' || activeTab === 'department' || activeTab === 'due') && (
        <div className="no-print bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัส, ชื่อความเสี่ยง, แหล่งที่มา, ผู้รับผิดชอบ, 2P Safety..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Source Filter */}
              <select
                value={selectedSource}
                onChange={e => setSelectedSource(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">ทุกแหล่งที่มา</option>
                <option value="มาตรฐานสำคัญ 9 ด้าน">มาตรฐานสำคัญ 9 ด้าน</option>
                <option value="รายงานอุบัติการณ์">รายงานอุบัติการณ์</option><option value="FMEA">FMEA</option><option value="Safety Walkround">Safety Walkround</option><option value="Proactive Risk Assessment">Proactive Risk Assessment</option>
                <option value="เรื่องที่หน่วยงานให้ความสำคัญ">เรื่องที่หน่วยงานให้ความสำคัญ</option>
                <option value="ทบทวนเวชระเบียน">ทบทวนเวชระเบียน</option>
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">ทุกหมวดหมู่</option>
                <option value="Clinical">Clinical Risk (ทางคลินิก)</option>
                <option value="Non-Clinical">Non-Clinical Risk (สิ่งแวดล้อม/อาคาร)</option>
                <option value="Personnel">Personnel Safety (ความปลอดภัยบุคลากร)</option>
              </select>

              {/* Level Filter */}
              <select
                value={selectedRiskLevel}
                onChange={e => setSelectedRiskLevel(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">ทุกระดับคะแนน</option>
                <option value="red">🔴 Extreme (วิกฤต 15-25)</option>
                <option value="orange">🟠 High (สูง 9-14)</option>
                <option value="yellow">🟡 Medium (ปานกลาง 4-8)</option>
                <option value="green">🟢 Low (ต่ำ 1-3)</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="open">เปิด (Open)</option>
                <option value="monitoring">เฝ้าระวังต่อเนื่อง (Monitoring)</option>
                <option value="closed">ปิด (Closed)</option>
              </select>

              {/* Never Event Toggle */}
              <button
                onClick={() => setOnlyNeverEvents(!onlyNeverEvents)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  onlyNeverEvents
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                Never Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL HOSPITAL RISK REGISTER TABLE (PRINTABLE & EXCEL-STYLE HEADERS) */}
      {/* ========================================================================= */}
      {(activeTab === 'hospital' || activeTab === 'department' || activeTab === 'due') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-table-container">

          {/* Official Printable Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  แบบฟอร์มทะเบียนความเสี่ยงโรงพยาบาลวังเจ้า (Hospital Risk Register Form)
                </span>
                <span className="no-print text-xs text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
                  {filteredRisks.length} ความเสี่ยง
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                <strong>หน่วยงาน:</strong> <span className="text-indigo-700 font-bold">{currentDeptName}</span> | <strong>ขอบเขต:</strong> {activeTab === 'hospital' ? 'ระดับโรงพยาบาล (Hospital-wide)' : activeTab === 'department' ? 'ระดับหน่วยงาน (Departmental)' : 'รายการที่ถึงกำหนดทบทวน'} | <strong>มาตรฐาน:</strong> HA Thailand & 2P Safety Goals
              </p>
            </div>

            <div className="no-print flex items-center gap-2">
              <button
                onClick={handlePrintTable}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                พิมพ์เฉพาะตารางนี้
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 print-table border-collapse">
              {/* TWO-TIER OFFICIAL SPREADSHEET HEADER */}
              <thead className="select-none font-bold border-b border-slate-300">
                {/* TIER 1: Category Groups with Color Coding */}
                <tr className="text-center font-extrabold text-white text-[11px] tracking-wide uppercase">
                  <th colSpan={5} className="bg-sky-700 py-2.5 px-2 border-r border-sky-600">
                    🔷 1. Risk Identification (การระบุความเสี่ยง)
                  </th>
                  <th colSpan={6} className="bg-emerald-700 py-2.5 px-2 border-r border-emerald-600">
                    🟢 2. Risk Monitoring & Review (การติดตามและทบทวนความเสี่ยง)
                  </th>
                  <th colSpan={3} className="bg-amber-600 py-2.5 px-2 border-r border-amber-500">
                    🟠 3. Risk Analysis (การวิเคราะห์)
                  </th>
                  <th colSpan={3} className="bg-purple-700 py-2.5 px-2 border-r border-purple-600">
                    🟣 4. Risk Treatment Plan (แผนจัดการความเสี่ยง 4 ด้าน)
                  </th>
                  <th colSpan={1} className="bg-rose-700 py-2.5 px-2 border-r border-rose-600">
                    🔴 5. QI Plan
                  </th>
                  <th colSpan={1} className="bg-slate-800 py-2.5 px-2 no-print">
                    ⚙️ จัดการ
                  </th>
                </tr>

                {/* TIER 2: Specific Column Headers */}
                <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold border-b border-slate-300 text-center">
                  {/* 1. Identification */}
                  <th className="py-2.5 px-1.5 w-10 border-r border-slate-200">ลำดับ</th>
                  <th className="py-2.5 px-2 w-20 border-r border-slate-200">วันที่นำเข้า</th>
                  <th className="py-2.5 px-2 w-28 border-r border-slate-200">แหล่งที่มา</th>
                  <th className="py-2.5 px-3 min-w-[200px] text-left border-r border-slate-200">ชื่อความเสี่ยง / รหัส</th>
                  <th className="py-2.5 px-3 min-w-[220px] text-left border-r border-slate-300">รายละเอียดความเสี่ยง</th>

                  {/* 2. Monitoring & Review */}
                  <th className="py-2.5 px-2 w-32 text-left border-r border-slate-200">ผู้รับผิดชอบ</th>
                  <th className="py-2.5 px-1.5 w-16 border-r border-slate-200">ทบทวนทุก</th>
                  <th className="py-2.5 px-2 w-20 border-r border-slate-200">วันที่ทบทวน</th>
                  <th className="py-2.5 px-3 min-w-[200px] text-left border-r border-slate-200">ผลการทบทวน / RCA / การปฏิบัติ</th>
                  <th className="py-2.5 px-2 w-24 border-r border-slate-200">ความเสี่ยงคงเหลือ</th>
                  <th className="py-2.5 px-1.5 w-16 border-r border-slate-300">สถานะ</th>

                  {/* 3. Risk Analysis */}
                  <th className="py-2.5 px-1.5 w-10 border-r border-slate-200 text-center" title="Likelihood (โอกาสเกิด 1-5)">L</th>
                  <th className="py-2.5 px-1.5 w-10 border-r border-slate-200 text-center" title="Consequence (ความรุนแรง 1-5)">C</th>
                  <th className="py-2.5 px-2 w-24 border-r border-slate-300 text-center" title="คะแนนความเสี่ยง Likelihood × Consequence">ระดับ (L×C)</th>

                  {/* 4. Treatment Plan */}
                  <th className="py-2.5 px-3 min-w-[220px] text-left border-r border-slate-200">มาตรการป้องกัน / ถ่ายโอน</th>
                  <th className="py-2.5 px-3 min-w-[180px] text-left border-r border-slate-200">การติดตาม (Monitor/KPI)</th>
                  <th className="py-2.5 px-3 min-w-[180px] text-left border-r border-slate-300">แนวทางบรรเทาความเสียหาย</th>

                  {/* 5. QI Plan */}
                  <th className="py-2.5 px-3 min-w-[180px] text-left border-r border-slate-300">โครงการพัฒนาคุณภาพ (QI)</th>

                  {/* Actions */}
                  <th className="py-2.5 px-2 w-24 text-center no-print">การกระทำ</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      กำลังโหลดข้อมูลทะเบียนความเสี่ยงโรงพยาบาล...
                    </td>
                  </tr>
                ) : filteredRisks.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-400">
                      <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      {loadErrors.includes('ทะเบียนความเสี่ยง') ? 'ยังแสดงทะเบียนไม่ได้ เนื่องจากโหลดข้อมูลไม่สำเร็จ' : 'ยังไม่มีทะเบียนความเสี่ยงที่บันทึกตรงกับหน่วยงานหรือเงื่อนไขที่เลือก'}
                    </td>
                  </tr>
                ) : (() => {
                  const grouped = filteredRisks.reduce((acc: any, item: any) => {
                    const cat = item.category_name || 'อื่นๆ / ไม่ได้ระบุหมวดหมู่';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {});
                  return Object.keys(grouped).map((catName) => {
                    const items = grouped[catName];
                    let headerColorClass = 'bg-sky-50 text-sky-950 border-l-4 border-sky-600 dark:bg-sky-950/40 dark:text-sky-200';
                    if (catName.includes('Clinical') || catName.includes('คลินิก')) {
                      headerColorClass = 'bg-indigo-50 text-indigo-950 border-l-4 border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200';
                    } else if (catName.includes('Non-Clinical') || catName.includes('สิ่งแวดล้อม')) {
                      headerColorClass = 'bg-slate-100 text-slate-900 border-l-4 border-slate-600 dark:bg-slate-800 dark:text-slate-200';
                    } else if (catName.includes('Personnel') || catName.includes('บุคลากร')) {
                      headerColorClass = 'bg-rose-50 text-rose-950 border-l-4 border-rose-600 dark:bg-rose-950/40 dark:text-rose-200';
                    }
                    return (
                      <React.Fragment key={catName}>
                        <tr className="bg-slate-100/50 dark:bg-slate-900/50">
                          <td colSpan={18} className={`py-3 px-4 font-black text-xs tracking-wide ${headerColorClass}`}>
                            📁 หมวดหมู่: {catName} ({items.length} รายการความเสี่ยง)
                          </td>
                        </tr>
                        {items.map((item: any, idx: number) => {
                          const isDue = item.next_review_date && new Date(item.next_review_date) <= new Date(Date.now() + 30 * 86400000);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition group print-table-row">
                              {/* 1. ลำดับ */}
                              <td className="py-2 px-1.5 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                                {idx + 1}
                              </td>

                        {/* 2. วันที่นำเข้า */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '-'}
                        </td>

                        {/* 3. แหล่งที่มา */}
                        <td className="py-2 px-2 text-slate-700 border-r border-slate-200">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                            {item.source || 'มาตรฐานสำคัญ 9 ด้าน'}
                          </span>
                        </td>

                        {/* 4. ชื่อความเสี่ยง / รหัส */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              {item.risk_code}
                            </span>
                            {item.is_never_event === 1 && (
                              <span title="Never Event / Zero Event" className="text-red-600 font-black text-xs">
                                ⚡ Never Event
                              </span>
                            )}
                          </div>
                          <div 
                            onClick={() => handleOpenDetailModal(item)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer leading-tight"
                          >
                            {item.risk_title}
                          </div>
                          {item.essential_std && (
                            <div className="text-[10px] text-indigo-600 mt-1 font-medium flex items-center gap-1">
                              <Target className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              <span className="line-clamp-1">{item.essential_std}</span>
                            </div>
                          )}
                        </td>

                        {/* 5. รายละเอียดความเสี่ยง */}
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-300 leading-relaxed text-[11px]">
                          {item.risk_description || '-'}
                        </td>

                        {/* 6. ผู้รับผิดชอบ */}
                        <td className="py-2 px-2 text-slate-800 border-r border-slate-200 font-medium text-[11px]">
                          <div>{item.risk_owner_name || 'คณะกรรมการ RM'}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {item.scope_level === 'hospital' ? '🏥 ระดับ รพ.' : `🏢 ${item.department_name || item.department_id}`}
                          </div>
                        </td>

                        {/* 7. ทบทวนทุก */}
                        <td className="py-2 px-1.5 text-center text-slate-700 border-r border-slate-200 text-[11px] whitespace-nowrap">
                          ทุก {item.review_frequency_months || 3} ด.
                        </td>

                        {/* 8. วันที่ทบทวน */}
                        <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap text-[10px]">
                          {item.last_reviewed_date ? (
                            <div className="text-emerald-700 font-semibold">
                              ล่าสุด: {new Date(item.last_reviewed_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-slate-400">ยังไม่ทบทวน</span>
                          )}
                          {item.next_review_date && (
                            <div className={`mt-0.5 font-bold ${isDue ? 'text-red-600 font-black' : 'text-slate-500'}`}>
                              นัด: {new Date(item.next_review_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' })}
                            </div>
                          )}
                        </td>

                        {/* 9. ผลการทบทวน / RCA */}
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200 text-[11px] leading-relaxed">
                          {item.latest_review ? (
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                <span>📅 อัพเดต: {new Date(item.latest_review.review_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' })}</span>
                                {item.latest_review.reviewed_by && (
                                  <span className="text-slate-400 font-normal">({item.latest_review.reviewed_by})</span>
                                )}
                              </div>
                              <p className="line-clamp-2 text-slate-800 font-medium">{item.latest_review.result_of_review}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">รอการทบทวนรอบแรก</span>
                          )}
                        </td>

                        {/* 10. ความเสี่ยงคงเหลือ */}
                        <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                          {item.latest_review ? (
                            <div>
                              {getRiskBadge(item.latest_review.current_risk_level, item.latest_review.current_risk_score)}
                              <div className="text-[9px] text-emerald-700 font-bold mt-0.5">รอบที่ {item.latest_review.review_cycle_no}</div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">ตามคะแนนเดิม</span>
                          )}
                        </td>

                        {/* 11. สถานะ */}
                        <td className="py-2 px-1.5 text-center border-r border-slate-300">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'closed'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : item.status === 'monitoring'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status === 'closed' ? 'ปิด' : item.status === 'monitoring' ? 'เฝ้าระวัง' : 'เปิด'}
                          </span>
                        </td>

                        {/* 12. Likelihood L */}
                        <td className="py-2 px-1.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {item.initial_likelihood}
                        </td>

                        {/* 13. Consequence C */}
                        <td className="py-2 px-1.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {item.initial_consequence}
                        </td>

                        {/* 14. ระดับ (L×C) */}
                        <td className="py-2 px-2 text-center border-r border-slate-300 whitespace-nowrap">
                          {getRiskBadge(item.initial_risk_level, item.initial_risk_score)}
                        </td>

                        {/* 15. มาตรการป้องกัน / ถ่ายโอน */}
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200 text-[11px] leading-relaxed">
                          {/* มาตรการเดิม */}
                          <div className="text-[11px]">
                            <span className="font-semibold text-slate-800">📌 มาตรการเดิม:</span>
                            <div className="whitespace-pre-line line-clamp-2 text-slate-700 mt-0.5">
                              {item.risk_prevention || '-'}
                            </div>
                          </div>

                          {/* มาตรการที่ได้เปลี่ยนแปลง */}
                          {item.latest_review?.updated_prevention && (
                            <div className="mt-1.5 p-1.5 bg-emerald-50/90 border border-emerald-200/80 rounded text-[10.5px] text-emerald-950">
                              <div className="flex items-center gap-1 font-bold text-emerald-800">
                                <span>✨ มาตรการที่เปลี่ยนแปลง:</span>
                                <span className="text-[9.5px] font-normal text-emerald-700">
                                  ({new Date(item.latest_review.review_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' })})
                                </span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 font-medium">{item.latest_review.updated_prevention}</p>
                            </div>
                          )}

                          {item.risk_transfer && (
                            <div className="text-[10px] text-purple-700 font-medium mt-1">
                              <strong>ถ่ายโอน:</strong> {item.risk_transfer}
                            </div>
                          )}
                        </td>

                        {/* 16. การติดตาม (Monitor) */}
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200 text-[11px] leading-relaxed">
                          <div className="whitespace-pre-line line-clamp-3">
                            {item.risk_monitor || '-'}
                          </div>
                        </td>

                        {/* 17. แนวทางบรรเทา (Mitigation) */}
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-300 text-[11px] leading-relaxed">
                          <div className="whitespace-pre-line line-clamp-3">
                            {item.risk_mitigation || '-'}
                          </div>
                        </td>

                        {/* 18. โครงการพัฒนาคุณภาพ (QI Plan) */}
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-300 text-[11px] leading-relaxed">
                          {item.qi_plan ? (
                            <div className="text-rose-900 bg-rose-50/70 p-1.5 rounded border border-rose-200 font-medium">
                              {item.qi_plan}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-2 text-center no-print whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* ปุ่มดูรายละเอียด (ทุกคน ทุกหน่วยงาน ดูได้ 100%) */}
                            <button
                              onClick={() => handleOpenDetailModal(item)}
                              title="ดูรายละเอียดเชิงลึก & ประวัติทบทวน (เปิดดูได้ทุกรายการ)"
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* สิทธิ์การแก้ไข/ทบทวน/ลบ: เฉพาะหน่วยงานตนเอง + ระดับ รพ. + Admin */}
                            {canEditRisk(item) ? (
                              <>
                                <button
                                  onClick={() => handleOpenReviewModal(item)}
                                  title="บันทึกผลการทบทวนตามรอบ"
                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  title="แก้ไขข้อมูลความเสี่ยง"
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRisk(item.id, item.risk_code)}
                                  disabled={user?.role !== 'admin'}
                                  title={user?.role === 'admin' ? 'ลบรายการ' : 'เฉพาะ Admin เท่านั้นที่ลบทะเบียนได้'}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span 
                                title={`รายการของ ${item.department_name || 'หน่วยงานอื่น'} (สิทธิ์ดูอย่างเดียว - แก้ไขได้เฉพาะหน่วยงานตนเองและระดับ รพ.)`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                              >
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                ดูอย่างเดียว
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()
        }
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
            <span>
              * ทะเบียนความเสี่ยงโรงพยาบาลวังเจ้า อิงเกณฑ์มาตรฐาน 2P Safety และการประเมิน Likelihood (1-5) × Consequence (1-5)
            </span>
            <span className="font-mono text-[11px]">
              แสดง {filteredRisks.length} รายการ
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 5x5 RISK MATRIX HEATMAP VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && loading && <p role="status" className="rounded-xl border p-6">กำลังโหลดเมทริกซ์อุบัติการณ์…</p>}
      {activeTab === 'matrix' && matrixData && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-600" />
                เมทริกซ์การประเมินระดับความเสี่ยง 5x5 (Risk Assessment Matrix)
              </h3>
              <p className="text-sm text-slate-500">
                อุบัติการณ์ที่ยืนยันแล้ว {matrixData.totalConfirmed.toLocaleString()} ครั้ง · ข้อมูลสะสมในขอบเขตที่เลือก จัดกลุ่มความถี่ตามโปรแกรมและระดับความรุนแรง
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> วิกฤต (Extreme 15-25)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> สูง (High 9-14)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span> ปานกลาง (Medium 4-8)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span> ต่ำ (Low 1-3)</span>
            </div>
          </div>

          <div className="flex">
            {/* Y-Axis Label */}
            <div className="w-10 flex items-center justify-center font-bold text-slate-500 text-xs -rotate-90">
              ผลกระทบ / ความรุนแรง (Consequence 1-5)
            </div>

            {/* Matrix Grid 5x5 */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map(y => (
                <div key={y} className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(x => {
                    const score = x * y;
                    const { count, items } = getMatrixCell(matrixData, y, x);

                    let bgClass = 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950';
                    let badgeClass = 'bg-emerald-600 text-white';

                    if (score >= 15) {
                      bgClass = 'bg-red-100 hover:bg-red-200 border-red-400 text-red-950';
                      badgeClass = 'bg-red-600 text-white';
                    } else if (score >= 9) {
                      bgClass = 'bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-950';
                      badgeClass = 'bg-amber-600 text-white';
                    } else if (score >= 4) {
                      bgClass = 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-950';
                      badgeClass = 'bg-yellow-600 text-white';
                    }

                    return (
                      <button
                        key={x}
                        onClick={() => setSelectedCell({ y, x, count, items })}
                        className={`h-24 p-2 rounded-xl border-2 transition flex flex-col justify-between text-left shadow-sm ${bgClass} cursor-pointer group`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-mono font-bold opacity-60">L{x} × C{y}</span>
                          <span className="text-xs font-black px-1.5 py-0.5 rounded bg-white/70 shadow-xs">
                            {score}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-auto">
                          <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-800">
                            {count > 0 ? `${count} เคส` : 'ไม่มีเคส'}
                          </span>
                          {count > 0 && (
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${badgeClass} shadow-sm`}>
                              {count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* X-Axis Label */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-slate-500 pt-2">
                <span>โอกาสเกิด 1 (Rare)</span>
                <span>โอกาสเกิด 2 (Unlikely)</span>
                <span>โอกาสเกิด 3 (Possible)</span>
                <span>โอกาสเกิด 4 (Likely)</span>
                <span>โอกาสเกิด 5 (Almost Certain)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: 9 ESSENTIAL STANDARDS (HA 2P SAFETY GOALS) */}
      {/* ========================================================================= */}
      {activeTab === 'standards' && (
        loading ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8">กำลังโหลดมาตรฐานและทะเบียนที่เชื่อมโยง…</p>
          : loadErrors.includes('มาตรฐานความปลอดภัย') ? <p className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">โหลดข้อมูลมาตรฐานไม่สำเร็จ กรุณาลองใหม่</p>
            : standards.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">ยังไม่มีข้อมูลมาตรฐานที่ตั้งค่าในระบบ</p>
              : <NineStandardsDashboard
                standards={standards}
                departments={departments}
                department={selectedDept}
                onDepartmentChange={setSelectedDept}
                onOpenRisk={id => handleOpenDetailModal({ id })}
                refreshKey={dataRevision}
              />
      )}
      <OfficialPrintFooter />

      {/* ========================================================================= */}
      {/* MODAL 1: SMART REGISTER / CREATE RISK PROFILE (WITH 1-CLICK AUTO-FILL)   */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    ลงทะเบียนความเสี่ยงใหม่ (Register Risk Profile)
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-900 uppercase">
                      Smart Auto-Fill
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200">ระบบช่วยกรอกข้อมูลอัตโนมัติจากมาตรฐานสำคัญ 9 ด้าน และรายงานอุบัติการณ์จริง</p>
                </div>
              </div>
              <button onClick={() => { if (!savingRef.current) setIsCreateModalOpen(false); }} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Auto-Fill Assistant Navigation Tabs */}
            <div className="bg-indigo-50/80 p-3 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCreateModeTab('template')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    createModeTab === 'template'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  1. เลือกจากข้อมูลมาตรฐานในระบบ
                </button>

                <button
                  type="button"
                  onClick={() => setCreateModeTab('incident')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    createModeTab === 'incident'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  2. ดึงจากรายงานอุบัติการณ์จริง ({recentIncidents.length})
                </button>

                <button
                  type="button"
                  onClick={() => setCreateModeTab('custom')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    createModeTab === 'custom'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  3. กรอกเองทั้งหมด (Custom)
                </button>
              </div>

              <span className="text-[11px] text-indigo-900 font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                เลือกรหัสมาตรฐานแล้วระบบจะกรอกข้อมูลที่ยืนยันได้จากบัญชี NRLS
              </span>
            </div>

            {/* Smart Selector Dropdowns depending on Tab */}
            {createModeTab === 'template' && (
              <div className="bg-indigo-100/50 px-6 py-3 border-b border-indigo-200 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-extrabold text-indigo-950 whitespace-nowrap flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  เลือกแม่แบบความเสี่ยงสำเร็จรูป:
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={e => handleSelectTemplate(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-lg border-2 border-indigo-300 bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <option value="">-- แตะเพื่อเลือกแม่แบบมาตรฐาน (Auto-Fill Form) --</option>
                  <optgroup label="🏥 มาตรฐานสำคัญจำเป็น 9 ด้าน (HA Thailand)">
                    {standards.flatMap(standard =>
                      (standard.incidents || []).map((incident: any) => (
                        <option key={`${standard.number}-${incident.code}`} value={`NRLS:${standard.number}:${incident.code}`}>
                          [{incident.code}] ข้อ {standard.number}: {incident.name}
                        </option>
                      ))
                    )}
                  </optgroup>
                  <optgroup label="🏢 ความเสี่ยงเฉพาะหน่วยงาน (Department Specific)">
                    {RISK_PRESET_TEMPLATES.filter(t => !t.category.includes('มาตรฐาน')).map(tpl => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.data.risk_code}] {tpl.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {createModeTab === 'incident' && (
              <div className="bg-amber-50 px-6 py-3 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-extrabold text-amber-950 whitespace-nowrap flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  เลือกเคสอุบัติการณ์ล่าสุด:
                </label>
                <select
                  value={selectedIncidentId}
                  onChange={e => handleSelectIncident(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-lg border-2 border-amber-300 bg-white text-amber-900 focus:ring-2 focus:ring-amber-500 shadow-sm"
                >
                  <option value="">-- เลือกอุบัติการณ์ที่เกิดขึ้นจริงเพื่อแปลงเป็นความเสี่ยงเชิงรุก --</option>
                  {recentIncidents.map(inc => (
                    <option key={inc.id} value={inc.id}>
                      #{inc.id} ({new Date(inc.date_report).toLocaleDateString('th-TH')}) - [{inc.level_id || 'Level'}] {inc.detail ? inc.detail.substring(0, 70) : 'ไม่มีรายละเอียด'}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitCreate} className="p-6 overflow-y-auto space-y-5 flex-1">
              <fieldset disabled={saving} className="min-w-0 space-y-5">

              <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">รหัสและชื่อความเสี่ยงอ้างอิงจากมาตรฐาน NRLS ระบบจะใช้ชื่อมาตรฐานตามรหัส NRLS เมื่อบันทึก</p>
              {/* Scope, Dept, Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ขอบเขตระดับ (Scope Level) *</label>
                  <select
                    value={formData.scope_level}
                    onChange={e => setFormData({ ...formData, scope_level: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {isAdminOrRm && <option value="hospital">🏥 ระดับโรงพยาบาล (Hospital-wide)</option>}
                    <option value="department">🏢 ระดับหน่วยงาน (Departmental)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยงานเจ้าของความเสี่ยง *</label>
                  <select
                    value={formData.department_id}
                    onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.depart_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">แหล่งที่มาของความเสี่ยง *</label>
                  <select
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="มาตรฐานสำคัญ 9 ด้าน">มาตรฐานสำคัญ 9 ด้าน</option>
                    <option value="รายงานอุบัติการณ์">รายงานอุบัติการณ์</option><option value="FMEA">FMEA</option><option value="Safety Walkround">Safety Walkround</option><option value="Proactive Risk Assessment">Proactive Risk Assessment</option>
                    <option value="เรื่องที่หน่วยงานให้ความสำคัญ">เรื่องที่หน่วยงานให้ความสำคัญ</option>
                    <option value="ทบทวนเวชระเบียน">ทบทวนเวชระเบียน</option>
                  </select>
                </div>
              </div>

              {/* Risk Code & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัส NRLS *</label>
                  <input type="text" required placeholder="เช่น CPP405" value={formData.nrls_code} onChange={e => setFormData({ ...formData, nrls_code: e.target.value.toUpperCase(), risk_code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono font-bold uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสความเสี่ยง (Code) *</label>
                  <input aria-label="รหัสความเสี่ยงตาม NRLS" readOnly
                    type="text"
                    placeholder="เช่น STD-01, ER-01"
                    value={formData.risk_code}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหัวข้อความเสี่ยง (Risk Title) *</label>
                  <input aria-label="ชื่อความเสี่ยงตาม NRLS" readOnly
                    type="text"
                    placeholder="เช่น ความคลาดเคลื่อนในการวินิจฉัยโรค (Missed / Delayed Diagnosis)"
                    value={formData.risk_title}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำนิยามและรายละเอียดความเสี่ยง (Description)</label>
                <textarea
                  rows={2}
                  placeholder="อธิบายเหตุการณ์ โอกาสเกิด หรือกลุ่มผู้ป่วยที่มีความเสี่ยง..."
                  value={formData.risk_description}
                  onChange={e => setFormData({ ...formData, risk_description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Standards and Goals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เริ่มรอบคำนวณ *</label>
                  <input type="date" required value={reviewFormData.period_start} onChange={e => setReviewFormData({ ...reviewFormData, period_start: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สิ้นสุดรอบคำนวณ *</label>
                  <input type="date" required value={reviewFormData.period_end} onChange={e => setReviewFormData({ ...reviewFormData, period_end: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เป้าหมายความปลอดภัย (2P Safety Goal)</label>
                  <input
                    type="text"
                    placeholder="เช่น Patient Safety (P: Patient Fall Prevention)"
                    value={formData.safety_goal}
                    onChange={e => setFormData({ ...formData, safety_goal: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">มาตรฐานสำคัญจำเป็น 9 ด้าน (HA Standard)</label>
                  <input
                    type="text"
                    placeholder="เช่น มาตรฐานสำคัญจำเป็นข้อที่ 2: การวินิจฉัยโรค"
                    value={formData.essential_std}
                    onChange={e => setFormData({ ...formData, essential_std: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* L x C Scoring Matrix */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">การประเมินคะแนนเริ่มต้น (Initial Assessment):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">คะแนน: {calculatedScore}</span>
                    {getRiskBadge(
                      getRiskMatrixLevel(formData.initial_likelihood, formData.initial_consequence),
                      calculatedScore
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      โอกาสเกิด (Likelihood: 1-5): <strong className="text-indigo-600">{formData.initial_likelihood}</strong>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={formData.initial_likelihood}
                      onChange={e => setFormData({ ...formData, initial_likelihood: Number(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>1: แทบไม่เคย</span>
                      <span>3: ปานกลาง</span>
                      <span>5: บ่อยมาก</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      ความรุนแรง (Consequence: 1-5): <strong className="text-indigo-600">{formData.initial_consequence}</strong>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={formData.initial_consequence}
                      onChange={e => setFormData({ ...formData, initial_consequence: Number(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>1: เล็กน้อย</span>
                      <span>3: ปานกลาง</span>
                      <span>5: วิกฤต/เสียชีวิต</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_never_event === 1}
                      onChange={e => setFormData({ ...formData, is_never_event: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                      ⚡ กำหนดเป็น Never Event / Zero Event (เหตุการณ์ที่ไม่ควรเกิดขึ้นเด็ดขาด)
                    </span>
                  </label>
                </div>
              </div>

              {/* 4 Pillars Control Measures */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">มาตรการควบคุม 4 ด้าน (4 Pillars)</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">1. มาตรการป้องกัน (Risk Prevention)</label>
                    <textarea
                      rows={2}
                      placeholder="ระบุ CPG, WI, Checklist หรือแนวทางปฏิบัติ..."
                      value={formData.risk_prevention}
                      onChange={e => setFormData({ ...formData, risk_prevention: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">2. การถ่ายโอนความเสี่ยง (Risk Transfer)</label>
                    <textarea
                      rows={2}
                      placeholder="ส่งต่อเคส, ส่งกรรมการเฉพาะด้าน, หรือทำประกันภัย..."
                      value={formData.risk_transfer}
                      onChange={e => setFormData({ ...formData, risk_transfer: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">3. การติดตามเฝ้าระวัง (Risk Monitor)</label>
                    <textarea
                      rows={2}
                      placeholder="KPI, ตัวชี้วัด, Environmental Round หรือการสุ่ม Audit..."
                      value={formData.risk_monitor}
                      onChange={e => setFormData({ ...formData, risk_monitor: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">4. การบรรเทาความเสียหาย (Risk Mitigation)</label>
                    <textarea
                      rows={2}
                      placeholder="การปฐมพยาบาล, แจ้งผู้บริหาร, Open Disclosure เจรจาไกล่เกลี่ย..."
                      value={formData.risk_mitigation}
                      onChange={e => setFormData({ ...formData, risk_mitigation: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* QI Plan */}
              <div>
                <label className="block text-xs font-bold text-rose-900 mb-1">5. แผนพัฒนาคุณภาพ (QI Plan / Innovation)</label>
                <textarea
                  rows={2}
                  placeholder="โครงการพัฒนาคุณภาพ นวัตกรรม หรือการปรับปรุงระบบเพื่อลดความเสี่ยงนี้..."
                  value={formData.qi_plan}
                  onChange={e => setFormData({ ...formData, qi_plan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-200 bg-rose-50/30 leading-relaxed"
                />
              </div>

              {/* Owner and Review Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้รับผิดชอบหลัก (Risk Owner)</label>
                  <input
                    type="text"
                    placeholder="เช่น นพ.สุกาญจน์, พว.สุดา, ทนพญ.เบญจมาศ"
                    value={formData.risk_owner_name}
                    onChange={e => setFormData({ ...formData, risk_owner_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ความถี่ในการทบทวนตามรอบ (Review Frequency)</label>
                  <select
                    value={formData.review_frequency_months}
                    onChange={e => setFormData({ ...formData, review_frequency_months: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  >
                    <option value={1}>ทุก 1 เดือน (ความเสี่ยงวิกฤต Extreme)</option>
                    <option value={3}>ทุก 3 เดือน (ไตรมาส - มาตรฐาน)</option>
                    <option value={6}>ทุก 6 เดือน (รายครึ่งปี)</option>
                    <option value={12}>ทุก 12 เดือน (รายปี)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { if (!savingRef.current) setIsCreateModalOpen(false); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'กำลังบันทึก…' : 'บันทึกลงทะเบียนความเสี่ยง'}
                </button>
              </div>

              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT RISK PROFILE */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedRiskItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-white">แก้ไขข้อมูลความเสี่ยง ({formData.risk_code})</h3>
              </div>
              <button onClick={() => { if (!savingRef.current) setIsEditModalOpen(false); }} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Notice Banner */}
            <div className="no-print px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b border-slate-100 bg-slate-50 text-slate-700">
              {isAdminOrRm ? (
                <span className="text-indigo-700">🔑 สิทธิ์ผู้ดูแลระบบ/RM: ท่านสามารถแก้ไขโครงสร้าง ข้อมูลระบุตัวตน และมาตรการความเสี่ยงได้ทั้งหมด</span>
              ) : (
                <span className="text-amber-700">🏢 สิทธิ์หัวหน้างาน/หน่วยงาน: แก้ไขแผนมาตรการและผลลัพธ์ย่อยได้ (ข้อมูลรหัสและคะแนนความเสี่ยงแก้ไขได้โดย Admin เท่านั้น)</span>
              )}
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <fieldset disabled={saving} className="min-w-0 space-y-5">
              <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">รหัสและชื่อความเสี่ยงอ้างอิงจากมาตรฐาน NRLS หากเปลี่ยนรหัส NRLS ระบบจะปรับชื่อให้ตรงมาตรฐานเมื่อบันทึก</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัส NRLS</label>
                  <input type="text" required disabled={!isAdminOrRm} value={formData.nrls_code} onChange={e => setFormData({ ...formData, nrls_code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono font-bold uppercase disabled:bg-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสความเสี่ยง</label>
                  <input aria-label="รหัสความเสี่ยงตาม NRLS" readOnly
                    type="text"
                    value={formData.risk_code}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono font-bold uppercase disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยงาน</label>
                  <select
                    value={formData.department_id}
                    disabled={!isAdminOrRm}
                    onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.depart_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">แหล่งที่มา</label>
                  <select
                    value={formData.source}
                    disabled={!isAdminOrRm}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="มาตรฐานสำคัญ 9 ด้าน">มาตรฐานสำคัญ 9 ด้าน</option>
                    <option value="รายงานอุบัติการณ์">รายงานอุบัติการณ์</option><option value="FMEA">FMEA</option><option value="Safety Walkround">Safety Walkround</option><option value="Proactive Risk Assessment">Proactive Risk Assessment</option>
                    <option value="เรื่องที่หน่วยงานให้ความสำคัญ">เรื่องที่หน่วยงานให้ความสำคัญ</option>
                    <option value="ทบทวนเวชระเบียน">ทบทวนเวชระเบียน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อความเสี่ยง</label>
                <input aria-label="ชื่อความเสี่ยงตาม NRLS" readOnly
                  type="text"
                  value={formData.risk_title}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียดความเสี่ยง</label>
                <textarea
                  rows={2}
                  disabled={!isAdminOrRm}
                  value={formData.risk_description}
                  onChange={e => setFormData({ ...formData, risk_description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* L x C Scoring */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">ประเมินคะแนน L × C:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">คะแนน: {calculatedScore}</span>
                    {getRiskBadge(
                      getRiskMatrixLevel(formData.initial_likelihood, formData.initial_consequence),
                      calculatedScore
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">โอกาสเกิด L (1-5): {formData.initial_likelihood}</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      disabled={!isAdminOrRm}
                      value={formData.initial_likelihood}
                      onChange={e => setFormData({ ...formData, initial_likelihood: Number(e.target.value) })}
                      className="w-full accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">ความรุนแรง C (1-5): {formData.initial_consequence}</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      disabled={!isAdminOrRm}
                      value={formData.initial_consequence}
                      onChange={e => setFormData({ ...formData, initial_consequence: Number(e.target.value) })}
                      className="w-full accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* 4 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">มาตรการป้องกัน</label>
                  <textarea
                    rows={2}
                    value={formData.risk_prevention}
                    onChange={e => setFormData({ ...formData, risk_prevention: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">การถ่ายโอน</label>
                  <textarea
                    rows={2}
                    value={formData.risk_transfer}
                    onChange={e => setFormData({ ...formData, risk_transfer: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">การติดตาม (Monitor)</label>
                  <textarea
                    rows={2}
                    value={formData.risk_monitor}
                    onChange={e => setFormData({ ...formData, risk_monitor: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">แนวทางบรรเทา (Mitigation)</label>
                  <textarea
                    rows={2}
                    value={formData.risk_mitigation}
                    onChange={e => setFormData({ ...formData, risk_mitigation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* QI Plan */}
              <div>
                <label className="block text-xs font-bold text-rose-900 mb-1">โครงการพัฒนาคุณภาพ (QI Plan)</label>
                <textarea
                  rows={2}
                  value={formData.qi_plan}
                  onChange={e => setFormData({ ...formData, qi_plan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-200 bg-rose-50/30"
                />
              </div>

              {/* Owner and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้รับผิดชอบหลัก</label>
                  <input
                    type="text"
                    value={formData.risk_owner_name}
                    onChange={e => setFormData({ ...formData, risk_owner_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานะ</label>
                  <select
                    disabled
                    title="เปลี่ยนสถานะผ่านการทบทวนพร้อมหลักฐาน"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  >
                    <option value="open">เปิด (Open)</option>
                    <option value="monitoring">เฝ้าระวังต่อเนื่อง (Monitoring)</option>
                    <option value="closed">ปิดเคส (Closed)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { if (!savingRef.current) setIsEditModalOpen(false); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
                >
                  {saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
                </button>
              </div>

              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PERIODIC REVIEW MODAL */}
      {/* ========================================================================= */}
      {isReviewModalOpen && selectedRiskItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-lg text-white">บันทึกผลการทบทวนตามรอบ (Periodic Review)</h3>
                  <p className="text-xs text-emerald-200">{selectedRiskItem.risk_code} - {selectedRiskItem.risk_title}</p>
                </div>
              </div>
              <button onClick={() => { if (!savingRef.current) setIsReviewModalOpen(false); }} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 overflow-y-auto space-y-4 flex-1">
              <fieldset disabled={saving} className="min-w-0 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    📅 วันที่ทำการทบทวน & อัพเดตมาตรการ *
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewFormData.review_date}
                    onChange={e => setReviewFormData({ ...reviewFormData, review_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🔢 จำนวนอุบัติการณ์จริงในรอบนี้ (Incident Count)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={reviewFormData.incident_count_in_period}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-100 font-bold"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Backend คำนวณจาก NRLS, ช่วงวันที่ และ scope เมื่อบันทึก</p>
                </div>
              </div>

              {/* Baseline / Current Measures Comparison Box (มาตรการเดิม) */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span>📌 มาตรการเดิมที่กำหนดไว้ (Current Baseline Measures):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div className="p-2 bg-white rounded-lg border border-amber-200/60">
                    <span className="font-semibold text-amber-900 block text-[11px]">1. มาตรการป้องกันเดิม:</span>
                    <p className="text-slate-700 mt-0.5">{selectedRiskItem.risk_prevention || 'ไม่มีระบุ'}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-amber-200/60">
                    <span className="font-semibold text-purple-900 block text-[11px]">2. การถ่ายโอนความเสี่ยง:</span>
                    <p className="text-slate-700 mt-0.5">{selectedRiskItem.risk_transfer || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🔍 ผลการทบทวน / วิเคราะห์สาเหตุ RCA / แนวโน้ม *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="ระบุข้อค้นพบในการทบทวน แนวโน้มความรุนแรง หรือผลการดำเนินงานตามมาตรการเดิม..."
                  value={reviewFormData.result_of_review}
                  onChange={e => setReviewFormData({ ...reviewFormData, result_of_review: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* RESIDUAL RISK SCORING */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">ประเมินระดับความเสี่ยงคงเหลือ (Residual Risk):</span>
                  {getRiskBadge(
                    getRiskMatrixLevel(reviewFormData.current_likelihood, reviewFormData.current_consequence),
                    reviewScore
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">โอกาสเกิดใหม่ (L: 1-5)</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={reviewFormData.current_likelihood}
                      onChange={e => setReviewFormData({ ...reviewFormData, current_likelihood: Number(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                    <span className="text-xs font-bold text-emerald-700">L: {reviewFormData.current_likelihood}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผลกระทบใหม่ (C: 1-5)</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={reviewFormData.current_consequence}
                      onChange={e => setReviewFormData({ ...reviewFormData, current_consequence: Number(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                    <span className="text-xs font-bold text-emerald-700">C: {reviewFormData.current_consequence}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
                <label className="block text-xs font-bold text-cyan-900">ผลลัพธ์ของ Risk Register หลังทบทวนรอบนี้</label>
                <select value={reviewFormData.lifecycle_decision} onChange={e => setReviewFormData({ ...reviewFormData, lifecycle_decision: e.target.value, is_escalated: e.target.value === 'ESCALATE' ? 1 : reviewFormData.is_escalated })} className="mt-2 w-full rounded-lg border border-cyan-200 bg-white px-3 py-2.5 text-sm">
                  <option value="KEEP">คงระดับและติดตามรอบถัดไป</option>
                  <option value="DECREASE">ลดระดับความเสี่ยงและติดตามต่อ</option>
                  <option value="ESCALATE">ยกระดับให้ทีมนำ/องค์กรสนับสนุน</option>
                  <option value="CLOSE_MONITORING">ปิดแบบเฝ้าระวัง (เฉพาะ Residual Risk สีเขียว)</option>
                  <option value="REOPEN">เปิดความเสี่ยงกลับมาติดตามเข้มข้น</option>
                </select><label className="mt-3 block text-sm">หลักฐานว่ามาตรการทำงานจริง (จำเป็นเมื่อปิดแบบเฝ้าระวัง)<textarea rows={3} value={reviewFormData.effectiveness_evidence || ''} onChange={e => setReviewFormData({ ...reviewFormData, effectiveness_evidence: e.target.value })} placeholder="ผลการตรวจติดตาม ตัวชี้วัด ช่วงเวลาประเมิน และแหล่งหลักฐาน" className="mt-2 w-full rounded-lg border p-3" /></label>
                <p className="mt-1 text-[11px] text-cyan-700">แม้ไม่มี Incident ใหม่ ระบบยังคงนัดทบทวนตามรอบได้ การปิดแบบเฝ้าระวังสามารถเปิดกลับมาใหม่เมื่อเกิดเหตุซ้ำหรือระดับเพิ่มขึ้น</p>
              </div>

              {/* UPDATED MEASURE INPUT (มาตรการที่ได้เปลี่ยนแปลง) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ✨ มาตรการที่ได้เปลี่ยนแปลง / ปรับปรุงเพิ่มเติม (Updated Prevention Measures) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="ระบุมาตรการใหม่ ระบบใหม่ นวัตกรรม หรือข้อปฏิบัติที่ปรับปรุงจากการทบทวน..."
                  value={reviewFormData.updated_prevention}
                  onChange={e => setReviewFormData({ ...reviewFormData, updated_prevention: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ทำการทบทวน / กรรมการ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นพ.สุกาญจน์, พญ.รัตนา"
                    value={reviewFormData.reviewed_by}
                    onChange={e => setReviewFormData({ ...reviewFormData, reviewed_by: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewFormData.is_escalated === 1}
                      onChange={e => setReviewFormData({ ...reviewFormData, is_escalated: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-indigo-900">ยกระดับสู่ทีมนำ (PCT / บอร์ด)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { if (!savingRef.current) setIsReviewModalOpen(false); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
                >
                  {saving ? 'กำลังบันทึก…' : 'บันทึกผลการทบทวน'}
                </button>
              </div>

              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETAIL & INCIDENT CASE DRILL-DOWN */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedRiskItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm px-2.5 py-1 rounded bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 font-bold">
                  {selectedRiskItem.risk_code}
                </span>
                <div>
                  <h3 className="font-bold text-lg text-white">{selectedRiskItem.risk_title}</h3>
                  <span className="text-xs text-slate-300">
                    {selectedRiskItem.scope_level === 'hospital' ? '🏥 ความเสี่ยงระดับโรงพยาบาล' : `🏢 ${selectedRiskItem.department_name}`} | แหล่งที่มา: {selectedRiskItem.source || 'มาตรฐานสำคัญ 9 ด้าน'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Score summary banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">คะแนนความเสี่ยงเริ่มต้น (Initial)</span>
                  <div className="mt-1 flex items-center gap-2">
                    {getRiskBadge(selectedRiskItem.initial_risk_level, selectedRiskItem.initial_risk_score)}
                    <span className="text-xs text-slate-500 font-mono">L{selectedRiskItem.initial_likelihood} × C{selectedRiskItem.initial_consequence}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">สถานะการทบทวน</span>
                  <div className="mt-1 text-xs font-semibold text-slate-800">
                    {selectedRiskItem.reviews?.length > 0 ? `ทบทวนแล้ว ${selectedRiskItem.reviews.length} รอบ` : 'ยังไม่มีการทบทวน'}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">วันนัดทบทวนรอบถัดไป</span>
                  <div className="mt-1 text-xs font-bold text-indigo-600">
                    {selectedRiskItem.next_review_date ? new Date(selectedRiskItem.next_review_date).toLocaleDateString('th-TH') : '-'}
                  </div>
                </div>
              </div>

              {/* 4 Pillars of Treatment Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">มาตรการควบคุม 4 ด้าน (4 Pillars of Control)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <span className="text-xs font-bold text-blue-900 block">1. มาตรการป้องกัน (Risk Prevention)</span>
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-800">📌 มาตรการเดิม:</span>
                      <p className="whitespace-pre-line leading-relaxed mt-0.5">
                        {selectedRiskItem.risk_prevention || 'ไม่มีข้อมูล'}
                      </p>
                    </div>

                    {/* Latest Updated Prevention from review */}
                    {selectedRiskItem.latest_review?.updated_prevention && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                        <div className="flex items-center gap-1 font-bold text-emerald-800 mb-0.5">
                          <span>✨ มาตรการที่ได้เปลี่ยนแปลงล่าสุด:</span>
                          <span className="text-[10px] font-normal text-emerald-700">
                            (รอบที่ {selectedRiskItem.latest_review.review_cycle_no} - {new Date(selectedRiskItem.latest_review.review_date).toLocaleDateString('th-TH')})
                          </span>
                        </div>
                        <p className="font-medium whitespace-pre-line leading-relaxed">
                          {selectedRiskItem.latest_review.updated_prevention}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                    <span className="text-xs font-bold text-purple-900 block mb-1">2. การถ่ายโอนความเสี่ยง (Risk Transfer)</span>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedRiskItem.risk_transfer || 'ไม่มีข้อมูล'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                    <span className="text-xs font-bold text-amber-900 block mb-1">3. การติดตามเฝ้าระวัง (Risk Monitor)</span>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedRiskItem.risk_monitor || 'ไม่มีข้อมูล'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                    <span className="text-xs font-bold text-rose-900 block mb-1">4. การบรรเทาความเสียหาย (Risk Mitigation)</span>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedRiskItem.risk_mitigation || 'ไม่มีข้อมูล'}
                    </p>
                  </div>
                </div>
              </div>

              {/* QI Plan */}
              {selectedRiskItem.qi_plan && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-xs font-bold text-rose-900 block mb-1">โครงการ / แผนพัฒนาคุณภาพ (QI Plan / Innovation)</span>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{selectedRiskItem.qi_plan}</p>
                </div>
              )}

              {/* Periodic Reviews Timeline */}
              {selectedRiskItem.reviews && selectedRiskItem.reviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ประวัติการทบทวนตามรอบ (Periodic Review Logs)</h4>
                  <div className="space-y-3">
                    {selectedRiskItem.reviews.map((rev: any) => (
                      <div key={rev.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            รอบที่ {rev.review_cycle_no} (วันที่ {new Date(rev.review_date).toLocaleDateString('th-TH')})
                          </span>
                          {getRiskBadge(rev.current_risk_level, rev.current_risk_score)}
                        </div>
                        <p className="text-xs text-slate-700">{rev.result_of_review}</p>
                        {rev.updated_prevention && (
                          <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                            <strong>มาตรการปรับปรุง:</strong> {rev.updated_prevention}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                          <span>ผู้ทบทวน: <strong>{rev.reviewed_by || '-'}</strong></span>
                          <span>เคสที่เกิดในรอบ: <strong>{rev.incident_count_in_period || 0} ครั้ง</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RCA and CAPA linked to this Risk Register item */}
              {((selectedRiskItem.standard_rca_cases?.length || 0) > 0 || (selectedRiskItem.capas?.length || 0) > 0) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">งานทบทวนและมาตรการที่เชื่อมโยง</h4>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900">RCA ({selectedRiskItem.standard_rca_cases?.length || 0})</span>
                      </div>
                      {selectedRiskItem.standard_rca_cases?.length ? (
                        <div className="space-y-2">
                          {selectedRiskItem.standard_rca_cases.map((rca: any) => (
                            <div key={rca.id} className="rounded-lg border border-indigo-100 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-900">{rca.topic || `Standard RCA #${rca.id}`}</p>
                                  <p className="mt-1 text-[11px] text-slate-500">สถานะ: {rca.status === 'COMPLETED' ? 'ทบทวนเสร็จแล้ว' : 'กำลังทบทวน'}</p>
                                </div>
                                <Link to={`/rca/standard/${rca.id}`} className="shrink-0 rounded-lg bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-200">เปิด RCA</Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-500">ยังไม่มี RCA ที่เชื่อมโยง</p>}
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">CAPA ({selectedRiskItem.capas?.length || 0})</span>
                        {!!selectedRiskItem.capas?.length && <Link to="/capa" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900">เปิดศูนย์ติดตาม CAPA</Link>}
                      </div>
                      {selectedRiskItem.capas?.length ? (
                        <div className="space-y-2">
                          {selectedRiskItem.capas.map((capa: any) => (
                            <div key={capa.id} className="rounded-lg border border-emerald-100 bg-white p-3">
                              <p className="text-xs font-semibold text-slate-900">{capa.action}</p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                <span>ดำเนินการ: {capa.status || '-'}</span>
                                <span>ประสิทธิผล: {capa.effectiveness_status || 'รอประเมิน'}</span>
                                {capa.due_date && <span>กำหนด: {new Date(capa.due_date).toLocaleDateString('th-TH')}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-500">ยังไม่มี CAPA ที่เชื่อมโยง</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Real Incidents */}
              {selectedRiskItem.linked_incidents && selectedRiskItem.linked_incidents.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    อุบัติการณ์ที่เกิดขึ้นจริงเชื่อมโยง ({selectedRiskItem.linked_incidents.length} เคส)
                  </h4>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {selectedRiskItem.linked_incidents.map((inc: any) => (
                      <div key={inc.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            เคส #{inc.id} - {inc.detail || 'ไม่มีรายละเอียด'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            วันที่เกิดเหตุ: {new Date(inc.date_report).toLocaleDateString('th-TH')} | ความรุนแรง: <strong className="text-red-600">{inc.level_id}</strong>
                          </div>
                        </div>
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100"
                        >
                          เปิดดูเคส
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATRIX DRILL-DOWN MODAL */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  รายละเอียดช่องคะแนน: ความรุนแรงระดับ {selectedCell.y} × โอกาสเกิดระดับ {selectedCell.x} (Score: {selectedCell.y * selectedCell.x})
                </h3>
                <p className="text-xs text-slate-400">พบอุบัติการณ์ทั้งหมด {selectedCell.count} ครั้ง · แสดงตัวอย่าง {selectedCell.items.length} รายการ (สูงสุด 5)</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {selectedCell.items.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">ไม่มีอุบัติการณ์ในระดับคะแนนนี้</div>
              ) : (
                selectedCell.items.map((item: any) => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">#{item.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{item.status_risk}</span>
                        {item.date_report && <span className="text-xs text-slate-500">{new Date(item.date_report).toLocaleDateString('th-TH')}</span>}
                      </div>
                      <p className="text-xs text-slate-700 mt-1 font-medium line-clamp-1">{item.detail}</p>
                    </div>
                    <Link to={`/incidents/${item.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-3 py-1.5 rounded-lg bg-indigo-50">
                      เปิดดู
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
