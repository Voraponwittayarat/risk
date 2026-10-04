import React, { useState } from 'react';
import axios from 'axios';
import { X, Shield, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { SwissCheeseTable } from '../../components/rca/SwissCheeseTable';
import type { SwissCheeseHole } from '../../components/rca/SwissCheeseTable';
import { ContributingFactorSelector } from '../../components/rca/ContributingFactorSelector';
import { AiRcaAssistantModal } from '../../components/rca/AiRcaAssistantModal';
import { SWISS_CHEESE_LAYERS } from '../../utils/rcaCriteria';
import { factorSwissLayer, factorsToSwissHoles } from '../../utils/factorSwissCheese';
import { useAuth } from '../../contexts/AuthContext';
import {
  CONTRIBUTING_FACTORS,
  contributingFactorSelectionsFromLegacy,
  normalizeContributingFactorSelections,
  type ContributingFactorSelection,
} from '../../utils/contributingFactors';

interface MiniRcaModalProps {
  isOpen: boolean;
  embedded?: boolean;
  onClose: () => void;
  incident: {
    id: number;
    id_risk?: number;
    topic?: string;
    risk_name?: string;
    level_id?: string;
    department_id?: string;
    department_name?: string;
    detail?: string;
    date_risk?: string;
    date_report?: string;
    nrls_name_snapshot?: string;
  };
  onSuccess?: () => void;
}

export const MiniRcaModal: React.FC<MiniRcaModalProps> = ({ isOpen, onClose, incident, onSuccess, embedded = false }) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState(incident.nrls_name_snapshot || incident.risk_name || incident.topic || 'ทบทวนสาเหตุเชิงระบบ Mini RCA');
  const [incidentDetail, setIncidentDetail] = useState(incident.detail || '');
  const [holes, setHoles] = useState<SwissCheeseHole[]>([]);
  const [cmpProblem, setCmpProblem] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [responsibleUnit, setResponsibleUnit] = useState(incident.department_name || (incident.department_id ? `หน่วยที่ ${incident.department_id}` : ''));
  const [reviewerName, setReviewerName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  // New features for feedback
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const factorLayers: Record<string, string> = {};
  const [contributingFactors, setContributingFactors] = useState<ContributingFactorSelection[]>([]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctiveAction.trim()) {
      alert('กรุณาระบุมาตรการแก้ไข/ป้องกัน (Action Plan)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        topic,
        rca_type: 'mini',
        review_date: new Date().toISOString(),
        incident_date: incident.date_report || incident.date_risk || undefined,
        incident_detail: incidentDetail,
        created_by: user?.id || 1,
        incidents: [
          {
            incident_id: incident.id,
            incident_id_risk: incident.id_risk || 0,
            risk_name: incident.risk_name || topic,
            severity_level: incident.level_id || 'C',
            department_id: incident.department_id,
            detail: incidentDetail,
          },
        ],
        swiss_cheeses: [...factorsToSwissHoles(contributingFactors, factorLayers), ...holes, ...(cmpProblem.trim() ? [{ layer: 'act', hole: cmpProblem.trim() }] : [])],
        contributing_factors: contributingFactors,
        cmps: [
          {
            cmp_problem: [cmpProblem.trim(), ...holes.filter(hole => hole.layer === 'act').map(hole => hole.hole)].filter(Boolean).join('; ') || [...factorsToSwissHoles(contributingFactors, factorLayers), ...holes].map(hole => hole.hole).join('; ') || 'ปัญหา/ช่องโหว่การปฏิบัติงาน',
            corrective_action: correctiveAction,
            responsible_unit: embedded ? (incident.department_name || (incident.department_id ? `หน่วยที่ ${incident.department_id}` : '')) : responsibleUnit,
            status: 'pending',
          },
        ],
        reviewers: [
          {
            name: reviewerName || user?.name || 'ทีมงาน',
            position: 'ผู้ทบทวน',
            department: embedded ? (incident.department_name || (incident.department_id ? `หน่วยที่ ${incident.department_id}` : '')) : responsibleUnit,
          },
        ],
      };

      await axios.post('/rca/cases', payload);
      alert('บันทึก Mini RCA แล้ว สถานะกำลังดำเนินการ กรุณาติดตามและสรุปผลในศูนย์ RCA');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create Mini RCA', err);
      alert('เกิดข้อผิดพลาดในการบันทึก Mini RCA');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={embedded ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"}>
        <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-800 space-y-6 ${embedded ? "" : "max-w-4xl shadow-2xl my-8"}`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ทบทวน RCA ในหน่วยงาน
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                  เคสเดียว (Single Case)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                วิเคราะห์สาเหตุและมาตรการระดับหน่วยงาน บันทึกแล้วเคสยังเปิดอยู่เพื่อดำเนินการและติดตามผลต่อ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAiAssistantOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 font-medium text-xs border border-purple-200 dark:border-purple-800/50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>ผู้ช่วย AI</span>
            </button>
            <button type="button" aria-label={embedded ? "กลับไปใช้แบบทบทวนปกติ" : "ปิด Mini RCA"} onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Standalone form needs context; embedded review already shows it above. */}
          {!embedded && <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                รหัสอุบัติการณ์: #{incident.id} | ระดับความรุนแรง: {incident.level_id || 'C'}
              </div>
              <div className="text-xs text-slate-500">
                แผนก: {incident.department_name || (incident.department_id ? `หน่วยที่ ${incident.department_id}` : '-')}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                หัวข้อ/ประเด็นความเสี่ยง
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                รายละเอียดเหตุการณ์
              </label>
              <textarea
                rows={2}
                value={incidentDetail}
                onChange={(e) => setIncidentDetail(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>}

          <section className="space-y-4">
            <h4 className="text-sm font-bold">Swiss Cheese และปัจจัย NRLS</h4>
            <p className="text-xs text-slate-500">กดหัวข้อ 1–4 เพื่อเลือกปัจจัยและกรอกข้อค้นพบในชั้นนั้น โดยจัดหมวดให้อัตโนมัติตามที่ตกลงไว้</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {SWISS_CHEESE_LAYERS.map(layer => {
                const codes = CONTRIBUTING_FACTORS.filter(factor => factorSwissLayer(factor.code) === layer.key).map(factor => factor.code);
                const selected = contributingFactors.filter(factor => codes.includes(factor.code));
                const extraHoles = holes.filter(hole => hole.layer === layer.key);
                return <details key={layer.key} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 overflow-hidden">
                  <summary className={`cursor-pointer p-4 text-sm font-bold ${layer.color}`}>
                    {layer.name} <span className="ml-2">({selected.length + extraHoles.length + (layer.key === 'act' && cmpProblem.trim() ? 1 : 0)})</span>
                  </summary>
                  <div className="space-y-3 p-3">
                    <p className="text-xs text-slate-500">{layer.description}</p>
                    {codes.length > 0 ? <ContributingFactorSelector hideHeader pickerOpen allowedCodes={codes}
                      value={selected} onChange={next => setContributingFactors(previous => [...previous.filter(factor => !codes.includes(factor.code)), ...next])} />
                      : <p className="text-xs text-slate-500">หมวด NRLS จัดอยู่ในข้อ 1–3 ตามที่ตกลงไว้ ข้อนี้ใช้ระบุการกระทำที่ไม่ปลอดภัยจากข้อเท็จจริงเพิ่มเติม</p>}
                    {layer.key === 'act' && <label className="block text-xs font-semibold">
                      การกระทำที่ไม่ปลอดภัย / จุดอ่อนในการดูแลที่พบ
                      <textarea rows={3} value={cmpProblem} onChange={event => setCmpProblem(event.target.value)}
                        placeholder="ระบุสิ่งที่เกิดขึ้นจริง เช่น ไม่ได้ตรวจสอบซ้ำก่อนปฏิบัติ"
                        className="mt-2 w-full rounded-xl border border-rose-200 bg-white p-3 text-xs dark:bg-slate-900" />
                      <span className="mt-1 block font-normal text-slate-500">นำข้อความนี้ไปใช้เป็นปัญหาตั้งต้นของมาตรการโดยอัตโนมัติ ไม่ต้องกรอก CMP ซ้ำ</span>
                    </label>}
                    {extraHoles.map(hole => <div key={holes.indexOf(hole)} className="flex justify-between gap-2 text-xs">
                      <span>{hole.hole}</span><button type="button" aria-label={`ลบช่องโหว่ ${hole.hole}`} onClick={() => setHoles(previous => previous.filter(item => item !== hole))} className="text-rose-600">ลบ</button>
                    </div>)}
                    <details className="rounded-xl border border-slate-200 p-2">
                      <summary className="cursor-pointer text-xs">เพิ่มช่องโหว่อื่นในชั้นนี้ (ถ้ามี)</summary>
                      <SwissCheeseTable controlsOnly fixedLayer={layer.key} holes={extraHoles}
                        onChange={next => setHoles(previous => [...previous.filter(hole => hole.layer !== layer.key), ...next])} />
                    </details>
                  </div>
                </details>;
              })}
            </div>
          </section>

          {/* Action Plan & CMP */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600" />
              มาตรการแก้ไขและป้องกัน (Corrective Action Plan)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!embedded && <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  หน่วยงานรับผิดชอบ
                </label>
                <input
                  type="text"
                  value={responsibleUnit}
                  onChange={(e) => setResponsibleUnit(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  มาตรการแก้ไข/ป้องกันเชิงระบบ (Action Item) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="ระบุแนวทางปรับปรุง เช่น จัดทำ Checklist ตรวจสอบคู่, ติดป้ายเตือน High Alert..."
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อผู้บันทึก/ผู้ทบทวน
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
            >
              {embedded ? "กลับไปใช้แบบทบทวนปกติ" : "ยกเลิก"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกผล Mini RCA'}
            </button>
          </div>
        </form>
      </div>
    </div>

      <AiRcaAssistantModal
        incidentId={incident.id}
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        topic={topic}
        whatHappened={incidentDetail}
        severity={incident.level_id || 'C'}
        rcaType="mini"
        onApply={(aiData, selectedKeys) => {
          if (selectedKeys.includes('cmps') && aiData.cmps && aiData.cmps.length > 0) {
            setCmpProblem(current => [current, ...aiData.cmps!.map(cmp => cmp.observation)].filter(Boolean).join('\n'));
            setCorrectiveAction(current => [current, ...aiData.cmps!.map(cmp => cmp.comment)].filter(Boolean).join('\n'));
          }
          if (selectedKeys.includes('swiss_cheese') && aiData.swiss_cheeses && aiData.swiss_cheeses.length > 0) {
            setHoles(current => [...current, ...aiData.swiss_cheeses!.filter(hole => SWISS_CHEESE_LAYERS.some(layer => layer.key === hole.layer))]);
          }
          if (selectedKeys.includes('fishbone') && ((aiData.contributing_factors && aiData.contributing_factors.length > 0) || (aiData.fishbones && aiData.fishbones.length > 0))) {
            const suggested = normalizeContributingFactorSelections(aiData.contributing_factors);
            const migratedSuggestion = contributingFactorSelectionsFromLegacy(aiData.fishbones || []).selections;
            setContributingFactors(current => normalizeContributingFactorSelections([...current, ...(suggested.length ? suggested : migratedSuggestion)]));
          }
        }}
      />
    </>
  );
};
