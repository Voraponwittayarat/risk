import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Printer,
  Save,
  AlertTriangle,
  Plus,
  Trash2,
  Layers,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import type { TimelineItem } from '../../components/rca/EventTimeline';
import { FishboneDiagram } from '../../components/rca/FishboneDiagram';
import type { FishboneItem } from '../../components/rca/FishboneDiagram';
import { AiRcaAssistantModal } from '../../components/rca/AiRcaAssistantModal';
import { useAuth } from '../../contexts/AuthContext';

// Master Trigger Tool List (Wang Chao Hospital Standard 1/2568)
const TRIGGER_TOOL_ITEMS = [
  { code: 'GTT-01', name: 'การแพ้ยาซ้ำซ้อน / อาการไม่พึงประสงค์จากยา (Adverse Drug Event - ADE)', defaultSeverity: 'G', category: 'Medication' },
  { code: 'GTT-02', name: 'การให้เลือดหรือผลิตภัณฑ์เลือดผิดคน / ผิดหมู่ (Blood Transfusion Error)', defaultSeverity: 'I', category: 'Blood Safety' },
  { code: 'GTT-03', name: 'การติดเชื้อในโรงพยาบาลรุนแรง (Hospital-Acquired Infection: Sepsis/CAUTI/VAP)', defaultSeverity: 'G', category: 'Infection Control' },
  { code: 'GTT-04', name: 'การพลัดตกหกล้มของผู้ป่วยที่ทำให้เกิดการบาดเจ็บ (In-Hospital Patient Fall & Injury)', defaultSeverity: 'F', category: 'Patient Safety' },
  { code: 'GTT-05', name: 'ภาวะแทรกซ้อนจากการทำหัตถการหรือผ่าตัด (Surgical & Procedural Complications)', defaultSeverity: 'G', category: 'Clinical Safety' },
  { code: 'GTT-06', name: 'หัวใจหยุดเต้นฉับพลันในหอผู้ป่วยทั่วไป / การตอบสนองภาวะวิกฤตล่าช้า (In-hospital Arrest / Rapid Response Delay)', defaultSeverity: 'H', category: 'Emergency / CPR' },
  { code: 'GTT-07', name: 'การกลับเข้ารักษาซ้ำโดยไม่ได้วางแผนภายใน 28 วัน (Unplanned 28-day Re-admission)', defaultSeverity: 'E', category: 'Care Continuity' },
  { code: 'GTT-08', name: 'การย้ายเข้า ICU กะทันหัน หรือส่งต่อไป รพ.ระดับตติยภูมิฉุกเฉิน (Unplanned ICU Transfer / Emergent Referral)', defaultSeverity: 'G', category: 'Referral System' },
  { code: 'GTT-09', name: 'ภาวะแทรกซ้อนทางสูติกรรมและทารกแรกเกิด (Maternal & Neonatal Adverse Events)', defaultSeverity: 'H', category: 'Maternal & Child' },
  { code: 'GTT-10', name: 'ผลการตรวจทางห้องปฏิบัติการวิกฤตที่รายงานล่าช้า / วินิจฉัยคลาดเคลื่อน (Critical Lab Delay / Diagnostic Error)', defaultSeverity: 'F', category: 'Diagnostic & Lab' },
  { code: 'GTT-11', name: 'ความคลาดเคลื่อนจากการสื่อสารและการส่งมอบเวร (Communication & Handover Failure - SBAR)', defaultSeverity: 'E', category: 'Communication' },
];

const STANDARD_RCA_TEAMS = [
  'คณะกรรมการบริหารความเสี่ยง รพ.วังเจ้า (RM Committee)',
  'ทีมนำทางคลินิก (PCT: Patient Care Team)',
  'ทีมระบบยาและเภสัชกรรม (PTC: Pharmacy & Therapeutic)',
  'ทีมป้องกันและควบคุมการติดเชื้อ (IC: Infection Control)',
  'ทีมสิ่งแวดล้อมและความปลอดภัย (ENV / Safety)',
  'องค์กรแพทย์ (Medical Staff Organization)',
  'องค์กรพยาบาล (Nursing Staff Organization)',
  'กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค',
  'แผนกอุบัติเหตุและฉุกเฉิน (ER)',
  'แผนกผู้ป่วยใน (IPD: หอผู้ป่วยสามัญ/พิเศษ)',
  'แผนกผู้ป่วยนอก (OPD: คลินิกบริการ)',
  'ห้องคลอดและงานอนามัยแม่และเด็ก (LR/MCH)',
];

const CLINICAL_CARE_STEPS = [
  '1. การเข้าถึงและเข้ารับบริการ (Access & Entry)',
  '2. การประเมินผู้ป่วยแรกรับ (Initial Assessment)',
  '3. การตรวจวินิจฉัยและส่งตรวจทางห้องปฏิบัติการ (Diagnosis & Investigation)',
  '4. การวางแผนการรักษา (Care Planning)',
  '5. การให้การดูแลรักษาและการทำหัตถการ (Treatment & Clinical Care)',
  '6. การประเมินซ้ำและการเฝ้าระวังอาการทรุดลง (Re-assessment & Early Warning)',
  '7. การสื่อสารและการส่งมอบข้อมูล (Communication & Handover)',
  '8. การวางแผนจำหน่ายผู้ป่วย (Discharge Planning)',
  '9. การเสริมพลังและการให้ความรู้ผู้ป่วย/ญาติ (Empowerment & Education)',
  '10. การติดตามผลหลังจำหน่าย (Discharge Follow-up & Continuity of Care)',
];

interface WhyItem {
  level: number;
  question?: string;
  answer: string;
}

interface ProcessAnalysisItem {
  process_key: string;
  problem: string;
  tier1_personnel: string;
  tier2_teamwork: string;
  tier3_environment: string;
  tier4_policy: string;
  tier5_external: string;
  corrective_action: string;
}

interface CapaItem {
  action: string;
  type: string; // 'immediate' | 'preventive' | 'systemic'
  responsible: string;
  due_date: string;
  status: string;
  evidence?: string;
}

interface CmpItem {
  observation: string;
  hypothesis: string;
  comment: string;
}

interface ReviewSessionItem {
  session_no: number;
  review_date_time: string;
  reviewers: string;
  notes: string;
}

export default function StandardRcaForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals & UI Toggles
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState('');
  const [useFishbone, setUseFishbone] = useState(true);
  const [useSwissCheese, setUseSwissCheese] = useState(false);

  // Section 1: General Metadata
  const [caseId, setCaseId] = useState(id || '');
  const [rmNo, setRmNo] = useState('');
  const [topic, setTopic] = useState('');
  const [severity, setSeverity] = useState('G');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [rcaTeam, setRcaTeam] = useState('คณะกรรมการบริหารความเสี่ยง รพ.วังเจ้า (RM Committee)');
  const [customTeam, setCustomTeam] = useState('');
  const [isNotRisk, setIsNotRisk] = useState(false);
  const [status, setStatus] = useState('in_progress');
  const [sourceTriggerReviewId, setSourceTriggerReviewId] = useState<number | undefined>(undefined);

  // Sources of Information
  const [infoInterview, setInfoInterview] = useState(true);
  const [infoCctv, setInfoCctv] = useState(false);
  const [infoDocument, setInfoDocument] = useState(true);
  const [infoInspection, setInfoInspection] = useState(true);

  // Section 2: Problem & Impact
  const [whatHappened, setWhatHappened] = useState('');
  const [actualImpact, setActualImpact] = useState('');
  const [potentialImpact, setPotentialImpact] = useState('');

  // Section 3: Timeline
  const [timelines, setTimelines] = useState<TimelineItem[]>([
    { event_time: '08:30 น.', event_description: '', is_critical_point: false },
    { event_time: '10:00 น.', event_description: '', is_critical_point: true },
  ]);

  // Section 4: CMPs (Care Management Problems)
  const [cmps, setCmps] = useState<CmpItem[]>([
    { observation: '', hypothesis: '', comment: '' },
  ]);

  // Section 5: Clinical Process (10 Steps & 5 Tiers)
  const [selectedProcessKey, setSelectedProcessKey] = useState(CLINICAL_CARE_STEPS[0]);
  const [processAnalyses, setProcessAnalyses] = useState<ProcessAnalysisItem[]>([
    {
      process_key: CLINICAL_CARE_STEPS[0],
      problem: '',
      tier1_personnel: '',
      tier2_teamwork: '',
      tier3_environment: '',
      tier4_policy: '',
      tier5_external: '',
      corrective_action: '',
    },
  ]);

  // Section 6: Fishbone 6M
  const [fishbones, setFishbones] = useState<FishboneItem[]>([]);

  // Section 7a: 5 Whys
  const [whys, setWhys] = useState<WhyItem[]>([
    { level: 1, question: 'ทำไมถึงเกิดเหตุการณ์นี้?', answer: '' },
    { level: 2, question: 'ทำไมถึงเกิดสาเหตุในข้อ 1?', answer: '' },
    { level: 3, question: 'ทำไมถึงเกิดสาเหตุในข้อ 2?', answer: '' },
    { level: 4, question: 'ทำไมถึงเกิดสาเหตุในข้อ 3?', answer: '' },
    { level: 5, question: 'ทำไม (สาเหตุรากเหง้าเชิงระบบ)?', answer: '' },
  ]);

  // Section 7b: Swiss Cheese Model (4 Layers)
  const [swissCheeseOrg, setSwissCheeseOrg] = useState('');
  const [swissCheeseSupervision, setSwissCheeseSupervision] = useState('');
  const [swissCheesePreconditions, setSwissCheesePreconditions] = useState('');
  const [swissCheeseUnsafeActs, setSwissCheeseUnsafeActs] = useState('');

  // Section 8: CAPA Action Plan
  const [capas, setCapas] = useState<CapaItem[]>([
    {
      action: '',
      type: 'preventive',
      responsible: 'คณะกรรมการบริหารความเสี่ยง (RM)',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'pending',
    },
  ]);

  // Section 9: Review Sessions
  const [reviewSessions, setReviewSessions] = useState<ReviewSessionItem[]>([
    {
      session_no: 1,
      review_date_time: new Date().toISOString().slice(0, 16),
      reviewers: user?.name ? `${user.name} (ผู้บันทึก)` : 'คณะทำงาน RCA',
      notes: 'การประชุมทบทวนรอบแรกเพื่อรวบรวมข้อเท็จจริงและลำดับเหตุการณ์',
    },
  ]);

  // Load existing case or pre-load from location state
  useEffect(() => {
    if (id && id !== 'new') {
      loadCaseData(id);
    } else {
      // Check location state from Trigger Tool or Incident Detail
      const state = location.state as any;
      if (state) {
        if (state.source_trigger_review_id) {
          setSourceTriggerReviewId(state.source_trigger_review_id);
        }
        if (state.topic || state.risk_name) {
          setTopic(state.topic || state.risk_name || '');
        }
        if (state.severity_level || state.level_id) {
          setSeverity(state.severity_level || state.level_id || 'G');
        }
        if (state.what_happened || state.ae_description || state.detail) {
          setWhatHappened(state.what_happened || state.ae_description || state.detail || '');
        }
        if (state.incident_date || state.date_risk) {
          const d = state.incident_date || state.date_risk;
          setIncidentDate(d.slice(0, 10));
        }
        if (state.rm_no) {
          setRmNo(state.rm_no);
        }
      }
    }
  }, [id, location.state]);

  const loadCaseData = async (caseIdToLoad: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/rca/standard/${caseIdToLoad}`);
      const data = res.data;
      setCaseId(data.id);
      setRmNo(data.rm_no || '');
      setTopic(data.topic || '');
      setSeverity(data.severity || 'G');
      if (data.incident_date) setIncidentDate(data.incident_date.slice(0, 10));
      
      if (STANDARD_RCA_TEAMS.includes(data.rca_team)) {
        setRcaTeam(data.rca_team);
      } else if (data.rca_team) {
        setRcaTeam('other');
        setCustomTeam(data.rca_team);
      }
      
      setIsNotRisk(data.is_not_risk ?? false);
      setWhatHappened(data.what_happened || '');
      setActualImpact(data.actual_impact || '');
      setPotentialImpact(data.potential_impact || '');
      setStatus(data.status || 'in_progress');
      setSourceTriggerReviewId(data.source_trigger_review_id);

      setInfoInterview(data.info_interview ?? true);
      setInfoCctv(data.info_cctv ?? false);
      setInfoDocument(data.info_document ?? true);
      setInfoInspection(data.info_inspection ?? true);

      if (data.timelines?.length) setTimelines(data.timelines);
      if (data.whys?.length) setWhys(data.whys);
      if (data.fishbones?.length) {
        setFishbones(data.fishbones);
        setUseFishbone(true);
      }
      if (data.process_analyses?.length) setProcessAnalyses(data.process_analyses);
      if (data.capas?.length) setCapas(data.capas);
      if (data.review_sessions?.length) {
        setReviewSessions(
          data.review_sessions.map((s: any, idx: number) => ({
            session_no: idx + 1,
            review_date_time: s.review_date_time ? s.review_date_time.slice(0, 16) : '',
            reviewers: s.reviewers || '',
            notes: s.notes || '',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load standard RCA case', err);
    } finally {
      setLoading(false);
    }
  };

  // AI Modal Apply Handler
  const handleApplyAiData = (aiData: any, selectedKeys: string[]) => {
    if (selectedKeys.includes('problem_impact')) {
      if (aiData.topic_refined && !topic) setTopic(aiData.topic_refined);
      if (aiData.what_happened_summary) setWhatHappened(aiData.what_happened_summary);
      if (aiData.actual_impact_summary) setActualImpact(aiData.actual_impact_summary);
      if (aiData.potential_impact_summary) setPotentialImpact(aiData.potential_impact_summary);
    }

    if (selectedKeys.includes('fishbone') && aiData.fishbones?.length) {
      setFishbones(
        aiData.fishbones.map((f: any, idx: number) => ({
          category: f.category === 'man' ? 'people' : f.category === 'milieu' ? 'environment' : f.category,
          factor: f.factor,
          sub_factor: f.sub_factor,
          sort_order: idx + 1,
        }))
      );
      setUseFishbone(true);
    }

    if (selectedKeys.includes('whys') && aiData.whys?.length) {
      setWhys(aiData.whys);
    }

    if (selectedKeys.includes('cmps') && aiData.cmps?.length) {
      setCmps(aiData.cmps);
    }

    if (selectedKeys.includes('process') && aiData.process_analyses?.length) {
      setProcessAnalyses(aiData.process_analyses);
    }

    if (selectedKeys.includes('swiss_cheese') && aiData.swiss_cheeses?.length) {
      setUseSwissCheese(true);
      aiData.swiss_cheeses.forEach((sc: any) => {
        if (sc.layer.includes('องค์กร')) setSwissCheeseOrg(sc.hole);
        else if (sc.layer.includes('นิเทศ')) setSwissCheeseSupervision(sc.hole);
        else if (sc.layer.includes('สภาพแวดล้อม')) setSwissCheesePreconditions(sc.hole);
        else if (sc.layer.includes('การกระทำ')) setSwissCheeseUnsafeActs(sc.hole);
      });
    }

    if (selectedKeys.includes('capa') && aiData.capas?.length) {
      setCapas(aiData.capas);
    }

    if (selectedKeys.includes('timeline') && aiData.timelines?.length) {
      setTimelines(aiData.timelines);
    }

    if (selectedKeys.includes('team')) {
      if (aiData.rca_team_suggestion) {
        setRcaTeam('other');
        setCustomTeam(aiData.rca_team_suggestion);
      }
    }
  };

  // Trigger Tool Item Select
  const handleSelectTrigger = (item: (typeof TRIGGER_TOOL_ITEMS)[0]) => {
    setTopic(`[${item.code}] ${item.name}`);
    setSeverity(item.defaultSeverity);
    setIsTriggerModalOpen(false);
  };

  // Timeline Step Handlers
  const handleAddTimelineStep = () => {
    setTimelines([
      ...timelines,
      { event_time: '', event_description: '', is_critical_point: false },
    ]);
  };

  const handleRemoveTimelineStep = (idx: number) => {
    setTimelines(timelines.filter((_, i) => i !== idx));
  };

  const handleTimelineChange = (idx: number, field: keyof TimelineItem, val: any) => {
    const updated = [...timelines];
    updated[idx] = { ...updated[idx], [field]: val };
    setTimelines(updated);
  };

  // CMP Handlers
  const handleAddCmp = () => {
    setCmps([...cmps, { observation: '', hypothesis: '', comment: '' }]);
  };

  const handleRemoveCmp = (idx: number) => {
    setCmps(cmps.filter((_, i) => i !== idx));
  };

  const handleCmpChange = (idx: number, field: keyof CmpItem, val: string) => {
    const updated = [...cmps];
    updated[idx] = { ...updated[idx], [field]: val };
    setCmps(updated);
  };

  // CAPA Handlers
  const handleAddCapa = () => {
    setCapas([
      ...capas,
      {
        action: '',
        type: 'preventive',
        responsible: rcaTeam === 'other' ? customTeam : rcaTeam,
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'pending',
      },
    ]);
  };

  const handleRemoveCapa = (idx: number) => {
    setCapas(capas.filter((_, i) => i !== idx));
  };

  const handleCapaChange = (idx: number, field: keyof CapaItem, val: any) => {
    const updated = [...capas];
    updated[idx] = { ...updated[idx], [field]: val };
    setCapas(updated);
  };

  // Review Session Handlers
  const handleAddReviewSession = () => {
    setReviewSessions([
      ...reviewSessions,
      {
        session_no: reviewSessions.length + 1,
        review_date_time: new Date().toISOString().slice(0, 16),
        reviewers: user?.name || 'คณะทำงาน RCA',
        notes: '',
      },
    ]);
  };

  const handleRemoveReviewSession = (idx: number) => {
    setReviewSessions(reviewSessions.filter((_, i) => i !== idx));
  };

  const handleSetCurrentTimeSession = (idx: number) => {
    const updated = [...reviewSessions];
    updated[idx].review_date_time = new Date().toISOString().slice(0, 16);
    setReviewSessions(updated);
  };

  // Form Save
  const handleSave = async (markAsNotRisk = isNotRisk) => {
    if (!topic.trim()) {
      alert('กรุณาระบุหัวข้อเรื่องการทำ RCA');
      return;
    }

    setSaving(true);
    const finalTeam = rcaTeam === 'other' ? customTeam : rcaTeam;

    const payload = {
      id: caseId || undefined,
      rm_no: rmNo || undefined,
      source_trigger_review_id: sourceTriggerReviewId,
      topic,
      severity,
      incident_date: incidentDate || undefined,
      rca_team: finalTeam,
      is_not_risk: markAsNotRisk,
      what_happened: whatHappened,
      actual_impact: actualImpact,
      potential_impact: potentialImpact,
      info_interview: infoInterview,
      info_cctv: infoCctv,
      info_document: infoDocument,
      info_inspection: infoInspection,
      status: markAsNotRisk ? 'closed' : status,
      created_by: user?.id || 1,
      timelines: timelines.filter((t) => t.event_description.trim() || t.event_time.trim()),
      whys: whys.filter((w) => w.answer.trim()),
      fishbones: useFishbone ? fishbones : [],
      process_analyses: processAnalyses.filter((p) => p.problem.trim() || p.corrective_action.trim()),
      capas: capas.filter((c) => c.action.trim()),
      review_sessions: reviewSessions.map((s) => ({
        reviewers: s.reviewers,
        review_date_time: s.review_date_time ? new Date(s.review_date_time).toISOString() : null,
        notes: s.notes,
      })),
    };

    try {
      if (id && id !== 'new') {
        await axios.patch(`/rca/standard/${id}`, payload);
      } else {
        const res = await axios.post('/rca/standard', payload);
        setCaseId(res.data.id);
      }
      alert('บันทึกข้อมูล Standard RCA รพ.วังเจ้า เรียบร้อยแล้ว!');
      navigate('/rca/list');
    } catch (err) {
      console.error('Failed to save standard RCA', err);
      alert('เกิดข้อผิดพลาดในการบันทึก Standard RCA');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotRisk = () => {
    const nextState = !isNotRisk;
    setIsNotRisk(nextState);
    if (nextState) {
      if (window.confirm('คุณต้องการทำเครื่องหมายว่า "ทบทวนแล้ว ไม่ใช่ความเสี่ยง (Not a Risk)" และบันทึกข้อมูลใช่หรือไม่?')) {
        handleSave(true);
      }
    }
  };

  const filteredTriggers = TRIGGER_TOOL_ITEMS.filter(
    (t) =>
      t.code.toLowerCase().includes(triggerSearch.toLowerCase()) ||
      t.name.toLowerCase().includes(triggerSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(triggerSearch.toLowerCase())
  );

  const clinicalSeverities = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const generalSeverities = ['1', '2', '3', '4', '5'];

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">กำลังโหลดแบบฟอร์ม Standard RCA รพ.วังเจ้า...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-28">
      {/* 1. Header Banner with AI Assistant Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden transition-all">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate('/rca/list')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> กลับหน้ารวมรายการ RCA
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  แบบฟอร์มวิเคราะห์สาเหตุเชิงลึก (Standard RCA)
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  รพ.วังเจ้า มาตรฐาน 9 ส่วน
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Case ID: {caseId || 'สร้างเคสใหม่'} {sourceTriggerReviewId ? `(เชื่อมโยงจาก Trigger Tool Review #${sourceTriggerReviewId})` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>✨ ผู้ช่วย AI วิเคราะห์ RCA</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>พิมพ์รายงาน HA</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
          </button>
        </div>
      </div>

      {/* Main 9 Sections Form Body (No nested <form> tags) */}
      <div className="space-y-8">
        {/* ================= SECTION 1: GENERAL METADATA ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                1
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                ข้อมูลทั่วไปของอุบัติการณ์ (General & Incident Metadata)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsTriggerModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              <span>เลือกจาก Trigger Tool (11 หมวด)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                หัวข้อเรื่อง / ประเด็นความเสี่ยงหลัก (Incident Topic) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น การให้ยา High Alert Drug ไม่ตรงตามคำสั่งแพทย์ในเวรดึก"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                วันที่และเวลาเกิดเหตุ
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* RCA Team Dropdown */}
            <div className="md:col-span-6 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ทีมงานผู้วิเคราะห์ (RCA Team)
              </label>
              <select
                value={rcaTeam}
                onChange={(e) => setRcaTeam(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {STANDARD_RCA_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="other">ระบุทีมอื่น ๆ หรือทีมร่วมเฉพาะกิจ...</option>
              </select>

              {rcaTeam === 'other' && (
                <input
                  type="text"
                  value={customTeam}
                  onChange={(e) => setCustomTeam(e.target.value)}
                  placeholder="พิมพ์ระบุชื่อทีมหรือคณะทำงานร่วม..."
                  className="w-full mt-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-indigo-300 dark:border-indigo-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>

            {/* RM No */}
            <div className="md:col-span-6 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                เลขที่รายงานความเสี่ยง (RM No. / Incident ID)
              </label>
              <input
                type="text"
                value={rmNo}
                onChange={(e) => setRmNo(e.target.value)}
                placeholder="เช่น RM-2568-089"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* รายละเอียดเหตุการณ์ที่เกิดขึ้น (Incident Description / What Happened) */}
            <div className="md:col-span-12 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  รายละเอียดเหตุการณ์ที่เกิดขึ้น / ข้อเท็จจริงของความเสี่ยง (Incident Description)
                </label>
                {whatHappened && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    ✓ ดึงข้อมูลรายละเอียดความเสี่ยงมาให้อัตโนมัติ
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="รายละเอียดข้อเท็จจริงของเหตุการณ์ความเสี่ยงที่เกิดขึ้นตามลำดับ..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Severity Matrix */}
            <div className="md:col-span-12 space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ระดับความรุนแรง (Severity Matrix)
                </label>
                <span className="text-xs text-slate-500">
                  ระดับปัจจุบัน: <span className="font-bold text-indigo-600 dark:text-indigo-400">{severity}</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  ความรุนแรงทางคลินิก (Clinical: A - I)
                </span>
                <div className="flex flex-wrap gap-2">
                  {clinicalSeverities.map((lvl) => {
                    const isSelected = severity === lvl;
                    const isSevere = ['G', 'H', 'I'].includes(lvl);
                    const isModerate = ['E', 'F'].includes(lvl);
                    const isLow = ['C', 'D'].includes(lvl);

                    let bgClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200';
                    if (isSelected) {
                      if (isSevere) bgClass = 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400';
                      else if (isModerate) bgClass = 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-300';
                      else if (isLow) bgClass = 'bg-yellow-500 text-white shadow-md shadow-yellow-500/30 ring-2 ring-yellow-300';
                      else bgClass = 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300';
                    }

                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSeverity(lvl)}
                        className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${bgClass}`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  ความรุนแรงทั่วไป (General: ระดับ 1 - 5)
                </span>
                <div className="flex flex-wrap gap-2">
                  {generalSeverities.map((lvl) => {
                    const isSelected = severity === lvl;
                    const isHigh = ['4', '5'].includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSeverity(lvl)}
                        className={`px-4 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                          isSelected
                            ? isHigh
                              ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-md'
                              : 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        ระดับ {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sources of Information */}
            <div className="md:col-span-12 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                แหล่งข้อมูลที่ใช้ในการทบทวน (Sources of Information)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={infoInterview}
                    onChange={(e) => setInfoInterview(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>สัมภาษณ์ผู้เกี่ยวข้อง</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={infoCctv}
                    onChange={(e) => setInfoCctv(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>ตรวจสอบกล้อง CCTV</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={infoDocument}
                    onChange={(e) => setInfoDocument(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>ทบทวนเวชระเบียน / Log</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={infoInspection}
                    onChange={(e) => setInfoInspection(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>ตรวจสถานที่เกิดเหตุจริง</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 2: PROBLEM & IMPACT ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              2
            </span>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              รายละเอียดสถานการณ์และผลกระทบ (Problem & Impact)
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                สิ่งที่เกิดขึ้นจริง (What Happened?)
              </label>
              <textarea
                rows={3}
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="ระบุข้อเท็จจริงของเหตุการณ์ที่เกิดขึ้นตามลำดับอย่างกระชับและชัดเจน..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">
                  ผลกระทบที่เกิดขึ้นจริง (Actual Impact)
                </label>
                <textarea
                  rows={3}
                  value={actualImpact}
                  onChange={(e) => setActualImpact(e.target.value)}
                  placeholder="ผลกระทบต่อผู้ป่วย ญาติ เจ้าหน้าที่ หรือชื่อเสียงของโรงพยาบาล..."
                  className="w-full px-4 py-3 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-400">
                  ผลกระทบที่อาจเกิดขึ้นหากไม่แก้ไข (Potential Impact)
                </label>
                <textarea
                  rows={3}
                  value={potentialImpact}
                  onChange={(e) => setPotentialImpact(e.target.value)}
                  placeholder="ความเสี่ยงหรือความรุนแรงสูงสุดที่อาจเกิดขึ้นหากเกิดเหตุการณ์ซ้ำ..."
                  className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 3: INCIDENT TIMELINE ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                3
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  เส้นเวลาของลำดับเหตุการณ์ (Incident Timeline)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  บันทึกลำดับเหตุการณ์ตามช่วงเวลา พร้อมระบุจุดวิกฤต (Critical Point)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddTimelineStep}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มช่วงเวลา</span>
            </button>
          </div>

          <div className="space-y-3">
            {timelines.map((t, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
                  t.is_critical_point
                    ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/50'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="w-full sm:w-36 shrink-0">
                  <input
                    type="text"
                    value={t.event_time}
                    onChange={(e) => handleTimelineChange(idx, 'event_time', e.target.value)}
                    placeholder="เช่น 10:30 น."
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 text-center"
                  />
                </div>

                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={t.event_description}
                    onChange={(e) =>
                      handleTimelineChange(idx, 'event_description', e.target.value)
                    }
                    placeholder="ระบุสิ่งที่เกิดขึ้นในช่วงเวลานี้..."
                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <input
                      type="checkbox"
                      checked={t.is_critical_point || false}
                      onChange={(e) =>
                        handleTimelineChange(idx, 'is_critical_point', e.target.checked)
                      }
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>จุดวิกฤต</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveTimelineStep(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 4: REVIEWERS & CMPS ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                4
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  การทบทวนจากผู้เกี่ยวข้อง และวิเคราะห์ CMPs (Care Management Problems)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ปัญหาในกระบวนการดูแลรักษา สมมติฐานเชิงสาเหตุ และความเห็นแนวทางแก้ไขทันที
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCmp}
              className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มข้อสังเกต CMP</span>
            </button>
          </div>

          <div className="space-y-4">
            {cmps.map((cmp, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-teal-50/30 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                    ประเด็น CMP ข้อที่ {idx + 1}
                  </span>
                  {cmps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCmp(idx)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      สิ่งที่สังเกตพบ (CMPs)
                    </label>
                    <textarea
                      rows={2}
                      value={cmp.observation}
                      onChange={(e) => handleCmpChange(idx, 'observation', e.target.value)}
                      placeholder="เช่น ขาดการทำ Double Check ยา HAD..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      สมมติฐาน / ปัจจัยที่เป็นอุปสรรค
                    </label>
                    <textarea
                      rows={2}
                      value={cmp.hypothesis}
                      onChange={(e) => handleCmpChange(idx, 'hypothesis', e.target.value)}
                      placeholder="เช่น ภาระงานเร่งด่วนในเวรดึก ขาดระบบแจ้งเตือน..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      ความเห็นและแนวทางแก้ไขทันที
                    </label>
                    <textarea
                      rows={2}
                      value={cmp.comment}
                      onChange={(e) => handleCmpChange(idx, 'comment', e.target.value)}
                      placeholder="เช่น กำหนดให้มี Checklist ติดหน้าตู้ยาทันที..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 5: CLINICAL PROCESS (10 STEPS & 5 TIERS) ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              5
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                การวิเคราะห์กระบวนการดูแลรักษา (Clinical Process 10 Steps & 5 Tiers)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                  มาตรฐาน (Standard)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                วิเคราะห์เจาะลึก 5 ลำดับชั้นปัจจัย (บุคลากร, ทีมงาน, สิ่งแวดล้อม, นโยบาย, ภายนอก) ในแต่ละขั้นตอนการดูแล
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                เลือกขั้นตอนการดูแลรักษาที่พบปัญหา
              </label>
              <select
                value={selectedProcessKey}
                onChange={(e) => {
                  setSelectedProcessKey(e.target.value);
                  if (!processAnalyses.find((p) => p.process_key === e.target.value)) {
                    setProcessAnalyses([
                      ...processAnalyses,
                      {
                        process_key: e.target.value,
                        problem: '',
                        tier1_personnel: '',
                        tier2_teamwork: '',
                        tier3_environment: '',
                        tier4_policy: '',
                        tier5_external: '',
                        corrective_action: '',
                      },
                    ]);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {CLINICAL_CARE_STEPS.map((step) => (
                  <option key={step} value={step}>
                    {step}
                  </option>
                ))}
              </select>
            </div>

            {/* 5 Tiers Input for selected process */}
            {(() => {
              const currentItem =
                processAnalyses.find((p) => p.process_key === selectedProcessKey) || {
                  process_key: selectedProcessKey,
                  problem: '',
                  tier1_personnel: '',
                  tier2_teamwork: '',
                  tier3_environment: '',
                  tier4_policy: '',
                  tier5_external: '',
                  corrective_action: '',
                };

              const updateCurrentItem = (field: keyof ProcessAnalysisItem, val: string) => {
                const idx = processAnalyses.findIndex((p) => p.process_key === selectedProcessKey);
                if (idx >= 0) {
                  const updated = [...processAnalyses];
                  updated[idx] = { ...updated[idx], [field]: val };
                  setProcessAnalyses(updated);
                } else {
                  setProcessAnalyses([
                    ...processAnalyses,
                    { ...currentItem, [field]: val },
                  ]);
                }
              };

              return (
                <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      ปัญหาที่พบในขั้นตอนนี้ (Process Breakdown / Failure)
                    </label>
                    <input
                      type="text"
                      value={currentItem.problem}
                      onChange={(e) => updateCurrentItem('problem', e.target.value)}
                      placeholder="ระบุความคลาดเคลื่อนหรืออุปสรรคที่เกิดขึ้นในขั้นตอนนี้..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Tier 1: บุคลากร
                      </label>
                      <textarea
                        rows={2}
                        value={currentItem.tier1_personnel}
                        onChange={(e) => updateCurrentItem('tier1_personnel', e.target.value)}
                        placeholder="ทักษะ, ความเหนื่อยล้า..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Tier 2: ทีมงาน
                      </label>
                      <textarea
                        rows={2}
                        value={currentItem.tier2_teamwork}
                        onChange={(e) => updateCurrentItem('tier2_teamwork', e.target.value)}
                        placeholder="การสื่อสาร, การส่งเวร..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Tier 3: สิ่งแวดล้อม/อุปกรณ์
                      </label>
                      <textarea
                        rows={2}
                        value={currentItem.tier3_environment}
                        onChange={(e) => updateCurrentItem('tier3_environment', e.target.value)}
                        placeholder="แสงสว่าง, เครื่องมือ..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Tier 4: นโยบาย/องค์กร
                      </label>
                      <textarea
                        rows={2}
                        value={currentItem.tier4_policy}
                        onChange={(e) => updateCurrentItem('tier4_policy', e.target.value)}
                        placeholder="แนวทาง CPG, กำลังคน..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Tier 5: ปัจจัยภายนอก
                      </label>
                      <textarea
                        rows={2}
                        value={currentItem.tier5_external}
                        onChange={(e) => updateCurrentItem('tier5_external', e.target.value)}
                        placeholder="ผู้ป่วย/ญาติ, บริษัทยา..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      แนวทางแก้ไขเฉพาะกระบวนการนี้ (Process Corrective Action)
                    </label>
                    <input
                      type="text"
                      value={currentItem.corrective_action}
                      onChange={(e) => updateCurrentItem('corrective_action', e.target.value)}
                      placeholder="มาตรการปรับปรุงกระบวนการดูแลรักษาเฉพาะจุดนี้..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* ================= SECTION 6: FISHBONE DIAGRAM 6M (COLLAPSIBLE / OPTIONAL) ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                6
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>แผนผังก้างปลา 6M (Fishbone Diagram Analysis)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
                    {useFishbone ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  วิเคราะห์สาเหตุและปัจจัยเชิงระบบ 6 ด้าน (Man, Method, Machine, Material, Measurement, Milieu/Environment)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUseFishbone(!useFishbone)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                useFishbone
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{useFishbone ? '✓ ใช้เครื่องมือผังก้างปลา' : '+ เปิดใช้เครื่องมือผังก้างปลา'}</span>
              {useFishbone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {useFishbone && (
            <div className="animate-in fade-in">
              <FishboneDiagram
                factors={fishbones}
                topic={topic || 'อุบัติการณ์ความเสี่ยง รพ.วังเจ้า'}
                onChange={setFishbones}
              />
            </div>
          )}
        </section>

        {/* ================= SECTION 7: 5 WHYS & SWISS CHEESE MODEL ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                7
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  การขุดค้นสาเหตุ 5 Whys และแบบจำลองชีสสวิส (Swiss Cheese Model)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ถามเจาะลึก 5 ระดับเพื่อค้นหารากเหง้าเชิงระบบ และวิเคราะห์ช่องโหว่ของแนวป้องกัน 4 ชั้น
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUseSwissCheese(!useSwissCheese)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                useSwissCheese
                  ? 'bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{useSwissCheese ? '✓ แสดงแบบจำลองชีสสวิส' : '+ เปิดใช้เครื่องมือชีสสวิส (Swiss Cheese)'}</span>
              {useSwissCheese ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* 7a. 5 Whys Chain */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>ลำดับการวิเคราะห์ 5 Whys (Five Whys Root Cause Chain)</span>
            </h4>

            {whys.map((w, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                <div className="w-full sm:w-48 shrink-0">
                  <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                    Why #{w.level}: {w.question}
                  </span>
                </div>
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={w.answer}
                    onChange={(e) => {
                      const updated = [...whys];
                      updated[idx].answer = e.target.value;
                      setWhys(updated);
                    }}
                    placeholder={`ตอบสาเหตุระดับที่ ${w.level}...`}
                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 7b. Swiss Cheese Model (Collapsible) */}
          {useSwissCheese && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
              <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>ช่องโหว่ของแนวป้องกัน 4 ระดับ (Swiss Cheese Defense Layers)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                  <label className="block text-xs font-bold text-purple-800 dark:text-purple-300">
                    1. การบริหารองค์กรและนโยบาย (Organizational Influences)
                  </label>
                  <textarea
                    rows={2}
                    value={swissCheeseOrg}
                    onChange={(e) => setSwissCheeseOrg(e.target.value)}
                    placeholder="ระบุนโยบาย วัฒนธรรมความปลอดภัย หรือทรัพยากรที่มีช่องโหว่..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                  <label className="block text-xs font-bold text-blue-800 dark:text-blue-300">
                    2. การกำกับดูแลและหัวหน้างาน (Unsafe Supervision)
                  </label>
                  <textarea
                    rows={2}
                    value={swissCheeseSupervision}
                    onChange={(e) => setSwissCheeseSupervision(e.target.value)}
                    placeholder="การนิเทศงาน การฝึกอบรม หรือการมอบหมายงานที่มีข้อบกพร่อง..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <label className="block text-xs font-bold text-amber-800 dark:text-amber-300">
                    3. สภาพแวดล้อมและเงื่อนไขหน้างาน (Preconditions)
                  </label>
                  <textarea
                    rows={2}
                    value={swissCheesePreconditions}
                    onChange={(e) => setSwissCheesePreconditions(e.target.value)}
                    placeholder="ความเหนื่อยล้า ภาระงานล้น สิ่งรบกวนสมาธิ อุปกรณ์ไม่พร้อม..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                  <label className="block text-xs font-bold text-rose-800 dark:text-rose-300">
                    4. การกระทำที่ไม่ปลอดภัยหน้างาน (Unsafe Acts)
                  </label>
                  <textarea
                    rows={2}
                    value={swissCheeseUnsafeActs}
                    onChange={(e) => setSwissCheeseUnsafeActs(e.target.value)}
                    placeholder="ความพลั้งเผลอ (Slip/Lapse), การเข้าใจผิด, หรือการข้ามขั้นตอน..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ================= SECTION 8: CAPA ACTION PLAN ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                8
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  แผนปฏิบัติการแก้ไขและป้องกัน (CAPA Action Plan)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  มาตรการแก้ไขเฉพาะหน้า ป้องกันการเกิดซ้ำ และปรับปรุงระบบความปลอดภัย
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCapa}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มมาตรการ CAPA</span>
            </button>
          </div>

          <div className="space-y-3">
            {capas.map((c, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    มาตรการที่ {idx + 1}
                  </span>
                  {capas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCapa(idx)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      มาตรการที่ต้องดำเนินการ
                    </label>
                    <input
                      type="text"
                      value={c.action}
                      onChange={(e) => handleCapaChange(idx, 'action', e.target.value)}
                      placeholder="ระบุกิจกรรม/มาตรการที่ต้องทำ..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      ประเภทมาตรการ
                    </label>
                    <select
                      value={c.type}
                      onChange={(e) => handleCapaChange(idx, 'type', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="immediate">แก้ไขเฉพาะหน้า</option>
                      <option value="preventive">ป้องกันการเกิดซ้ำ</option>
                      <option value="systemic">ปรับปรุงเชิงระบบ</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      ผู้รับผิดชอบ
                    </label>
                    <input
                      type="text"
                      value={c.responsible}
                      onChange={(e) => handleCapaChange(idx, 'responsible', e.target.value)}
                      placeholder="หน่วยงาน/บุคคล..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      กำหนดเสร็จ
                    </label>
                    <input
                      type="date"
                      value={c.due_date}
                      onChange={(e) => handleCapaChange(idx, 'due_date', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 9: REVIEW SESSIONS ================= */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                9
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  รายชื่อและประวัติการทบทวน (Review Sessions & Attendance)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  บันทึกรอบการประชุมทบทวน วันที่ เวลา และรายชื่อคณะผู้ร่วมวิเคราะห์
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddReviewSession}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มรอบการประชุม</span>
            </button>
          </div>

          <div className="space-y-4">
            {reviewSessions.map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    การทบทวนครั้งที่ {s.session_no}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetCurrentTimeSession(idx)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium hover:bg-indigo-200 transition"
                    >
                      🕒 ใส่วันเวลาปัจจุบัน
                    </button>
                    {reviewSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewSession(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      วันและเวลาประชุมทบทวน
                    </label>
                    <input
                      type="datetime-local"
                      value={s.review_date_time}
                      onChange={(e) => {
                        const updated = [...reviewSessions];
                        updated[idx].review_date_time = e.target.value;
                        setReviewSessions(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-8 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      รายชื่อผู้เข้าร่วมการทบทวน
                    </label>
                    <input
                      type="text"
                      value={s.reviewers}
                      onChange={(e) => {
                        const updated = [...reviewSessions];
                        updated[idx].reviewers = e.target.value;
                        setReviewSessions(updated);
                      }}
                      placeholder="เช่น นพ.ประธาน PCT, พว.หัวหน้าตึก, เภสัชกรประจำหอผู้ป่วย..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-12 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      สรุปมติที่ประชุม / ข้อสังเกตเพิ่มเติม
                    </label>
                    <textarea
                      rows={2}
                      value={s.notes}
                      onChange={(e) => {
                        const updated = [...reviewSessions];
                        updated[idx].notes = e.target.value;
                        setReviewSessions(updated);
                      }}
                      placeholder="บันทึกข้อสรุป มติ หรือประเด็นที่ต้องติดตามต่อ..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= BOTTOM ACTION BAR & NOT A RISK TOGGLE ================= */}
        <section className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleNotRisk}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                isNotRisk
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isNotRisk ? 'text-white' : 'text-amber-400'}`} />
              <span>{isNotRisk ? '✓ ทบทวนแล้ว: ไม่ใช่ความเสี่ยง (Not a Risk)' : 'ทบทวนแล้ว: ไม่ใช่ความเสี่ยง (Not a Risk)'}</span>
            </button>
            {isNotRisk && (
              <span className="text-xs text-rose-300 font-medium">
                * เคสนี้จะถูกจัดเป็น Not a Risk และปิดสถานะการทบทวน
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/rca/list')}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกข้อมูล RCA'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* ================= TRIGGER TOOL QUICK SELECTOR MODAL ================= */}
      {isTriggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">เลือกรายการจาก Trigger Tool (รพ.วังเจ้า 1/2568)</h3>
              </div>
              <button
                onClick={() => setIsTriggerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={triggerSearch}
                  onChange={(e) => setTriggerSearch(e.target.value)}
                  placeholder="ค้นหารหัส Trigger หรือชื่อเหตุการณ์..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredTriggers.map((item) => (
                <div
                  key={item.code}
                  onClick={() => handleSelectTrigger(item)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-white dark:bg-slate-900 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 cursor-pointer transition flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono">
                        {item.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        หมวด: {item.category}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                      {item.name}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                    ระดับ {item.defaultSeverity}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI RCA ASSISTANT MODAL ================= */}
      <AiRcaAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        topic={topic}
        whatHappened={whatHappened}
        actualImpact={actualImpact}
        severity={severity}
        onApply={handleApplyAiData}
      />
    </div>
  );
}
