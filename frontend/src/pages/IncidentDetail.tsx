import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { 
  ArrowLeft, AlertTriangle, CheckCircle2, 
  MessageSquare, Check, X, ShieldAlert,
  Calendar, Sparkles, RefreshCw, History, Target,
  Share2, Users, Send,
  Printer, Edit3, ShieldCheck, Building2, Clock, Paperclip, Download
} from 'lucide-react';
import { getStatusInfo, getSeverityBadge } from '../utils/statusAdapter';
import { StandardRiskSelector } from '../components/StandardRiskSelector';
import { getNrlsRiskKind } from '../utils/nrlsClassification';
import { ContributingFactorSelector } from '../components/rca/ContributingFactorSelector';
import { OfficialPrintFooter, OfficialPrintHeader } from '../components/OfficialPrintLayout';
import { printOfficialReport } from '../utils/officialPrint';
import IncidentImprovementFeedback from '../components/IncidentImprovementFeedback';
import {
  getContributingFactor,
  normalizeContributingFactorSelections,
  type ContributingFactorSelection,
} from '../utils/contributingFactors';

type DepartmentOutcome = 'IN_PROGRESS' | 'RESOLVED' | 'UNRESOLVED';
type ForwardingPurpose = 'NONE' | 'INFORM' | 'CO_REVIEW' | 'ADDITIONAL_ACTION' | 'TRANSFER_OWNER';
type ReviewResultOption = { id: number; reviewresults_name: string };
type ReviewAttachment = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type ReviewSummary = {
  reviewId: number;
  structuredReviewId: number;
  note: string;
  cause: string;
  contributingFactors: ContributingFactorSelection[];
  departmentOutcome: DepartmentOutcome | null;
  outcomeSaved: boolean;
  forwardingPurpose: ForwardingPurpose;
  forwardingDepartmentName?: string;
  reviewResultName: string;
  requiresRca: boolean;
};

const MAX_REVIEW_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const REVIEW_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function parseReviewAttachments(value: unknown): ReviewAttachment[] {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item) => item?.filename && item?.originalname) : [];
  } catch {
    return [];
  }
}

const DEPARTMENT_OUTCOME_LABELS: Record<DepartmentOutcome, string> = {
  IN_PROGRESS: 'อยู่ระหว่างการดำเนินการแก้ปัญหาระดับหน่วยงาน',
  RESOLVED: 'สิ้นสุดการแก้ปัญหาระดับหน่วยงาน โดยยุติปัญหาได้',
  UNRESOLVED: 'สิ้นสุดการแก้ปัญหาระดับหน่วยงาน แต่ไม่สามารถยุติปัญหาได้',
};

const FORWARDING_PURPOSE_LABELS: Record<ForwardingPurpose, string> = {
  NONE: 'ไม่ส่งต่อ',
  INFORM: 'ส่งเพื่อรับทราบ / แลกเปลี่ยนเรียนรู้',
  CO_REVIEW: 'ขอร่วมทบทวน',
  ADDITIONAL_ACTION: 'ขอให้ดำเนินการเพิ่มเติม',
  TRANSFER_OWNER: 'โอนผู้รับผิดชอบหลัก',
};

function parseRcaEvaluationSnapshot(value: unknown): any | null {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

export default function IncidentDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  // Linked RCA State (Standard & Mini)
  const [linkedRca, setLinkedRca] = useState<{ standardCases: any[]; miniConciseCases: any[] } | null>(null);
  // Action / Review State
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewResultId, setReviewResultId] = useState('');
  const [reviewResultsList, setReviewResultsList] = useState<ReviewResultOption[]>([]);
  const [causeProblem, setCauseProblem] = useState('');
  const [reviewContributingFactors, setReviewContributingFactors] = useState<ContributingFactorSelection[]>([]);
  const [forwardingPurpose, setForwardingPurpose] = useState<ForwardingPurpose>('NONE');
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [openingReviewFile, setOpeningReviewFile] = useState('');
  const reviewFileInputRef = React.useRef<HTMLInputElement>(null);
  const [coReviewDepartmentId, setCoReviewDepartmentId] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveSuccessLink, setSaveSuccessLink] = useState<{ to: string; label: string } | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [savingReviewOutcome, setSavingReviewOutcome] = useState(false);
  const [sendingSummaryToRca, setSendingSummaryToRca] = useState(false);

  // Forward / Co-Review State
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetType, setForwardTargetType] = useState<'team' | 'department'>('department');
  const [forwardTeamId, setForwardTeamId] = useState('');
  const [forwardDeptId, setForwardDeptId] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [submittingForward, setSubmittingForward] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [programsList, setProgramsList] = useState<any[]>([]); // loaded from DB
  
  // Edit Incident Modal States
  const [risksList, setRisksList] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({
    department_id: '',
    program_id: '',
    riskstore_id: '',
    nrls_code: '',
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
  const [confirmNrlsCode, setConfirmNrlsCode] = useState('');
  const [confirmRiskstoreId, setConfirmRiskstoreId] = useState<number | null>(null);
  const [confirmLevelId, setConfirmLevelId] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [isReturningForEdit, setIsReturningForEdit] = useState(false);
  const [submittingConfirm, setSubmittingConfirm] = useState(false);
  const [finalStatusAction, setFinalStatusAction] = useState<'จำหน่าย' | 'ไม่ใช่ความเสี่ยง' | null>(null);
  const [finalStatusReason, setFinalStatusReason] = useState('');
  const [finalStatusError, setFinalStatusError] = useState('');

  const confirmRiskKind = getNrlsRiskKind(confirmNrlsCode);
  const confirmLevels = confirmRiskKind === 'clinical'
    ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    : confirmRiskKind === 'general' ? ['1', '2', '3', '4', '5'] : [];
  const confirmLevelIsValid = confirmLevels.includes(confirmLevelId);

  const handleConfirmSubmit = async (targetStatus: 'ตรวจสอบ' | 'แก้ไข') => {
    if (!incident) return;
    if (targetStatus === 'ตรวจสอบ' && (!confirmNrlsCode || !confirmLevelIsValid)) {
      alert('กรุณาตรวจสอบและเลือกมาตรฐานความเสี่ยง NRLS พร้อมระดับความรุนแรงก่อนยืนยัน');
      return;
    }
    if (targetStatus === 'แก้ไข' && confirmNote.trim().length < 10) {
      alert('กรุณาระบุข้อมูลที่ต้องแก้ไขและคำแนะนำอย่างน้อย 10 ตัวอักษร');
      return;
    }
    setSubmittingConfirm(true);
    try {
      const token = localStorage.getItem('token');
      if (targetStatus === 'ตรวจสอบ') {
        const classificationChanged =
          String(confirmNrlsCode) !== String(incident.nrls_code || '')
          || Number(confirmRiskstoreId || 0) !== Number(incident.riskstore_id || 0)
          || String(confirmLevelId) !== String(incident.level_id || '');

        if (classificationChanged) {
          await axios.patch(`/incidents/${incident.id}`, {
            nrls_code: confirmNrlsCode,
            riskstore_id: confirmRiskstoreId,
            level_id: confirmLevelId,
            classification_reason: confirmNote.trim() || 'ผู้ยืนยันตรวจสอบและปรับประเภทความเสี่ยงก่อนยืนยัน',
          }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        }
        await axios.patch(`/incidents/${incident.id}/classification`,
          { reason: confirmNote.trim() || 'ยืนยันการจัดประเภท NRLS' },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      }
      await axios.patch(
        `/incidents/${incident.id}/status`,
        {
          status_risk: targetStatus,
          note: confirmNote.trim() || (targetStatus === 'ตรวจสอบ' ? 'หัวหน้างานยืนยันความเสี่ยงเรียบร้อยแล้ว' : 'ส่งกลับให้ผู้รายงานแก้ไขข้อมูล'),
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


  // The backend is the single source of truth for record-level permissions.
  // Query strings and client-side role guesses must never grant additional access.
  const permissions = incident?.permissions || {};
  const canEditIncident = Boolean(permissions.canEdit);


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
        setError(err.response?.status === 403
          ? 'คุณไม่มีสิทธิ์ดูอุบัติการณ์ความเสี่ยงนี้'
          : 'ไม่พบข้อมูลอุบัติการณ์ความเสี่ยงนี้');
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
        if (res.data.teams) {
          setTeamsList(res.data.teams);
          setForwardTeamId((current) => current || (res.data.teams[0]?.id ? String(res.data.teams[0].id) : ''));
        }
        if (res.data.programs && res.data.programs.length > 0) {
          setProgramsList(res.data.programs);
        }
        if (res.data.risks && res.data.risks.length > 0) {
          setRisksList(res.data.risks);
        }
        if (Array.isArray(res.data.reviewresults)) {
          setReviewResultsList(res.data.reviewresults);
        }
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    const imageNames = String(incident?.image || '').split(',').map((name) => name.trim()).filter(Boolean);
    if (!incident?.id || imageNames.length === 0) {
      setAttachmentUrls({});
      return;
    }

    let cancelled = false;
    const createdUrls: string[] = [];
    setAttachmentUrls({});
    setFailedImages({});
    const token = localStorage.getItem('token');

    Promise.allSettled(imageNames.map(async (storedName) => {
      const filename = storedName.replace(/\\/g, '/').split('/').pop()?.split('?')[0] || '';
      if (!filename) throw new Error('Invalid attachment filename');
      const response = await axios.get(
        `/incidents/${incident.id}/attachments/${encodeURIComponent(filename)}`,
        {
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const objectUrl = URL.createObjectURL(response.data);
      createdUrls.push(objectUrl);
      return [storedName, objectUrl] as const;
    })).then((results) => {
      if (cancelled) return;
      const loaded: Record<string, string> = {};
      const failures: Record<string, boolean> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') loaded[result.value[0]] = result.value[1];
        else failures[imageNames[index]] = true;
      });
      setAttachmentUrls(loaded);
      setFailedImages(failures);
    });

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [incident?.id, incident?.image]);

  const handleOpenEditModal = () => {
    if (!incident) return;
    setEditFormData({
      department_id: incident.department_id ? String(incident.department_id) : '',
      program_id: incident.program_id ? String(incident.program_id) : '',
      riskstore_id: incident.riskstore_id ? String(incident.riskstore_id) : '',
      nrls_code: incident.nrls_code || '',
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
        nrls_code: editFormData.nrls_code,
        riskstore_id: editFormData.riskstore_id ? Number(editFormData.riskstore_id) : null,
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

  const handleStatusChange = async (newStatus: string, note?: string): Promise<boolean> => {
    if (!incident) return false;
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/incidents/${incident.id}/status`,
        { status_risk: newStatus, note: note || `เปลี่ยนสถานะเป็น ${newStatus}` },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchDetail();
      return true;
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + (err.response?.data?.message || err.message));
      return false;
    } finally {
      setSubmittingAction(false);
    }
  };

  const requestFinalStatus = (status: 'จำหน่าย' | 'ไม่ใช่ความเสี่ยง') => {
    setFinalStatusAction(status);
    setFinalStatusReason('');
    setFinalStatusError('');
  };

  const submitFinalStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!finalStatusAction) return;
    const reason = finalStatusReason.trim();
    if (reason.length < 10) {
      setFinalStatusError('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร เพื่อใช้ตรวจสอบย้อนหลัง');
      return;
    }
    const succeeded = await handleStatusChange(finalStatusAction, reason);
    if (succeeded) {
      setFinalStatusAction(null);
      setFinalStatusReason('');
      setFinalStatusError('');
    }
  };

  const handleReviewFileSelection = (files: FileList | null) => {
    const selected = Array.from(files || []);
    if (selected.length > 10) {
      alert('แนบไฟล์ได้ไม่เกิน 10 ไฟล์ต่อการทบทวน');
      if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
      return;
    }
    if (selected.some((file) => !REVIEW_ATTACHMENT_TYPES.has(file.type))) {
      alert('รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF');
      if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
      return;
    }
    if (selected.reduce((sum, file) => sum + file.size, 0) > MAX_REVIEW_ATTACHMENT_BYTES) {
      alert('ขนาดไฟล์แนบรวมต้องไม่เกิน 10 MB');
      if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
      return;
    }
    setReviewFiles(selected);
  };

  const openReviewAttachment = async (reviewId: number, attachment: ReviewAttachment) => {
    if (!incident) return;
    const key = `${reviewId}:${attachment.filename}`;
    setOpeningReviewFile(key);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/incidents/${incident.id}/reviews/${reviewId}/attachments/${encodeURIComponent(attachment.filename)}`,
        { responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error: any) {
      alert('เปิดไฟล์แนบไม่สำเร็จ: ' + (error.response?.data?.message || error.message));
    } finally {
      setOpeningReviewFile('');
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !reviewNote.trim()) {
      alert('กรุณาระบุรายละเอียดการทบทวน หรือมาตรการแก้ไข');
      return;
    }
    if (!reviewResultId) {
      alert('กรุณาเลือกผลการทบทวนและการเปลี่ยนแปลงมาตรการ');
      return;
    }
    const lowSeverityReview = ['A', 'B', '1'].includes(String(incident.level_id || '').trim().toUpperCase());
    if (!lowSeverityReview && reviewContributingFactors.length === 0 && !causeProblem.trim()) {
      alert('กรุณาเลือกปัจจัยที่เกี่ยวข้อง หรือพิมพ์สาเหตุอื่น ๆ');
      return;
    }
    if (forwardingPurpose !== 'NONE' && !coReviewDepartmentId) {
      alert('กรุณาเลือกหน่วยงานปลายทาง');
      return;
    }
    setSubmittingAction(true);

    const finalCause = causeProblem.trim();
    const finalNote = reviewNote.trim();

    try {
      const token = localStorage.getItem('token');
      const selectedForwardingPurpose = forwardingPurpose;
      const selectedFactors = [...reviewContributingFactors];
      const selectedReviewResult = reviewResultsList.find((item) => String(item.id) === reviewResultId);
      const forwardingDepartmentName = departmentsList.find(
        (department: any) => String(department.id) === coReviewDepartmentId,
      )?.depart_name;
      const reviewPayload = {
        review_date: reviewDate,
        findings: finalNote,
        notereview: finalNote,
        cause_problem: finalCause,
        contributing_factors: reviewContributingFactors,
        reviewresults_id: Number(reviewResultId),
        forwarding_purpose: forwardingPurpose,
        ...(forwardingPurpose !== 'NONE'
          ? { forwarded_department_id: coReviewDepartmentId }
          : {}),
      };
      let response;
      if (reviewFiles.length) {
        const formData = new FormData();
        Object.entries(reviewPayload).forEach(([key, value]) => {
          formData.append(key, key === 'contributing_factors' ? JSON.stringify(value) : String(value));
        });
        reviewFiles.forEach((file) => formData.append('files', file));
        response = await axios.post(`/incidents/${incident.id}/review`, formData, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } else {
        response = await axios.post(`/incidents/${incident.id}/review`, reviewPayload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }
      setReviewNote('');
      setReviewResultId('');
      setCauseProblem('');
      setReviewContributingFactors([]);
      setForwardingPurpose('NONE');
      setCoReviewDepartmentId('');
      setReviewFiles([]);
      if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
      setReviewSummary({
        reviewId: Number(response.data?.id),
        structuredReviewId: Number(response.data?.structured_review?.id),
        note: finalNote,
        cause: finalCause,
        contributingFactors: selectedFactors,
        departmentOutcome: null,
        outcomeSaved: false,
        forwardingPurpose: selectedForwardingPurpose,
        forwardingDepartmentName,
        reviewResultName: selectedReviewResult?.reviewresults_name || 'ไม่ระบุผลการเปลี่ยนแปลงมาตรการ',
        requiresRca: Boolean(incident.rca_required) && incident.rca_status !== 'COMPLETED',
      });
      setSaveSuccessMsg(selectedForwardingPurpose !== 'NONE'
        ? 'บันทึกผลและส่งต่อหน่วยงานปลายทางเรียบร้อยแล้ว'
        : 'บันทึกผลการทบทวนเรียบร้อยแล้ว');
      setSaveSuccessLink(
        selectedForwardingPurpose !== 'NONE'
            ? { to: '/incidents/dept?tab=forwarded', label: 'ดูรายการส่งร่วมทบทวน' }
            : null,
      );
      setTimeout(() => {
        setSaveSuccessMsg('');
        setSaveSuccessLink(null);
      }, 8000);
      fetchDetail();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกการทบทวน: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const saveReviewOutcome = async (value: DepartmentOutcome): Promise<boolean> => {
    if (!incident || !reviewSummary) return false;
    setSavingReviewOutcome(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/incidents/${incident.id}/review/outcome`,
        {
          review_id: reviewSummary.reviewId,
          structured_review_id: reviewSummary.structuredReviewId,
          department_outcome: value,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      setReviewSummary((current) => current ? { ...current, departmentOutcome: value, outcomeSaved: true } : current);
      setIncident((current: any) => current ? { ...current, department_review_outcome: value } : current);
      return true;
    } catch (err: any) {
      alert('บันทึกผลการดำเนินการไม่สำเร็จ: ' + (err.response?.data?.message || err.message));
      return false;
    } finally {
      setSavingReviewOutcome(false);
    }
  };

  const handleSelectReviewOutcome = (value: DepartmentOutcome) => {
    setReviewSummary((current) => current
      ? { ...current, departmentOutcome: value, outcomeSaved: false }
      : current);
  };

  const handleSaveReviewOutcome = async () => {
    if (!reviewSummary?.departmentOutcome) {
      alert('กรุณาเลือกผลการดำเนินการระดับหน่วยงาน');
      return;
    }
    await saveReviewOutcome(reviewSummary.departmentOutcome);
  };

  const handleConfirmDischargeFromSummary = async () => {
    if (!reviewSummary) return;
    if (reviewSummary.departmentOutcome !== 'RESOLVED') {
      alert('กรุณาเลือก “ยุติปัญหาได้” ก่อนยืนยันการจำหน่าย');
      return;
    }
    if (!reviewSummary.outcomeSaved) {
      const outcomeSaved = await saveReviewOutcome('RESOLVED');
      if (!outcomeSaved) return;
    }
    const succeeded = await handleStatusChange(
      'จำหน่าย',
      `ยืนยันจำหน่ายหลังทบทวน: ${reviewSummary.note}`,
    );
    if (succeeded) setReviewSummary(null);
  };

  const handleSendSummaryToRca = async () => {
    if (!incident || !reviewSummary) return;
    if (!reviewSummary.departmentOutcome) {
      alert('กรุณาเลือกผลการดำเนินการระดับหน่วยงานก่อนส่งทำ RCA');
      return;
    }
    if (!reviewSummary.outcomeSaved) {
      const outcomeSaved = await saveReviewOutcome(reviewSummary.departmentOutcome);
      if (!outcomeSaved) return;
    }
    setSendingSummaryToRca(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/incidents/${incident.id}/review/send-rca`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const rcaCaseId = response.data?.rca_case_id;
      setReviewSummary(null);
      navigate(rcaCaseId ? `/rca/list?case=${encodeURIComponent(rcaCaseId)}` : '/rca/list');
    } catch (err: any) {
      alert('ส่งเรื่องเข้าศูนย์ RCA ไม่สำเร็จ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSendingSummaryToRca(false);
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
  const rcaEvaluation = parseRcaEvaluationSnapshot(incident.rca_evaluation_snapshot);
  const rcaCriteria: string[] = Array.isArray(rcaEvaluation?.criteria_matches)
    ? rcaEvaluation.criteria_matches.filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim()))
    : String(incident.rca_criteria_match || '')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);
  const rcaNeedsAction = Boolean(incident.rca_required) && incident.rca_status !== 'COMPLETED';
  const isLowSeverityReview = ['A', 'B', '1'].includes(String(incident.level_id || '').trim().toUpperCase());
  const linkedRcaCount = (linkedRca?.standardCases?.length || 0) + (linkedRca?.miniConciseCases?.length || 0);

  const dtEvent = incident.date_report ? format(new Date(incident.date_report), 'dd/MM/yyyy') : '-';
  const dtRegister = incident.register_date ? format(new Date(incident.register_date), 'dd/MM/yyyy HH:mm') : '-';

  const steps = [
    { key: 'รายงาน', label: '1. บันทึกรายงาน' },
    { key: 'ตรวจสอบ', label: '2. ยืนยันความเสี่ยง' },
    { key: 'ทบทวน', label: '3. ดำเนินการ / RCA' },
    { key: 'จำหน่าย', label: '4. ปิดเคสเสร็จสิ้น' },
  ];

  return (
    <div className="official-print-document official-print-form max-w-5xl mx-auto space-y-6 pb-16">
      <OfficialPrintHeader
        title="แบบรายงานอุบัติการณ์และความเสี่ยง"
        subtitle="Incident & Risk Management Report"
        documentCode="RM-FM-01"
        referenceNo={incident?.id ? `INC-${incident.id}` : '-'}
        metadata={[
          { label: 'Incident ID', value: incident?.id },
          { label: 'รหัส IR', value: incident?.id_risk },
          { label: 'หน่วยงาน', value: incident?.department_name },
          { label: 'สถานะ', value: getStatusInfo(incident?.status_risk).label },
        ]}
      />

      <section className="official-print-only official-print-academic-summary" aria-hidden="true">
        <h2>{incident.nrls_code && incident.nrls_name ? `${incident.nrls_code} : ${incident.nrls_name}` : `อุบัติการณ์เลขที่ ${incident.id}`}</h2>
        <dl>
          <div><dt>สถานะรายงาน</dt><dd>{statusInfo.label}</dd></div>
          <div><dt>ระดับความรุนแรง</dt><dd>{severity.label}</dd></div>
          <div><dt>วันที่เกิดเหตุ</dt><dd>{dtEvent}</dd></div>
          <div><dt>วันที่บันทึก</dt><dd>{dtRegister}</dd></div>
          <div><dt>การประเมิน RCA</dt><dd>{incident.rca_required ? `เข้าเกณฑ์ ${incident.recommended_rca_type || 'RCA'}` : 'ไม่เข้าเกณฑ์บังคับ RCA'}</dd></div>
          <div><dt>กำหนดแล้วเสร็จ RCA</dt><dd>{incident.rca_due_at ? format(new Date(incident.rca_due_at), 'dd/MM/yyyy HH:mm') : '-'}</dd></div>
        </dl>
      </section>

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
            onClick={printOfficialReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Returned for Edit High-Alert Banner */}
      {incident.status_risk === 'แก้ไข' && (
        <div className="print-alert bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-l-4 border-orange-500 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
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

      {/* RCA criteria warning */}
      {rcaNeedsAction && (
        <div className="print-alert rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-4 shadow-md dark:from-red-950/50 dark:via-orange-950/30 dark:to-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-xl bg-red-600 p-2.5 text-white shadow-sm">
              <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-red-950 dark:text-red-200">⚠️ เรื่องนี้เข้าเกณฑ์ ต้องทำ RCA ต่อ</h3>
                  <span className="rounded-full border border-red-300 bg-white px-2.5 py-0.5 text-[10px] font-black text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    {incident.recommended_rca_type === 'STANDARD' ? 'Standard RCA' : incident.recommended_rca_type === 'CONCISE' ? 'Concise RCA' : 'Mini RCA'}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-red-800 dark:text-red-300">
                  กรุณาบันทึกผลการทบทวนก่อน ระบบจะแสดงปุ่มส่งทำ RCA ในหน้าสรุปและยังไม่อนุญาตให้จำหน่ายเคส
                </p>
                <div className="mt-3 rounded-xl border border-red-200 bg-white/80 p-3 dark:border-red-900 dark:bg-slate-900/70">
                  <div className="text-[11px] font-black uppercase tracking-wide text-red-800 dark:text-red-300">เกณฑ์ที่ตรวจพบ</div>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {(rcaCriteria.length ? rcaCriteria : [`เข้าเกณฑ์ RCA ตามระดับความรุนแรง ${severity.label}`]).map((criterion, index) => (
                      <li key={`${criterion}-${index}`} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>สถานะ: {incident.rca_status || 'REQUIRED'}</span>
                  {incident.rca_due_at && <span>กำหนดแล้วเสร็จ: {format(new Date(incident.rca_due_at), 'dd/MM/yyyy HH:mm')}</span>}
                  {linkedRcaCount > 0 && <span>มีรายการ RCA เชื่อมโยงแล้ว {linkedRcaCount} รายการ</span>}
                </div>
              </div>
            </div>
            {permissions.canForward ? (
              <button
                type="button"
                onClick={() => {
                  document.getElementById('review-workstation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700"
              >
                <Target className="h-4 w-4" /> ไปบันทึกผลทบทวน
              </button>
            ) : (
              <Link to="/rca" className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-center text-xs font-black text-white hover:bg-red-700">ติดตามในศูนย์ RCA</Link>
            )}
          </div>
        </div>
      )}

      {/* Case Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="print-screen-only flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug max-w-3xl">
                {incident.nrls_code && incident.nrls_name ? `${incident.nrls_code} : ${incident.nrls_name}` : `อุบัติการณ์ #${incident.id}`}
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
            {incident.status_risk !== 'จำหน่าย' && (permissions.canReview || permissions.canTeamReview || permissions.canRecordRmReview) && (
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
        <div className="print-screen-only py-6 border-b border-slate-100 dark:border-slate-700">
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
                    const imgUrl = attachmentUrls[imgName];

                    if (failedImages[imgName]) {
                      return (
                        <div key={idx} className="aspect-video sm:aspect-square rounded-xl border border-dashed border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex flex-col items-center justify-center text-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-[11px] font-bold">ไม่พบไฟล์รูปบนเซิร์ฟเวอร์</span>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[130px]" title={imgName}>{imgName}</span>
                        </div>
                      );
                    }

                    if (!imgUrl) {
                      return (
                        <div key={idx} className="aspect-video sm:aspect-square animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
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
                          onError={() => setFailedImages(prev => ({ ...prev, [imgName]: true }))}
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
              <div className="print-actions flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {permissions.canConfirm && (incident.status_risk === 'รายงาน' || incident.status_risk === 'แก้ไข') && (
                  <>
                    <button
                      onClick={() => {
                        setConfirmNrlsCode(String(incident.nrls_code || ''));
                        setConfirmRiskstoreId(incident.riskstore_id ? Number(incident.riskstore_id) : null);
                        setConfirmLevelId(String(incident.level_id || ''));
                        setConfirmNote('');
                        setIsReturningForEdit(false);
                        setIsConfirmModalOpen(true);
                      }}
                      disabled={submittingAction}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      ยืนยันความเสี่ยง
                    </button>
                  </>
                )}

                {permissions.canReject && !permissions.canReview && incident.status_risk !== 'ไม่ใช่ความเสี่ยง' && (
                  <button
                    type="button"
                    onClick={() => requestFinalStatus('ไม่ใช่ความเสี่ยง')}
                    disabled={submittingAction}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-sm shadow-xs transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    ไม่ใช่ความเสี่ยง
                  </button>
                )}

                {permissions.canForward && !permissions.canReview && incident.status_risk === 'ทบทวน' && (
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
                    {permissions.canForwardToTeam ? (
                      <button
                        type="button"
                        onClick={() => {
                          setForwardTargetType('team');
                          setIsForwardModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-xl font-semibold text-sm shadow-xs transition-all cursor-pointer"
                      >
                        <Users className="w-4 h-4" />
                        ส่งเข้าภาพรวมทีมนำ
                      </button>
                    ) : incident.status_risk === 'ตรวจสอบ' ? (
                      <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        บันทึกการทบทวนหน่วยงานก่อนส่งทีม
                      </span>
                    ) : null}
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
              <span className="text-slate-400">ความเสี่ยง NRLS :</span>
              <span className="font-semibold text-slate-750 dark:text-slate-200 text-right max-w-[65%]" title={incident.nrls_name}>
                {incident.nrls_code ? `${incident.nrls_code} : ${incident.nrls_name || '-'}` : 'ข้อมูลเดิม—รอตรวจสอบ'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">ชื่อความเสี่ยงเดิมของโรงพยาบาล :</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-right max-w-[65%]">{incident.risk_topic_name || '-'}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">สถานะการยืนยัน NRLS :</span>
              <span className="font-bold">{incident.classification_status || 'PENDING'}{incident.classified_at ? ` • ${format(new Date(incident.classified_at), 'dd/MM/yyyy HH:mm')}` : ''}</span>
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

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex flex-wrap items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
            {saveSuccessLink && (
              <Link to={saveSuccessLink.to} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700">
                {saveSuccessLink.label}
              </Link>
            )}
          </div>
        )}

      {/* Collaborative Co-Review / Forward Status Banner */}
      {(incident.sendto_team_name || incident.sendto_department_name) && (
        <div className="official-print-academic-section bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border-l-4 border-purple-600 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm mt-0.5 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-purple-950 dark:text-purple-200 text-sm">
                  📤 ส่งต่อให้ {incident.sendto_team_name ? `ทีมนำ: ${incident.sendto_team_name}` : `หน่วยงาน: ${incident.sendto_department_name}`} ร่วมทบทวน
                </h3>
                <span className="print-screen-only text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-200 font-bold border border-purple-300 dark:border-purple-800">
                  {FORWARDING_PURPOSE_LABELS[incident.review_forwarding_purpose as ForwardingPurpose] || 'ผู้รับผิดชอบการทบทวน'}
                </span>
              </div>

              {incident.note && (
                <div className="text-xs text-purple-900 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 p-2.5 rounded-lg border border-purple-200/80 dark:border-purple-800/60 mt-1.5">
                  <span className="font-bold">📝 ประเด็นขอคำปรึกษา/ร่วมทบทวน:</span> {incident.note}
                </div>
              )}

              {/* Level Warning Rule Box */}
              {incident.level_warning && (
                <div className="print-alert text-xs text-amber-900 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-300/60 dark:border-amber-800/60 mt-1.5 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>⏱️ กำหนดเวลาทบทวนตามระดับความรุนแรง ({incident.level_warning.warning_code}):</strong> {incident.level_warning.warning_name}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-purple-700 dark:text-purple-400">
                ส่งเรื่องเมื่อ {incident.send_date ? format(new Date(incident.send_date), 'dd/MM/yyyy HH:mm') : '-'} โดย {incident.send_use || 'ผู้ประสานงานความเสี่ยง'}
              </p>
              {incident.sendto_team_name && (
                <p className="mt-1 text-[11px] font-medium text-purple-800 dark:text-purple-300">
                  ทีมจะรับและสรุปเรื่องนี้ร่วมกับเหตุการณ์อื่นในหน้า “ภาพรวมความเสี่ยงของทีม”
                </p>
              )}
            </div>
          </div>

          {permissions.canForward && !permissions.canReview && incident.status_risk === 'ทบทวน' && (
            <button
              type="button"
              onClick={() => {
                setForwardTargetType(incident.sendto_team_id ? 'team' : 'department');
                setIsForwardModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-300 dark:border-purple-700 shadow-xs transition-all shrink-0 cursor-pointer self-start sm:self-center"
            >
              🔄 เปลี่ยนปลายทางร่วมทบทวน
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INLINE REVIEW & RCA WORKSTATION (รวมในหน้าเดียว ไม่ต้องเปิด Popup Modal) */}
      {/* ========================================================================= */}
      {(permissions.canReview || permissions.canTeamReview || permissions.canRecordRmReview) && (
      <div id="review-workstation" className="print-screen-only bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-indigo-500/40 dark:border-indigo-500/50 shadow-sm space-y-4">
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
                  ทบทวนระดับหน่วยงาน
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ทุกการทบทวนช่วยให้เราดูแลกันได้ปลอดภัยขึ้น
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

        {incident.reviews?.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <summary className="cursor-pointer text-sm font-semibold">ผลการทบทวนล่าสุด — เปิดอ่านก่อนบันทึกครั้งนี้</summary>
            <p className="mt-2 whitespace-pre-wrap text-sm">{incident.reviews[0].notereview}</p>
          </details>
        )}

        {!isLowSeverityReview && (
          <section className="space-y-4 rounded-2xl border-2 border-indigo-300 bg-indigo-50/30 p-4 dark:border-indigo-800 dark:bg-indigo-950/20 sm:p-5">
            <div>
              <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                สาเหตุและปัจจัยที่เกี่ยวข้อง <span className="text-rose-500">*</span>
              </h3>
              <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">เลือกปัจจัยที่เกี่ยวข้องได้มากกว่า 1 ปัจจัย หรือระบุสาเหตุอื่น</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-slate-900">
              <ContributingFactorSelector
                value={reviewContributingFactors}
                onChange={setReviewContributingFactors}
                otherCause={causeProblem}
                onOtherCauseChange={setCauseProblem}
              />
            </div>
          </section>
        )}

        {/* 4. ฟอร์มบันทึกข้อมูลหลัก (Main Review Inputs) */}
        <form onSubmit={handleAddReview} className="space-y-4">
          <section className="space-y-3 rounded-2xl border-2 border-cyan-300 bg-cyan-50/40 p-4 dark:border-cyan-800 dark:bg-cyan-950/20">
            <div>
              <h3 className="text-sm font-black text-cyan-950 dark:text-cyan-200">
                ผลการทบทวนและการเปลี่ยนแปลงมาตรการ <span className="text-rose-500">*</span>
              </h3>
              <p className="mt-1 text-xs text-cyan-700 dark:text-cyan-300">
                เลือกผลที่ตรงกับรอบนี้ ข้อความที่เลือกจะแสดงในประวัติการทบทวน
              </p>
            </div>
            {reviewResultsList.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {reviewResultsList.map((result) => {
                  const selected = reviewResultId === String(result.id);
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setReviewResultId(String(result.id))}
                      aria-pressed={selected}
                      className={`rounded-xl border p-3 text-left text-xs font-bold transition-all ${selected
                        ? 'border-cyan-600 bg-white text-cyan-950 shadow-sm ring-2 ring-cyan-500/20 dark:bg-cyan-950/60 dark:text-cyan-100'
                        : 'border-cyan-100 bg-white/70 text-slate-700 hover:border-cyan-400 dark:border-cyan-900 dark:bg-slate-900/50 dark:text-slate-200'}`}
                    >
                      <span className="flex items-start gap-2">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300'}`}>
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <span>{result.reviewresults_name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                ไม่สามารถโหลดตัวเลือกผลการทบทวนได้ กรุณารีเฟรชหน้าแล้วลองใหม่
              </div>
            )}
            {!reviewResultId && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">กรุณาเลือก 1 รายการก่อนบันทึก</p>}
          </section>

          {/* ช่องเพิ่มมาตรการใหม่ / รายละเอียดการทบทวน */}
          <div className={isLowSeverityReview ? 'rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20' : ''}>
            <label htmlFor="review-measure" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isLowSeverityReview ? 'มาตรการแก้ไขและป้องกันการเกิดซ้ำ *' : 'การแก้ไขในการทบทวนครั้งนี้ *'}
            </label>
            <textarea
              id="review-measure"
              required
              minLength={10}
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={isLowSeverityReview
                ? 'พิมพ์มาตรการที่หน่วยงานดำเนินการ เช่น ปรับขั้นตอน เพิ่มการตรวจสอบ ย้ำแนวทาง หรือคงมาตรการเดิม...'
                : 'ระบุข้อเท็จจริงจากการทบทวน, มาตรการใหม่ที่ได้ปรับเปลี่ยน, แนวทางปฏิบัติ หรือการคงมาตรการเดิม...'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {isLowSeverityReview && (
              <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                ระดับ {incident.level_id}: ไม่ต้องเลือกปัจจัย กรุณาพิมพ์มาตรการที่ดำเนินการอย่างน้อย 10 ตัวอักษร
              </p>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Paperclip className="h-4 w-4 text-indigo-600" />
              แนบหลักฐานประกอบการทบทวน (ไม่บังคับ)
            </label>
            <input
              ref={reviewFileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => handleReviewFileSelection(event.target.files)}
              className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700 dark:text-slate-300"
            />
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              รองรับ JPG, PNG, WebP และ PDF สูงสุด 10 ไฟล์ โดยขนาดรวมทั้งหมดต้องไม่เกิน 10 MB
            </p>
            {reviewFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {reviewFiles.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs dark:border-indigo-900 dark:bg-slate-900">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{file.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
                          if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
                        }}
                        className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        aria-label={`ลบไฟล์ ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="text-right text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                  รวม {(reviewFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} / 10 MB
                </div>
              </div>
            )}
          </div>

        {/* Forwarding purpose */}
        <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <div>
            <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">การส่งต่อหลังทบทวน</h3>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">ผลการแก้ไขและการส่งต่อเป็นคนละเรื่องกัน จึงเลือก “ยุติปัญหาได้” พร้อมส่งเพื่อรับทราบได้</p>
          </div>
          <select aria-label="การส่งต่อหลังทบทวน" value={forwardingPurpose}
            onChange={(event) => { setForwardingPurpose(event.target.value as ForwardingPurpose); setCoReviewDepartmentId(''); }}
            className="w-full rounded-xl border border-amber-200 bg-white p-3 text-sm dark:bg-slate-900">
            {Object.entries(FORWARDING_PURPOSE_LABELS).map(([value, label]) => (
              <option key={value} value={value} disabled={value !== 'NONE' && !permissions.canForward}>{label}</option>
            ))}
          </select>
          {forwardingPurpose !== 'NONE' && (
            <div>
              <label className="block text-xs font-black text-amber-950 dark:text-amber-200">
                หน่วยงานปลายทาง <span className="text-rose-500">*</span>
              </label>
              <select
                value={coReviewDepartmentId}
                onChange={(event) => setCoReviewDepartmentId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 dark:border-amber-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- เลือกหน่วยงานอื่น --</option>
                {departmentsList
                  .filter((department: any) => String(department.id) !== String(incident.department_id))
                  .map((department: any) => (
                    <option key={department.id} value={department.id}>{department.depart_name || department.name}</option>
                  ))}
              </select>
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                {forwardingPurpose === 'INFORM'
                  ? 'ปลายทางเปิดดูข้อมูลได้ แต่ไม่ถูกกำหนดให้ทบทวนหรือดำเนินการ'
                  : 'เคสจะยังเปิดอยู่จนกว่างานที่ส่งต่อจะดำเนินการครบ'}
              </p>
            </div>
          )}
        </section>

          {/* Action Command Center */}
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed dark:bg-slate-900" aria-live="polite">
            <strong>สรุปก่อนบันทึก</strong>
            <p>ผลการทบทวน: {reviewResultsList.find((item) => String(item.id) === reviewResultId)?.reviewresults_name || 'ยังไม่ได้เลือก'}</p>
            <p>{FORWARDING_PURPOSE_LABELS[forwardingPurpose]}{coReviewDepartmentId ? ` • ${departmentsList.find(d => String(d.id) === coReviewDepartmentId)?.depart_name || ''}` : ''}</p>
            <p>หลังบันทึก ระบบจะแสดงรายละเอียดสำคัญและให้เลือกผลการดำเนินการระดับหน่วยงานก่อนเลือกจำหน่ายหรือส่งทำ RCA</p>
          </div>
          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
              {/* Left Action: Not Risk / Dismiss */}
              <div className="flex justify-start order-2 sm:order-1">
                {permissions.canReject && incident.status_risk !== 'ไม่ใช่ความเสี่ยง' && (
                  <button
                    type="button"
                    onClick={() => requestFinalStatus('ไม่ใช่ความเสี่ยง')}
                    disabled={submittingAction}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:bg-slate-700 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-xs transition-all cursor-pointer shadow-xs"
                    title="ปฏิเสธเหตุการณ์นี้เนื่องจากไม่ใช่ความเสี่ยงทางคลินิกหรือทั่วไป"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    ไม่ใช่ความเสี่ยง
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
                  {submittingAction
                    ? 'กำลังบันทึกข้อมูล...'
                    : forwardingPurpose !== 'NONE'
                          ? 'บันทึกผลและส่งต่อหน่วยงาน'
                          : 'บันทึกผลการทบทวน'}
                </button>
              </div>

              <div className="hidden sm:block" aria-hidden="true" />
            </div>

            {/* Audit Notice Helper */}
            <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-1">
              💡 ผลการทบทวนและมาตรการจะถูกบันทึกเป็นประวัติรอบใหม่ (Audit Log) และแสดงในไทม์ไลน์ด้านล่างทันที
            </div>
          </div>
        </form>
      </div>
      )}

      {/* P2 remains available as a compact follow-up status, keeping the legacy review page primary. */}
      <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3 shadow-sm dark:border-violet-900 dark:bg-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="shrink-0">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-violet-600" />สถานะติดตามหลังการทบทวน
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">แยกสถานะเอกสาร RCA ออกจากผลการติดตามมาตรการแก้ไข</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {incident.department_review_outcome && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                ผลหน่วยงาน: {DEPARTMENT_OUTCOME_LABELS[incident.department_review_outcome as DepartmentOutcome] || incident.department_review_outcome}
              </span>
            )}
            <span className="rounded-full bg-purple-50 px-2.5 py-1.5 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
              RCA: {incident.rca_required ? (incident.rca_status === 'COMPLETED' ? 'เอกสารเสร็จแล้ว' : incident.rca_status || 'REQUIRED') : 'ไม่บังคับ'}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              Workflow: {incident.operational_closed_at ? `จำหน่ายแล้ว ${format(new Date(incident.operational_closed_at), 'dd/MM/yyyy')}` : 'ยังเปิดอยู่'}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              มาตรการ: {incident.improvement_status === 'CLOSED' ? 'ปิดการติดตามแล้ว' : incident.improvement_status === 'MONITORING' ? `กำลังติดตาม • รอประเมิน ${incident.capa_summary?.awaiting_effectiveness || 0}` : `ยังไม่มี/ไม่ต้องมี • ทั้งหมด ${incident.capa_summary?.total || 0}`}
            </span>
            {user?.role === 'rm_committee' && user?.rmScope === 'hospital' && <Link to="/capa" className="rounded-xl bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700">ดูมาตรการ</Link>}
          </div>
        </div>
      </div>

      <IncidentImprovementFeedback actions={incident.capa_actions} />

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
              const reviewFactors = normalizeContributingFactorSelections(rev.contributing_factors);
              const reviewAttachments = parseReviewAttachments(rev.files);

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
                        {DEPARTMENT_OUTCOME_LABELS[rev.department_outcome as DepartmentOutcome] || rev.reviewresults_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>วันที่อัพเดต/ทบทวน:</strong> {dtReview}</span>
                    </div>
                  </div>

                  {(rev.department_outcome || rev.forwarding_purpose) && (
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      {rev.department_outcome && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          ผลหน่วยงาน: {DEPARTMENT_OUTCOME_LABELS[rev.department_outcome as DepartmentOutcome] || rev.department_outcome}
                        </span>
                      )}
                      {rev.forwarding_purpose && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          การส่งต่อ: {FORWARDING_PURPOSE_LABELS[rev.forwarding_purpose as ForwardingPurpose] || rev.forwarding_purpose}
                        </span>
                      )}
                    </div>
                  )}

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

                  {reviewFactors.length > 0 && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs dark:border-indigo-900 dark:bg-indigo-950/30">
                      <div className="mb-2 font-bold text-indigo-800 dark:text-indigo-300">📚 Contributing Factors (NRLS 2569)</div>
                      <div className="flex flex-wrap gap-2">
                        {reviewFactors.map((selection) => {
                          const factor = getContributingFactor(selection.code);
                          if (!factor) return null;
                          return (
                            <span key={selection.code} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-slate-700 dark:border-indigo-800 dark:bg-slate-900 dark:text-slate-200">
                              <strong className="font-mono text-indigo-700 dark:text-indigo-300">{factor.code}</strong> {factor.labelTh}
                              {selection.detail ? ` — ${selection.detail}` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Root Cause & Actions */}
                  {rev.cause_problem && (
                    <div className="text-xs bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">🔍 สาเหตุ/ข้อสรุปเพิ่มเติม:</span>
                      <span>{rev.cause_problem}</span>
                    </div>
                  )}

                  {reviewAttachments.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300">
                        <Paperclip className="h-3.5 w-3.5" /> หลักฐานแนบ ({reviewAttachments.length} ไฟล์)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reviewAttachments.map((attachment) => {
                          const key = `${rev.id}:${attachment.filename}`;
                          return (
                            <button
                              key={attachment.filename}
                              type="button"
                              disabled={openingReviewFile === key}
                              onClick={() => void openReviewAttachment(Number(rev.id), attachment)}
                              className="flex max-w-full items-center gap-1.5 truncate rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
                              title={`${attachment.originalname} (${(attachment.size / 1024 / 1024).toFixed(2)} MB)`}
                            >
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{openingReviewFile === key ? 'กำลังเปิด...' : attachment.originalname}</span>
                            </button>
                          );
                        })}
                      </div>
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

      {reviewSummary && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="review-summary-title">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-5 dark:border-blue-900 dark:from-blue-950/50 dark:to-slate-900 sm:px-7">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-blue-600 p-2.5 text-white"><CheckCircle2 className="h-6 w-6" /></span>
                <div>
                  <h2 id="review-summary-title" className="text-lg font-black text-slate-950 dark:text-white">สรุปผลการทบทวน</h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">บันทึกแล้ว กรุณาตรวจสอบสาระสำคัญก่อนเลือกขั้นตอนถัดไป</p>
                </div>
              </div>
              <button type="button" onClick={() => setReviewSummary(null)} disabled={savingReviewOutcome || !reviewSummary.outcomeSaved} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="ปิดหน้าสรุป"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                <div className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">รายละเอียดความเสี่ยงที่สำคัญ</div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="rounded-lg bg-white px-2.5 py-1 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">RM {incident.id_risk || incident.id}</span>
                  {incident.nrls_code && <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300">{incident.nrls_code}</span>}
                  <span className="rounded-lg bg-white px-2.5 py-1 text-rose-700 shadow-sm dark:bg-slate-800 dark:text-rose-300">ระดับ {severity.label}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{incident.detail || incident.risk_topic_name || 'ไม่ระบุรายละเอียดเหตุการณ์'}</p>
              </section>

              <div className={`grid gap-4 ${reviewSummary.contributingFactors.length > 0 || reviewSummary.cause ? 'md:grid-cols-2' : ''}`}>
                {(reviewSummary.contributingFactors.length > 0 || reviewSummary.cause) && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <div className="text-xs font-black text-amber-800 dark:text-amber-300">สาเหตุและปัจจัยสำคัญ</div>
                    {reviewSummary.contributingFactors.length > 0 && (
                      <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {reviewSummary.contributingFactors.map((factor) => (
                          <li key={`${factor.code}-${factor.detail || ''}`} className="flex gap-2"><span className="text-amber-600">•</span><span>{getContributingFactor(factor.code)?.labelTh || factor.code}{factor.detail ? `: ${factor.detail}` : ''}</span></li>
                        ))}
                      </ul>
                    )}
                    {reviewSummary.cause && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">{reviewSummary.cause}</p>}
                  </section>
                )}

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <div className="text-xs font-black text-emerald-800 dark:text-emerald-300">{reviewSummary.reviewResultName}</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{reviewSummary.note}</p>
                </section>
              </div>

              <section className="space-y-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div>
                  <div className="font-black text-emerald-950 dark:text-emerald-200">ผลการดำเนินการระดับหน่วยงาน <span className="text-rose-500">*</span></div>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">เลือก 1 รายการ แล้วกดปุ่มบันทึกหรือจำหน่ายด้านล่าง</p>
                </div>
                <div className={`grid grid-cols-1 gap-3 ${isLowSeverityReview ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                  {([
                    ['IN_PROGRESS', 'อยู่ระหว่างดำเนินการ', 'ยังมีงานที่หน่วยงานต้องติดตามต่อ'],
                    ['RESOLVED', 'ยุติปัญหาได้', 'หน่วยงานแก้ไขและควบคุมปัญหาได้แล้ว'],
                    ...(isLowSeverityReview ? [] : [['UNRESOLVED', 'ยังยุติปัญหาไม่ได้', 'ต้องส่งต่อให้ RM พิจารณาระดับระบบ']]),
                  ] as Array<[DepartmentOutcome, string, string]>).map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleSelectReviewOutcome(value)}
                      disabled={savingReviewOutcome}
                      className={`rounded-xl border p-3 text-left transition-all disabled:cursor-wait disabled:opacity-60 ${reviewSummary.departmentOutcome === value
                        ? 'border-emerald-500 bg-white shadow-sm ring-2 ring-emerald-500/20 dark:bg-emerald-950/60'
                        : 'border-emerald-100 bg-white/70 hover:border-emerald-300 dark:border-emerald-900 dark:bg-slate-900/40'}`}
                    >
                      <span className="block text-xs font-black text-slate-900 dark:text-white">{label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className={reviewSummary.departmentOutcome ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                    {savingReviewOutcome
                      ? 'กำลังบันทึก...'
                      : reviewSummary.outcomeSaved && reviewSummary.departmentOutcome
                        ? `บันทึกแล้ว: ${DEPARTMENT_OUTCOME_LABELS[reviewSummary.departmentOutcome]}`
                        : reviewSummary.departmentOutcome
                          ? `เลือกแล้ว: ${DEPARTMENT_OUTCOME_LABELS[reviewSummary.departmentOutcome]} — กรุณากดปุ่มบันทึก`
                          : 'กรุณาเลือกผลการดำเนินการก่อนทำขั้นตอนถัดไป'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">การส่งต่อ: {FORWARDING_PURPOSE_LABELS[reviewSummary.forwardingPurpose]}{reviewSummary.forwardingDepartmentName ? ` • ${reviewSummary.forwardingDepartmentName}` : ''}</span>
                </div>
              </section>

              {(reviewSummary.requiresRca || rcaNeedsAction) && (
                <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-xs font-semibold leading-relaxed text-red-800 dark:bg-red-950/30 dark:text-red-200">
                  เรื่องนี้เข้าเกณฑ์ทำ RCA จึงยังจำหน่ายหรือปิดเคสไม่ได้ กรุณาส่งเรื่องเข้าศูนย์ RCA เพื่อดำเนินการต่อ
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setReviewSummary(null)} disabled={savingReviewOutcome || !reviewSummary.outcomeSaved} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">ปิดหน้าสรุป</button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {reviewSummary.departmentOutcome && reviewSummary.departmentOutcome !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => void handleSaveReviewOutcome()}
                      disabled={savingReviewOutcome || reviewSummary.outcomeSaved}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {savingReviewOutcome ? 'กำลังบันทึก...' : reviewSummary.outcomeSaved ? 'บันทึกแล้ว' : 'บันทึกผลการดำเนินการ'}
                    </button>
                  )}
                  {permissions.canClose
                    && incident.status_risk !== 'จำหน่าย'
                    && reviewSummary.departmentOutcome === 'RESOLVED'
                    && !['CO_REVIEW', 'ADDITIONAL_ACTION', 'TRANSFER_OWNER'].includes(reviewSummary.forwardingPurpose)
                    && !reviewSummary.requiresRca
                    && !rcaNeedsAction && (
                      <button type="button" onClick={handleConfirmDischargeFromSummary} disabled={submittingAction || savingReviewOutcome} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{submittingAction || savingReviewOutcome ? 'กำลังจำหน่าย...' : 'จำหน่าย'}</button>
                    )}
                  {reviewSummary.departmentOutcome === 'RESOLVED'
                    && !(
                      permissions.canClose
                      && incident.status_risk !== 'จำหน่าย'
                      && !['CO_REVIEW', 'ADDITIONAL_ACTION', 'TRANSFER_OWNER'].includes(reviewSummary.forwardingPurpose)
                      && !reviewSummary.requiresRca
                      && !rcaNeedsAction
                    ) && (
                    <button
                      type="button"
                      onClick={() => void handleSaveReviewOutcome()}
                      disabled={savingReviewOutcome || reviewSummary.outcomeSaved}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {savingReviewOutcome ? 'กำลังบันทึก...' : reviewSummary.outcomeSaved ? 'บันทึกแล้ว — รอผู้มีสิทธิ์จำหน่าย' : 'บันทึกผลยุติปัญหาได้'}
                    </button>
                  )}
                  {permissions.canForward && (
                    <button
                      type="button"
                      onClick={handleSendSummaryToRca}
                      disabled={sendingSummaryToRca || savingReviewOutcome || !reviewSummary.departmentOutcome}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black shadow-md disabled:opacity-50 ${(reviewSummary.requiresRca || rcaNeedsAction)
                        ? 'animate-pulse border-2 border-red-600 bg-white text-red-700 ring-4 ring-red-200 hover:bg-red-50 dark:bg-slate-900 dark:text-red-300 dark:ring-red-950'
                        : 'border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                      <Target className="h-4 w-4" />{sendingSummaryToRca ? 'กำลังส่ง...' : 'ส่งทำ RCA'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {finalStatusAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className={`border-b px-6 py-5 ${finalStatusAction === 'จำหน่าย' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-2.5 ${finalStatusAction === 'จำหน่าย' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'}`}>
                    {finalStatusAction === 'จำหน่าย' ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {finalStatusAction === 'จำหน่าย' ? 'ยืนยันการปิดเคส' : 'ยืนยันว่าไม่ใช่ความเสี่ยง'}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      การดำเนินการนี้จะสิ้นสุดกระบวนการของเคส กรุณาตรวจสอบข้อเท็จจริงและระบุเหตุผลสำหรับ Audit Log
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setFinalStatusAction(null)} disabled={submittingAction} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/70 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={submitFinalStatus} className="space-y-5 p-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                เคส #{incident.id}: หลังยืนยันแล้ว สถานะนี้ไม่สามารถย้อนกลับจากหน้าจอปกติได้
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
                  เหตุผลประกอบการตัดสินใจ <span className="text-rose-600">*</span>
                </label>
                <textarea
                  autoFocus
                  required
                  minLength={10}
                  rows={4}
                  value={finalStatusReason}
                  onChange={(event) => { setFinalStatusReason(event.target.value); setFinalStatusError(''); }}
                  placeholder={finalStatusAction === 'จำหน่าย' ? 'สรุปผลการทบทวน มาตรการที่ดำเนินการ และเหตุผลที่พร้อมปิดเคส...' : 'ระบุข้อเท็จจริงและเหตุผลที่พิจารณาแล้วว่าไม่เข้าข่ายอุบัติการณ์ความเสี่ยง...'}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <div className="mt-1.5 flex justify-between gap-3 text-xs">
                  <span className={finalStatusError ? 'text-rose-600' : 'text-slate-400'}>{finalStatusError || 'อย่างน้อย 10 ตัวอักษร'}</span>
                  <span className="text-slate-400">{finalStatusReason.trim().length} ตัวอักษร</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
                <button type="button" onClick={() => setFinalStatusAction(null)} disabled={submittingAction} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">ยกเลิก</button>
                <button type="submit" disabled={submittingAction || finalStatusReason.trim().length < 10} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${finalStatusAction === 'จำหน่าย' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                  {submittingAction ? 'กำลังบันทึก…' : finalStatusAction === 'จำหน่าย' ? 'ยืนยันปิดเคส' : 'ยืนยันว่าไม่ใช่ความเสี่ยง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORWARD / CO-REVIEW MODAL (ส่งต่อให้ทีมนำ / แผนกอื่นร่วมทบทวน) */}
      {/* ========================================================================= */}
      {permissions.canForward && isForwardModalOpen && (
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
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                <button type="button" onClick={() => setForwardTargetType('department')} className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${forwardTargetType === 'department' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`}>
                  <Building2 className="mr-1 inline h-3.5 w-3.5" /> หน่วยงานอื่น
                </button>
                <button type="button" onClick={() => setForwardTargetType('team')} disabled={!permissions.canForwardToTeam} className={`rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${forwardTargetType === 'team' ? 'bg-white text-purple-700 shadow-sm dark:bg-slate-800 dark:text-purple-300' : 'text-slate-500'}`}>
                  <Users className="mr-1 inline h-3.5 w-3.5" /> ทีมนำ
                </button>
              </div>

              {forwardTargetType === 'department' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🏢 เลือกหน่วยงานปลายทาง:</label>
                  <select value={forwardDeptId} onChange={(e) => setForwardDeptId(e.target.value)} required className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <option value="">-- กรุณาเลือกหน่วยงาน --</option>
                    {departmentsList.map((d: any) => <option key={d.id} value={d.id}>{d.depart_name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">👥 เลือกทีมนำที่รับภาพรวมความเสี่ยง:</label>
                  <select value={forwardTeamId} onChange={(e) => setForwardTeamId(e.target.value)} required className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <option value="">-- กรุณาเลือกทีมนำ --</option>
                    {teamsList.map((team: any) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
                  </select>
                </div>
              )}
              

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
                  <span>{forwardTargetType === 'team' ? 'ลำดับงานก่อนเข้าทีมนำ:' : 'ระบบการทบทวนร่วมกัน:'}</span>
                </div>
                <p className="text-purple-700 dark:text-purple-300 leading-relaxed">
                  {forwardTargetType === 'team'
                    ? 'เหตุการณ์นี้ผ่านการทบทวนของหน่วยงานแล้ว เมื่อส่งต่อจะเข้า Team Risk Workspace เพื่อให้ทีมรับงาน วิเคราะห์ Risk Matrix และสรุปหลายเหตุการณ์พร้อมกัน'
                    : 'หน่วยงานต้นสังกัดยังเป็นเจ้าของเหตุการณ์ และหน่วยงานปลายทางเข้าร่วมให้ข้อเสนอแนะตามขอบเขตที่ได้รับ'}
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
                    disabled
                    value={editFormData.department_id}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- เลือกหน่วยงาน --</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.depart_name}</option>
                    ))}
                  </select>
                </div>

                {/* Program is a read-only snapshot derived from NRLS by the backend. */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🎯 โปรแกรมความเสี่ยง:</label>
                  <select
                    required
                    disabled
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

              <StandardRiskSelector
                selectedNrlsCode={editFormData.nrls_code}
                selectedLocalRiskId={editFormData.riskstore_id ? Number(editFormData.riskstore_id) : null}
                onSelect={(nrlsCode, localRiskId, nrlsRisk) => setEditFormData((prev: any) => ({
                  ...prev,
                  nrls_code: nrlsCode || '',
                  riskstore_id: localRiskId ? String(localRiskId) : '',
                  program_id: nrlsRisk?.program_id ? String(nrlsRisk.program_id) : '',
                  level_id: prev.nrls_code === nrlsCode ? prev.level_id : '',
                }))}
              />

              {/* Risk Store ID / Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🔍 หัวข้อความเสี่ยง (ชื่อความเสี่ยง):</label>
                <select
                  disabled
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

              <div>
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
      {permissions.canConfirm && isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl max-h-[90vh] overflow-y-auto w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">ยืนยันความเสี่ยง</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ตรวจสอบข้อมูลและให้หน่วยงานต้นทางทบทวนเบื้องต้น</p>
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
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block break-words">
                  #{incident.id} - {incident.risk_topic_name || incident.detail}
                </span>
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <span className="text-slate-500 block font-medium">รายละเอียดเหตุการณ์ที่ผู้รายงานระบุ:</span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-200">{incident.detail || 'ยังไม่ได้ระบุรายละเอียดเหตุการณ์'}</p>
                </div>
                <p className="mt-3 font-semibold text-slate-700 dark:text-slate-300">
                  ระดับความรุนแรงที่ผู้รายงานประเมิน: {incident.level_id ? `ระดับ ${incident.level_id}` : 'ยังไม่ได้ระบุ'}
                </p>
              </div>

              {/* Risk classification review */}
              <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/70 dark:bg-blue-950/20">
                <div>
                  <h4 className="font-bold text-blue-950 dark:text-blue-200">🔎 ตรวจสอบเรื่องความเสี่ยงก่อนยืนยัน</h4>
                  <p className="mt-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                    ผู้ยืนยันสามารถค้นหาและแก้มาตรฐาน NRLS หรือหัวข้อความเสี่ยงของโรงพยาบาลให้ถูกต้องได้
                  </p>
                </div>
                <StandardRiskSelector
                  selectedNrlsCode={confirmNrlsCode || null}
                  selectedLocalRiskId={confirmRiskstoreId}
                  onSelect={(nrlsCode, localRiskId) => {
                    setConfirmNrlsCode(nrlsCode || '');
                    setConfirmRiskstoreId(localRiskId);
                    const nextKind = getNrlsRiskKind(nrlsCode);
                    const levelMatches = nextKind === 'clinical'
                      ? /^[A-I]$/.test(confirmLevelId)
                      : nextKind === 'general' && /^[1-5]$/.test(confirmLevelId);
                    if (!levelMatches) setConfirmLevelId('');
                  }}
                />
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    ⚠️ ระดับความรุนแรงที่ผู้ยืนยันตรวจสอบ ({confirmRiskKind === 'clinical' ? 'Clinical / คลินิก A–I' : confirmRiskKind === 'general' ? 'General / ทั่วไป 1–5' : 'กรุณาเลือก NRLS'}):
                  </label>
                  <select
                    value={confirmLevelId}
                    onChange={e => setConfirmLevelId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-rose-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-rose-400"
                  >
                    <option value="">-- เลือกระดับความรุนแรง --</option>
                    {confirmLevelId && !confirmLevelIsValid && <option value={confirmLevelId} disabled>ระดับ {confirmLevelId} (เดิม — กรุณาตรวจสอบประเภท NRLS และเลือกระดับ)</option>}
                    {confirmLevels.map(level => <option key={level} value={level}>ระดับ {level}</option>)}
                  </select>
                  <p className="text-[11px] text-slate-500">เริ่มต้นจากระดับที่ผู้รายงานประเมิน ผู้ยืนยันปรับได้หลังตรวจสอบเหตุการณ์</p>
                </div>
              </div>

              {/* Reporting department is immutable evidence of where the report originated. */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900">
                <span className="block font-bold text-slate-700 dark:text-slate-300">🏢 หน่วยงานต้นทางของรายงาน (แก้ไขไม่ได้)</span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{incident.department_name || `แผนก ${incident.department_id}`}</span>
                <p className="text-[11px] text-slate-500">หน่วยงานต้นทางทบทวนเบื้องต้นก่อน หากต้องการความเห็นจากหน่วยงานอื่น ให้เลือก Co-review ท้ายแบบฟอร์มทบทวน</p>
              </div>

              {isReturningForEdit && <div className="space-y-1.5">
                <label htmlFor="return-for-edit-note" className="font-bold text-slate-700 dark:text-slate-300 block">
                  📝 เหตุผลและคำแนะนำในการส่งกลับให้แก้ไข:
                </label>
                <textarea
                  id="return-for-edit-note"
                  autoFocus
                  rows={2}
                  value={confirmNote}
                  onChange={e => setConfirmNote(e.target.value)}
                  placeholder="ระบุสิ่งที่ต้องแก้ไขและคำแนะนำอย่างน้อย 10 ตัวอักษร..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-750">
              <button
                type="button"
                onClick={() => isReturningForEdit ? handleConfirmSubmit('แก้ไข') : setIsReturningForEdit(true)}
                disabled={submittingConfirm}
                className="w-full sm:w-auto px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:hover:bg-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {submittingConfirm && isReturningForEdit ? 'กำลังส่งกลับ...' : isReturningForEdit ? 'ยืนยันส่งกลับให้แก้ไข' : 'ส่งกลับให้แก้ไข'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isReturningForEdit && <button
                  type="button"
                  disabled={submittingConfirm}
                  onClick={() => { setIsReturningForEdit(false); setConfirmNote(''); }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 cursor-pointer"
                >กลับไปยืนยันความเสี่ยง</button>}
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                {!isReturningForEdit && <button
                  type="button"
                  onClick={() => handleConfirmSubmit('ตรวจสอบ')}
                  disabled={submittingConfirm}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                    {submittingConfirm ? 'กำลังยืนยัน...' : 'ยืนยันและส่งให้หน่วยงานทบทวน'}
                </button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini RCA Modal for Department */}
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

      <OfficialPrintFooter />
    </div>
  );
}
