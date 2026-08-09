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
}

interface AiRcaAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  whatHappened: string;
  actualImpact?: string;
  severity?: string;
  onApply: (aiData: AiData, selectedSections: string[]) => void;
}

export const AiRcaAssistantModal: React.FC<AiRcaAssistantModalProps> = ({
  isOpen,
  onClose,
  topic,
  whatHappened,
  actualImpact,
  severity = 'G',
  onApply,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AiData | null>(null);

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

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/rca/ai-assist`, {
        topic: topic || 'อุบัติการณ์ความเสี่ยงทางคลินิก',
        what_happened: whatHappened || '',
        actual_impact: actualImpact || '',
        severity: severity,
      });
      setAiData(res.data);
    } catch (err: any) {
      console.error('Failed to generate AI RCA:', err);
      setError('ไม่สามารถเชื่อมต่อระบบ AI ได้ กำลังเปิดใช้งานโหมดสำรองในเครื่อง...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !aiData && !loading) {
      handleGenerate();
    }
  }, [isOpen]);

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
    man: '👨‍⚕️ Man (บุคลากร)',
    method: '📋 Method (วิธีปฏิบัติ)',
    machine: '⚙️ Machine (อุปกรณ์/ระบบ)',
    material: '📦 Material (เวชภัณฑ์/ยา)',
    measurement: '📏 Measurement (การวัด/ประเมิน)',
    environment: '🏥 Environment (สิ่งแวดล้อม)',
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
                วิเคราะห์รากเหง้าเชิงระบบ 6M, 5 Whys, 5 Tiers, CMPs, Swiss Cheese และมาตรการ CAPA ตามมาตรฐาน HA
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
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-medium ml-4 shrink-0"
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
                  ระบบกำลังสร้างโมเดล 6M, 5 Whys, CMPs, Swiss Cheese และ CAPA จากมาตรฐานความปลอดภัย รพ.วังเจ้า
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-2 text-xs font-semibold px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          ) : aiData ? (
            <div className="space-y-4">
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

              {/* 1. Fishbone 6M Section */}
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
                      <span className="text-base">🐟</span>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        ผังก้างปลา 6M (Fishbone Diagram Analysis)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                        {aiData.fishbones?.length || 0} ปัจจัย
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
                        แผนปฏิบัติการแก้ไขและป้องกัน (CAPA Action Plan)
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
          ) : null}
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
          <button
            type="button"
            onClick={handleApply}
            disabled={!aiData || loading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>นำข้อมูลไปใส่ในฟอร์ม RCA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
