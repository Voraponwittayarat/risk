import React, { useState } from 'react';
import axios from 'axios';
import { X, Shield, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { SwissCheeseTable } from '../../components/rca/SwissCheeseTable';
import type { SwissCheeseHole } from '../../components/rca/SwissCheeseTable';
import { FishboneDiagram } from '../../components/rca/FishboneDiagram';
import type { FishboneItem } from '../../components/rca/FishboneDiagram';
import { AiRcaAssistantModal } from '../../components/rca/AiRcaAssistantModal';
import { useAuth } from '../../contexts/AuthContext';

interface MiniRcaModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: {
    id: number;
    id_risk?: number;
    topic?: string;
    risk_name?: string;
    level_id?: string;
    department_id?: string;
    detail?: string;
    date_risk?: string;
  };
  onSuccess?: () => void;
}

export const MiniRcaModal: React.FC<MiniRcaModalProps> = ({ isOpen, onClose, incident, onSuccess }) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState(incident.risk_name || incident.topic || 'ทบทวนสาเหตุเชิงระบบ Mini RCA');
  const [incidentDetail, setIncidentDetail] = useState(incident.detail || '');
  const [holes, setHoles] = useState<SwissCheeseHole[]>([]);
  const [cmpProblem, setCmpProblem] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [responsibleUnit, setResponsibleUnit] = useState(incident.department_id ? `หน่วยที่ ${incident.department_id}` : '');
  const [reviewerName, setReviewerName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  // New features for feedback
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [toolChoice, setToolChoice] = useState<'swiss_cheese' | 'fishbone'>('swiss_cheese');
  const [fishbones, setFishbones] = useState<FishboneItem[]>([]);

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
        incident_date: incident.date_risk ? new Date(incident.date_risk).toISOString() : new Date().toISOString(),
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
        swiss_cheeses: toolChoice === 'swiss_cheese' ? holes : [],
        fishbones: toolChoice === 'fishbone' ? fishbones : [],
        cmps: [
          {
            cmp_problem: cmpProblem || 'ปัญหา/ช่องโหว่การปฏิบัติงาน',
            corrective_action: correctiveAction,
            responsible_unit: responsibleUnit,
            status: 'pending',
          },
        ],
        reviewers: [
          {
            name: reviewerName || user?.name || 'ทีมงาน',
            position: 'ผู้ทบทวน',
            department: responsibleUnit,
          },
        ],
      };

      await axios.post('/rca/cases', payload);
      alert('บันทึกการทบทวน Mini RCA เรียบร้อยแล้ว!');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ทบทวนด่วน Mini RCA (Swiss Cheese Model)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                  เคสเดียว (Single Case)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                วิเคราะห์ช่องโหว่ด่านป้องกันและกำหนดมาตรการแก้ไขอย่างรวดเร็วสำหรับเหตุการณ์ระดับ C-F หรือ Near Miss
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
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Snapshot Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                รหัสอุบัติการณ์: #{incident.id} | ระดับความรุนแรง: {incident.level_id || 'C'}
              </div>
              <div className="text-xs text-slate-500">
                แผนก: {incident.department_id ? `หน่วยที่ ${incident.department_id}` : '-'}
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
          </div>

          {/* Tool Selection Toggle */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mx-auto border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setToolChoice('swiss_cheese')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                toolChoice === 'swiss_cheese'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              สวิสชีส (Swiss Cheese)
            </button>
            <button
              type="button"
              onClick={() => setToolChoice('fishbone')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                toolChoice === 'fishbone'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              ผังก้างปลา (Fishbone)
            </button>
          </div>

          {/* Analysis Tool Component */}
          {toolChoice === 'swiss_cheese' ? (
            <SwissCheeseTable holes={holes} onChange={setHoles} />
          ) : (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <FishboneDiagram factors={fishbones} topic={topic} onChange={setFishbones} />
            </div>
          )}

          {/* Action Plan & CMP */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600" />
              มาตรการแก้ไขและป้องกัน (Corrective Action Plan)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ปัญหา/จุดอ่อนในการดูแล (CMP Problem)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ไม่ได้ทำ Double check, ขาดระบบเตือน..."
                  value={cmpProblem}
                  onChange={(e) => setCmpProblem(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  หน่วยงานรับผิดชอบ
                </label>
                <input
                  type="text"
                  value={responsibleUnit}
                  onChange={(e) => setResponsibleUnit(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

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
              ยกเลิก
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
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        topic={topic}
        whatHappened={incidentDetail}
        severity={incident.level_id || 'C'}
        onApply={(aiData) => {
          if (aiData.cmps && aiData.cmps.length > 0) {
            setCmpProblem(aiData.cmps[0].observation || '');
            setCorrectiveAction(aiData.cmps[0].comment || '');
          }
          if (aiData.swiss_cheeses && aiData.swiss_cheeses.length > 0) {
            setHoles(aiData.swiss_cheeses);
            setToolChoice('swiss_cheese');
          } else if (aiData.fishbones && aiData.fishbones.length > 0) {
            setFishbones(aiData.fishbones);
            setToolChoice('fishbone');
          }
        }}
      />
    </>
  );
};
