import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FileSearch,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Send,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  X,
  Layers,
  Sparkles,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { StandardRiskSelector } from '../components/StandardRiskSelector';
import { getNrlsRiskKind } from '../utils/nrlsClassification';

interface TriggerMaster {
  id: number;
  code: string;
  name: string;
  definition: string;
  source: string;
  reviewer_role: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

interface TriggerFinding {
  id?: number;
  trigger_id: number;
  trigger_name: string;
  detail?: string;
}

interface DepartmentOption {
  id: number | string;
  depart_name: string;
}

type FormErrorMap = Record<string, string>;

function apiErrorMessages(error: any, fallback: string): string[] {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.map((item) => String(item));
  if (typeof message === 'string' && message.trim()) return [message.trim()];
  return [fallback];
}

interface ReviewRecord {
  id: number;
  review_date: string;
  reviewer_name: string;
  department: string;
  hn: string;
  an?: string;
  admit_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  has_trigger: boolean;
  has_adverse_event: boolean;
  has_error: boolean;
  severity_level?: string;
  preventability?: string;
  ae_description?: string;
  risk_confirmation_status?: string;
  riskregister_id?: number;
  riskregister_id_risk?: number;
  nrls_code?: string;
  nrls_name_snapshot?: string;
  standard_rca_id?: string;
  findings: TriggerFinding[];
  incident?: {
    id: number;
    id_risk: number;
    status_risk?: string;
    level_id?: string;
    nrls_code?: string;
    nrls_name_snapshot?: string;
    classification_status?: string;
    rca_required?: boolean;
    rca_status?: string;
    rca_case_id?: string;
  } | null;
}

export default function TriggerToolReview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'reviews' | 'master'>('reviews');
  const [loading, setLoading] = useState(false);

  // Master Data State
  const [masterList, setMasterList] = useState<TriggerMaster[]>([]);
  const [masterSearch, setMasterSearch] = useState('');
  const [editingMaster, setEditingMaster] = useState<TriggerMaster | null>(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Review List State
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [filterAeOnly, setFilterAeOnly] = useState(false);

  // New Review Form Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [formReviewer, setFormReviewer] = useState(user?.name || '');
  const [formDept, setFormDept] = useState(user?.department_name || '');
  const [formDepartmentId, setFormDepartmentId] = useState(String(user?.department_id || ''));
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [formHn, setFormHn] = useState('');
  const [formAn, setFormAn] = useState('');
  const [formAdmitDate, setFormAdmitDate] = useState('');
  const [formDischargeDate, setFormDischargeDate] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<number[]>([]);
  const [triggerDetails, setTriggerDetails] = useState<Record<number, string>>({});
  const [hasAe, setHasAe] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [riskConfirmed, setRiskConfirmed] = useState(false);
  const [selectedNrlsCode, setSelectedNrlsCode] = useState<string | null>(null);
  const [selectedLocalRiskId, setSelectedLocalRiskId] = useState<number | null>(null);
  const [selectedRiskKind, setSelectedRiskKind] = useState<'clinical' | 'general' | null>(null);
  const [severityLevel, setSeverityLevel] = useState('');
  const [preventability, setPreventability] = useState('ป้องกันได้ (Preventable)');
  const [aeDescription, setAeDescription] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewToConfirm, setReviewToConfirm] = useState<ReviewRecord | null>(null);
  const [reviewFormErrors, setReviewFormErrors] = useState<FormErrorMap>({});
  const [confirmationErrors, setConfirmationErrors] = useState<FormErrorMap>({});

  const clearReviewError = (field: string) => {
    setReviewFormErrors((current) => {
      if (!current[field] && !current.server) return current;
      const next = { ...current };
      delete next[field];
      delete next.server;
      return next;
    });
  };

  const clearConfirmationError = (field: string) => {
    setConfirmationErrors((current) => {
      if (!current[field] && !current.server) return current;
      const next = { ...current };
      delete next[field];
      delete next.server;
      return next;
    });
  };

  const resetReviewForm = () => {
    setSelectedTriggers([]);
    setTriggerDetails({});
    setHasAe(false);
    setHasError(false);
    setRiskConfirmed(false);
    setSelectedNrlsCode(null);
    setSelectedLocalRiskId(null);
    setSelectedRiskKind(null);
    setSeverityLevel('');
    setAeDescription('');
    setFormHn('');
    setFormAn('');
    setFormAdmitDate('');
    setFormDischargeDate('');
    setFormDiagnosis('');
    setFormReviewer(user?.name || '');
    setFormDepartmentId(String(user?.department_id || ''));
    setFormDept(user?.department_name || '');
    setReviewFormErrors({});
  };

  const handleRiskTopicSelect = (nrlsCode: string | null, localRiskId: number | null) => {
    setSelectedNrlsCode(nrlsCode);
    setSelectedLocalRiskId(localRiskId);
    clearReviewError('nrls');
    clearConfirmationError('nrls');
    if (!nrlsCode) {
      setSelectedRiskKind(null);
      setSeverityLevel('');
      return;
    }
    const nextKind = getNrlsRiskKind(nrlsCode);
    if (!nextKind) {
      setSelectedRiskKind(null);
      setSeverityLevel('');
      return;
    }
    setSelectedRiskKind((currentKind) => {
      if (currentKind && currentKind !== nextKind) setSeverityLevel('');
      return nextKind;
    });
  };

  const openExistingReviewConfirmation = (review: ReviewRecord) => {
    setRiskConfirmed(false);
    setSelectedNrlsCode(null);
    setSelectedLocalRiskId(null);
    setSelectedRiskKind(null);
    setSeverityLevel('');
    setAeDescription(review.ae_description || '');
    setFormDepartmentId(String(user?.department_id || ''));
    setFormDept(user?.department_name || '');
    setConfirmationErrors({});
    setReviewToConfirm(review);
  };

  // Fetch Master triggers
  const fetchMaster = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/trigger-tools/master');
      if (Array.isArray(res.data)) {
        setMasterList(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setMasterList(res.data.data);
      } else {
        setMasterList([]);
      }
    } catch (err) {
      console.error('Failed to load trigger tools master', err);
      setMasterList([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Reviews
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/trigger-tools/reviews');
      if (Array.isArray(res.data)) {
        setReviews(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setReviews(res.data.data);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to load reviews', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaster();
    fetchReviews();
    axios.get('/departments')
      .then((response) => setDepartments(Array.isArray(response.data) ? response.data : []))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!formReviewer.trim()) setFormReviewer(user.name || '');
    if (!formDepartmentId && user.department_id) setFormDepartmentId(String(user.department_id));
    if (!formDept.trim() && user.department_name) setFormDept(user.department_name);
  }, [user, formDepartmentId, formDept, formReviewer]);

  useEffect(() => {
    const department = departments.find((item) => String(item.id) === formDepartmentId);
    if (department && department.depart_name !== formDept) setFormDept(department.depart_name);
  }, [departments, formDepartmentId, formDept]);

  // Handle Master Save/Update
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaster) return;

    try {
      if (editingMaster.id) {
        await axios.patch(`/trigger-tools/master/${editingMaster.id}`, editingMaster);
      } else {
        await axios.post('/trigger-tools/master', editingMaster);
      }
      setIsMasterModalOpen(false);
      setEditingMaster(null);
      fetchMaster();
    } catch {
      alert('บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  // Handle Master Delete
  const handleDeleteMaster = async (id: number) => {
    if (!window.confirm('คุณต้องการลบรายการ Trigger นี้หรือไม่?')) return;
    try {
      await axios.delete(`/trigger-tools/master/${id}`);
      fetchMaster();
    } catch {
      alert('ลบไม่สำเร็จ');
    }
  };

  // Handle Create Review Submit
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FormErrorMap = {};
    if (!formHn.trim()) errors.hn = 'กรุณาระบุ HN (เลขประจำตัวผู้ป่วย)';
    if (!formReviewer.trim()) errors.reviewer = 'กรุณาระบุชื่อผู้ทบทวน';
    if (!formDepartmentId.trim() || !formDept.trim()) errors.department = 'กรุณาเลือกหน่วยงานต้นทางจากรายการ';
    if (selectedTriggers.length === 0) errors.triggers = 'กรุณาเลือก Trigger ที่ตรวจพบอย่างน้อย 1 รายการ';
    if (!aeDescription.trim()) errors.description = 'กรุณาระบุรายละเอียดเหตุการณ์/ข้อเท็จจริงที่พบจากเวชระเบียน';
    if (!selectedNrlsCode) errors.nrls = 'กรุณาเลือกหัวข้อความเสี่ยงตามมาตรฐาน NRLS';
    if (!severityLevel) errors.severity = 'กรุณาเลือกระดับความรุนแรงของความเสี่ยง';
    setReviewFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const safeList = Array.isArray(masterList) ? masterList : [];
    const findings: TriggerFinding[] = selectedTriggers.map((tId) => {
      const match = safeList.find((m) => m.id === tId);
      return {
        trigger_id: tId,
        trigger_name: match ? match.name : `Trigger #${tId}`,
        detail: triggerDetails[tId] || '',
      };
    });

    const payload = {
      reviewer_name: formReviewer,
      department: formDept,
      hn: formHn,
      an: formAn || undefined,
      admit_date: formAdmitDate || undefined,
      discharge_date: formDischargeDate || undefined,
      diagnosis: formDiagnosis || undefined,
      has_trigger: findings.length > 0,
      has_adverse_event: hasAe,
      has_error: hasError,
      severity_level: severityLevel,
      preventability: hasAe ? preventability : undefined,
      ae_description: aeDescription.trim(),
      risk_confirmed: true,
      nrls_code: selectedNrlsCode,
      riskstore_id: selectedLocalRiskId,
      department_id: formDepartmentId,
      findings,
    };

    try {
      setSavingReview(true);
      const res = await axios.post('/trigger-tools/reviews', payload);
      const rmNo = res.data?.incident?.id_risk || res.data?.riskregister_id_risk || res.data?.incident?.id;
      try {
        const rcaResponse = await axios.post(`/trigger-tools/reviews/${res.data.id}/forward-to-rca`);
        setIsReviewModalOpen(false);
        navigate(`/rca/standard/${rcaResponse.data.rca_id}`);
      } catch (rcaError: any) {
        setIsReviewModalOpen(false);
        await fetchReviews();
        const reason = apiErrorMessages(rcaError, 'ไม่สามารถเปิด Standard Full RCA ได้').join(' • ');
        alert(`สร้างรายงานอุบัติการณ์เรียบร้อยแล้ว${rmNo ? `\nRM No. ${rmNo}` : ''}\nแต่เปิด Full RCA ไม่สำเร็จ: ${reason}\nสามารถกด “ส่งทำ Standard RCA” จากรายการทบทวนได้ภายหลัง`);
      }
    } catch (err: any) {
      setReviewFormErrors({ server: apiErrorMessages(err, 'เกิดข้อผิดพลาดในการบันทึกการทบทวน').join(' • ') });
    } finally {
      setSavingReview(false);
    }
  };

  // Forward to Standard RCA
  const handleForwardToRca = async (reviewId: number) => {
    try {
      setLoading(true);
      const res = await axios.post(`/trigger-tools/reviews/${reviewId}/forward-to-rca`);
      alert(res.data.message || 'ส่งต่อไปยัง Standard RCA เรียบร้อยแล้ว!');
      fetchReviews();
      navigate(`/rca/standard/${res.data.rca_id}`);
    } catch {
      alert('ไม่สามารถส่งต่อไปยัง Standard RCA ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExistingReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewToConfirm) return;
    const errors: FormErrorMap = {};
    if (!formDepartmentId.trim()) errors.department = 'กรุณาเลือกหน่วยงานต้นทางสำหรับรายงานอุบัติการณ์';
    if (!riskConfirmed) errors.confirmation = 'กรุณายืนยันว่ารายการทบทวนนี้เป็นความเสี่ยง';
    if (!selectedNrlsCode) errors.nrls = 'กรุณาเลือกหัวข้อความเสี่ยงตามมาตรฐาน NRLS';
    if (!severityLevel) errors.severity = 'กรุณาเลือกระดับความรุนแรงของความเสี่ยง';
    if (!aeDescription.trim()) errors.description = 'กรุณาระบุรายละเอียดเหตุการณ์/ข้อเท็จจริงที่พบจากเวชระเบียน';
    setConfirmationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      setSavingReview(true);
      const res = await axios.post(`/trigger-tools/reviews/${reviewToConfirm.id}/confirm-risk`, {
        risk_confirmed: true,
        nrls_code: selectedNrlsCode,
        riskstore_id: selectedLocalRiskId,
        severity_level: severityLevel,
        ae_description: aeDescription.trim(),
        department_id: formDepartmentId,
      });
      setReviewToConfirm(null);
      await fetchReviews();
      const rmNo = res.data?.incident?.id_risk || res.data?.riskregister_id_risk || res.data?.incident?.id;
      alert(`${res.data?.message || 'สร้าง Incident เรียบร้อยแล้ว'}${rmNo ? `\nRM No. ${rmNo}` : ''}`);
    } catch (err: any) {
      setConfirmationErrors({ server: apiErrorMessages(err, 'ไม่สามารถยืนยันความเสี่ยงและสร้าง Incident ได้').join(' • ') });
    } finally {
      setSavingReview(false);
    }
  };

  const safeMasterList = Array.isArray(masterList) ? masterList : [];
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const filteredMaster = safeMasterList.filter(
    (m) =>
      (m?.name || '').toLowerCase().includes(masterSearch.toLowerCase()) ||
      (m?.definition || '').toLowerCase().includes(masterSearch.toLowerCase()) ||
      (m?.source || '').toLowerCase().includes(masterSearch.toLowerCase()) ||
      (m?.reviewer_role || '').toLowerCase().includes(masterSearch.toLowerCase())
  );

  const filteredReviews = safeReviews.filter((r) => {
    const matchSearch =
      (r?.hn || '').toLowerCase().includes(reviewSearch.toLowerCase()) ||
      (r?.reviewer_name || '').toLowerCase().includes(reviewSearch.toLowerCase()) ||
      (r?.department || '').toLowerCase().includes(reviewSearch.toLowerCase()) ||
      (r?.diagnosis && r.diagnosis.toLowerCase().includes(reviewSearch.toLowerCase()));

    if (filterAeOnly) return matchSearch && (r.has_adverse_event || r.has_error);
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              <FileSearch className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Trigger Tool 11 รายการ รพ.วังเจ้า
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            การทบทวนเวชระเบียนด้วย Trigger Tool
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            การทบทวนที่ยืนยันความเสี่ยงจะสร้างรายงานอุบัติการณ์ 1 รายการ เลือกหัวข้อ NRLS และติดตามต่อใน Workflow ความเสี่ยงเดียวกับการรายงานปกติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => {
              resetReviewForm();
              setIsReviewModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> บันทึกการทบทวนเคสใหม่
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'reviews'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> บันทึกผลการทบทวนเวชระเบียน ({reviews.length})
        </button>

        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'master'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" /> ตารางแม่แบบ Trigger Tool (อัปเดต/แก้ไขได้) ({masterList.length})
        </button>
      </div>

      {/* TAB 1: REVIEWS LIST */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาตาม HN, AN, ผู้ทบทวน, แผนก, หรือการวินิจฉัย..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-400">
                <input
                  type="checkbox"
                  checked={filterAeOnly}
                  onChange={(e) => setFilterAeOnly(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300"
                />
                เฉพาะพบ Adverse Event / Error
              </label>

              <button
                onClick={fetchReviews}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                title="รีเฟรช"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Review Records Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">วันที่ทบทวน / ผู้ทบทวน</th>
                    <th className="px-4 py-3.5">HN / AN</th>
                    <th className="px-4 py-3.5">การวินิจฉัย</th>
                    <th className="px-4 py-3.5">Trigger ที่ตรวจพบ</th>
                    <th className="px-4 py-3.5 text-center">ผลยืนยัน / Incident</th>
                    <th className="px-4 py-3.5 text-center">สถานะ Standard RCA</th>
                    <th className="px-4 py-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                          <span>กำลังโหลดข้อมูลการทบทวนเวชระเบียน...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        ไม่พบประวัติการทบทวนเวชระเบียน
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-medium">
                          <div className="text-slate-900 dark:text-slate-100 font-bold">
                            {new Date(r.review_date).toLocaleDateString('th-TH')}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.reviewer_name} ({r.department})
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-blue-600 dark:text-blue-400">HN: {r.hn}</div>
                          {r.an && <div className="text-[11px] text-slate-400">AN: {r.an}</div>}
                        </td>

                        <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-700 dark:text-slate-300">
                          {r.diagnosis || '-'}
                        </td>

                        <td className="px-4 py-3.5">
                          {r.findings && r.findings.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {r.findings.map((f, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold"
                                >
                                  {f.trigger_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">ไม่พบ Trigger</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {r.incident ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 size={11} /> ยืนยันเป็นความเสี่ยง
                              </span>
                              <button
                                type="button"
                                onClick={() => navigate(`/incidents/${r.incident?.id}`)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                              >
                                <Eye size={11} /> RM No. {r.incident.id_risk || r.incident.id} · {r.incident.status_risk || 'รายงาน'}
                              </button>
                              <span className="max-w-[190px] truncate text-[10px] text-slate-500" title={r.nrls_name_snapshot || r.incident.nrls_name_snapshot || r.nrls_code || r.incident.nrls_code}>
                                {r.nrls_code || r.incident.nrls_code} {(r.nrls_name_snapshot || r.incident.nrls_name_snapshot) ? `: ${r.nrls_name_snapshot || r.incident.nrls_name_snapshot}` : ''}
                              </span>
                              {(r.has_adverse_event || r.has_error) && (
                                <span className="text-[10px] font-semibold text-rose-500">
                                  {r.has_adverse_event ? `พบ AE (${r.severity_level})` : 'พบ Error'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex max-w-[190px] flex-col items-center gap-1.5">
                              <span className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                รายการเดิม ยังไม่ได้สร้าง Incident
                              </span>
                              {r.findings?.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openExistingReviewConfirmation(r)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                                >
                                  <CheckCircle2 size={11} /> ยืนยันความเสี่ยง
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {r.standard_rca_id ? (
                            <button
                              onClick={() => navigate(`/rca/standard/${r.standard_rca_id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold hover:underline"
                            >
                              <Sparkles size={11} /> {r.standard_rca_id}
                            </button>
                          ) : (r.has_adverse_event || r.has_error) ? (
                            <button
                              onClick={() => handleForwardToRca(r.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-[10px] shadow-sm hover:scale-105 transition-transform"
                            >
                              <Send size={11} /> ส่งต่อทำ Standard RCA
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {r.incident ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/incidents/${r.incident?.id}`)}
                              className="p-1 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                              title="เปิดรายงานอุบัติการณ์"
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                if (window.confirm('ต้องการลบประวัติการทบทวนนี้หรือไม่?')) {
                                  await axios.delete(`/trigger-tools/reviews/${r.id}`);
                                  fetchReviews();
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="ลบรายการที่ยังไม่เชื่อม Incident"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER TABLE (Editable & Configurable) */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ Trigger, นิยาม, แหล่งข้อมูล, หรือผู้ทบทวน..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => {
                setEditingMaster({
                  id: 0,
                  code: `GTT-${masterList.length + 1}`,
                  name: '',
                  definition: '',
                  source: '',
                  reviewer_role: '',
                  category: 'General',
                  is_active: true,
                  sort_order: masterList.length + 1,
                });
                setIsMasterModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <Plus size={14} /> เพิ่มรายการ Trigger Tool ใหม่
            </button>
          </div>

          {/* Master Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 w-14">ลำดับ</th>
                    <th className="px-4 py-3.5">Trigger Tool Name</th>
                    <th className="px-4 py-3.5">นิยามการตรวจจับ (Definition)</th>
                    <th className="px-4 py-3.5">แหล่งข้อมูล (Source)</th>
                    <th className="px-4 py-3.5">ผู้ทบทวนหลัก (Reviewer)</th>
                    <th className="px-4 py-3.5 text-center">สถานะ</th>
                    <th className="px-4 py-3.5 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                  {filteredMaster.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {m.code}
                          </span>
                          {m.name}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed">
                        {m.definition}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                        {m.source}
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {m.reviewer_role}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.is_active
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {m.is_active ? 'ใช้งาน' : 'ปิดการใช้'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingMaster(m);
                              setIsMasterModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteMaster(m.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: NEW/EDIT MASTER TRIGGER ================= */}
      {isMasterModalOpen && editingMaster && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/70 px-3 py-5 backdrop-blur-xs sm:px-4 sm:py-8">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-500" />
                {editingMaster.id ? 'แก้ไขข้อมูล Trigger Tool' : 'เพิ่มรายการ Trigger Tool ใหม่'}
              </h3>
              <button
                onClick={() => setIsMasterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัส Trigger (Code)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMaster.code}
                    onChange={(e) => setEditingMaster({ ...editingMaster, code: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อ Trigger Tool *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMaster.name}
                    onChange={(e) => setEditingMaster({ ...editingMaster, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  นิยามการตรวจจับ (Definition) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingMaster.definition}
                  onChange={(e) => setEditingMaster({ ...editingMaster, definition: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    แหล่งข้อมูล (Source)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น OPD card, IPD chart, ใบ refer..."
                    value={editingMaster.source}
                    onChange={(e) => setEditingMaster({ ...editingMaster, source: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ผู้ทบทวนหลัก (Reviewer)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น แพทย์, พยาบาล IPD, เภสัชกร..."
                    value={editingMaster.reviewer_role}
                    onChange={(e) => setEditingMaster({ ...editingMaster, reviewer_role: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editingMaster.is_active}
                  onChange={(e) => setEditingMaster({ ...editingMaster, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  เปิดใช้งานรายการ Trigger นี้
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMasterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: MEDICAL RECORD REVIEW FORM ================= */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/70 px-2 py-3 backdrop-blur-xs sm:px-4 sm:py-8">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-emerald-500" />
                  บันทึกผลการทบทวนเวชระเบียน (Trigger Tool Review Form)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เมื่อบันทึก ระบบจะสร้างรายงานอุบัติการณ์พร้อมเลข RM แล้วเปิดหน้า Standard Full RCA ให้ทำต่อทันที
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveReview} className="space-y-6">
              {Object.keys(reviewFormErrors).length > 0 && (
                <div role="alert" aria-live="assertive" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    ยังบันทึกไม่ได้ เพราะข้อมูลต่อไปนี้ยังไม่ครบหรือไม่ถูกต้อง
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-xs">
                    {Object.values(reviewFormErrors).map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>
              )}
              {/* Section 1: Patient & Reviewer Demographics */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  1. ข้อมูลผู้ป่วยและผู้ทบทวน
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      HN (เลขประจำตัวผู้ป่วย) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 68001234"
                      value={formHn}
                      onChange={(e) => { setFormHn(e.target.value); clearReviewError('hn'); }}
                      aria-invalid={Boolean(reviewFormErrors.hn)}
                      className={`w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-white font-bold ${reviewFormErrors.hn ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-300 dark:border-slate-700'}`}
                    />
                    {reviewFormErrors.hn && <p className="mt-1 text-[11px] font-semibold text-rose-600">{reviewFormErrors.hn}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      AN (เลขที่รับผู้ป่วยใน)
                    </label>
                    <input
                      type="text"
                      placeholder="ถ้ามี"
                      value={formAn}
                      onChange={(e) => setFormAn(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ชื่อผู้ทบทวน *
                    </label>
                    <input
                      type="text"
                      required
                      value={formReviewer}
                      onChange={(e) => { setFormReviewer(e.target.value); clearReviewError('reviewer'); }}
                      aria-invalid={Boolean(reviewFormErrors.reviewer)}
                      className={`w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-white ${reviewFormErrors.reviewer ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-300 dark:border-slate-700'}`}
                    />
                    {reviewFormErrors.reviewer && <p className="mt-1 text-[11px] font-semibold text-rose-600">{reviewFormErrors.reviewer}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      หน่วยงาน/แผนก *
                    </label>
                    <select
                      required
                      value={formDepartmentId}
                      onChange={(e) => {
                        const departmentId = e.target.value;
                        const department = departments.find((item) => String(item.id) === departmentId);
                        setFormDepartmentId(departmentId);
                        setFormDept(department?.depart_name || '');
                        clearReviewError('department');
                      }}
                      aria-invalid={Boolean(reviewFormErrors.department)}
                      className={`w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-white ${reviewFormErrors.department ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-300 dark:border-slate-700'}`}
                    >
                      <option value="">เลือกหน่วยงานต้นทาง...</option>
                      {formDepartmentId && !departments.some((item) => String(item.id) === formDepartmentId) && (
                        <option value={formDepartmentId}>{formDept || `หน่วยงานรหัส ${formDepartmentId}`}</option>
                      )}
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.depart_name}</option>)}
                    </select>
                    {reviewFormErrors.department && <p className="mt-1 text-[11px] font-semibold text-rose-600">{reviewFormErrors.department}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      การวินิจฉัยโรค (Diagnosis)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Sepsis with septic shock, Acute appendicitis..."
                      value={formDiagnosis}
                      onChange={(e) => setFormDiagnosis(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      วันที่ Admit
                    </label>
                    <input
                      type="date"
                      value={formAdmitDate}
                      onChange={(e) => setFormAdmitDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      วันที่ D/C
                    </label>
                    <input
                      type="date"
                      value={formDischargeDate}
                      onChange={(e) => setFormDischargeDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Trigger Checklist (Wang Chao 11 Master Items) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    2. รายการ Trigger Tool ที่ตรวจพบในเวชระเบียน
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      เลือกได้หลายข้อ ({selectedTriggers.length} รายการที่เลือก)
                    </span>
                  </h4>
                </div>
                {reviewFormErrors.triggers && <p className="text-[11px] font-semibold text-rose-600">{reviewFormErrors.triggers}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                  {safeMasterList
                    .filter((m) => m.is_active)
                    .map((m) => {
                      const isSelected = selectedTriggers.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                          }`}
                          onClick={() => {
                            clearReviewError('triggers');
                            if (isSelected) {
                              setSelectedTriggers(selectedTriggers.filter((id) => id !== m.id));
                            } else {
                              setSelectedTriggers([...selectedTriggers, m.id]);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 text-blue-600 rounded"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {m.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                {m.definition}
                              </p>

                              {isSelected && (
                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    placeholder="ระบุข้อเท็จจริงเพิ่มเติมจากชาร์ต..."
                                    value={triggerDetails[m.id] || ''}
                                    onChange={(e) =>
                                      setTriggerDetails({
                                        ...triggerDetails,
                                        [m.id]: e.target.value,
                                      })
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Section 3: Adverse Event & Error Evaluation */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-rose-50/30 dark:from-slate-800/50 dark:to-rose-950/20 border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  3. การวินิจฉัย/ประเมินเหตุการณ์ไม่พึงประสงค์ (Adverse Event / Error Assessment)
                </h4>

                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-600 dark:text-rose-400">
                    <input
                      type="checkbox"
                      checked={hasAe}
                      onChange={(e) => setHasAe(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    เกิด Adverse Event (ส่งผลอันตรายต่อผู้ป่วย)
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-600 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={hasError}
                      onChange={(e) => setHasError(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    เกิดข้อผิดพลาด/ความคลาดเคลื่อน (Error)
                  </label>
                </div>

                {hasAe && (
                  <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60">
                    <div className="max-w-md">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        การป้องกันได้ (Preventability)
                      </label>
                      <select
                        value={preventability}
                        onChange={(e) => setPreventability(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="ป้องกันได้ (Preventable)">ป้องกันได้ (Preventable)</option>
                        <option value="อาจป้องกันได้ (Potentially Preventable)">อาจป้องกันได้ (Potentially Preventable)</option>
                        <option value="ป้องกันไม่ได้ (Non-preventable)">ป้องกันไม่ได้ (Non-preventable)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รายละเอียดเหตุการณ์ / ข้อเท็จจริงที่พบจากเวชระเบียน *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="ระบุสิ่งที่เกิดขึ้น ลำดับเหตุการณ์ และผลกระทบ เช่น ผู้ป่วยได้รับยาเกินขนาดจน BP drop ต้อง refer..."
                    value={aeDescription}
                    onChange={(e) => { setAeDescription(e.target.value); clearReviewError('description'); }}
                    aria-invalid={Boolean(reviewFormErrors.description)}
                    className={`w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-white ${reviewFormErrors.description ? 'border-rose-500 ring-2 ring-rose-500/15 dark:border-rose-600' : 'border-slate-300 dark:border-slate-700'}`}
                  />
                  {reviewFormErrors.description ? (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">{reviewFormErrors.description}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">กรอบจะเปลี่ยนเป็นสีแดงเฉพาะเมื่อช่องนี้ว่างตอนกดบันทึก</p>
                  )}
                </div>
              </div>

              {/* Section 4: Classify the risk reported by this review */}
              <div className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    4. เลือกหัวข้อความเสี่ยงที่ตรวจพบ
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    การบันทึกผลทบทวนครั้งนี้ถือเป็นการรายงานอุบัติการณ์ 1 ครั้งโดยอัตโนมัติ กรุณาเลือกหัวข้อความเสี่ยงและระดับความรุนแรงที่พบ ระบบจะออกเลข RM ส่งเข้ารายการ “อุบัติการณ์รอยืนยัน” และเปิดหน้า Full RCA ให้ทำต่อ
                  </p>
                </div>

                <div className="space-y-4 border-t border-emerald-200 pt-4 dark:border-emerald-900">
                    <StandardRiskSelector
                      selectedNrlsCode={selectedNrlsCode}
                      selectedLocalRiskId={selectedLocalRiskId}
                      required
                      onSelect={handleRiskTopicSelect}
                    />
                    {reviewFormErrors.nrls && <p className="text-[11px] font-semibold text-rose-600">{reviewFormErrors.nrls}</p>}

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ระดับความรุนแรงของความเสี่ยง *
                      </label>
                      <select
                        required
                        disabled={!selectedRiskKind}
                        value={severityLevel}
                        onChange={(e) => { setSeverityLevel(e.target.value); clearReviewError('severity'); }}
                        aria-invalid={Boolean(reviewFormErrors.severity)}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900 ${reviewFormErrors.severity ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-emerald-300 dark:border-emerald-800'}`}
                      >
                        <option value="">{selectedRiskKind ? 'เลือกระดับความรุนแรง...' : 'เลือกหัวข้อความเสี่ยง NRLS ก่อน'}</option>
                        {selectedRiskKind === 'clinical' ? (
                          <>
                            <option value="A">A: ยังไม่เกิดความคลาดเคลื่อน</option>
                            <option value="B">B: เกิดความคลาดเคลื่อน แต่ยังไม่ถึงผู้ป่วย</option>
                            <option value="C">C: ถึงผู้ป่วย แต่ไม่เกิดอันตราย</option>
                            <option value="D">D: ถึงผู้ป่วย ต้องเฝ้าระวัง/ป้องกันอันตราย</option>
                            <option value="E">E: อันตรายชั่วคราว ต้องให้การรักษา</option>
                            <option value="F">F: อันตรายชั่วคราว ต้องนอน รพ. หรืออยู่นานขึ้น</option>
                            <option value="G">G: อันตรายถาวร</option>
                            <option value="H">H: ต้องช่วยชีวิต</option>
                            <option value="I">I: เสียชีวิต</option>
                          </>
                        ) : selectedRiskKind === 'general' ? (
                          <>
                            <option value="1">1: ผลกระทบเล็กน้อย</option>
                            <option value="2">2: ผลกระทบต่ำ</option>
                            <option value="3">3: ผลกระทบปานกลาง</option>
                            <option value="4">4: ผลกระทบสูง</option>
                            <option value="5">5: ผลกระทบรุนแรงมาก</option>
                          </>
                        ) : null}
                      </select>
                      {reviewFormErrors.severity && <p className="mt-1 text-[11px] font-semibold text-rose-600">{reviewFormErrors.severity}</p>}
                    </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              {Object.keys(reviewFormErrors).length > 0 && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                  บันทึกไม่ได้: {Object.values(reviewFormErrors).join(' • ')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReview ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {savingReview ? 'กำลังสร้าง Incident และ Full RCA...' : 'บันทึกและเปิด Full RCA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm a historical Trigger Tool review and create its one Incident */}
      {reviewToConfirm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/70 px-2 py-3 backdrop-blur-xs sm:px-4 sm:py-8">
          <div className="w-full max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ยืนยันความเสี่ยงจากรายการทบทวนเดิม
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Review #{reviewToConfirm.id} · HN {reviewToConfirm.hn} · {new Date(reviewToConfirm.review_date).toLocaleDateString('th-TH')}
                </p>
              </div>
              <button type="button" onClick={() => setReviewToConfirm(null)} className="text-slate-400 hover:text-slate-600" disabled={savingReview}>
                <X size={20} />
              </button>
            </div>

            <form noValidate onSubmit={handleConfirmExistingReview} className="space-y-4">
              {Object.keys(confirmationErrors).length > 0 && (
                <div role="alert" aria-live="assertive" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                  <div className="flex items-center gap-2 text-sm font-black"><AlertCircle className="h-5 w-5 shrink-0" />ยังยืนยันไม่ได้ เพราะข้อมูลต่อไปนี้ยังไม่ครบหรือไม่ถูกต้อง</div>
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-xs">
                    {Object.values(confirmationErrors).map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/50">
                <div className="font-bold text-slate-800 dark:text-slate-100">Trigger ที่พบ</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {reviewToConfirm.findings.map((finding) => (
                    <span key={finding.id || finding.trigger_id} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                      {finding.trigger_name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">หน่วยงานต้นทางของรายงาน *</label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => {
                    const departmentId = e.target.value;
                    const department = departments.find((item) => String(item.id) === departmentId);
                    setFormDepartmentId(departmentId);
                    setFormDept(department?.depart_name || '');
                    clearConfirmationError('department');
                  }}
                  aria-invalid={Boolean(confirmationErrors.department)}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 dark:bg-slate-800 dark:text-white ${confirmationErrors.department ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  <option value="">เลือกหน่วยงานต้นทาง...</option>
                  {formDepartmentId && !departments.some((item) => String(item.id) === formDepartmentId) && (
                    <option value={formDepartmentId}>{formDept || `หน่วยงานรหัส ${formDepartmentId}`}</option>
                  )}
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.depart_name}</option>)}
                </select>
                {confirmationErrors.department && <p className="mt-1 text-[11px] font-semibold text-rose-600">{confirmationErrors.department}</p>}
              </div>

              <button
                type="button"
                onClick={() => { setRiskConfirmed((value) => !value); clearConfirmationError('confirmation'); }}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all ${riskConfirmed ? 'border-emerald-500 bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100' : 'border-slate-300 text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200'}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${riskConfirmed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'}`}>
                  {riskConfirmed && <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <span>
                  <span className="block text-sm font-black">ยืนยันว่ารายการทบทวนนี้เป็นความเสี่ยง</span>
                  <span className="mt-0.5 block text-[11px] font-normal opacity-80">เมื่อบันทึก ระบบจะสร้าง Incident 1 รายการและออกเลข RM</span>
                </span>
              </button>
              {confirmationErrors.confirmation && <p className="text-[11px] font-semibold text-rose-600">{confirmationErrors.confirmation}</p>}

              {riskConfirmed && (
                <>
                  <StandardRiskSelector
                    selectedNrlsCode={selectedNrlsCode}
                    selectedLocalRiskId={selectedLocalRiskId}
                    required
                    onSelect={handleRiskTopicSelect}
                  />
                  {confirmationErrors.nrls && <p className="text-[11px] font-semibold text-rose-600">{confirmationErrors.nrls}</p>}

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">ระดับความรุนแรง *</label>
                    <select
                      required
                      disabled={!selectedRiskKind}
                      value={severityLevel}
                      onChange={(e) => { setSeverityLevel(e.target.value); clearConfirmationError('severity'); }}
                      aria-invalid={Boolean(confirmationErrors.severity)}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-800 dark:text-white ${confirmationErrors.severity ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-emerald-300 dark:border-emerald-800'}`}
                    >
                      <option value="">{selectedRiskKind ? 'เลือกระดับความรุนแรง...' : 'เลือกหัวข้อความเสี่ยง NRLS ก่อน'}</option>
                      {selectedRiskKind === 'clinical' ? (
                        <>
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((level) => <option key={level} value={level}>ระดับ {level}</option>)}
                        </>
                      ) : selectedRiskKind === 'general' ? (
                        <>
                          {['1', '2', '3', '4', '5'].map((level) => <option key={level} value={level}>ระดับ {level}</option>)}
                        </>
                      ) : null}
                    </select>
                    {confirmationErrors.severity && <p className="mt-1 text-[11px] font-semibold text-rose-600">{confirmationErrors.severity}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">รายละเอียดเหตุการณ์ / ข้อเท็จจริง *</label>
                    <textarea
                      rows={3}
                      required
                      value={aeDescription}
                      onChange={(e) => { setAeDescription(e.target.value); clearConfirmationError('description'); }}
                      placeholder="ระบุข้อเท็จจริงที่พบจากเวชระเบียน"
                      aria-invalid={Boolean(confirmationErrors.description)}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 dark:bg-slate-800 dark:text-white ${confirmationErrors.description ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-slate-300 dark:border-slate-700'}`}
                    />
                    {confirmationErrors.description && <p className="mt-1 text-[11px] font-semibold text-rose-600">{confirmationErrors.description}</p>}
                  </div>
                </>
              )}

              {Object.keys(confirmationErrors).length > 0 && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                  ยืนยันไม่ได้: {Object.values(confirmationErrors).join(' • ')}
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button type="button" onClick={() => setReviewToConfirm(null)} disabled={savingReview} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300">
                  ยกเลิก
                </button>
                <button type="submit" disabled={savingReview} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60">
                  {savingReview ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {savingReview ? 'กำลังสร้าง Incident...' : 'ยืนยันและสร้าง Incident 1 รายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
