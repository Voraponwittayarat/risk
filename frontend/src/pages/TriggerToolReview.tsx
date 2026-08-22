import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FileSearch,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  standard_rca_id?: string;
  findings: TriggerFinding[];
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
  const [formDept, setFormDept] = useState(user?.department_name || (user?.department_id ? `หน่วยที่ ${user.department_id}` : 'กลุ่มงานการพยาบาล'));
  const [formHn, setFormHn] = useState('');
  const [formAn, setFormAn] = useState('');
  const [formAdmitDate, setFormAdmitDate] = useState('');
  const [formDischargeDate, setFormDischargeDate] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<number[]>([]);
  const [triggerDetails, setTriggerDetails] = useState<Record<number, string>>({});
  const [hasAe, setHasAe] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [severityLevel, setSeverityLevel] = useState('E');
  const [preventability, setPreventability] = useState('ป้องกันได้ (Preventable)');
  const [aeDescription, setAeDescription] = useState('');

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
  }, []);

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
    } catch (err) {
      alert('บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  // Handle Master Delete
  const handleDeleteMaster = async (id: number) => {
    if (!window.confirm('คุณต้องการลบรายการ Trigger นี้หรือไม่?')) return;
    try {
      await axios.delete(`/trigger-tools/master/${id}`);
      fetchMaster();
    } catch (err) {
      alert('ลบไม่สำเร็จ');
    }
  };

  // Handle Create Review Submit
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHn.trim() || !formReviewer.trim()) {
      alert('กรุณาระบุ HN และชื่อผู้ทบทวน');
      return;
    }

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
      severity_level: hasAe ? severityLevel : undefined,
      preventability: hasAe ? preventability : undefined,
      ae_description: aeDescription || undefined,
      findings,
    };

    try {
      const res = await axios.post('/trigger-tools/reviews', payload);
      setIsReviewModalOpen(false);
      fetchReviews();

      // If Adverse Event or Error detected, prompt user to forward to Standard RCA immediately
      if (hasAe || hasError) {
        if (window.confirm('ตรวจพบ Adverse Event / Error! คุณต้องการเปิดเคส Standard RCA เพื่อวิเคราะห์เชิงลึกทันทีหรือไม่?')) {
          handleForwardToRca(res.data.id);
        }
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกการทบทวน');
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
    } catch (err) {
      alert('ไม่สามารถส่งต่อไปยัง Standard RCA ได้');
    } finally {
      setLoading(false);
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
            เครื่องมือค้นหาเหตุการณ์ไม่พึงประสงค์ (Adverse Event) และความคลาดเคลื่อน (Error) เชิงรุกจากเวชระเบียน พร้อมส่งต่อเข้าสู่กระบวนการ Standard RCA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setSelectedTriggers([]);
              setTriggerDetails({});
              setHasAe(false);
              setHasError(false);
              setAeDescription('');
              setFormHn('');
              setFormAn('');
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
                    <th className="px-4 py-3.5 text-center">ผลการประเมิน AE</th>
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
                          {r.has_adverse_event ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <AlertTriangle size={11} /> พบ AE ({r.severity_level || 'E'})
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">{r.preventability}</span>
                            </div>
                          ) : r.has_error ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              พบ Error
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              ปกติ (No AE)
                            </span>
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
                          <button
                            onClick={async () => {
                              if (window.confirm('ต้องการลบประวัติการทบทวนนี้หรือไม่?')) {
                                await axios.delete(`/trigger-tools/reviews/${r.id}`);
                                fetchReviews();
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-emerald-500" />
                  บันทึกผลการทบทวนเวชระเบียน (Trigger Tool Review Form)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เลือกรายการ Trigger ที่ตรวจพบ พร้อมประเมินว่าเกิด Adverse Event หรือ Error หรือไม่
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-6">
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
                      onChange={(e) => setFormHn(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
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
                      onChange={(e) => setFormReviewer(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      หน่วยงาน/แผนก *
                    </label>
                    <input
                      type="text"
                      required
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-rose-200/60 dark:border-rose-900/60">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ระดับความรุนแรงของอันตราย (Severity Level) *
                      </label>
                      <select
                        value={severityLevel}
                        onChange={(e) => setSeverityLevel(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white font-bold"
                      >
                        <option value="E">ระดับ E: เกิดอันตรายชั่วคราว ต้องให้การบำบัดรักษา</option>
                        <option value="F">ระดับ F: เกิดอันตรายชั่วคราว ต้องนอน รพ. หรืออยู่นานขึ้น</option>
                        <option value="G">ระดับ G: เกิดอันตรายถาวรแก่ผู้ป่วย</option>
                        <option value="H">ระดับ H: ต้องทำการช่วยชีวิต (CPR / Life-support)</option>
                        <option value="I">ระดับ I: เป็นสาเหตุทำให้ผู้ป่วยเสียชีวิต</option>
                      </select>
                    </div>

                    <div>
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

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        คำอธิบายสรุป Adverse Event และผลกระทบต่อผู้ป่วย
                      </label>
                      <textarea
                        rows={2}
                        placeholder="ระบุสิ่งที่เกิดขึ้น เช่น ผู้ป่วยได้รับยาเกินขนาดจน BP drop ต้อง refer..."
                        value={aeDescription}
                        onChange={(e) => setAeDescription(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
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
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> บันทึกผลการทบทวน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
