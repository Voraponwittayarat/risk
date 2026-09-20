import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  AlertTriangle,
  Layers,
  HelpCircle,
  ShieldAlert,
  ClipboardCheck,
  RefreshCw,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import axios from 'axios';

const API_BASE = '';

interface AiData {
  topic_refined?: string;
  what_happened_summary?: string;
  actual_impact_summary?: string;
  potential_impact_summary?: string;
  contributing_factors?: Array<{ code: string; detail?: string }>;
  fishbones?: Array<{ category: string; factor: string; sub_factor?: string }>;
  whys?: Array<{ level: number; question: string; answer: string }>;
  cmps?: Array<{ observation: string; hypothesis: string; comment: string }>;
  process_analyses?: Array<{
    process_key: string;
    problem: string;
    tier1_personnel: string;
    tier2_teamwork: string;
    tier3_environment: string;
    tier4_policy: string;
    tier5_external: string;
    corrective_action: string;
  }>;
  swiss_cheeses?: Array<{ layer: string; hole: string }>;
  capas?: Array<{ action: string; type: string; responsible: string; due_date: string; status: string }>;
  timelines?: Array<{ event_time: string; event_description: string; is_critical_point: boolean }>;
  rca_team_suggestion?: string;
  reviewers_suggestion?: string;
  risk_classification?: string;
  analysis_source?: 'gemini' | 'local_fallback';
  analysis_mode?: 'basic' | 'full';
  analysis_notice?: string;
}

interface AiRcaAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  whatHappened: string;
  actualImpact?: string;
  severity?: string;
  rcaType?: 'standard' | 'mini';
  onApply: (aiData: AiData, selectedSections: string[]) => void;
}

export const AiRcaAssistantModal: React.FC<AiRcaAssistantModalProps> = ({
  isOpen,
  onClose,
  topic,
  whatHappened,
  actualImpact,
  severity = 'G',
  rcaType = 'standard',
  onApply,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AiData | null>(null);
  const [incidentText, setIncidentText] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'basic' | 'full'>('full');

  // Selected sections to import
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
    problem_impact: true,
    fishbone: true,
    whys: true,
    cmps: true,
    process: true,
    swiss_cheese: true,
    capa: true,
    timeline: true,
    team: true,
  });

  const [expandedSection, setExpandedSection] = useState<string | null>('fishbone');

  const toggleSectionSelect = (key: string) => {
    setSelectedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async (mode: 'basic' | 'full' = analysisMode) => {
    if (!incidentText.trim()) {
      setError('กรุณาระบุรายละเอียดเหตุการณ์ก่อนเริ่มวิเคราะห์');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisMode(mode);
    try {
      const res = await axios.post(`${API_BASE}/rca/ai-assist`, {
        topic: topic || 'อุบัติการณ์ความเสี่ยงทางคลินิก',
        what_happened: whatHappened || '',
        actual_impact: actualImpact || '',
        severity: severity,
        incident_text: incidentText.trim(),
        rca_type: rcaType,
        analysis_mode: mode,
      });
      setAiData(res.data);
    } catch (err: any) {
      console.error('Failed to generate AI RCA:', err);
      setError(err?.response?.data?.message || 'ไม่สามารถวิเคราะห์ข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialText = [
        topic ? `หัวข้อเหตุการณ์: ${topic}` : '',
        whatHappened ? `รายละเอียดเหตุการณ์: ${whatHappened}` : '',
        actualImpact ? `ผลกระทบที่เกิดขึ้นจริง: ${actualImpact}` : '',
        severity ? `ระดับความรุนแรงที่บันทึกไว้: ${severity}` : '',
      ].filter(Boolean).join('\n\n');
      setIncidentText(initialText);
      setAiData(null);
      setError(null);
      setAnalysisMode('full');
    }
  }, [isOpen, topic, whatHappened, actualImpact, severity]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!aiData) return;
    const activeKeys = Object.entries(selectedSections)
      .filter(([_, active]) => active)
      .map(([k]) => k);
    onApply(aiData, activeKeys);
    onClose();
  };

  const categoryIcons: Record<string, string> = {
    staff: 'ด้านบุคลากร',
    patient: 'ด้านผู้ป่วย',
    nature_of_work: 'ลักษณะงานที่ปฏิบัติ',
    team: 'ทีมทำงาน',
    communication: 'การสื่อสาร',
    supervision_support: 'การกำกับดูแล/การสนับสนุน',
    policies_protocols: 'นโยบายและระเบียบปฏิบัติ',
    data_information: 'ข้อมูลและสารสนเทศ',
    equipment_device: 'อุปกรณ์/เครื่องมือ',
    environment: 'สิ่งแวดล้อม',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">✨ ผู้ช่วย AI วิเคราะห์ Root Cause Analysis</h3>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-amber-400 text-slate-900 shadow-xs">
                  Clinical AI Model
                </span>
              </div>
              <p className="text-xs text-purple-100 mt-0.5">
                Clinical Safety • System Approach • ภาษาวิชาการที่เข้าใจและไม่กล่าวโทษผู้ปฏิบัติงาน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Incident Summary Pill */}
        <div className="px-6 py-3 bg-purple-50 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/30 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-purple-700 dark:text-purple-300">หัวข้อเหตุการณ์:</span>
            <span className="font-medium truncate">{topic || 'ยังไม่ได้ระบุหัวข้อ'}</span>
            {severity && (
              <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                ระดับ {severity}
              </span>
            )}
          </div>
          <button
            onClick={() => handleGenerate(analysisMode)}
            disabled={loading}
            className={`flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-medium ml-4 shrink-0 ${aiData ? '' : 'invisible'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            วิเคราะห์ใหม่
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 animate-spin"></div>
                <Bot className="w-7 h-7 text-purple-600 absolute inset-0 m-auto" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  กำลังประมวลผลการวิเคราะห์สาเหตุเชิงลึก...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ระบบกำลังวิเคราะห์ปัจจัยร่วม NRLS 2569, 5 Whys, CMPs, Swiss Cheese และมาตรการแก้ไขจากข้อมูลเหตุการณ์
                </p>
              </div>
            </div>
          ) : !aiData ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/60 dark:bg-purple-950/20">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">วางรายละเอียดเหตุการณ์ที่ต้องการให้ AI ช่วยวิเคราะห์</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      ระบบจะสกัดหัวข้อ ผลกระทบ Timeline, CMPs และมาตรการแก้ไขและป้องกัน โดยใช้มุมมองเชิงระบบ หากเลือกแบบเจาะลึกจะรวม Clinical Process Analysis 5-Tier ด้วย
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="rca-ai-incident-text" className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  เนื้อหาเหตุการณ์ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="rca-ai-incident-text"
                  rows={13}
                  value={incidentText}
                  onChange={(event) => setIncidentText(event.target.value)}
                  placeholder="วางข้อความเหตุการณ์ที่นี่..."
                  className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-inner outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-purple-950"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>ตรวจสอบและลบข้อมูลระบุตัวบุคคลที่ไม่จำเป็นก่อนส่งวิเคราะห์</span>
                  <span>{incidentText.trim().length.toLocaleString('th-TH')} ตัวอักษร</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {aiData.analysis_notice && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{aiData.analysis_notice}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-bold ${aiData.analysis_source === 'gemini' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {aiData.analysis_source === 'gemini' ? 'AI Clinical Safety' : 'โหมดวิเคราะห์สำรอง'}
                </span>
                <span className="rounded-full bg-purple-100 px-2.5 py-1 font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {aiData.analysis_mode === 'basic' ? 'วิเคราะห์พื้นฐาน' : 'วิเคราะห์เจาะลึก'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span>เลือกหัวข้อที่ต้องการนำไปเติมลงในแบบฟอร์ม:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSections({
                        problem_impact: true,
                        fishbone: true,
                        whys: true,
                        cmps: true,
                        process: true,
                        swiss_cheese: true,
                        capa: true,
                        timeline: true,
                        team: true,
                      })
                    }
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    เลือกทั้งหมด
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSections({
                        problem_impact: false,
                        fishbone: false,
                        whys: false,
                        cmps: false,
                        process: false,
                        swiss_cheese: false,
                        capa: false,
                        timeline: false,
                        team: false,
                      })
                    }
                    className="text-slate-500 hover:underline"
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              </div>

              {/* Incident summary and impact */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div
                  className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/60"
                  onClick={() => setExpandedSection(expandedSection === 'problem' ? null : 'problem')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.problem_impact}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleSectionSelect('problem_impact');
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">สรุปเหตุการณ์และผลกระทบ</div>
                      {aiData.risk_classification && <div className="mt-0.5 text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">{aiData.risk_classification === 'clinical' ? 'ความเสี่ยงทางคลินิก' : aiData.risk_classification === 'general' ? 'ความเสี่ยงทั่วไป' : aiData.risk_classification}</div>}
                    </div>
                  </div>
                  {expandedSection === 'problem' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
                {expandedSection === 'problem' && (
                  <div className="space-y-3 bg-white p-4 text-xs dark:bg-slate-900">
                    <div><span className="font-bold text-purple-700 dark:text-purple-300">หัวข้อ: </span><span className="text-slate-700 dark:text-slate-300">{aiData.topic_refined || '-'}</span></div>
                    <div><span className="font-bold text-slate-700 dark:text-slate-300">เหตุการณ์: </span><span className="text-slate-600 dark:text-slate-400">{aiData.what_happened_summary || '-'}</span></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/20"><span className="font-bold text-rose-700 dark:text-rose-300">ผลกระทบจริง: </span><span className="text-slate-700 dark:text-slate-300">{aiData.actual_impact_summary || '-'}</span></div>
                      <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20"><span className="font-bold text-amber-700 dark:text-amber-300">ผลกระทบที่อาจเกิด: </span><span className="text-slate-700 dark:text-slate-300">{aiData.potential_impact_summary || '-'}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div
                  className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/60"
                  onClick={() => setExpandedSection(expandedSection === 'timeline' ? null : 'timeline')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.timeline}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleSectionSelect('timeline');
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">เส้นเวลาลำดับเหตุการณ์</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{aiData.timelines?.length || 0} รายการ</span>
                  </div>
                  {expandedSection === 'timeline' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
                {expandedSection === 'timeline' && (
                  <div className="space-y-2 bg-white p-4 dark:bg-slate-900">
                    {aiData.timelines?.length ? aiData.timelines.map((item, index) => (
                      <div key={`${item.event_time}-${index}`} className={`flex gap-3 rounded-lg border p-3 text-xs ${item.is_critical_point ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30'}`}>
                        <span className="w-24 shrink-0 font-bold text-slate-700 dark:text-slate-300">{item.event_time || 'ไม่ระบุเวลา'}</span>
                        <span className="text-slate-600 dark:text-slate-400">{item.event_description}</span>
                      </div>
                    )) : <p className="text-xs text-slate-500">AI ไม่พบข้อมูลลำดับเวลาที่ชัดเจนจากเนื้อหา</p>}
                  </div>
                )}
              </div>

              {/* 1. NRLS Contributing Factors Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedSection(expandedSection === 'fishbone' ? null : 'fishbone')
                  }
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.fishbone}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSectionSelect('fishbone');
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-base">📚</span>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        ปัจจัยร่วม/สาเหตุของความเสี่ยงตาม NRLS 2569
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                        {aiData.contributing_factors?.length || aiData.fishbones?.length || 0} ปัจจัย
                      </span>
                    </div>
                  </div>
                  {expandedSection === 'fishbone' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandedSection === 'fishbone' && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900">
                    {aiData.fishbones?.map((fb, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                          <span>{categoryIcons[fb.category] || fb.category}</span>
                        </div>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{fb.factor}</p>
                        {fb.sub_factor && (
                          <p className="text-slate-500 dark:text-slate-400 italic">└ {fb.sub_factor}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Five Whys */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedSection(expandedSection === 'whys' ? null : 'whys')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.whys}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSectionSelect('whys');
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        การขุดค้นสาเหตุ 5 Whys (Five Whys Root Cause Chain)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                        {aiData.whys?.length || 0} ขั้น
                      </span>
                    </div>
                  </div>
                  {expandedSection === 'whys' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandedSection === 'whys' && (
                  <div className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                    {aiData.whys?.map((why, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs space-y-1"
                      >
                        <div className="font-bold text-amber-800 dark:text-amber-300">
                          Why #{why.level}: {why.question}
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 pl-4 border-l-2 border-amber-400">
                          {why.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. CMPs */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedSection(expandedSection === 'cmps' ? null : 'cmps')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.cmps}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSectionSelect('cmps');
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-500" />
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        Care Management Problems (CMPs)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-medium">
                        {aiData.cmps?.length || 0} ประเด็น
                      </span>
                    </div>
                  </div>
                  {expandedSection === 'cmps' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandedSection === 'cmps' && (
                  <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                    {aiData.cmps?.map((cmp, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                      >
                        <div>
                          <span className="font-bold text-teal-700 dark:text-teal-300">
                            สิ่งที่สังเกตพบ (CMPs):{' '}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">{cmp.observation}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            สมมติฐาน/อุปสรรค:{' '}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">{cmp.hypothesis}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            แนวทางแก้ไขทันที:{' '}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">{cmp.comment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {rcaType === 'standard' && (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <div
                    className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/60"
                    onClick={() => setExpandedSection(expandedSection === 'process' ? null : 'process')}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSections.process}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleSectionSelect('process');
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Clinical Process Analysis (5-Tier)</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{aiData.process_analyses?.length || 0} กระบวนการ</span>
                    </div>
                    {expandedSection === 'process' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                  {expandedSection === 'process' && (
                    <div className="space-y-3 bg-white p-4 dark:bg-slate-900">
                      {aiData.process_analyses?.length ? aiData.process_analyses.map((process, index) => (
                        <div key={`${process.process_key}-${index}`} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs dark:border-indigo-900 dark:bg-indigo-950/20">
                          <div className="font-bold text-indigo-700 dark:text-indigo-300">{process.process_key || `กระบวนการที่ ${index + 1}`}</div>
                          <div className="mt-2 text-slate-700 dark:text-slate-300"><span className="font-bold">CMP: </span>{process.problem || '-'}</div>
                          <div className="mt-2 grid gap-1 text-[11px] text-slate-600 dark:text-slate-400 md:grid-cols-2">
                            <div><b>Tier 1 บุคคล:</b> {process.tier1_personnel || '-'}</div>
                            <div><b>Tier 2 งาน/ทีม:</b> {process.tier2_teamwork || '-'}</div>
                            <div><b>Tier 3 สิ่งแวดล้อม:</b> {process.tier3_environment || '-'}</div>
                            <div><b>Tier 4 องค์กร:</b> {process.tier4_policy || '-'}</div>
                            <div><b>Tier 5 ภายนอก:</b> {process.tier5_external || '-'}</div>
                            <div className="font-medium text-emerald-700 dark:text-emerald-300"><b>ออกแบบระบบใหม่:</b> {process.corrective_action || '-'}</div>
                          </div>
                        </div>
                      )) : <p className="text-xs text-slate-500">การวิเคราะห์พื้นฐานจะยังไม่เติมส่วนที่ 5 — กด “วิเคราะห์ใหม่” แล้วเลือกแบบเจาะลึกหากต้องการ</p>}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Swiss Cheese Model */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedSection(expandedSection === 'swiss' ? null : 'swiss')
                  }
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.swiss_cheese}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSectionSelect('swiss_cheese');
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        โมเดลเนยแข็งสวิส (Swiss Cheese Model 4 Layers)
                      </span>
                    </div>
                  </div>
                  {expandedSection === 'swiss' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandedSection === 'swiss' && (
                  <div className="p-4 space-y-2 bg-white dark:bg-slate-900">
                    {aiData.swiss_cheeses?.map((sc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs"
                      >
                        <div className="font-bold text-rose-700 dark:text-rose-300 mb-1">{sc.layer}</div>
                        <div className="text-slate-700 dark:text-slate-300">{sc.hole}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. CAPA Action Plan */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedSection(expandedSection === 'capa' ? null : 'capa')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSections.capa}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSectionSelect('capa');
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        แผนมาตรการแก้ไขและป้องกันการเกิดซ้ำ
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
                        {aiData.capas?.length || 0} มาตรการ
                      </span>
                    </div>
                  </div>
                  {expandedSection === 'capa' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandedSection === 'capa' && (
                  <div className="p-4 space-y-2 bg-white dark:bg-slate-900">
                    {aiData.capas?.map((capa, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {capa.action}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-3">
                            <span>ผู้รับผิดชอบ: {capa.responsible}</span>
                            <span>•</span>
                            <span>กำหนดเสร็จ: {capa.due_date}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] rounded font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 shrink-0">
                          {capa.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            ยกเลิก
          </button>
          {aiData ? (
            <button
              type="button"
              onClick={handleApply}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>นำข้อมูลที่เลือกไปใส่ในฟอร์ม RCA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleGenerate('basic')}
                disabled={loading || !incidentText.trim()}
                className="rounded-xl border border-purple-300 bg-white px-4 py-2.5 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-800 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-purple-950/40"
              >
                วิเคราะห์ข้อมูล (พื้นฐาน)
              </button>
              <button
                type="button"
                onClick={() => handleGenerate('full')}
                disabled={loading || !incidentText.trim()}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                วิเคราะห์เจาะลึก (รวมส่วนที่ 5)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
