import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  Database,
  Link2,
  Users,
  MessageSquareText,
} from 'lucide-react';
import type { TimelineItem } from '../../components/rca/EventTimeline';
import { TierContributingFactorPicker } from '../../components/rca/TierContributingFactorPicker';
import { AiRcaAssistantModal } from '../../components/rca/AiRcaAssistantModal';
import { useAuth } from '../../contexts/AuthContext';
import { OfficialPrintFooter, OfficialPrintHeader } from '../../components/OfficialPrintLayout';
import { printOfficialReport } from '../../utils/officialPrint';
import {
  contributingFactorSelectionsFromLegacy,
  contributingFactorSelectionsToLegacy,
  getContributingFactor,
  normalizeContributingFactorSelections,
  type ContributingFactorSelection,
  type LegacyCauseFactor,
} from '../../utils/contributingFactors';

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
  'การเข้าถึง/เข้ารับบริการ (Access/Entry)',
  'การประเมิน/การส่งตรวจ (Assessment/Investigation)',
  'การวินิจฉัย (Diagnosis)',
  'วางแผนดูแล (Plan of Care)',
  'การดูแลรักษาผู้ป่วย (Care of Patient)',
  'ประเมินซ้ำ (Reassess)',
  'การสื่อสารให้ข้อมูลผู้ป่วย (Communication)',
  'แผนจำหน่าย (Discharge Plan)',
  'ให้ความรู้/เสริมพลัง (Empowerment)',
  'จำหน่าย/ดูแลต่อเนื่อง (Discharge)',
  'อื่นๆ (ระบุเอง)',
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
  effectiveness_criteria?: string;
  baseline_value?: string;
  target_value?: string;
  effectiveness_due_date?: string;
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

interface ReviewParticipantItem {
  participant_type: 'PERSON' | 'DEPARTMENT' | 'TEAM' | 'EXPERT';
  display_name: string;
  role: 'OWNER' | 'FACILITATOR' | 'INFORMANT' | 'ANALYST' | 'APPROVER';
  department_id?: string;
  team_id?: number;
  purpose: string;
  response_status: 'NOT_REQUIRED' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
  responded_at?: string;
  is_owner: boolean;
}

interface VoiceOfStaffItem {
  interviewee_name: string;
  interviewee_role: string;
  interviewee_department: string;
  interview_date: string;
  work_context: string;
  key_points: string;
  contributing_conditions: string;
  suggestions: string;
}

interface DepartmentOption {
  id: number;
  depart_name: string;
}

interface TeamOption {
  id: number;
  team_name: string;
}

interface IncidentSource {
  id: number;
  id_risk?: number;
  rm_no?: string;
  nrls_code?: string;
  nrls_name?: string;
  nrls_name_snapshot?: string;
  incident_topic?: string;
  incident_description?: string;
  risk_topic_name?: string;
  detail?: string;
  problem_basic?: string;
  level_id?: string;
  date_report?: string;
  status_risk?: string;
  department_id?: string;
}

const PROCESS_TIER_FIELD_NUMBER: Partial<Record<keyof ProcessAnalysisItem, number>> = {
  tier1_personnel: 1,
  tier2_teamwork: 2,
  tier3_environment: 3,
  tier4_policy: 4,
  tier5_external: 5,
};

export default function StandardRcaForm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const latestDraftPayloadRef = useRef<any>(null);
  const lastAutoSavedFingerprintRef = useRef('');

  // Modals & UI Toggles
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState('');
  const [useSwissCheese, setUseSwissCheese] = useState(false);
  const [guidedMode, setGuidedMode] = useState(true);
  const [activeStep, setActiveStep] = useState('rca-facts');

  // Section 1: General Metadata
  const [caseId, setCaseId] = useState(id || '');
  const [rmNo, setRmNo] = useState('');
  const [topic, setTopic] = useState('');
  const [severity, setSeverity] = useState('G');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [rcaTeam, setRcaTeam] = useState('other');
  const [customTeam, setCustomTeam] = useState('หน่วยงานเจ้าของเรื่อง');
  const [isNotRisk, setIsNotRisk] = useState(false);
  const [status, setStatus] = useState('in_progress');
  const [riskProfiles, setRiskProfiles] = useState<any[]>([]);
  const [selectedRiskProfileId, setSelectedRiskProfileId] = useState('');
  const [riskDescription, setRiskDescription] = useState('');
  const [riskOwnerName, setRiskOwnerName] = useState('');
  const [initialLikelihood, setInitialLikelihood] = useState(1);
  const [reviewFrequencyMonths, setReviewFrequencyMonths] = useState(3);
  const [reviewOutcome, setReviewOutcome] = useState('IN_PROGRESS');
  const [supportRequestPurpose, setSupportRequestPurpose] = useState('PROCESS_ANALYSIS');
  const [supportTargetName, setSupportTargetName] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [sourceTriggerReviewId, setSourceTriggerReviewId] = useState<number | undefined>(undefined);
  const [incidentId, setIncidentId] = useState<number | undefined>(undefined);
  const [sourceIncident, setSourceIncident] = useState<IncidentSource | null>(null);
  const [incidentCandidates, setIncidentCandidates] = useState<IncidentSource[]>([]);
  const [incidentSearch, setIncidentSearch] = useState('');
  const [loadingIncident, setLoadingIncident] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

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
  const [processAnalyses, setProcessAnalyses] = useState<ProcessAnalysisItem[]>([]);
  const [expandedProcessFactorSummary, setExpandedProcessFactorSummary] = useState<string | null>(null);

  // NRLS fiscal-year 2569 Contributing Factors, scoped to the case or a clinical process
  const [contributingFactors, setContributingFactors] = useState<ContributingFactorSelection[]>([]);
  const [legacyFishbones, setLegacyFishbones] = useState<LegacyCauseFactor[]>([]);

  // Section 6a: 5 Whys
  const [whys, setWhys] = useState<WhyItem[]>([
    { level: 1, question: 'ทำไมถึงเกิดเหตุการณ์นี้?', answer: '' },
    { level: 2, question: 'ทำไมถึงเกิดสาเหตุในข้อ 1?', answer: '' },
    { level: 3, question: 'ทำไมถึงเกิดสาเหตุในข้อ 2?', answer: '' },
    { level: 4, question: 'ทำไมถึงเกิดสาเหตุในข้อ 3?', answer: '' },
    { level: 5, question: 'ทำไม (สาเหตุรากเหง้าเชิงระบบ)?', answer: '' },
  ]);

  // Section 6b: Swiss Cheese Model (4 Layers)
  const [swissCheeseOrg, setSwissCheeseOrg] = useState('');
  const [swissCheeseSupervision, setSwissCheeseSupervision] = useState('');
  const [swissCheesePreconditions, setSwissCheesePreconditions] = useState('');
  const [swissCheeseUnsafeActs, setSwissCheeseUnsafeActs] = useState('');

  // Section 7: CAPA Action Plan
  const [capas, setCapas] = useState<CapaItem[]>([
    {
      action: '',
      type: 'preventive',
      responsible: user?.name || 'หน่วยงานเจ้าของเรื่อง',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'pending',
      effectiveness_criteria: '',
      baseline_value: '',
      target_value: '',
      effectiveness_due_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    },
  ]);

  // Section 8: Review Sessions
  const [reviewSessions, setReviewSessions] = useState<ReviewSessionItem[]>([
    {
      session_no: 1,
      review_date_time: new Date().toISOString().slice(0, 16),
      reviewers: user?.name ? `${user.name} (ผู้บันทึก)` : 'คณะทำงาน RCA',
      notes: 'การประชุมทบทวนรอบแรกเพื่อรวบรวมข้อเท็จจริงและลำดับเหตุการณ์',
    },
  ]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [participants, setParticipants] = useState<ReviewParticipantItem[]>([
    {
      participant_type: 'DEPARTMENT',
      display_name: 'หน่วยงานเจ้าของเรื่อง',
      role: 'OWNER',
      purpose: 'รับผิดชอบทบทวนข้อเท็จจริง วิเคราะห์ และติดตามมาตรการ',
      response_status: 'ACCEPTED',
      responded_at: new Date().toISOString(),
      is_owner: true,
    },
  ]);
  const [voiceOfStaffEntries, setVoiceOfStaffEntries] = useState<VoiceOfStaffItem[]>([
    {
      interviewee_name: '',
      interviewee_role: '',
      interviewee_department: '',
      interview_date: new Date().toISOString().slice(0, 16),
      work_context: '',
      key_points: '',
      contributing_conditions: '',
      suggestions: '',
    },
  ]);

  useEffect(() => {
    axios.get('/rca/collaboration-options')
      .then((response) => {
        setDepartments(Array.isArray(response.data?.departments) ? response.data.departments : []);
        setTeamOptions(Array.isArray(response.data?.teams) ? response.data.teams : []);
      })
      .catch(() => { setDepartments([]); setTeamOptions([]); });
  }, []);

  const applyIncidentSource = (incident: IncidentSource) => {
    const linkedIncidentId = Number(incident.id);
    if (!Number.isFinite(linkedIncidentId) || linkedIncidentId <= 0) return;

    const nrlsTopic = incident.incident_topic
      || incident.nrls_name_snapshot
      || incident.nrls_name
      || incident.risk_topic_name
      || `อุบัติการณ์ #${linkedIncidentId}`;
    const description = incident.incident_description
      || incident.detail
      || incident.problem_basic
      || '';
    const sourceRmNo = incident.rm_no || String(incident.id_risk || linkedIncidentId);

    setIncidentId(linkedIncidentId);
    setSourceIncident(incident);
    setTopic(nrlsTopic);
    setRmNo(sourceRmNo);
    setWhatHappened(description);
    setRiskDescription((current) => current || description);
    setRiskOwnerName((current) => current || user?.name || 'เจ้าของกระบวนการ');
    if (incident.level_id) setSeverity(incident.level_id);
    if (incident.date_report) setIncidentDate(incident.date_report.slice(0, 10));
  };

  const loadIncidentSource = async (sourceId: number, fallback?: IncidentSource) => {
    try {
      setLoadingIncident(true);
      const res = await axios.get(`/incidents/${sourceId}`);
      applyIncidentSource(res.data);
    } catch (err) {
      console.error('Failed to load linked incident', err);
      if (fallback) applyIncidentSource(fallback);
      else alert('ไม่สามารถดึงข้อมูลรายงานความเสี่ยงที่เลือกได้');
    } finally {
      setLoadingIncident(false);
    }
  };

  // Load existing case or pre-load its linked incident from navigation/query state.
  useEffect(() => {
    if (id && id !== 'new') {
      loadCaseData(id);
    } else {
      const state = location.state as any;
      const stateIncident = state?.incident || state;
      const requestedIncidentId = Number(
        searchParams.get('incident_id') || stateIncident?.incident_id || stateIncident?.id,
      );
      if (Number.isFinite(requestedIncidentId) && requestedIncidentId > 0) {
        loadIncidentSource(requestedIncidentId, stateIncident);
      } else if (state) {
        if (state.source_trigger_review_id) {
          setSourceTriggerReviewId(state.source_trigger_review_id);
        }
        if (state.topic || state.risk_name) setTopic(state.topic || state.risk_name || '');
        if (state.severity_level || state.level_id) setSeverity(state.severity_level || state.level_id || 'G');
        if (state.what_happened || state.ae_description || state.detail) setWhatHappened(state.what_happened || state.ae_description || state.detail || '');
        if (state.incident_date || state.date_risk) setIncidentDate((state.incident_date || state.date_risk).slice(0, 10));
        if (state.rm_no) setRmNo(state.rm_no);
      }
    }
  }, [id, location.state, searchParams]);

  useEffect(() => {
    if (id && id !== 'new') return;
    const timer = window.setTimeout(async () => {
      try {
        setLoadingCandidates(true);
        const res = await axios.get('/rca/standard-candidates', {
          params: incidentSearch.trim() ? { search: incidentSearch.trim() } : undefined,
        });
        setIncidentCandidates(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load Standard RCA incident sources', err);
        setIncidentCandidates([]);
      } finally {
        setLoadingCandidates(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [id, incidentSearch]);

  useEffect(() => {
    const nrlsCode = sourceIncident?.nrls_code;
    if (!nrlsCode || !sourceIncident?.department_id) {
      setRiskProfiles([]);
      return;
    }
    let active = true;
    axios.get('/risk-analysis', {
      params: { department_id: sourceIncident.department_id, search: nrlsCode },
    }).then((response) => {
      if (!active) return;
      const matches = (Array.isArray(response.data) ? response.data : [])
        .filter((profile: any) => profile.nrls_code === nrlsCode);
      setRiskProfiles(matches);
    }).catch(() => {
      if (active) setRiskProfiles([]);
    });
    return () => { active = false; };
  }, [sourceIncident?.department_id, sourceIncident?.nrls_code]);

  useEffect(() => {
    if (!sourceIncident?.department_id || !departments.length) return;
    const ownerDepartment = departments.find((item) => String(item.id) === String(sourceIncident.department_id));
    if (!ownerDepartment) return;
    setParticipants((current) => current.map((participant) => (
      participant.is_owner && participant.display_name === 'หน่วยงานเจ้าของเรื่อง'
        ? { ...participant, display_name: ownerDepartment.depart_name, department_id: String(ownerDepartment.id) }
        : participant
    )));
  }, [departments, sourceIncident?.department_id]);

  const loadCaseData = async (caseIdToLoad: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/rca/standard/${caseIdToLoad}`);
      const data = res.data;
      setCaseId(data.id);
      if (data.incident_id) {
        setIncidentId(Number(data.incident_id));
        setSourceIncident({
          id: Number(data.incident_id),
          id_risk: data.incident_id_risk,
          rm_no: data.rm_no,
          nrls_code: data.nrls_code,
          nrls_name: data.nrls_name_snapshot,
          incident_topic: data.nrls_name_snapshot || data.topic,
          incident_description: data.incident_detail_raw || data.what_happened,
          department_id: data.department_id,
        });
      }
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
      setSelectedRiskProfileId(data.risk_analysis_id ? String(data.risk_analysis_id) : '');
      setRiskDescription(data.risk_analysis?.risk_description || data.what_happened || '');
      setRiskOwnerName(data.risk_analysis?.risk_owner_name || user?.name || 'เจ้าของกระบวนการ');
      setReviewOutcome(data.review_outcome || 'IN_PROGRESS');
      setSupportRequestPurpose(data.support_request_purpose || 'PROCESS_ANALYSIS');
      setSupportTargetName(data.support_target_name || '');
      setEscalationReason(data.escalation_reason || '');
      setSourceTriggerReviewId(data.source_trigger_review_id);

      setInfoInterview(data.info_interview ?? true);
      setInfoCctv(data.info_cctv ?? false);
      setInfoDocument(data.info_document ?? true);
      setInfoInspection(data.info_inspection ?? true);

      if (data.timelines?.length) setTimelines(data.timelines);
      if (data.whys?.length) setWhys(data.whys);
      const storedContributingFactors = normalizeContributingFactorSelections(data.contributing_factors);
      const migratedFishbones = contributingFactorSelectionsFromLegacy(data.fishbones || []);
      if (storedContributingFactors.length || migratedFishbones.selections.length) {
        setContributingFactors(storedContributingFactors.length ? storedContributingFactors : migratedFishbones.selections);
      }
      setLegacyFishbones(migratedFishbones.legacy);
      if (data.cmps?.length) setCmps(data.cmps);
      if (data.process_analyses?.length) {
        setProcessAnalyses(data.process_analyses);
        setSelectedProcessKey(data.process_analyses[0].process_key);
      }
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
      if (data.participants?.length) {
        setParticipants(data.participants.map((participant: any) => ({
          participant_type: participant.participant_type || 'DEPARTMENT',
          display_name: participant.display_name || '',
          role: participant.role || 'INFORMANT',
          department_id: participant.department_id || undefined,
          team_id: participant.team_id || undefined,
          purpose: participant.purpose || '',
          response_status: participant.response_status || 'PENDING',
          responded_at: participant.responded_at || undefined,
          is_owner: Boolean(participant.is_owner),
        })));
      }
      if (data.voice_of_staff_entries?.length) {
        setVoiceOfStaffEntries(data.voice_of_staff_entries.map((voice: any) => ({
          interviewee_name: voice.interviewee_name || '',
          interviewee_role: voice.interviewee_role || '',
          interviewee_department: voice.interviewee_department || '',
          interview_date: voice.interview_date ? voice.interview_date.slice(0, 16) : '',
          work_context: voice.work_context || '',
          key_points: voice.key_points || '',
          contributing_conditions: voice.contributing_conditions || '',
          suggestions: voice.suggestions || '',
        })));
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

    if (selectedKeys.includes('fishbone') && (aiData.contributing_factors?.length || aiData.fishbones?.length)) {
      const suggested = normalizeContributingFactorSelections(aiData.contributing_factors);
      const migratedSuggestion = contributingFactorSelectionsFromLegacy(aiData.fishbones || []).selections;
      setContributingFactors(suggested.length ? suggested : migratedSuggestion);
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

  const handleQuickReviewDateChange = (value: string) => {
    setReviewSessions((current) => {
      const first = current[0] || {
        session_no: 1,
        review_date_time: '',
        reviewers: user?.name || '',
        notes: 'การทบทวนจากผู้เกี่ยวข้องแบบรวดเร็ว',
      };
      const time = first.review_date_time?.slice(11, 16) || '09:00';
      const updatedFirst = { ...first, review_date_time: value ? `${value}T${time}` : '' };
      return current.length ? [updatedFirst, ...current.slice(1)] : [updatedFirst];
    });
  };

  const handleQuickReviewersChange = (value: string) => {
    setReviewSessions((current) => {
      const first = current[0] || {
        session_no: 1,
        review_date_time: new Date().toISOString().slice(0, 16),
        reviewers: '',
        notes: 'การทบทวนจากผู้เกี่ยวข้องแบบรวดเร็ว',
      };
      const updatedFirst = { ...first, reviewers: value };
      return current.length ? [updatedFirst, ...current.slice(1)] : [updatedFirst];
    });
  };

  const handleAddProcessAnalysis = () => {
    if (processAnalyses.some((item) => item.process_key === selectedProcessKey)) return;
    setProcessAnalyses([
      ...processAnalyses,
      {
        process_key: selectedProcessKey,
        problem: '',
        tier1_personnel: '',
        tier2_teamwork: '',
        tier3_environment: '',
        tier4_policy: '',
        tier5_external: '',
        corrective_action: '',
      },
    ]);
  };

  const handleRemoveProcessAnalysis = (idx: number) => {
    const removedProcessKey = processAnalyses[idx]?.process_key;
    setProcessAnalyses(processAnalyses.filter((_, itemIdx) => itemIdx !== idx));
    if (removedProcessKey) {
      setContributingFactors((current) => current.filter((factor) => factor.process_key !== removedProcessKey));
      if (expandedProcessFactorSummary === removedProcessKey) setExpandedProcessFactorSummary(null);
    }
  };

  const handleProcessAnalysisChange = (idx: number, field: keyof ProcessAnalysisItem, value: string) => {
    const updated = [...processAnalyses];
    updated[idx] = { ...updated[idx], [field]: value };
    setProcessAnalyses(updated);
    const tier = PROCESS_TIER_FIELD_NUMBER[field];
    if (tier) {
      const processKey = updated[idx].process_key;
      setContributingFactors((current) => current.map((factor) => (
        factor.process_key === processKey && factor.tier === tier
          ? { ...factor, ...(value.trim() ? { detail: value.trim() } : { detail: undefined }) }
          : factor
      )));
    }
  };

  const handleTierContributingFactorsChange = (
    processKey: string,
    tier: number,
    cause: string,
    nextFactors: ContributingFactorSelection[],
  ) => {
    setContributingFactors((current) => {
      const otherMappings = current.filter((factor) => !(factor.process_key === processKey && factor.tier === tier));
      const tierMappings = nextFactors.map((factor) => ({
        code: factor.code,
        ...(cause.trim() ? { detail: cause.trim() } : {}),
        process_key: processKey,
        tier,
      }));
      return [...otherMappings, ...tierMappings];
    });
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
        effectiveness_criteria: '',
        baseline_value: '',
        target_value: '',
        effectiveness_due_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
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

  const handleAddParticipant = () => {
    setParticipants((current) => [...current, {
      participant_type: 'TEAM',
      display_name: '',
      role: 'ANALYST',
      purpose: 'ช่วยวิเคราะห์กระบวนการและร่วมกำหนดมาตรการ',
      response_status: 'PENDING',
      is_owner: false,
    }]);
  };

  const handleParticipantChange = (index: number, field: keyof ReviewParticipantItem, value: any) => {
    setParticipants((current) => current.map((participant, itemIndex) => (
      itemIndex === index ? {
        ...participant,
        [field]: value,
        ...(field === 'response_status' ? { responded_at: ['ACCEPTED', 'DECLINED'].includes(value) ? new Date().toISOString() : undefined } : {}),
      } : participant
    )));
  };

  const handleAddVoiceOfStaff = () => {
    setVoiceOfStaffEntries((current) => [...current, {
      interviewee_name: '', interviewee_role: '', interviewee_department: '',
      interview_date: new Date().toISOString().slice(0, 16), work_context: '', key_points: '',
      contributing_conditions: '', suggestions: '',
    }]);
  };

  const handleVoiceOfStaffChange = (index: number, field: keyof VoiceOfStaffItem, value: string) => {
    setVoiceOfStaffEntries((current) => current.map((voice, itemIndex) => (
      itemIndex === index ? { ...voice, [field]: value } : voice
    )));
  };

  const buildPayload = (markAsNotRisk = isNotRisk) => {
    const finalTeam = rcaTeam === 'other' ? customTeam : rcaTeam;
    return {
      id: caseId || undefined,
      incident_id: incidentId,
      incident_id_risk: sourceIncident?.id_risk,
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
      review_outcome: reviewOutcome,
      support_request_purpose: ['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(reviewOutcome) ? supportRequestPurpose : undefined,
      support_target_name: ['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(reviewOutcome) ? supportTargetName : undefined,
      escalation_reason: ['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(reviewOutcome) ? escalationReason : undefined,
      status: markAsNotRisk ? 'closed' : status,
      created_by: user?.id || 1,
      timelines: timelines.filter((t) => t.event_description.trim() || t.event_time.trim()),
      whys: whys.filter((w) => w.answer.trim()),
      contributing_factors: contributingFactors,
      fishbones: [
        ...legacyFishbones,
        ...contributingFactorSelectionsToLegacy(contributingFactors),
      ],
      cmps: cmps.filter((cmp) => cmp.observation.trim() || cmp.hypothesis.trim() || cmp.comment.trim()),
      process_analyses: processAnalyses.filter((p) =>
        p.problem.trim()
        || p.tier1_personnel.trim()
        || p.tier2_teamwork.trim()
        || p.tier3_environment.trim()
        || p.tier4_policy.trim()
        || p.tier5_external.trim()
        || p.corrective_action.trim()
        || contributingFactors.some((factor) => factor.process_key === p.process_key)
      ),
      capas: capas.filter((c) => c.action.trim()),
      review_sessions: reviewSessions.map((s) => ({
        reviewers: s.reviewers,
        review_date_time: s.review_date_time ? new Date(s.review_date_time).toISOString() : null,
        notes: s.notes,
      })),
      participants: participants.filter((participant) => participant.display_name.trim()).map((participant) => ({
        ...participant,
        responded_at: participant.responded_at || undefined,
      })),
      voice_of_staff_entries: infoInterview
        ? voiceOfStaffEntries.filter((voice) => voice.key_points.trim()).map((voice) => ({
            ...voice,
            interview_date: voice.interview_date ? new Date(voice.interview_date).toISOString() : undefined,
          }))
        : [],
    };
  };

  latestDraftPayloadRef.current = buildPayload();

  useEffect(() => {
    const savedCaseId = id && id !== 'new' ? id : caseId;
    if (!savedCaseId || status.toUpperCase() === 'COMPLETED') return;
    const timer = window.setInterval(async () => {
      if (saving || completing || !latestDraftPayloadRef.current) return;
      const fingerprint = JSON.stringify(latestDraftPayloadRef.current);
      if (fingerprint === lastAutoSavedFingerprintRef.current) return;
      try {
        setAutoSaveStatus('saving');
        await axios.patch(`/rca/standard/${savedCaseId}`, latestDraftPayloadRef.current);
        lastAutoSavedFingerprintRef.current = fingerprint;
        setLastAutoSavedAt(new Date());
        setAutoSaveStatus('saved');
      } catch {
        setAutoSaveStatus('error');
      }
    }, 20000);
    return () => window.clearInterval(timer);
  }, [caseId, completing, id, saving, status]);

  const persistRca = async (markAsNotRisk = isNotRisk, navigateAfter = true) => {
    if ((!id || id === 'new') && !incidentId) {
      alert('กรุณาเลือกรายงานความเสี่ยงต้นทางก่อนสร้าง Standard RCA');
      return null;
    }
    if (!topic.trim()) {
      alert('กรุณาระบุหัวข้อเรื่องการทำ RCA');
      return null;
    }

    setSaving(true);
    const payload = buildPayload(markAsNotRisk);

    try {
      let savedId = caseId;
      if (id && id !== 'new') {
        await axios.patch(`/rca/standard/${id}`, payload);
        savedId = id;
      } else {
        const res = await axios.post('/rca/standard', payload);
        savedId = res.data.id;
        setCaseId(savedId);
      }
      if (navigateAfter) {
        alert('บันทึกร่าง RCA เรียบร้อยแล้ว คุณสามารถกลับมาเติมข้อมูลต่อได้');
        navigate('/rca/list');
      }
      return savedId;
    } catch (err) {
      console.error('Failed to save standard RCA', err);
      const message = axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : 'เกิดข้อผิดพลาดในการบันทึก Standard RCA';
      alert(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (markAsNotRisk = isNotRisk) => persistRca(markAsNotRisk, true);

  const handleCompleteRca = async () => {
    if (!window.confirm('ยืนยันสรุป RCA และนำความเสี่ยงเข้าสู่ Risk Register ใช่หรือไม่?')) return;
    setCompleting(true);
    try {
      const savedId = await persistRca(false, false);
      if (!savedId) return;
      const response = await axios.post(`/rca/standard/${savedId}/complete`, {
        risk_analysis_id: selectedRiskProfileId ? Number(selectedRiskProfileId) : undefined,
        risk_description: riskDescription.trim(),
        risk_owner_name: riskOwnerName.trim(),
        initial_likelihood: initialLikelihood,
        review_frequency_months: reviewFrequencyMonths,
      });
      const profile = response.data?.risk_analysis;
      alert(response.data?.risk_profile_created
        ? `สรุป RCA และสร้าง Risk Register ${profile?.risk_code || ''} เรียบร้อยแล้ว`
        : `สรุป RCA และเชื่อมกับ Risk Register ${profile?.risk_code || ''} เรียบร้อยแล้ว`);
      navigate('/reports?tab=register');
    } catch (err) {
      const message = axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : 'สรุป RCA และเชื่อม Risk Register ไม่สำเร็จ';
      alert(message);
    } finally {
      setCompleting(false);
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
  const selectableIncidents = sourceIncident && !incidentCandidates.some((candidate) => candidate.id === sourceIncident.id)
    ? [sourceIncident, ...incidentCandidates]
    : incidentCandidates;
  const hasAnalysis = contributingFactors.length > 0 || cmps.some((item) => item.observation.trim() || item.hypothesis.trim()) || whys.some((item) => item.answer.trim()) || processAnalyses.some((item) => item.problem.trim() || item.corrective_action.trim());
  const hasCompleteCapa = capas.some((item) => item.action.trim() && item.responsible.trim() && item.due_date && item.effectiveness_criteria?.trim() && item.baseline_value?.trim() && item.target_value?.trim() && item.effectiveness_due_date);
  const hasReviewTeam = participants.some((item) => item.is_owner && item.display_name.trim());
  const hasVoice = !infoInterview || voiceOfStaffEntries.some((item) => item.key_points.trim());
  const hasRoute = reviewOutcome !== 'IN_PROGRESS' && (!['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(reviewOutcome) || Boolean(supportTargetName.trim() && escalationReason.trim()));
  const hasRegister = Boolean(selectedRiskProfileId || (riskDescription.trim() && riskOwnerName.trim()));
  const sectionCompletion: Record<string, boolean> = {
    'rca-facts': Boolean(incidentId && topic.trim() && whatHappened.trim()),
    'rca-timeline': timelines.some((item) => item.event_description.trim()),
    'rca-analysis': Boolean(hasAnalysis && hasReviewTeam && hasVoice),
    'rca-actions': Boolean(hasCompleteCapa),
    'rca-route': hasRoute,
    'risk-register-link': hasRegister,
  };
  const completionPercent = Math.round(Object.values(sectionCompletion).filter(Boolean).length / Object.keys(sectionCompletion).length * 100);

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">กำลังโหลดแบบฟอร์ม Standard RCA รพ.วังเจ้า...</p>
      </div>
    );
  }

  return (
    <div className="official-print-document official-print-form space-y-8 max-w-6xl mx-auto pb-28">
      <OfficialPrintHeader
        title="แบบวิเคราะห์สาเหตุรากเหง้าเชิงระบบ (Standard RCA)"
        subtitle="Root Cause Analysis & Corrective Action Report"
        documentCode="RM-RCA-FM-01"
        referenceNo={caseId || (incidentId ? `INC-${incidentId}` : 'DRAFT')}
        metadata={[
          { label: 'RM No.', value: rmNo },
          { label: 'Incident ID', value: incidentId },
          { label: 'ระดับความรุนแรง', value: severity },
          { label: 'สถานะ RCA', value: status },
        ]}
      />
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
                Case ID: {caseId || 'สร้างเคสใหม่'} {incidentId ? `• เชื่อม Incident #${incidentId}` : ''} {sourceTriggerReviewId ? `(เชื่อมโยงจาก Trigger Tool Review #${sourceTriggerReviewId})` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`rounded-full px-2.5 py-1 font-black ${completionPercent === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>ความครบถ้วน {completionPercent}%</span>
                {caseId && <span className={`font-semibold ${autoSaveStatus === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>{autoSaveStatus === 'saving' ? 'กำลังบันทึกอัตโนมัติ...' : autoSaveStatus === 'error' ? 'บันทึกอัตโนมัติไม่สำเร็จ กรุณากดบันทึกร่าง' : lastAutoSavedAt ? `บันทึกอัตโนมัติล่าสุด ${lastAutoSavedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : 'ระบบจะบันทึกร่างอัตโนมัติทุก 20 วินาทีเมื่อมีการแก้ไข'}</span>}
              </div>
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
            onClick={printOfficialReport}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>พิมพ์รายงาน HA</span>
          </button>
          {status.toUpperCase() !== 'COMPLETED' && <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || completing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}</span>
          </button>}
        </div>
      </div>

      {(!id || id === 'new') && (
        <section className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/60 p-5 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/20 print:hidden sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white"><Database className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-indigo-950 dark:text-indigo-200">เชื่อมโยงรายงานความเสี่ยงเดิม <span className="text-rose-500">*</span></h2>
              <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">เลือก Incident ต้นทาง ระบบจะดึงหัวข้อ NRLS, เลข RM, รายละเอียดเหตุการณ์, วันที่ และระดับความรุนแรงมาให้อัตโนมัติ</p>

              <div className="mt-4 grid gap-3 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={incidentSearch}
                    onChange={(event) => setIncidentSearch(event.target.value)}
                    placeholder="ค้นหาจาก Incident ID, IR, NRLS หรือรายละเอียด..."
                    className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-900"
                  />
                </div>
                <select
                  value={incidentId || ''}
                  disabled={loadingCandidates || loadingIncident}
                  onChange={(event) => {
                    const nextId = Number(event.target.value);
                    if (!nextId) {
                      setIncidentId(undefined);
                      setSourceIncident(null);
                      setTopic('');
                      setRmNo('');
                      setWhatHappened('');
                      return;
                    }
                    const candidate = selectableIncidents.find((item) => item.id === nextId);
                    if (candidate) loadIncidentSource(nextId, candidate);
                  }}
                  className="rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-indigo-800 dark:bg-slate-900 lg:col-span-3"
                >
                  <option value="">{loadingCandidates ? 'กำลังค้นหารายงาน...' : 'เลือกรายงานความเสี่ยงต้นทาง'}</option>
                  {selectableIncidents.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      #{candidate.id} / IR {candidate.id_risk || '-'} • {candidate.nrls_code || 'ไม่มี NRLS'} • {candidate.incident_topic || candidate.nrls_name || candidate.nrls_name_snapshot || candidate.detail || '-'}
                    </option>
                  ))}
                </select>
              </div>

              {sourceIncident && (
                <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-emerald-300 bg-white p-4 text-xs dark:border-emerald-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-300"><Link2 className="h-4 w-4" /> เชื่อมโยงแล้ว: Incident #{sourceIncident.id} / IR {sourceIncident.id_risk || '-'}</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{sourceIncident.nrls_code || '-'} : {sourceIncident.nrls_name || sourceIncident.nrls_name_snapshot || sourceIncident.incident_topic || topic}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">ดึงข้อมูลเดิมแล้ว</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main 9 Sections Form Body (No nested <form> tags) */}
      <div className="space-y-8">
        <nav className="sticky top-2 z-30 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 print:hidden" aria-label="ขั้นตอนการทำ RCA">
          <div className="flex min-w-max gap-2">
            {[
              ['rca-facts', '1. ข้อเท็จจริง'],
              ['rca-timeline', '2. Timeline'],
              ['rca-analysis', '3. วิเคราะห์สาเหตุ'],
              ['rca-actions', '4. มาตรการ'],
              ['rca-route', '5. เส้นทางต่อ'],
              ['risk-register-link', '6. Risk Register'],
            ].map(([target, label]) => (
              <button key={target} type="button" onClick={() => { setActiveStep(target); window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${activeStep === target && guidedMode ? 'ring-2 ring-indigo-400' : ''} ${sectionCompletion[target] ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-amber-950'}`}>
                {sectionCompletion[target] ? '✓ ' : '○ '}{label}
              </button>
            ))}
            <button type="button" onClick={() => setGuidedMode((current) => !current)} className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">{guidedMode ? 'แสดงทุกส่วน' : 'ทำทีละขั้น'}</button>
          </div>
        </nav>

        {/* ================= SECTION 1: GENERAL METADATA ================= */}
        <section id="rca-facts" className={`scroll-mt-24 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${guidedMode && activeStep !== 'rca-facts' ? 'hidden print:block' : ''}`}>
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
                readOnly={Boolean(incidentId)}
                placeholder="เช่น การให้ยา High Alert Drug ไม่ตรงตามคำสั่งแพทย์ในเวรดึก"
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${incidentId ? 'bg-emerald-50/70 dark:bg-emerald-950/20 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800/80'}`}
              />
              {incidentId && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ หัวข้อมาตรฐานจาก NRLS Topic ของ Incident #{incidentId}</p>}
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
                readOnly={Boolean(incidentId)}
                placeholder="เช่น RM-2568-089"
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${incidentId ? 'bg-emerald-50/70 dark:bg-emerald-950/20 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800/80'}`}
              />
              {incidentId && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ อ้างอิง Incident #{incidentId} / IR {sourceIncident?.id_risk || '-'}</p>}
            </div>

            {/* รายละเอียดเหตุการณ์ที่เกิดขึ้น (Incident Description / What Happened) */}
            <div className="md:col-span-12 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  รายละเอียดเหตุการณ์ที่เกิดขึ้น / ข้อเท็จจริงของความเสี่ยง (Incident Description)
                </label>
                {incidentId && whatHappened && (
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

          </div>
        </section>

        {/* ================= SECTION 2: PROBLEM & IMPACT ================= */}
        <section className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${guidedMode && activeStep !== 'rca-facts' ? 'hidden print:block' : ''}`}>
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
        <section id="rca-timeline" className={`scroll-mt-24 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${guidedMode && activeStep !== 'rca-timeline' ? 'hidden print:block' : ''}`}>
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

        {/* ================= SECTION 4: QUICK STAKEHOLDER REVIEW & CMPS ================= */}
        <section id="rca-analysis" className={`scroll-mt-24 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 ${guidedMode && activeStep !== 'rca-analysis' ? 'hidden print:block' : ''}`}>
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-sm font-black text-violet-600 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400">4</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">การทบทวนจากผู้เกี่ยวข้อง (แบบรวดเร็ว) และวิเคราะห์ CMPs</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">รวบรวมข้อมูลจากผู้เกี่ยวข้องและหลักฐาน เพื่อระบุปัญหาการจัดการดูแลรักษาที่เบี่ยงเบนจากมาตรฐาน</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">วันที่ร่วมทบทวน / วันที่สัมภาษณ์</label>
              <input
                type="date"
                value={reviewSessions[0]?.review_date_time?.slice(0, 10) || ''}
                onChange={(e) => handleQuickReviewDateChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">รายชื่อผู้ร่วมทบทวน / ผู้ให้ข้อมูลสำคัญ</label>
              <input
                type="text"
                value={reviewSessions[0]?.reviewers || ''}
                onChange={(e) => handleQuickReviewersChange(e.target.value)}
                placeholder="ระบุชื่อบุคลากรที่เกี่ยวข้องที่ให้ข้อมูล"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">แหล่งข้อมูลเพิ่มเติมที่เข้าสืบค้นและทบทวน (Information &amp; Evidence Sources)</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'สัมภาษณ์บุคลากร', checked: infoInterview, setter: setInfoInterview },
                { label: 'กล้องวงจรปิด (CCTV)', checked: infoCctv, setter: setInfoCctv },
                { label: 'ตรวจสอบเอกสาร/Logs', checked: infoDocument, setter: setInfoDocument },
                { label: 'เดินตรวจประเมินหน้างาน', checked: infoInspection, setter: setInfoInspection },
              ].map((source) => (
                <label key={source.label} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-800">
                  <input type="checkbox" checked={source.checked} onChange={(e) => source.setter(e.target.checked)} className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500" />
                  <span>{source.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">รายละเอียดประเด็นปัญหา CMPs และสมมติฐานร่วมกัน</h4>
                <p className="mt-0.5 text-[11px] text-slate-500">Care Management Problems (CMPs) คือ ปัญหาจากการจัดการดูแลรักษา หรือความเบี่ยงเบนจากแนวปฏิบัติมาตรฐาน</p>
              </div>
              <button type="button" onClick={handleAddCmp} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
                <Plus className="h-3.5 w-3.5" /> เพิ่มประเด็นหน้างาน
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-[900px] w-full table-fixed text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="w-[31%] px-3 py-3">สิ่งที่สังเกตพบ / ปัญหาเชิงพฤติกรรมและการจัดการ (CMPs)</th>
                    <th className="w-[31%] px-3 py-3">สมมติฐาน / ปัจจัยที่เป็นอุปสรรคหรือปัญหาหน้างาน</th>
                    <th className="w-[31%] px-3 py-3">ความเห็นของผู้เกี่ยวข้อง / แนวทางแก้ไขเชิงปฏิบัติทันที</th>
                    <th className="w-[7%] px-2 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {cmps.map((cmp, idx) => (
                    <tr key={idx}>
                      <td className="p-3 align-top"><textarea rows={3} value={cmp.observation} onChange={(e) => handleCmpChange(idx, 'observation', e.target.value)} placeholder="สิ่งที่สังเกตพบ..." className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></td>
                      <td className="p-3 align-top"><textarea rows={3} value={cmp.hypothesis} onChange={(e) => handleCmpChange(idx, 'hypothesis', e.target.value)} placeholder="สมมติฐาน..." className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></td>
                      <td className="p-3 align-top"><textarea rows={3} value={cmp.comment} onChange={(e) => handleCmpChange(idx, 'comment', e.target.value)} placeholder="ความเห็นของผู้เกี่ยวข้อง..." className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></td>
                      <td className="p-3 text-center align-middle"><button type="button" onClick={() => handleRemoveCmp(idx)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40" title="ลบประเด็น CMP"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {cmps.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">ยังไม่มีประเด็น CMP — กด “เพิ่มประเด็นหน้างาน” เพื่อเริ่มบันทึก</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================= SECTION 5: CLINICAL PROCESS BOARD ================= */}
        <section className={`space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 ${guidedMode && activeStep !== 'rca-analysis' ? 'hidden print:block' : ''}`}>
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-black text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">5</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">การวิเคราะห์กระบวนการดูแลรักษา (Clinical Process Analysis)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">เพิ่มกระบวนการที่มีปัญหา วิเคราะห์จาก CMPs ถึง Tier 5 และผูกสาเหตุมาตรฐาน NRLS กับแต่ละกระบวนการ</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">เลือกกระบวนการที่พบปัญหาเพื่อเพิ่มลงในกระดานวิเคราะห์</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select value={selectedProcessKey} onChange={(e) => setSelectedProcessKey(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {CLINICAL_CARE_STEPS.map((step) => <option key={step} value={step}>{step}</option>)}
              </select>
              <button type="button" onClick={handleAddProcessAnalysis} disabled={processAnalyses.some((item) => item.process_key === selectedProcessKey)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">
                <Plus className="h-4 w-4" /> {processAnalyses.some((item) => item.process_key === selectedProcessKey) ? 'เพิ่มแล้ว' : 'เพิ่มกระบวนการ'}
              </button>
            </div>
          </div>

          {processAnalyses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-12 text-center dark:border-slate-800">
              <p className="font-bold text-slate-500 dark:text-slate-400">ยังไม่มีกระบวนการที่ถูกเลือก</p>
              <p className="mt-1 text-xs text-slate-400">กรุณาเลือกกระบวนการจากด้านบนแล้วกด “เพิ่มกระบวนการ”</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2 pb-4">
              <div className="flex min-w-max items-stretch gap-4">
                {processAnalyses.map((item, idx) => {
                  const titleMatch = item.process_key.match(/^(.*?)\s*\((.*?)\)$/);
                  const thaiTitle = titleMatch?.[1] || item.process_key;
                  const englishTitle = titleMatch?.[2] || '';
                  const processFactors = contributingFactors.filter((factor) => factor.process_key === item.process_key);
                  const processFactorCount = processFactors.length;
                  const tiers: Array<{ field: keyof ProcessAnalysisItem; tierNumber?: number; icon: string; title: string; hint: string; box: string; label: string }> = [
                    { field: 'problem', icon: '⚠️', title: 'ปัญหา (CMPs)', hint: 'คลิกระบุความผิดพลาด (Error/Mistake)', box: 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20', label: 'text-rose-700 dark:text-rose-300' },
                    { field: 'tier1_personnel', tierNumber: 1, icon: '🧑‍⚕️', title: 'Tier 1: บุคคล', hint: 'เขียนสาเหตุด้านผู้ป่วย/เจ้าหน้าที่ ทักษะ ความเหนื่อยล้า...', box: 'border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20', label: 'text-violet-700 dark:text-violet-300' },
                    { field: 'tier2_teamwork', tierNumber: 2, icon: '🤝', title: 'Tier 2: งานและทีม', hint: 'เขียนสาเหตุด้านงาน/ทีม การสื่อสาร การส่งเวร...', box: 'border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/20', label: 'text-teal-700 dark:text-teal-300' },
                    { field: 'tier3_environment', tierNumber: 3, icon: '🌿', title: 'Tier 3: สิ่งแวดล้อม', hint: 'เขียนสาเหตุด้านสภาพแวดล้อม เครื่องมือ การกำกับสนับสนุน...', box: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20', label: 'text-amber-700 dark:text-amber-300' },
                    { field: 'tier4_policy', tierNumber: 4, icon: '🏢', title: 'Tier 4: บริหาร/องค์กร', hint: 'เขียนสาเหตุด้านนโยบาย การบริหาร และวัฒนธรรมองค์กร...', box: 'border-pink-200 bg-pink-50/50 dark:border-pink-900 dark:bg-pink-950/20', label: 'text-pink-700 dark:text-pink-300' },
                    { field: 'tier5_external', tierNumber: 5, icon: '🌐', title: 'Tier 5: ภายนอก', hint: 'เขียนสาเหตุจากนโยบายรัฐ ผู้ให้บริการภายนอก หรือปัจจัยภายนอก...', box: 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40', label: 'text-slate-700 dark:text-slate-300' },
                  ];
                  return (
                    <article key={`${item.process_key}-${idx}`} className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="relative rounded-xl border border-blue-200 bg-blue-50 px-9 py-3 text-center dark:border-blue-900 dark:bg-blue-950/40">
                        <button type="button" onClick={() => handleRemoveProcessAnalysis(idx)} className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40" title="ลบกระบวนการนี้"><Trash2 size={14} /></button>
                        <div className="text-sm font-black text-blue-800 dark:text-blue-200">{thaiTitle}</div>
                        {englishTitle && <div className="mt-0.5 text-[11px] text-blue-500 dark:text-blue-400">({englishTitle})</div>}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedProcessFactorSummary((current) => current === item.process_key ? null : item.process_key)}
                        className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition ${expandedProcessFactorSummary === item.process_key
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'}`}
                      >
                        <span>สาเหตุ NRLS ของกระบวนการนี้</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">{processFactorCount}{expandedProcessFactorSummary === item.process_key ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</span>
                      </button>

                      {expandedProcessFactorSummary === item.process_key && (
                        <div className="mt-2 space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                          <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">Summary Factor ทั้งหมดของ Process</div>
                          {processFactorCount === 0 ? (
                            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">ยังไม่ได้เลือก Factor — เขียนสาเหตุใน Tier แล้วเลือก Suggested หรือ “แสดงทั้งหมด”</p>
                          ) : (
                            [1, 2, 3, 4, 5].map((tierNumber) => {
                              const tierFactors = processFactors.filter((factor) => factor.tier === tierNumber);
                              if (!tierFactors.length) return null;
                              return (
                                <div key={`summary-${item.process_key}-${tierNumber}`}>
                                  <div className="mb-1 text-[10px] font-black text-slate-600 dark:text-slate-300">Tier {tierNumber}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {tierFactors.map((factor) => (
                                      <span key={`${tierNumber}-${factor.code}`} className="rounded-md bg-indigo-600 px-1.5 py-1 text-[9px] font-bold text-white" title={getContributingFactor(factor.code)?.labelTh}>
                                        {factor.code} {getContributingFactor(factor.code)?.labelTh}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {processFactors.some((factor) => !factor.tier) && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/20">
                              <div className="text-[10px] font-black text-amber-700 dark:text-amber-300">ข้อมูลเดิมที่ยังไม่ระบุ Tier</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {processFactors.filter((factor) => !factor.tier).map((factor) => <span key={`unassigned-${factor.code}`} className="rounded-md bg-amber-600 px-1.5 py-1 text-[9px] font-bold text-white">{factor.code}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex-1 space-y-3">
                        {tiers.map((tier) => (
                          <div key={tier.field} className={`rounded-xl border p-3 ${tier.box}`}>
                            <label className={`mb-1.5 flex items-center gap-1.5 text-xs font-black ${tier.label}`}><span>{tier.icon}</span>{tier.title}</label>
                            <textarea rows={3} value={String(item[tier.field] || '')} onChange={(e) => handleProcessAnalysisChange(idx, tier.field, e.target.value)} placeholder={tier.hint} className="w-full resize-y rounded-lg border border-white/80 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                            {tier.tierNumber && (
                              <TierContributingFactorPicker
                                tier={tier.tierNumber}
                                cause={String(item[tier.field] || '')}
                                value={processFactors.filter((factor) => factor.tier === tier.tierNumber)}
                                onChange={(nextFactors) => handleTierContributingFactorsChange(item.process_key, tier.tierNumber!, String(item[tier.field] || ''), nextFactors)}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300"><span>✅</span>เป้าหมาย / การออกแบบระบบใหม่</label>
                        <textarea rows={4} value={item.corrective_action} onChange={(e) => handleProcessAnalysisChange(idx, 'corrective_action', e.target.value)} placeholder="ระบุการออกแบบระบบใหม่ หรือแนวทางป้องกัน..." className="w-full resize-y rounded-lg border border-emerald-300 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-800 dark:border-emerald-800 dark:bg-slate-950 dark:text-slate-100" />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {contributingFactors.some((factor) => !factor.process_key || !factor.tier) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <h4 className="text-xs font-black text-amber-800 dark:text-amber-300">ข้อมูล Contributing Factor เดิมที่ยังไม่ได้ผูกครบทั้ง Process และ Tier</h4>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">ระบบยังคงเก็บข้อมูลเดิมไว้ ข้อมูลใหม่ควรเขียนสาเหตุและเลือก Factor ภายใน Tier ของแต่ละ Process ด้านบน</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {contributingFactors.filter((factor) => !factor.process_key || !factor.tier).map((factor, factorIndex) => (
                  <span key={`legacy-factor-${factor.process_key || 'case'}-${factor.tier || 'none'}-${factor.code}-${factorIndex}`} className="rounded-lg bg-amber-600 px-2 py-1 text-[10px] font-bold text-white">
                    {factor.code} {getContributingFactor(factor.code)?.labelTh}{factor.process_key ? ` — ${factor.process_key}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ================= SECTION 6: 5 WHYS & SWISS CHEESE MODEL ================= */}
        <section className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${guidedMode && activeStep !== 'rca-analysis' ? 'hidden print:block' : ''}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                6
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

          {/* 6a. 5 Whys Chain */}
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

          {/* 6b. Swiss Cheese Model (Collapsible) */}
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

        {/* ================= SECTION 7: CAPA ACTION PLAN ================= */}
        <section id="rca-actions" className={`scroll-mt-24 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${guidedMode && activeStep !== 'rca-actions' ? 'hidden print:block' : ''}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                7
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  แผนมาตรการแก้ไขและป้องกันการเกิดซ้ำ
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
              <span>เพิ่มมาตรการ</span>
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
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20 md:grid-cols-12">
                  <div className="md:col-span-12">
                    <div className="text-[11px] font-black text-emerald-900 dark:text-emerald-200">กำหนดวิธีพิสูจน์ว่ามาตรการได้ผล</div>
                    <div className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">ข้อมูลชุดนี้จะถูกส่งต่อไปยังศูนย์ติดตามมาตรการโดยอัตโนมัติ</div>
                  </div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-4">
                    เกณฑ์ประเมินประสิทธิผล
                    <textarea
                      rows={2}
                      value={c.effectiveness_criteria || ''}
                      onChange={(e) => handleCapaChange(idx, 'effectiveness_criteria', e.target.value)}
                      placeholder="เช่น อัตราปฏิบัติตามขั้นตอน ≥ 95% และไม่เกิดเหตุซ้ำระดับ C ขึ้นไป"
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-normal dark:border-emerald-900 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-2">
                    ข้อมูลก่อนปรับปรุง
                    <input
                      value={c.baseline_value || ''}
                      onChange={(e) => handleCapaChange(idx, 'baseline_value', e.target.value)}
                      placeholder="Baseline"
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-normal dark:border-emerald-900 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-2">
                    เป้าหมาย
                    <input
                      value={c.target_value || ''}
                      onChange={(e) => handleCapaChange(idx, 'target_value', e.target.value)}
                      placeholder="Target"
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-normal dark:border-emerald-900 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-4">
                    วันที่ประเมินประสิทธิผล
                    <input
                      type="date"
                      value={c.effectiveness_due_date || ''}
                      onChange={(e) => handleCapaChange(idx, 'effectiveness_due_date', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-normal dark:border-emerald-900 dark:bg-slate-900"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 8: REVIEW SESSIONS ================= */}
        <section className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 ${guidedMode && activeStep !== 'rca-analysis' ? 'hidden print:block' : ''}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                8
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

          <div className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"><Users size={18} /></span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">ทีมทบทวนเรื่องนี้</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">หน่วยงานเจ้าของเรื่องยังรับผิดชอบหลัก การเพิ่มทีมอื่นหมายถึงขอให้ช่วยตามบทบาทที่ระบุ ไม่ใช่ส่งมอบเรื่องทั้งหมด</p>
                </div>
              </div>
              <button type="button" onClick={handleAddParticipant} className="shrink-0 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">
                + ขอทีม/ผู้เชี่ยวชาญช่วย
              </button>
            </div>

            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div key={index} className={`rounded-2xl border p-4 ${participant.is_owner ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${participant.is_owner ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'}`}>
                        {participant.is_owner ? 'เจ้าของเรื่อง' : `ผู้ร่วมทบทวน ${index}`}
                      </span>
                      <span className="text-[11px] text-slate-500">{participant.response_status === 'ACCEPTED' ? 'ตอบรับแล้ว' : participant.response_status === 'DECLINED' ? 'ไม่สะดวกเข้าร่วม' : participant.response_status === 'PENDING' ? 'รอตอบรับ' : 'ไม่ต้องตอบรับ'}</span>
                    </div>
                    {!participant.is_owner && <button type="button" onClick={() => setParticipants((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-12">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-2">
                      ประเภท
                      <select disabled={participant.is_owner} value={participant.participant_type} onChange={(event) => handleParticipantChange(index, 'participant_type', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                        <option value="DEPARTMENT">หน่วยงาน</option><option value="TEAM">ทีมนำ/ทีมคร่อม</option><option value="PERSON">บุคคล</option><option value="EXPERT">ผู้เชี่ยวชาญ</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-4">
                      ชื่อผู้ร่วมทบทวน/ทีม
                      {participant.participant_type === 'DEPARTMENT' ? (
                        <select value={participant.department_id || ''} onChange={(event) => {
                          const department = departments.find((item) => String(item.id) === event.target.value);
                          handleParticipantChange(index, 'department_id', event.target.value);
                          if (department) handleParticipantChange(index, 'display_name', department.depart_name);
                        }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950">
                          <option value="">เลือกหน่วยงาน</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.depart_name}</option>)}
                        </select>
                      ) : participant.participant_type === 'TEAM' && teamOptions.length ? (
                        <select value={participant.team_id || ''} onChange={(event) => {
                          const team = teamOptions.find((item) => String(item.id) === event.target.value);
                          handleParticipantChange(index, 'team_id', Number(event.target.value) || undefined);
                          if (team) handleParticipantChange(index, 'display_name', team.team_name);
                        }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950">
                          <option value="">เลือกทีมนำ/ทีมคร่อมสายงาน</option>{teamOptions.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}
                        </select>
                      ) : (
                        <input value={participant.display_name} onChange={(event) => handleParticipantChange(index, 'display_name', event.target.value)} placeholder="ชื่อบุคคลหรือทีม" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" />
                      )}
                    </label>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-3">
                      บทบาท
                      <select disabled={participant.is_owner} value={participant.role} onChange={(event) => handleParticipantChange(index, 'role', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                        <option value="OWNER">เจ้าของเรื่อง</option><option value="FACILITATOR">ผู้ดำเนินการทบทวน</option><option value="INFORMANT">ผู้ให้ข้อมูล</option><option value="ANALYST">ผู้ช่วยวิเคราะห์</option><option value="APPROVER">ผู้รับรองข้อสรุป</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-3">
                      สถานะเข้าร่วม
                      <select disabled={participant.is_owner} value={participant.response_status} onChange={(event) => handleParticipantChange(index, 'response_status', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                        <option value="PENDING">รอตอบรับ</option><option value="ACCEPTED">ตอบรับแล้ว</option><option value="DECLINED">ไม่สะดวกเข้าร่วม</option><option value="NOT_REQUIRED">ไม่ต้องตอบรับ</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-12">
                      วัตถุประสงค์/สิ่งที่ขอให้ช่วย
                      <input value={participant.purpose} onChange={(event) => handleParticipantChange(index, 'purpose', event.target.value)} placeholder="เช่น ช่วยวิเคราะห์ขั้นตอนการให้ยาและร่วมกำหนดมาตรการ" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200"><MessageSquareText size={18} /></span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Voice of Staff</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">บันทึกสิ่งที่บุคลากรพบจากการทำงานจริง เน้นบริบทและเงื่อนไขของระบบ ไม่ใช้เพื่อตำหนิบุคคล</p>
                </div>
              </div>
              <button type="button" onClick={handleAddVoiceOfStaff} className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300">+ เพิ่มการสัมภาษณ์</button>
            </div>
            {!infoInterview ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">ยังไม่ได้เลือก “สัมภาษณ์บุคลากร” ในแหล่งข้อมูล ส่วนนี้จะไม่ถูกส่งบันทึก</div>
            ) : (
              <div className="space-y-3">
                {voiceOfStaffEntries.map((voice, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-black text-violet-700 dark:text-violet-300">การสัมภาษณ์ครั้งที่ {index + 1}</span>{voiceOfStaffEntries.length > 1 && <button type="button" onClick={() => setVoiceOfStaffEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>}</div>
                    <div className="grid gap-3 md:grid-cols-12">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-3">ชื่อผู้ให้ข้อมูล (ถ้าระบุได้)<input value={voice.interviewee_name} onChange={(event) => handleVoiceOfStaffChange(index, 'interviewee_name', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-3">บทบาท/ตำแหน่ง<input value={voice.interviewee_role} onChange={(event) => handleVoiceOfStaffChange(index, 'interviewee_role', event.target.value)} placeholder="เช่น พยาบาลเวร" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-3">หน่วยงาน<input value={voice.interviewee_department} onChange={(event) => handleVoiceOfStaffChange(index, 'interviewee_department', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-3">วันเวลาสัมภาษณ์<input type="datetime-local" value={voice.interview_date} onChange={(event) => handleVoiceOfStaffChange(index, 'interview_date', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-6">บริบทการทำงานขณะเกิดเหตุ<textarea rows={2} value={voice.work_context} onChange={(event) => handleVoiceOfStaffChange(index, 'work_context', event.target.value)} placeholder="ภาระงาน จำนวนผู้ป่วย เครื่องมือ เวลา หรือข้อจำกัดที่มีในขณะนั้น" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-6">ประเด็นสำคัญที่ได้จากการรับฟัง *<textarea rows={2} value={voice.key_points} onChange={(event) => handleVoiceOfStaffChange(index, 'key_points', event.target.value)} placeholder="สิ่งที่เกิดขึ้นจริง มุมมองของผู้ปฏิบัติงาน และจุดที่ระบบไม่เอื้อ" className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 text-xs font-normal dark:border-violet-800 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-6">เงื่อนไขที่มีส่วนให้เกิดเหตุ<textarea rows={2} value={voice.contributing_conditions} onChange={(event) => handleVoiceOfStaffChange(index, 'contributing_conditions', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 md:col-span-6">ข้อเสนอแนะจากผู้ปฏิบัติงาน<textarea rows={2} value={voice.suggestions} onChange={(event) => handleVoiceOfStaffChange(index, 'suggestions', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">ประวัติรอบการประชุมทบทวน</h4>
            <p className="mt-1 text-xs text-slate-500">บันทึกว่าแต่ละรอบประชุมเมื่อใดและได้ข้อสรุปอะไร</p>
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

        <section id="rca-route" className={`scroll-mt-24 space-y-5 rounded-3xl border border-cyan-200 bg-white p-6 shadow-sm dark:border-cyan-900 dark:bg-slate-900 sm:p-8 ${guidedMode && activeStep !== 'rca-route' ? 'hidden print:block' : ''}`}>
          <div>
            <div className="text-xs font-black text-cyan-700 dark:text-cyan-300">ผลลัพธ์หลังหน่วยงานทบทวน</div>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">เรื่องนี้ควรดำเนินต่ออย่างไร</h3>
            <p className="mt-1 text-xs text-slate-500">หน่วยงานจบเรื่องเองได้เมื่อมีอำนาจและข้อมูลเพียงพอ หรือขอทีมคร่อมสายงานช่วยโดยหน่วยงานยังเป็นเจ้าของเรื่อง</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['DEPARTMENT_CLOSED', 'จัดการและจบที่หน่วยงาน', 'ปัญหาอยู่ในขอบเขตหน่วยงานและมีมาตรการครบ'],
              ['DEPARTMENT_MONITORING', 'ติดตามมาตรการต่อในหน่วยงาน', 'สรุป RCA แล้วและติดตามผลผ่าน CAPA/Risk Register'],
              ['CROSS_FUNCTIONAL_SUPPORT', 'ขอทีมคร่อมสายงานร่วมทบทวน', 'ต้องการความรู้หรือการประสานงานจากทีมอื่น'],
              ['ORGANIZATION_RCA', 'ยกระดับเป็น RCA ระดับองค์กร', 'เป็นปัญหาเชิงระบบ รุนแรง หรือกระทบหลายกระบวนการ'],
            ].map(([value, label, hint]) => (
              <button key={value} type="button" onClick={() => setReviewOutcome(value)} className={`rounded-2xl border p-4 text-left transition ${reviewOutcome === value ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100 dark:bg-cyan-950/30 dark:ring-cyan-950' : 'border-slate-200 hover:border-cyan-300 dark:border-slate-700'}`}>
                <div className="text-sm font-black text-slate-900 dark:text-white">{label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>
              </button>
            ))}
          </div>
          {['CROSS_FUNCTIONAL_SUPPORT', 'ORGANIZATION_RCA'].includes(reviewOutcome) && (
            <div className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20 md:grid-cols-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">ทีมที่ขอให้ช่วย<input value={supportTargetName} onChange={(event) => setSupportTargetName(event.target.value)} placeholder="เช่น PCT, PTC, IC, ENV หรือทีมเฉพาะกิจ" className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-amber-800 dark:bg-slate-950" /></label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">วัตถุประสงค์<select value={supportRequestPurpose} onChange={(event) => setSupportRequestPurpose(event.target.value)} className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-amber-800 dark:bg-slate-950"><option value="PROCESS_ANALYSIS">ช่วยวิเคราะห์กระบวนการ</option><option value="SPECIALIST_ADVICE">ให้ความเห็นเฉพาะด้าน</option><option value="JOINT_ACTION">ร่วมกำหนดมาตรการ</option><option value="POLICY_DECISION">พิจารณานโยบาย/ทรัพยากร</option></select></label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 md:col-span-2">เหตุผลที่ต้องขอความช่วยเหลือหรือยกระดับ<textarea rows={3} value={escalationReason} onChange={(event) => setEscalationReason(event.target.value)} placeholder="ระบุขอบเขตที่หน่วยงานแก้เองไม่ได้ ความซับซ้อน เหตุซ้ำ หรือความรุนแรง" className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-amber-800 dark:bg-slate-950" /></label>
            </div>
          )}
        </section>

        <section id="risk-register-link" className={`scroll-mt-24 space-y-5 rounded-3xl border-2 border-indigo-300 bg-indigo-50/40 p-6 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/20 sm:p-8 ${guidedMode && activeStep !== 'risk-register-link' ? 'hidden print:block' : ''}`}>
          <div className="flex flex-col gap-2 border-b border-indigo-200 pb-4 dark:border-indigo-900 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black text-indigo-600">ขั้นตอนสุดท้ายก่อนสรุป RCA</div>
              <h3 className="mt-1 text-lg font-black text-indigo-950 dark:text-indigo-100">นำความเสี่ยงเข้าสู่ Risk Register</h3>
              <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">ระบบจะเชื่อมกับรายการเดิมที่ใช้ NRLS เดียวกัน หรือสร้างรายการใหม่ให้เจ้าของกระบวนการติดตามต่อ โดยไม่ต้องรอ RM เปิดเรื่องให้</p>
            </div>
            <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">NRLS {sourceIncident?.nrls_code || '-'}</span>
          </div>

          {status.toUpperCase() === 'COMPLETED' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              RCA นี้สรุปแล้วและเชื่อมกับ Risk Register เรียบร้อย
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200">
                เลือก Risk Register ที่มีอยู่ หรือให้ระบบสร้างรายการใหม่
                <select
                  value={selectedRiskProfileId}
                  onChange={(event) => setSelectedRiskProfileId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 dark:border-indigo-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">สร้าง Risk Register ใหม่จาก RCA นี้</option>
                  {riskProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>[{profile.risk_code}] {profile.risk_title} · {profile.scope_level === 'hospital' ? 'ระดับโรงพยาบาล' : profile.department_name || `หน่วยงาน ${profile.department_id}`} · เจ้าของ {profile.risk_owner_name || 'ยังไม่ระบุ'}</option>
                  ))}
                </select>
              </label>

              {selectedRiskProfileId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">ระบบจะเชื่อม RCA กับ Risk Register ที่คุณเลือกโดยตรง กรุณาตรวจขอบเขต หน่วยงาน และเจ้าของความเสี่ยงก่อนกดสรุป</div>}

              {!selectedRiskProfileId && (
                <div className="grid gap-4 rounded-2xl border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-slate-900 md:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 md:col-span-2">
                    ข้อความความเสี่ยง: เหตุการณ์ที่อาจเกิดและผลกระทบ
                    <textarea
                      rows={3}
                      value={riskDescription}
                      onChange={(event) => setRiskDescription(event.target.value)}
                      placeholder="เช่น การระบุตัวผู้ป่วยไม่ครบถ้วน อาจทำให้ให้การรักษาผิดคนและเกิดอันตรายต่อผู้ป่วย"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    เจ้าของความเสี่ยง/เจ้าของกระบวนการ
                    <input value={riskOwnerName} onChange={(event) => setRiskOwnerName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    โอกาสเกิดซ้ำเริ่มต้น
                    <select value={initialLikelihood} onChange={(event) => setInitialLikelihood(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>ระดับ {value}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    รอบทบทวน
                    <select value={reviewFrequencyMonths} onChange={(event) => setReviewFrequencyMonths(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                      <option value={1}>ทุก 1 เดือน</option><option value={3}>ทุก 3 เดือน</option><option value={6}>ทุก 6 เดือน</option><option value={12}>ทุก 12 เดือน</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}
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
            {status.toUpperCase() !== 'COMPLETED' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving || completing}
                  className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving && !completing ? 'กำลังบันทึก...' : 'บันทึกร่าง'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCompleteRca()}
                  disabled={saving || completing}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{completing ? 'กำลังสรุปและเชื่อมทะเบียน...' : 'สรุป RCA และเข้า Risk Register'}</span>
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <OfficialPrintFooter />

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
        rcaType="standard"
        onApply={handleApplyAiData}
      />
    </div>
  );
}
