import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  ArrowLeft, AlertTriangle, CheckCircle2, 
  FileSearch, 
  MessageSquare, Check, X, ShieldAlert,
  Calendar, Sparkles, RefreshCw, History, Target,
  ChevronDown, ChevronUp, Share2, Users, Send,
  Printer, Edit3, Layers, ShieldCheck, ArrowRight, RotateCcw, Building2, Clock
} from 'lucide-react';
import { getStatusInfo, getSeverityBadge, isSentinelEvent } from '../utils/statusAdapter';
import { useAuth } from '../contexts/AuthContext';
import { MiniRcaModal } from './rca/MiniRcaModal';

export default function IncidentDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Linked RCA State (Standard & Mini)
  const [linkedRca, setLinkedRca] = useState<{ standardCases: any[]; miniConciseCases: any[] } | null>(null);
  const [isMiniRcaModalOpen, setIsMiniRcaModalOpen] = useState(false);

  // Action / Review State
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [reviewNote, setReviewNote] = useState('');
  const [causeProblem, setCauseProblem] = useState('');
  const [reviewResultId, setReviewResultId] = useState(1);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Forward / Co-Review State
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetType, setForwardTargetType] = useState<'team' | 'department'>('department');
  const [forwardTeamId, setForwardTeamId] = useState('1');
  const [forwardDeptId, setForwardDeptId] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [submittingForward, setSubmittingForward] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [programsList, setProgramsList] = useState<any[]>([]); // loaded from DB
  
  // Edit Incident Modal States
  const [risksList, setRisksList] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({
    department_id: '',
    program_id: '',
    riskstore_id: '',
    date_report: '',
    time_report: '',
    user_ir_type: '',
    affected: [] as string[],
    problem_basic: '',
    detail: '',
    edit: '',
    detail_hosxp: '',
    level_id: '',
  });

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmDeptId, setConfirmDeptId] = useState('');
  const [confirmSendToDeptId, setConfirmSendToDeptId] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  const handleDirectConfirm = async () => {
    if (!incident) return;
    if (!window.confirm('คุณต้องการยืนยันความเสี่ยงนี้ใช่หรือไม่?')) return;
    
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/incidents/${incident.id}/status`,
        {
          status_risk: 'ตรวจสอบ',
          note: 'หัวหน้างานยืนยันความเสี่ยงเรียบร้อยแล้ว',
          department_id: incident.department_id ? String(incident.department_id) : '',
          sendto_department_id: incident.sendto_department_id ? String(incident.sendto_department_id) : '',
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setSaveSuccessMsg('✅ ยืนยันความเสี่ยงเรียบร้อยแล้ว!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการดำเนินการ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDirectReturn = async () => {
    if (!incident) return;
    const note = window.prompt('กรุณาระบุเหตุผลหรือข้อความที่ต้องการส่งกลับแก้ไข:');
    if (note === null) return;

    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/incidents/${incident.id}/status`,
        {
          status_risk: 'แก้ไข',
          note: note.trim() || 'ส่งกลับให้ผู้รายงานแก้ไขข้อมูล',
          department_id: incident.department_id ? String(incident.department_id) : '',
          sendto_department_id: incident.sendto_department_id ? String(incident.sendto_department_id) : '',
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setSaveSuccessMsg('🟠 ส่งกลับให้ผู้รายงานแก้ไขเรียบร้อยแล้ว!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการดำเนินการ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleConfirmSubmit = async (targetStatus: 'ตรวจสอบ' | 'แก้ไข') => {
    if (!incident) return;
    setSubmittingConfirm(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/incidents/${incident.id}/status`,
        {
          status_risk: targetStatus,
          note: confirmNote.trim() || (targetStatus === 'ตรวจสอบ' ? 'หัวหน้างานยืนยันความเสี่ยงเรียบร้อยแล้ว' : 'ส่งกลับให้ผู้รายงานแก้ไขข้อมูล'),
          department_id: confirmDeptId,
          sendto_department_id: confirmSendToDeptId,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsConfirmModalOpen(false);
      setSaveSuccessMsg(targetStatus === 'ตรวจสอบ' ? '✅ ยืนยันความเสี่ยงและปรับปรุงข้อมูลเรียบร้อยแล้ว!' : '🟠 ส่งกลับให้ผู้รายงานแก้ไขเรียบร้อยแล้ว!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการดำเนินการ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingConfirm(false);
    }
  };


  const isAdminOrRm = user?.role === 'admin' || user?.accessrules === '1' || user?.accessrules === 'admin' || user?.rmStatus === '1' || user?.role === 'rm_committee';
  const isHeadOfGroup = user?.priority === '1' || user?.role === 'head' || user?.accessrules === 'head';
  
  // Extract query parameters to verify if accessed from my-reported page
  const searchParams = new URLSearchParams(window.location.search);
  const fromSource = searchParams.get('from');
  const isClosed = incident?.status_risk === 'จำหน่าย' || incident?.status_risk === 'ไม่ใช่ความเสี่ยง';
  
  // Edit permission logic:
  // - Closed/Cancelled cases (!isClosed=false) cannot be edited by anyone
  // - Management (Admin, RM, Head) can edit active incidents
  // - Regular Creator/Owner can ONLY edit when status is 'รายงาน' (รอยืนยัน) or 'แก้ไข' (ส่งกลับแก้ไข)
  // - Once confirmed ('ตรวจสอบ' / 'ทบทวน'), regular creator/owner CANNOT edit
  const isCreator = user?.id && (String(user.id) === String(incident?.created_by) || String(user.id) === String(incident?.user_create));
  const isPendingOrReturned = incident?.status_risk === 'รายงาน' || incident?.status_risk === 'แก้ไข';
  
  const canEditIncident = !isClosed && (
    (isAdminOrRm || isHeadOfGroup) || 
    (isPendingOrReturned && (isCreator || fromSource === 'my-reported'))
  );

  // Full RCA Mode State (Fishbone 4M1E / 2P Safety)
  const [isFullRcaOpen, setIsFullRcaOpen] = useState(false);
  const [rcaMan, setRcaMan] = useState('');
  const [rcaMethod, setRcaMethod] = useState('');
  const [rcaMachine, setRcaMachine] = useState('');
  const [rcaEnvironment, setRcaEnvironment] = useState('');
  const [rcaManagement, setRcaManagement] = useState('');
  const [rcaSafetyGoal, setRcaSafetyGoal] = useState('');
  const [rcaActionPlan, setRcaActionPlan] = useState('');

  const fetchDetail = () => {
    if (!id) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    axios.get(`/incidents/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        setIncident(res.data);
        if (res.data?.sendto_team_id) setForwardTeamId(res.data.sendto_team_id.toString());
        if (res.data?.sendto_department_id) setForwardDeptId(res.data.sendto_department_id);
        if (res.data?.note) setForwardNote(res.data.note);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('ไม่พบข้อมูลอุบัติการณ์ความเสี่ยงนี้');
        setLoading(false);
      });

    // Fetch linked RCA cases for this incident
    axios.get(`/rca/by-incident/${id}`)
      .then(res => {
        if (res.data) setLinkedRca(res.data);
      })
      .catch(err => console.log('No linked RCA found:', err));
  };

  useEffect(() => {
    fetchDetail();
    // Fetch master data for dropdowns
    const token = localStorage.getItem('token');
    axios.get('/incidents/form-data', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.data.departments) setDepartmentsList(res.data.departments);
        if (res.data.programs && res.data.programs.length > 0) {
          setProgramsList(res.data.programs);
        }
        if (res.data.risks && res.data.risks.length > 0) {
          setRisksList(res.data.risks);
        }
      })
      .catch(console.error);
  }, [id]);

  const handleOpenEditModal = () => {
    if (!incident) return;
    setEditFormData({
      department_id: incident.department_id ? String(incident.department_id) : '',
      program_id: incident.program_id ? String(incident.program_id) : '',
      riskstore_id: incident.riskstore_id ? String(incident.riskstore_id) : '',
      date_report: incident.date_report ? incident.date_report.split('T')[0] : '',
      time_report: incident.time_report ? (() => {
        try {
          const d = new Date(incident.time_report);
          const hours = String(d.getUTCHours()).padStart(2, '0');
          const minutes = String(d.getUTCMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        } catch {
          return '00:00';
        }
      })() : '00:00',
      user_ir_type: incident.user_ir_type || 'ตนเอง',
      affected: incident.affected ? incident.affected.split(',').map((s: string) => s.trim()) : [],
      problem_basic: incident.problem_basic || 'เกิดขณะให้บริการ',
      detail: incident.detail || '',
      edit: incident.edit || '',
      detail_hosxp: incident.detail_hosxp || '',
      level_id: incident.level_id || 'A',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.level_id) {
      alert('กรุณาระบุระดับความรุนแรงของอุบัติการณ์');
      return;
    }
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      const selectedRisk = risksList.find(r => String(r.id) === String(editFormData.riskstore_id));
      
      const payload = {
        date_report: editFormData.date_report,
        time_report: `${editFormData.date_report}T${editFormData.time_report || '00:00'}:00.000Z`,
        user_ir_type: editFormData.user_ir_type,
        department_id: String(editFormData.department_id),
        program_id: editFormData.program_id ? Number(editFormData.program_id) : null,
        riskstore_id: editFormData.riskstore_id ? Number(editFormData.riskstore_id) : 1,
        ...(selectedRisk ? { riskstore_text: selectedRisk.riskstore_full || `${selectedRisk.clear_id} ${selectedRisk.risk_name}` } : {}),
        level_id: editFormData.level_id,
        detail: editFormData.detail,
        detail_hosxp: editFormData.detail_hosxp,
        affected: Array.isArray(editFormData.affected) ? editFormData.affected.join(',') : editFormData.affected,
        edit: editFormData.edit,
        problem_basic: editFormData.problem_basic,
        modify_date: new Date(),
      };

      await axios.patch(`/incidents/${incident.id}`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert('✅ แก้ไขข้อมูลอุบัติการณ์เรียบร้อยแล้ว!');
      setIsEditModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleStatusChange = async (newStatus: string, note?: string) => {
    if (!incident) return;
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/incidents/${incident.id}/status`,
        { status_risk: newStatus, note: note || `เปลี่ยนสถานะเป็น ${newStatus}` },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickNoNewMeasure = () => {
    setReviewResultId(1);
    setReviewNote('ทบทวนร่วมกับทีมงานแล้ว: ยังคงปฏิบัติตามแนวทาง/มาตรการมาตรฐานเดิมต่อไปอย่างเคร่งครัด เนื่องจากมาตรการเดิมยังครอบคลุมและมีประสิทธิภาพ');
  };

  const handleQuickNewMeasure = () => {
    setReviewResultId(2);
    if (reviewNote.includes('คงปฏิบัติตามแนวทาง')) {
      setReviewNote('');
    }
  };

  const handleToggleFullRca = () => {
    const nextState = !isFullRcaOpen;
    setIsFullRcaOpen(nextState);
    if (nextState) {
      setReviewResultId(3); // เลือก 3. ได้รับการทำ RCA อัตโนมัติ
      if (reviewNote.includes('คงปฏิบัติตามแนวทาง')) {
        setReviewNote('');
      }
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !reviewNote.trim()) {
      alert('กรุณาระบุรายละเอียดการทบทวน หรือมาตรการแก้ไข');
      return;
    }
    setSubmittingAction(true);

    // Aggregate RCA causes if filled
    let finalCause = causeProblem.trim();
    if (isFullRcaOpen) {
      const rcaParts: string[] = [];
      if (rcaMan.trim()) rcaParts.push(`[ด้านบุคคล] ${rcaMan.trim()}`);
      if (rcaMethod.trim()) rcaParts.push(`[ด้านวิธีปฏิบัติ] ${rcaMethod.trim()}`);
      if (rcaMachine.trim()) rcaParts.push(`[ด้านเครื่องมือ] ${rcaMachine.trim()}`);
      if (rcaEnvironment.trim()) rcaParts.push(`[ด้านสิ่งแวดล้อม] ${rcaEnvironment.trim()}`);
      if (rcaManagement.trim()) rcaParts.push(`[ด้านการบริหาร] ${rcaManagement.trim()}`);
      if (rcaSafetyGoal) rcaParts.push(`[2P Safety] ${rcaSafetyGoal}`);
      
      if (rcaParts.length > 0) {
        finalCause = rcaParts.join(' | ');
      }
    }

    let finalNote = reviewNote.trim();
    if (isFullRcaOpen && rcaActionPlan.trim()) {
      finalNote += `\n[แผนป้องกันเชิงระบบ]: ${rcaActionPlan.trim()}`;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/incidents/${incident.id}/review`,
        {
          review_date: reviewDate,
          notereview: finalNote,
          cause_problem: finalCause,
          reviewresults_id: reviewResultId,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setReviewNote('');
      setCauseProblem('');
      setRcaMan('');
      setRcaMethod('');
      setRcaMachine('');
      setRcaEnvironment('');
      setRcaManagement('');
      setRcaSafetyGoal('');
      setRcaActionPlan('');
      setIsFullRcaOpen(false);
      setSaveSuccessMsg('บันทึกผลการทบทวนเรียบร้อยแล้ว!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกการทบทวน: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setSubmittingForward(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        refer_type: forwardTargetType === 'team' ? '2' : '1',
        sendto_team_id: forwardTargetType === 'team' ? Number(forwardTeamId) : null,
        sendto_department_id: forwardTargetType === 'department' ? forwardDeptId : null,
        note: forwardNote.trim(),
      };
      await axios.post(
        `/incidents/${incident.id}/forward`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsForwardModalOpen(false);
      setSaveSuccessMsg('📤 ส่งต่อเรื่องให้ทีมนำ/หน่วยงานร่วมทบทวนเรียบร้อยแล้ว!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการส่งต่อ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingForward(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500">กำลังโหลดรายละเอียดอุบัติการณ์...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-800 rounded-2xl text-center border border-slate-200 dark:border-slate-700 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">เกิดข้อผิดพลาด</h2>
        <p className="text-slate-500 mt-1 mb-6">{error || 'ไม่พบข้อมูล'}</p>
        <Link to="/incidents" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm">
          กลับสู่หน้ารายการ
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(incident.status_risk);
  const severity = getSeverityBadge(incident.level_id, incident.riskstore_id);
  const isSentinel = isSentinelEvent(incident.level_id, incident.riskstore_id);

  const dtEvent = incident.date_report ? format(new Date(incident.date_report), 'dd/MM/yyyy') : '-';
  const dtRegister = incident.register_date ? format(new Date(incident.register_date), 'dd/MM/yyyy HH:mm') : '-';

  const steps = [
    { key: 'รายงาน', label: '1. บันทึกรายงาน' },
    { key: 'ตรวจสอบ', label: '2. ยืนยันความเสี่ยง' },
    { key: 'ทบทวน', label: '3. ดำเนินการ / RCA' },
    { key: 'จำหน่าย', label: '4. ปิดเคสเสร็จสิ้น' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Official A4 Print CSS Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
            font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif !important;
          }
          .no-print, header, aside, nav, button, a[href="#review-workstation"], .no-print-area {
            display: none !important;
          }
          .print-only {
            display: flex !important;
          }
          .print-footer-signatures {
            display: block !important;
          }
          .dark {
            color-scheme: light !important;
          }
        }
      `}</style>

      {/* Official Hospital Print Header for A4 */}
      <div className="hidden print-only print-header flex-row items-center justify-between pb-3 mb-4 border-b-2 border-slate-900 text-black">
        <div className="flex items-center gap-3.5">
          <img src="/logo.png" alt="Hospital Logo" className="w-16 h-16 object-contain shrink-0" />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">โรงพยาบาลวังเจ้า (WANGCHAO HOSPITAL)</h1>
            <h2 className="text-sm font-bold text-slate-800">แบบบันทึกรายงานอุบัติการณ์และความเสี่ยงทางคลินิก/ทั่วไป (INCIDENT REPORT)</h2>
            <p className="text-xs text-slate-600 font-medium">กลุ่มงานบริหารจัดการความเสี่ยงและพัฒนาระบบคุณภาพ (RM & Quality Assurance System)</p>
          </div>
        </div>
        <div className="text-right text-xs space-y-1 shrink-0">
          <div className="font-mono font-bold text-sm border border-slate-900 px-2.5 py-1 rounded bg-slate-100 text-slate-900">
            เลขที่เอกสาร: #{incident?.id}
          </div>
          <div>รหัส IR: <strong>{incident?.id_risk}</strong></div>
          <div>วันที่พิมพ์: {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>

      {/* Top Navigation Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link 
          to="/incidents" 
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium border border-slate-200 dark:border-slate-700 shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับสู่รายการความเสี่ยง
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {canEditIncident && (
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-900/70 dark:text-amber-300 font-bold text-xs sm:text-sm border border-amber-200 dark:border-amber-800 shadow-xs transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              แก้ไขรายละเอียด
            </button>
          )}

          {/* Print Summary Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Returned for Edit High-Alert Banner */}
      {incident.status_risk === 'แก้ไข' && (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-l-4 border-orange-500 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-500 text-white rounded-lg shadow-sm mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-orange-950 dark:text-orange-200 text-sm">
                🟠 อุบัติการณ์ถูกส่งกลับมาให้แก้ไขรายละเอียด
              </h3>
              <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5">
                หัวหน้างาน/ผู้รับผิดชอบได้ส่งรายงานฉบับนี้กลับมาให้แก้ไขเพิ่มเติม ท่านสามารถกดปุ่ม "แก้ไขรายละเอียด" เพื่ออัปเดตข้อมูลได้ทันที
              </p>
            </div>
          </div>
          {canEditIncident && (
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs whitespace-nowrap shadow-sm flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center"
            >
              <Edit3 className="w-4 h-4" />
              แก้ไขรายละเอียดรายงาน
            </button>
          )}
        </div>
      )}

      {/* Sentinel High-Alert Banner */}
      {isSentinel && (
        <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-l-4 border-red-600 p-4 rounded-xl flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-300 text-sm">
                ⚠️ อุบัติการณ์ความรุนแรงสูง (Sentinel Event - ระดับ {severity.label})
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                มาตรฐาน HA กำหนดให้ต้องทำการวิเคราะห์สาเหตุเชิงลึก (RCA: Root Cause Analysis) ภายใน 24-48 ชั่วโมง
              </p>
            </div>
          </div>
          <Link
            to={`/rca/standard/new?incident_id=${incident.id}&topic=${encodeURIComponent(incident.risk_topic_name || incident.detail || '')}&rm_no=${encodeURIComponent(incident.id_risk || '')}&severity=${encodeURIComponent(incident.severity_level_code || '')}`}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs whitespace-nowrap shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            ทำ Standard RCA ทันที
          </Link>
        </div>
      )}

      {/* Case Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug max-w-3xl">
                {incident.risk_topic_name || `อุบัติการณ์ #${incident.id}`}
              </h1>
              {/* Big Prominent Status Badge */}
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm sm:text-base font-bold border-2 shadow-sm ${statusInfo.badgeClass}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotClass}`}></span>
                <span>{statusInfo.label}</span>
              </span>
              {/* Severity Badge */}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm ${severity.badgeClass}`}>
                ความรุนแรงระดับ {severity.label}
              </span>

              {/* Automatic Level Warning Badge */}
              {incident.level_warning && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500/15 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/30 shadow-xs" title={incident.level_warning.warning_name}>
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  {incident.level_warning.warning_code}: {incident.level_warning.warning_name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md font-mono font-semibold text-slate-600 dark:text-slate-300 text-xs">
                #{incident.id}
              </span>
              <span>IR: <span className="font-semibold">{incident.id_risk}</span></span>
              <span>•</span>
              <span>บันทึกเมื่อ {dtRegister}</span>
            </p>

          </div>

          {/* Jump to Review Workstation */}
          <div className="flex flex-wrap items-center gap-2.5">
            {incident.status_risk !== 'จำหน่าย' && (
              <a
                href="#review-workstation"
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                ไปที่ส่วนทบทวน & RCA ↓
              </a>
            )}
          </div>
        </div>

        {/* 4-Step Lifecycle Tracker */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {steps.map((s, idx) => {
              const isCurrent = incident.status_risk === s.key;
              const isPast = statusInfo.stepIndex > idx + 1;
              return (
                <div 
                  key={s.key} 
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-blue-50/80 border-blue-400 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 font-bold shadow-sm'
                      : isPast
                        ? 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400'
                        : 'bg-transparent border-dashed border-slate-200 text-slate-400 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="text-xs">{s.label}</div>
                  {isCurrent && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">● สถานะปัจจุบัน</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Case Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Incident Description */}
          <div className="space-y-4">
            {/* Primary Responsible Reviewing Department Card */}

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายละเอียดเหตุการณ์ที่เกิดขึ้น</label>
              <div className="mt-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {incident.detail || incident.problem_basic || 'ไม่มีรายละเอียด'}
              </div>
            </div>

            {/* Attached Images Gallery */}
            {incident.image && incident.image.split(',').filter(Boolean).length > 0 && (
              <div className="mt-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-semibold text-slate-500">รูปภาพประกอบ ({incident.image.split(',').filter(Boolean).length} รูป)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                  {incident.image.split(',').filter(Boolean).map((imgName: string, idx: number) => {
                    const imgUrl = imgName.startsWith('http') || imgName.startsWith('/') 
                      ? imgName 
                      : `/uploads/${imgName}`;

                    if (failedImages[imgName]) {
                      return (
                        <div key={idx} className="aspect-video sm:aspect-square rounded-xl border border-dashed border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex flex-col items-center justify-center text-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-[11px] font-bold">ไม่พบไฟล์รูปบนเซิร์ฟเวอร์</span>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[130px]" title={imgName}>{imgName}</span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={idx} 
                        className="relative group aspect-video sm:aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => setSelectedLightboxImage(imgUrl)}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`attached-img-${idx}`} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('/riskimage/')) {
                              target.src = `/riskimage/${imgName}`;
                            } else {
                              setFailedImages(prev => ({ ...prev, [imgName]: true }));
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold px-2.5 py-1.5 bg-black/60 rounded-full backdrop-blur-sm shadow-sm scale-90 group-hover:scale-100 transition-transform duration-200">
                            คลิกเพื่อขยาย
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {incident.detail_hosxp && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ข้อมูลผู้ป่วย / รายละเอียดทางการแพทย์ (HOSxP)</label>
                <div className="mt-1.5 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-900 dark:text-blue-200 text-sm">
                  {incident.detail_hosxp}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">การแก้ไขปัญหาเบื้องต้น ณ ที่เกิดเหตุ</label>
              <div className="mt-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm">
                {incident.edit || 'ยังไม่ได้ระบุ'}
              </div>

              {/* Action Buttons right under Immediate Problem Solving */}
              <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {(incident.status_risk === 'รายงาน' || incident.status_risk === 'แก้ไข') && (
                  <>
                    <button
                      onClick={handleDirectConfirm}
                      disabled={submittingAction}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      ยืนยันความเสี่ยง
                    </button>
                    <button
                      onClick={handleDirectReturn}
                      disabled={submittingAction}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      ส่งกลับแก้ไข
                    </button>
                  </>
                )}

                {incident.status_risk !== 'จำหน่าย' && (
                  <>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setForwardTargetType('department');
                        setIsForwardModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl font-semibold text-sm shadow-xs transition-all cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ส่งต่อหน่วยงานอื่นร่วมทบทวน
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metadata & Attributes */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">ข้อมูลจำเพาะของอุบัติการณ์</h3>
              {canEditIncident && (
                <button
                  onClick={handleOpenEditModal}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" /> แก้ไขรายละเอียด
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">ชื่อความเสี่ยง :</span>
              <span className="font-semibold text-slate-750 dark:text-slate-200 text-right max-w-[65%] truncate" title={incident.risk_topic_name || `อุบัติการณ์ #${incident.id}`}>
                {incident.risk_topic_name || `อุบัติการณ์ #${incident.id}`}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">หน่วยงานผู้ค้นพบ/บันทึกรายงาน :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{incident.department_name}</span>
            </div>

            {incident.location_name && (
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400">สถานที่เกิดเหตุเฉพาะจุด :</span>
                <span className="font-semibold text-primary dark:text-primary-light">📍 {incident.location_name}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">โปรแกรมความเสี่ยง :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{incident.program_name}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">วันที่เกิดเหตุ :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{dtEvent}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">ลักษณะการรายงาน :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{incident.user_ir_type}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">ผู้ได้รับผลกระทบ :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{incident.affected || 'ไม่ระบุ'}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-2">
              <span className="text-slate-400">ที่มาของรายงาน :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{incident.problem_basic || 'ระบบรายงานทั่วไป'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collaborative Co-Review / Forward Status Banner */}
      {(incident.sendto_team_name || incident.sendto_department_name) && (
        <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border-l-4 border-purple-600 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm mt-0.5 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-purple-950 dark:text-purple-200 text-sm">
                  📤 ส่งต่อให้ {incident.sendto_team_name ? `ทีมนำ: ${incident.sendto_team_name}` : `หน่วยงาน: ${incident.sendto_department_name}`} ร่วมทบทวน
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-200 font-bold border border-purple-300 dark:border-purple-800">
                  Co-Review Mode
                </span>
              </div>

              {incident.note && (
                <div className="text-xs text-purple-900 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 p-2.5 rounded-lg border border-purple-200/80 dark:border-purple-800/60 mt-1.5">
                  <span className="font-bold">📝 ประเด็นขอคำปรึกษา/ร่วมทบทวน:</span> {incident.note}
                </div>
              )}

              {/* Level Warning Rule Box */}
              {incident.level_warning && (
                <div className="text-xs text-amber-900 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-300/60 dark:border-amber-800/60 mt-1.5 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>⏱️ กำหนดเวลาทบทวนตามระดับความรุนแรง ({incident.level_warning.warning_code}):</strong> {incident.level_warning.warning_name}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-purple-700 dark:text-purple-400">
                ส่งเรื่องเมื่อ {incident.send_date ? format(new Date(incident.send_date), 'dd/MM/yyyy HH:mm') : '-'} โดย {incident.send_use || 'ผู้ประสานงานความเสี่ยง'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsForwardModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-300 dark:border-purple-700 shadow-xs transition-all shrink-0 cursor-pointer self-start sm:self-center"
          >
            🔄 ส่งต่อ/เปลี่ยนทีม
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INLINE REVIEW & RCA WORKSTATION (รวมในหน้าเดียว ไม่ต้องเปิด Popup Modal) */}
      {/* ========================================================================= */}
      <div id="review-workstation" className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border-2 border-indigo-500/40 dark:border-indigo-500/50 shadow-md space-y-6">
        {/* Header with Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-xl shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>บันทึกการทบทวน & จัดการมาตรการ</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Review & RCA Station
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ทบทวนอุบัติการณ์ วิเคราะห์สาเหตุเชิงระบบ ปรับปรุงมาตรการ และบันทึกผลได้โดยตรงที่นี่
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              📅 วันที่ทบทวน:
            </span>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 1. ส่วนแสดงมาตรการเดิมอย่างชัดเจน (Current / Baseline Measure) */}
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
              <span className="p-1 rounded-md bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-300">📌</span>
              <span>เดิมทำอย่างไร / มาตรการเดิมที่มีอยู่ (Current & Baseline Measure):</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium">
              ข้อมูลอ้างอิงเดิม
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900/70 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                🔹 การแก้ไขปัญหาเบื้องต้น ณ ที่เกิดเหตุ (เมื่อรายงาน):
              </span>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                {incident.edit || 'ไม่มีการบันทึกมาตรการเบื้องต้นไว้'}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900/70 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                🔹 มาตรการจากการทบทวนรอบล่าสุด (ถ้ามี):
              </span>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                {incident.reviews && incident.reviews.length > 0
                  ? incident.reviews[0].notereview
                  : 'ยังไม่เคยมีการบันทึกการทบทวนรอบก่อนหน้า'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Quick Action Mode Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            ⚡ เลือกรูปแบบผลการทบทวน (Quick Action Mode):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ปุ่ม 1: ทบทวนแล้วไม่มีมาตรการใหม่ */}
            <button
              type="button"
              onClick={handleQuickNoNewMeasure}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                reviewResultId === 1 && reviewNote.includes('คงปฏิบัติตาม')
                  ? 'bg-blue-50/90 border-blue-500 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-blue-300'
              }`}
            >
              <div className="p-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  1. ทบทวนแล้วไม่มีมาตรการใหม่
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  คงปฏิบัติตามแนวทาง/มาตรฐานเดิม
                </div>
              </div>
            </button>

            {/* ปุ่ม 2: เพิ่ม/ปรับปรุงมาตรการใหม่ */}
            <button
              type="button"
              onClick={handleQuickNewMeasure}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                reviewResultId !== 1
                  ? 'bg-emerald-50/90 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              }`}
            >
              <div className="p-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-lg shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  2. มีมาตรการใหม่ / ปรับปรุงระบบ
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  กำหนดแนวทางป้องกันหรือระบบใหม่
                </div>
              </div>
            </button>

            {/* ปุ่ม 3: ทำ RCA เต็มรูปแบบ */}
            <button
              type="button"
              onClick={handleToggleFullRca}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                isFullRcaOpen || reviewResultId === 3 || (linkedRca && ((linkedRca.standardCases?.length || 0) > 0 || (linkedRca.miniConciseCases?.length || 0) > 0))
                  ? 'bg-purple-50/90 border-purple-500 dark:bg-purple-950/40 dark:border-purple-500 shadow-sm ring-2 ring-purple-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-purple-300'
              }`}
            >
              <div className="p-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-lg shrink-0 mt-0.5">
                <Target className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>3. ได้รับการทำ RCA (ศูนย์จัดการ RCA รพ.วังเจ้า)</span>
                  {isFullRcaOpen ? <ChevronUp className="w-3.5 h-3.5 text-purple-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium mt-0.5">
                  {isFullRcaOpen
                    ? 'กำลังเปิดเครื่องมือ RCA (เลือกหัวข้อได้รับการทำ RCA อัตโนมัติ)'
                    : (linkedRca?.standardCases?.length || 0) + (linkedRca?.miniConciseCases?.length || 0) > 0
                    ? `✅ พบเอกสาร RCA ที่เชื่อมโยงแล้ว (${(linkedRca?.standardCases?.length || 0) + (linkedRca?.miniConciseCases?.length || 0)} ฉบับ) - คลิกเพื่อจัดการ`
                    : 'คลิกเพื่อเปิดเครื่องมือวิเคราะห์ 4M1E & เชื่อมโยง Standard/Mini RCA'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. ส่วนขยาย RCA เต็มรูปแบบ (Full Root Cause Analysis Deep-dive & Integration) */}
        {isFullRcaOpen && (
          <div className="p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-200/80 dark:border-purple-800 gap-2">
              <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200 text-sm">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>เครื่องมือวิเคราะห์สาเหตุรากเหง้าเชิงระบบ (Root Cause Analysis Hub)</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/rca"
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
                >
                  <FileSearch className="w-3 h-3" />
                  หน้ารวม RCA ทั้งหมด
                </Link>
                <span className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-md font-semibold">
                  Wang Chao RCA Level 1/2/3
                </span>
              </div>
            </div>

            {/* A. การเชื่อมโยงกับ Standard / Mini RCA ที่มีอยู่แล้ว */}
            {linkedRca && (linkedRca.standardCases?.length > 0 || linkedRca.miniConciseCases?.length > 0) && (
              <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-purple-200 dark:border-purple-800/80 shadow-xs">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>เอกสาร RCA ที่เชื่อมโยงกับอุบัติการณ์นี้ในฐานข้อมูล:</span>
                </div>
                <div className="space-y-2 pt-1">
                  {linkedRca.standardCases?.map((stdCase: any) => (
                    <div key={stdCase.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-600 text-white uppercase tracking-wider">
                            Standard Full RCA
                          </span>
                          <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                            {stdCase.id}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${stdCase.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {stdCase.status === 'completed' ? '✓ เสร็จสมบูรณ์' : 'กำลังดำเนินการ'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          หัวข้อ: {stdCase.topic} | 5-Whys: {stdCase.whys?.length || 0} ลำดับ | ก้างปลา 6M: {stdCase.fishbones?.length || 0} ปัจจัย | แผน CAPA: {stdCase.capas?.length || 0} แผน
                        </p>
                      </div>
                      <Link
                        to={`/rca/standard/${stdCase.id}`}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        เปิดดู / แก้ไข RCA ฉบับเต็ม
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}

                  {linkedRca.miniConciseCases?.map((mCase: any) => (
                    <div key={mCase.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-indigo-600 text-white uppercase tracking-wider">
                            {mCase.rca_type === 'concise' ? 'Concise RCA' : 'Mini RCA'}
                          </span>
                          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                            {mCase.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          หัวข้อ: {mCase.topic} | Swiss Cheese: {mCase.swiss_cheeses?.length || 0} จุดบกพร่อง | CMP Action: {mCase.cmps?.length || 0} มาตรการ
                        </p>
                      </div>
                      <Link
                        to="/rca"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        เปิดดูใน RCA Hub
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. Action Buttons เพื่อเปิดทำ Standard RCA หรือ Mini RCA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to={`/rca/standard/new?incident_id=${incident.id}&topic=${encodeURIComponent(incident.risk_topic_name || incident.detail || '')}&rm_no=${encodeURIComponent(incident.id_risk || '')}&severity=${encodeURIComponent(incident.severity_level_code || '')}`}
                className="p-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-sm flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">1. เปิดทำ Standard Full RCA ฉบับสมบูรณ์</div>
                    <div className="text-[11px] text-rose-100">กระบวนการ HA 5 ขั้นตอน (Why-Why, 6M, CAPA, สรุปประชุม)</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <button
                type="button"
                onClick={() => setIsMiniRcaModalOpen(true)}
                className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">2. ทำ Mini RCA ประจำหน่วยงาน (ในหน้านี้)</div>
                    <div className="text-[11px] text-indigo-100">วิเคราะห์ Swiss Cheese Model & CMP Action Plan ทันที</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* C. วิเคราะห์ 4M1E เบื้องต้นเพื่อบันทึกร่วมกับผลการทบทวน */}
            <div className="pt-2 border-t border-purple-200/80 dark:border-purple-800">
              <div className="text-xs font-bold text-purple-950 dark:text-purple-200 mb-3 flex items-center gap-1.5">
                <span>📋 หรือบันทึกสาเหตุรากเหง้า 4M1E & มาตรการป้องกันในบันทึกการทบทวนของหน้านี้:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Man */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>👤 ด้านบุคคล / ทักษะการปฏิบัติงาน (Man / Staff):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ขาดทักษะเฉพาะ, ความเหนื่อยล้า, การสื่อสารคลาดเคลื่อน..."
                    value={rcaMan}
                    onChange={(e) => setRcaMan(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                  />
                </div>

                {/* 2. Method */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>📋 ด้านระบบ / ขั้นตอนปฏิบัติ / WI / CPG (Method):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ขาดคู่มือแนวทางชัดเจน, ไม่ได้ทำ Double Check, ขั้นตอนส่งต่อข้อมูล..."
                    value={rcaMethod}
                    onChange={(e) => setRcaMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                  />
                </div>

                {/* 3. Machine & Environment */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>⚙️ ด้านเครื่องมือ / อุปกรณ์ / สิ่งแวดล้อม (Machine & Environment):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เครื่องมือชำรุด, แสงสว่างไม่เพียงพอ, สัญญาณเตือน Alarm ไม่ดัง..."
                    value={rcaMachine}
                    onChange={(e) => setRcaMachine(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                  />
                </div>

                {/* 4. Management & Communication */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>🏢 ด้านการบริหาร / การประสานงาน (Management / Communication):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น การจัดอัตรากำลัง, การควบคุมกำกับ, การประสานงานระหว่างหน่วยงาน..."
                    value={rcaManagement}
                    onChange={(e) => setRcaManagement(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                  />
                </div>
              </div>

              {/* Safety Goal & Preventive System */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    🎯 เป้าหมายความปลอดภัย 2P Safety Goals ที่เชื่อมโยง:
                  </label>
                  <select
                    value={rcaSafetyGoal}
                    onChange={(e) => setRcaSafetyGoal(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                  >
                    <option value="">-- เลือกเป้าหมาย 2P Safety Goal (ถ้ามี) --</option>
                    <option value="Safe Surgery (การผ่าตัดปลอดภัย)">Safe Surgery (การผ่าตัดปลอดภัย)</option>
                    <option value="Infection Prevention (การควบคุมการติดเชื้อ)">Infection Prevention (การควบคุมการติดเชื้อ)</option>
                    <option value="Medication & Blood Safety (ความปลอดภัยด้านยาและเลือด)">Medication & Blood Safety (ความปลอดภัยด้านยาและเลือด)</option>
                    <option value="Patient Care Process (กระบวนการดูแลผู้ป่วย/ส่งต่อ)">Patient Care Process (กระบวนการดูแลผู้ป่วย/ส่งต่อ)</option>
                    <option value="Line, Tube & Catheter (สายสวนและท่อช่วยหายใจ)">Line, Tube & Catheter (สายสวนและท่อช่วยหายใจ)</option>
                    <option value="Emergency Response (การตอบสนองภาวะฉุกเฉิน)">Emergency Response (การตอบสนองภาวะฉุกเฉิน)</option>
                    <option value="Personnel Safety (ความปลอดภัยของบุคลากร)">Personnel Safety (ความปลอดภัยของบุคลากร)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    🛡️ แผนป้องกันเชิงระบบ (Systemic Defense / Redundancy):
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ปรับแก้ระบบบันทึกอิเล็กทรอนิกส์, จัดทำ Check-list บังคับ..."
                    value={rcaActionPlan}
                    onChange={(e) => setRcaActionPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ฟอร์มบันทึกข้อมูลหลัก (Main Review Inputs) */}
        <form onSubmit={handleAddReview} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                🏷️ ผลการทบทวน (Review Result Category) *
              </label>
              <select
                value={reviewResultId}
                onChange={(e) => setReviewResultId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={1}>1. ทบทวนแล้ว ยังไม่เกิดมาตรการใหม่ (คงเดิม)</option>
                <option value={2}>2. มีการปฏิบัติตามมาตรการ หรือ ระบบใหม่</option>
                <option value={3}>3. RCA แล้วยังเกิดซ้ำแต่ ระดับความรุนแรงลดลง</option>
                <option value={4}>4. มีนวัตกรรม หรือ ระบบใหม่ที่เกิดจาก RCA</option>
                <option value={5}>5. ไกล่เกลี่ยสำเร็จ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                🔍 สาเหตุรากเหง้าที่พบโดยสรุป (Root Cause)
              </label>
              <input
                type="text"
                value={causeProblem}
                onChange={(e) => setCauseProblem(e.target.value)}
                placeholder="เช่น การส่งต่อข้อมูลไม่ครบถ้วน, ขาดการ Double Check"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
              />
            </div>
          </div>

          {/* ช่องเพิ่มมาตรการใหม่ / รายละเอียดการทบทวน */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ✨ รายละเอียดการทบทวน / มาตรการที่ได้เปลี่ยนแปลง (Updated Measures / Action Taken) *
            </label>
            <textarea
              required
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="ระบุข้อเท็จจริงจากการทบทวน, มาตรการใหม่ที่ได้ปรับเปลี่ยน, แนวทางปฏิบัติ หรือการคงมาตรการเดิม..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Action Command Center */}
          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
              {/* Left Action: Not Risk / Dismiss */}
              <div className="flex justify-start order-2 sm:order-1">
                {incident.status_risk !== 'ไม่ใช่ความเสี่ยง' && (user?.role === 'admin' || user?.accessrules === '1') && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('ไม่ใช่ความเสี่ยง', 'ปฏิเสธ/ไม่ใช่ความเสี่ยง')}
                    disabled={submittingAction}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:bg-slate-700 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-xs transition-all cursor-pointer shadow-xs"
                    title="ปฏิเสธเหตุการณ์นี้เนื่องจากไม่ใช่ความเสี่ยงทางคลินิกหรือทั่วไป"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    ไม่ใช่ความเสี่ยง (ปฏิเสธ)
                  </button>
                )}
              </div>

              {/* CENTER ACTION: Save Review & Measures (Primary Highlighted Hero Button) */}
              <div className="flex justify-center order-1 sm:order-2">
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                  {submittingAction ? 'กำลังบันทึกข้อมูล...' : 'บันทึกผลการทบทวน & มาตรการ'}
                </button>
              </div>

              {/* Right Action: Discharge / Close Case */}
              <div className="flex justify-end order-3">
                {incident.status_risk !== 'จำหน่าย' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('จำหน่าย', 'กรรมการความเสี่ยงตรวจสอบและปิดเคส')}
                    disabled={submittingAction}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer"
                    title="ปิดเคสความเสี่ยงนี้เมื่อทบทวนและกำหนดมาตรการเสร็จสิ้นแล้ว"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ปิดเคส (จำหน่าย)
                  </button>
                )}
              </div>
            </div>

            {/* Audit Notice Helper */}
            <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-1">
              💡 ผลการทบทวนและมาตรการจะถูกบันทึกเป็นประวัติรอบใหม่ (Audit Log) และแสดงในไทม์ไลน์ด้านล่างทันที
            </div>
          </div>
        </form>
      </div>

      {/* Review & Audit History Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">ประวัติการทบทวน & การเปลี่ยนแปลงมาตรการ (Audit & Review Timeline)</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ติดตามประวัติการวิเคราะห์สาเหตุ RCA และการเปรียบเทียบ <strong>มาตรการเดิม</strong> กับ <strong>มาตรการที่ได้เปลี่ยนแปลง</strong> ในแต่ละรอบ
            </p>
          </div>
        </div>

        {incident.reviews && incident.reviews.length > 0 ? (
          <div className="space-y-4 pt-1">
            {incident.reviews.map((rev: any, idx: number) => {
              const dtReview = rev.review_date ? format(new Date(rev.review_date), 'dd/MM/yyyy HH:mm') : '-';
              // Previous measure is either the review before this or the baseline
              const prevRev = incident.reviews[idx + 1];
              const priorMeasure = prevRev ? prevRev.notereview : (incident.edit || incident.problem_basic || 'มาตรการเบื้องต้นเดิม');

              return (
                <div 
                  key={rev.id || idx} 
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold">
                        #{rev.riskvisit || `REV-${idx + 1}`}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white text-sm">
                        {rev.reviewresults_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>วันที่อัพเดต/ทบทวน:</strong> {dtReview}</span>
                    </div>
                  </div>

                  {/* Comparative Measures Grid: Before vs After */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* มาตรการเดิม */}
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                        <span>📌 มาตรการเดิมก่อนหน้านี้:</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        {priorMeasure}
                      </p>
                    </div>

                    {/* มาตรการที่ได้เปลี่ยนแปลง */}
                    <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✨ มาตรการที่ได้เปลี่ยนแปลง / ระบบใหม่:</span>
                      </div>
                      <p className="text-emerald-900 dark:text-emerald-200 font-medium whitespace-pre-wrap">
                        {rev.notereview}
                      </p>
                    </div>
                  </div>

                  {/* Root Cause & Actions */}
                  {rev.cause_problem && (
                    <div className="text-xs bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">🔍 สาเหตุรากเหง้า (Root Cause):</span>
                      <span>{rev.cause_problem}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            ยังไม่มีบันทึกการทบทวนหรือการปรับเปลี่ยนมาตรการสำหรับอุบัติการณ์นี้
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FORWARD / CO-REVIEW MODAL (ส่งต่อให้ทีมนำ / แผนกอื่นร่วมทบทวน) */}
      {/* ========================================================================= */}
      {isForwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 rounded-2xl">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    ส่งต่อร่วมทบทวน (Co-Review)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ส่งต่อให้ทีมนำหรือหน่วยงานร่วมวิเคราะห์และให้ข้อเสนอแนะ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsForwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleForwardSubmit} className="space-y-4">
              {/* Type Switcher Removed */}
              {/* Destination Dropdown */}
              
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    🏢 เลือกหน่วยงานปลายทาง:
                  </label>
                  <select
                    value={forwardDeptId}
                    onChange={(e) => setForwardDeptId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="">-- กรุณาเลือกหน่วยงาน --</option>
                    {departmentsList.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.depart_name}
                      </option>
                    ))}
                  </select>
                </div>
              

              {/* Consultation Memo Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  📝 ประเด็นขอคำปรึกษา / เหตุผลที่ส่งต่อร่วมทบทวน:
                </label>
                <textarea
                  rows={3}
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  placeholder="เช่น ขอคำแนะนำแนวทางการจัดเก็บขยะติดเชื้อ / ปัญหาระบบระบายอากาศ หรือขอให้ทีมนำร่วมกำหนดมาตรการเชิงระบบ..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Helper Notice */}
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/50 rounded-xl text-[11px] text-purple-900 dark:text-purple-200 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>ระบบการทบทวนร่วมกัน (Collaborative Co-Review):</span>
                </div>
                <p className="text-purple-700 dark:text-purple-300 leading-relaxed">
                  หน่วยงานต้นสังกัดยังสามารถทบทวนเบื้องต้นได้ตามปกติ และทีมนำที่ได้รับเรื่องจะสามารถเปิดดูและบันทึกข้อเสนอแนะในหน้าเดียวกันนี้ได้ทันที
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsForwardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingForward}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingForward ? 'กำลังบันทึก...' : 'ยืนยันการส่งต่อร่วมทบทวน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: EDIT INCIDENT DETAILS (สำหรับหัวหน้างาน & Riskmanager) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-750 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-300 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base text-white">แก้ไขรายละเอียดอุบัติการณ์ความเสี่ยง</h3>
                  <p className="text-[10px] text-indigo-200">แก้ไขข้อมูลเฉพาะเจาะจงของอุบัติการณ์ความเสี่ยงนี้</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Report */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">📅 วันที่เกิดเหตุ:</label>
                  <input
                    type="date"
                    required
                    value={editFormData.date_report}
                    onChange={e => setEditFormData({ ...editFormData, date_report: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Time Report */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">⏰ เวลาเกิดเหตุ:</label>
                  <input
                    type="time"
                    required
                    value={editFormData.time_report}
                    onChange={e => setEditFormData({ ...editFormData, time_report: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🏢 หน่วยงานที่เกิดเหตุ:</label>
                  <select
                    required
                    value={editFormData.department_id}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      const userDeptId = user?.department_id ? String(user.department_id) : (incident ? String(incident.department_id) : '');
                      const autoIrType = (newDeptId && newDeptId !== userDeptId) ? 'ผู้อื่น' : 'ตนเอง';
                      setEditFormData({
                        ...editFormData,
                        department_id: newDeptId,
                        user_ir_type: autoIrType
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- เลือกหน่วยงาน --</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.depart_name}</option>
                    ))}
                  </select>
                </div>

                {/* Program */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🎯 โปรแกรมความเสี่ยง:</label>
                  <select
                    required
                    value={editFormData.program_id}
                    onChange={e => setEditFormData({ ...editFormData, program_id: e.target.value, riskstore_id: '' })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- เลือกโปรแกรม --</option>
                    {programsList.map(p => (
                      <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Risk Store ID / Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🔍 หัวข้อความเสี่ยง (ชื่อความเสี่ยง):</label>
                <select
                  required
                  value={editFormData.riskstore_id}
                  onChange={e => setEditFormData({ ...editFormData, riskstore_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- เลือกหัวข้อความเสี่ยง --</option>
                  {risksList
                    .filter(r => !editFormData.program_id || String(r.program_id) === String(editFormData.program_id))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.clear_id ? `[${r.clear_id}] ` : ''}{r.risk_name || r.riskstore_full}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Severity Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">⚠️ ระดับความรุนแรง:</label>
                  <select
                    required
                    value={editFormData.level_id}
                    onChange={e => setEditFormData({ ...editFormData, level_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- เลือกระดับความรุนแรง --</option>
                    <optgroup label="Clinical (ทางคลินิก)">
                      <option value="A">ระดับ A (ยังไม่ถึงตัวผู้ป่วย)</option>
                      <option value="B">ระดับ B (ถึงตัวผู้ป่วย ไม่เกิดอันตราย)</option>
                      <option value="C">ระดับ C (เกิดอันตรายเล็กน้อย)</option>
                      <option value="D">ระดับ D (ต้องเฝ้าระวังติดตาม)</option>
                      <option value="E">ระดับ E (อันตรายชั่วคราว ต้องรักษา)</option>
                      <option value="F">ระดับ F (ต้องนอน รพ. นานขึ้น)</option>
                      <option value="G">ระดับ G (อันตรายถาวร/พิการ)</option>
                      <option value="H">ระดับ H (ต้องช่วยฟื้นคืนชีพ)</option>
                      <option value="I">ระดับ I (เสียชีวิต)</option>
                    </optgroup>
                    <optgroup label="General (ทั่วไป)">
                      <option value="1">ระดับ 1 (รุนแรงน้อยมาก)</option>
                      <option value="2">ระดับ 2 (รุนแรงน้อย)</option>
                      <option value="3">ระดับ 3 (รุนแรงปานกลาง)</option>
                      <option value="4">ระดับ 4 (ค่อนข้างรุนแรง)</option>
                      <option value="5">ระดับ 5 (รุนแรงที่สุด)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Reporting Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">👤 ลักษณะการรายงาน:</label>
                  <select
                    required
                    value={editFormData.user_ir_type}
                    onChange={e => {
                      const newType = e.target.value;
                      const userDeptId = user?.department_id ? String(user.department_id) : (incident ? String(incident.department_id) : '');
                      setEditFormData({
                        ...editFormData,
                        user_ir_type: newType,
                        department_id: newType === 'ตนเอง' ? userDeptId : editFormData.department_id
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                  >
                    <option value="ตนเอง">ตนเอง (รายงานตนเอง)</option>
                    <option value="ผู้อื่น">ผู้อื่น (รายงานผู้อื่น)</option>
                  </select>
                  {editFormData.user_ir_type === 'ผู้อื่น' && (
                    <div className="mt-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-semibold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                      <span>ผูกข้อมูลอัตโนมัติถึงหน่วยงาน: {departmentsList.find(d => String(d.id) === String(editFormData.department_id))?.depart_name || 'ตามหน่วยงานที่เลือกด้านบน'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Source & Affected */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Incident Source */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ที่มาของรายงาน:</label>
                  <input
                    type="text"
                    value={editFormData.problem_basic}
                    onChange={e => setEditFormData({ ...editFormData, problem_basic: e.target.value })}
                    placeholder="เช่น การเดินตรวจ, ข้อร้องเรียน, ค้นพบเอง"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Affected */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ผู้ได้รับผลกระทบ:</label>
                  <input
                    type="text"
                    value={Array.isArray(editFormData.affected) ? editFormData.affected.join(', ') : editFormData.affected}
                    onChange={e => setEditFormData({ ...editFormData, affected: e.target.value })}
                    placeholder="เช่น ผู้ป่วย, เจ้าหน้าที่, ญาติ"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Patient Info / HN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🏥 ข้อมูลผู้ป่วย / HN (ถ้ามี):</label>
                <input
                  type="text"
                  value={editFormData.detail_hosxp}
                  onChange={e => setEditFormData({ ...editFormData, detail_hosxp: e.target.value })}
                  placeholder="ระบุ HN, AN หรือข้อมูลผู้ป่วยเพื่อการติดตามเชิงระบบ"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Incident Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">📝 รายละเอียดเหตุการณ์ที่เกิดขึ้น:</label>
                <textarea
                  rows={4}
                  required
                  value={editFormData.detail}
                  onChange={e => setEditFormData({ ...editFormData, detail: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Edit (Baseline Intervention) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🛡️ การแก้ไขปัญหาเบื้องต้น ณ ที่เกิดเหตุ:</label>
                <textarea
                  rows={2}
                  value={editFormData.edit}
                  onChange={e => setEditFormData({ ...editFormData, edit: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-750">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {submittingAction ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Confirmation & Department Assignment Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">ยืนยันความเสี่ยง & ตรวจสอบหน่วยงาน</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ตรวจสอบหน่วยงานรับผิดชอบและส่งเรื่องเข้าสู่กระบวนการทบทวน</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Target Incident Title */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-400 block font-medium">เรื่องที่ต้องการยืนยัน:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                  #{incident.id} - {incident.risk_topic_name || incident.detail}
                </span>
              </div>

              {/* Responsible Department */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  🏢 หน่วยงานรับผิดชอบหลัก (`department_id`):
                </label>
                <select
                  value={confirmDeptId}
                  onChange={e => setConfirmDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- เลือกหน่วยงานรับผิดชอบ --</option>
                  {departmentsList.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.depart_name || d.name} (ID: {d.id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  * หากผู้รายงานระบุหน่วยงานผิด สามารถปรับเลือกหน่วยงานที่ถูกต้องในจุดนี้ได้
                </p>
              </div>

              {/* Target / Forwarded Department */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  📤 ส่งต่อให้หน่วยงานปลายทางร่วมทบทวน/แก้ไข (`sendto_department_id`):
                </label>
                <select
                  value={confirmSendToDeptId}
                  onChange={e => setConfirmSendToDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">-- ไม่ระบุ (รับผิดชอบเฉพาะหน่วยงานหลัก) --</option>
                  {departmentsList.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.depart_name || d.name} (ID: {d.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Confirmation Note / Reason */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  📝 ข้อความยืนยัน / หมายเหตุข้อสั่งการเพิ่มเติม:
                </label>
                <textarea
                  rows={2}
                  value={confirmNote}
                  onChange={e => setConfirmNote(e.target.value)}
                  placeholder="ระบุข้อสังเกต คำแนะนำ หรือเหตุผลกรณีส่งกลับให้ผู้รายงานแก้ไข..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-750">
              <button
                type="button"
                onClick={() => handleConfirmSubmit('แก้ไข')}
                disabled={submittingConfirm}
                className="w-full sm:w-auto px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:hover:bg-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                ส่งกลับให้แก้ไข (สถานะ: แก้ไข)
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSubmit('ตรวจสอบ')}
                  disabled={submittingConfirm}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {submittingConfirm ? 'กำลังยืนยัน...' : 'ยืนยันความเสี่ยง (สถานะ: ตรวจสอบ)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini RCA Modal for Department */}
      {incident && (
        <MiniRcaModal
          isOpen={isMiniRcaModalOpen}
          onClose={() => setIsMiniRcaModalOpen(false)}
          incident={{
            id: incident.id,
            id_risk: incident.id_risk,
            topic: incident.risk_topic_name || incident.detail,
            risk_name: incident.risk_topic_name || incident.detail,
            level_id: incident.severity_level_code,
            department_id: incident.department_id ? String(incident.department_id) : undefined,
            detail: incident.detail,
            date_risk: incident.date_report,
          }}
          onSuccess={() => {
            fetchDetail();
          }}
        />
      )}

      {/* Image Lightbox Modal */}
      {selectedLightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedLightboxImage(null)}
        >
          <button 
            type="button"
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white hover:text-slate-200 p-2 rounded-full transition-colors backdrop-blur-sm"
            onClick={() => setSelectedLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedLightboxImage} 
              alt="enlarged-incident-pic" 
              className="max-w-full max-h-[85vh] object-contain mx-auto" 
            />
          </div>
        </div>
      )}

      {/* Official Signatures Block for A4 Print */}
      <div className="hidden print-only print-footer-signatures mt-8 pt-4 border-t-2 border-slate-900 text-xs text-black page-break-inside-avoid">
        <h3 className="font-bold mb-6 text-sm text-slate-900">ส่วนที่ 4: การลงนามรับรองและการติดตามผลการบริหารความเสี่ยง (Official Signatures)</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="space-y-6">
            <p className="font-bold">ลงชื่อ....................................................</p>
            <p className="font-medium">({user?.name || '....................................................'})<br/><span className="text-[11px] text-slate-700">ผู้รายงาน / ผู้รับแจ้งเหตุ</span></p>
            <p>วันที่ .......... / .......... / ..........</p>
          </div>
          <div className="space-y-6">
            <p className="font-bold">ลงชื่อ....................................................</p>
            <p className="font-medium">(....................................................)<br/><span className="text-[11px] text-slate-700">หัวหน้างาน / ผู้รับผิดชอบหน่วยงาน</span></p>
            <p>วันที่ .......... / .......... / ..........</p>
          </div>
          <div className="space-y-6">
            <p className="font-bold">ลงชื่อ....................................................</p>
            <p className="font-medium">(....................................................)<br/><span className="text-[11px] text-slate-700">ประธานคณะกรรมการบริหารความเสี่ยง (RM)</span></p>
            <p>วันที่ .......... / .......... / ..........</p>
          </div>
        </div>
      </div>
    </div>
  );
}
