import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Layers, 
  ArrowLeft,
  CheckCircle2, 
  AlertTriangle,
  Users,
  Plus, 
  Trash2, 
  FileText
} from 'lucide-react';
import { SwissCheeseTable } from '../../components/rca/SwissCheeseTable';
import type { SwissCheeseHole } from '../../components/rca/SwissCheeseTable';
import { useAuth } from '../../contexts/AuthContext';

interface IncidentItem {
  id: number;
  id_risk?: number;
  topic?: string;
  risk_name?: string;
  level_id?: string;
  department_id?: string;
  department_name?: string;
  detail?: string;
  date_risk?: string;
}

interface CmpItem {
  process?: string;
  cmp_problem: string;
  corrective_action: string;
  responsible_unit: string;
  status: string;
  due_date?: string;
}

interface ReviewerItem {
  name: string;
  position: string;
  department: string;
}

export default function ConciseRcaForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectedIncidents: IncidentItem[] = location.state?.incidents || [];

  const [topic, setTopic] = useState(
    selectedIncidents.length > 0
      ? `ทบทวนเชิงกลุ่ม (Concise RCA): ${selectedIncidents[0].risk_name || selectedIncidents[0].topic || ''} (${selectedIncidents.length} เหตุการณ์)`
      : 'ทบทวนเชิงกลุ่ม Concise RCA'
  );
  const [incidentDetail, setIncidentDetail] = useState(
    `การทบทวนอุบัติการณ์กลุ่มรวม ${selectedIncidents.length} เคส เพื่อค้นหารูปแบบสาเหตุเชิงระบบร่วมกัน (Common Systemic Causes)`
  );
  const [holes, setHoles] = useState<SwissCheeseHole[]>([]);
  const [cmps, setCmps] = useState<CmpItem[]>([
    {
      process: 'กระบวนการให้บริการ',
      cmp_problem: '',
      corrective_action: '',
      responsible_unit: '',
      status: 'pending',
    },
  ]);
  const [reviewers, setReviewers] = useState<ReviewerItem[]>([
    {
      name: user?.name || 'ผู้ดูแลระบบ',
      position: 'ผู้ทบทวน',
      department: user?.department_name || (user?.department_id ? `หน่วยที่ ${user.department_id}` : 'ศูนย์บริหารความเสี่ยง'),
    },
  ]);
  const [saving, setSaving] = useState(false);

  const handleAddCmp = () => {
    setCmps([
      ...cmps,
      {
        process: '',
        cmp_problem: '',
        corrective_action: '',
        responsible_unit: '',
        status: 'pending',
      },
    ]);
  };

  const handleRemoveCmp = (idx: number) => {
    setCmps(cmps.filter((_, i) => i !== idx));
  };

  const handleAddReviewer = () => {
    setReviewers([...reviewers, { name: '', position: '', department: '' }]);
  };

  const handleRemoveReviewer = (idx: number) => {
    setReviewers(reviewers.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert('กรุณาระบุหัวข้อการทบทวน');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        topic,
        rca_type: 'concise',
        review_date: new Date().toISOString(),
        incident_detail: incidentDetail,
        created_by: user?.id || 1,
        incidents: selectedIncidents.map((inc, idx) => ({
          incident_id: inc.id,
          incident_id_risk: inc.id_risk || 0,
          risk_name: inc.risk_name || inc.topic || `เคส #${inc.id}`,
          severity_level: inc.level_id || 'C',
          department_id: inc.department_id,
          detail: inc.detail,
          sort_order: idx + 1,
        })),
        swiss_cheeses: holes,
        cmps: cmps.filter((c) => c.corrective_action.trim()),
        reviewers: reviewers.filter((r) => r.name.trim()),
      };

      await axios.post('/rca/cases', payload);
      alert('บันทึกผลการทบทวน Concise RCA เรียบร้อยแล้ว!');
      navigate('/rca/list');
    } catch (err) {
      console.error('Failed to save Concise RCA', err);
      alert('เกิดข้อผิดพลาดในการบันทึก Concise RCA');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white mb-1 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> ย้อนกลับ
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              การทบทวนหลายเหตุการณ์พร้อมกัน (Concise Multi-Incident RCA)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            วิเคราะห์สาเหตุเชิงระบบแบบกลุ่ม (Cluster Analysis) จากหลายอุบัติการณ์ที่คล้ายคลึงกัน โดยใช้แบบจำลอง Swiss Cheese Model
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-xs">
            รวม {selectedIncidents.length} เหตุการณ์
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selected Incidents Cluster Summary */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            รายการอุบัติการณ์ที่เลือกมารวมทบทวน ({selectedIncidents.length} รายการ)
          </h3>

          {selectedIncidents.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
              ⚠️ ไม่พบรายการที่เลือกมาจากหน้ารายการความเสี่ยง คุณสามารถกรอกหัวข้อและวิเคราะห์กลุ่มได้โดยตรง
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">รหัสเหตุการณ์</th>
                    <th className="px-3 py-2.5">หัวข้อความเสี่ยง</th>
                    <th className="px-3 py-2.5">หน่วยงาน</th>
                    <th className="px-3 py-2.5 text-center">ระดับ</th>
                    <th className="px-3 py-2.5">รายละเอียดโดยย่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {selectedIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">#{inc.id}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {inc.risk_name || inc.topic || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                        {inc.department_name || (inc.department_id ? `หน่วยที่ ${inc.department_id}` : '-')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {inc.level_id || 'C'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-xs truncate text-slate-500">
                        {inc.detail || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อหัวข้อการทบทวนแบบกลุ่ม (Concise RCA Topic) *
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                บทสรุปรูปแบบปัญหาหรือข้อสังเกตร่วม (Summary Observation)
              </label>
              <textarea
                rows={2}
                value={incidentDetail}
                onChange={(e) => setIncidentDetail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Swiss Cheese Holes Analysis */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <SwissCheeseTable holes={holes} onChange={setHoles} />
        </div>

        {/* Action Plans / CMP */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                มาตรการปรับปรุงแก้ไขร่วมเชิงระบบ (Corrective & Preventive Action Plan)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดแนวทางแก้ไขช่องโหว่เพื่อป้องกันไม่ให้เกิดอุบัติการณ์ซ้ำในภาพรวม
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCmp}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 hover:bg-amber-500/25 transition-colors"
            >
              <Plus size={13} /> เพิ่มมาตรการ
            </button>
          </div>

          <div className="space-y-3">
            {cmps.map((cmp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    มาตรการที่ #{idx + 1}
                  </span>
                  {cmps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCmp(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      กระบวนการที่เกี่ยวข้อง
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ระบบจ่ายยา, การส่งต่อ..."
                      value={cmp.process || ''}
                      onChange={(e) => {
                        const next = [...cmps];
                        next[idx].process = e.target.value;
                        setCmps(next);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ปัญหา/จุดบกพร่อง (CMP Problem)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ขาดแนวทางสื่อสารแบบ SBAR..."
                      value={cmp.cmp_problem}
                      onChange={(e) => {
                        const next = [...cmps];
                        next[idx].cmp_problem = e.target.value;
                        setCmps(next);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      หน่วยงานผู้รับผิดชอบ
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น เภสัชกรรม, IPD..."
                      value={cmp.responsible_unit}
                      onChange={(e) => {
                        const next = [...cmps];
                        next[idx].responsible_unit = e.target.value;
                        setCmps(next);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      มาตรการแก้ไขและป้องกันเชิงระบบ (Action Item) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="ระบุสิ่งที่ต้องดำเนินการ เช่น ปรับปรุง CPG, อบรมทบทวนบุคลากร, เพิ่มระบบ Double Check..."
                      value={cmp.corrective_action}
                      onChange={(e) => {
                        const next = [...cmps];
                        next[idx].corrective_action = e.target.value;
                        setCmps(next);
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Team List */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              ทีมผู้ร่วมทบทวน (Review Team)
            </h3>

            <button
              type="button"
              onClick={handleAddReviewer}
              className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1 hover:bg-blue-500/25 transition-colors"
            >
              <Plus size={13} /> เพิ่มผู้ร่วมทบทวน
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {reviewers.map((rev, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 relative group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500">ผู้ทบทวน #{idx + 1}</span>
                  {reviewers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReviewer(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="ชื่อ - สกุล *"
                  value={rev.name}
                  onChange={(e) => {
                    const next = [...reviewers];
                    next[idx].name = e.target.value;
                    setReviewers(next);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ตำแหน่ง"
                    value={rev.position}
                    onChange={(e) => {
                      const next = [...reviewers];
                      next[idx].position = e.target.value;
                      setReviewers(next);
                    }}
                    className="w-full text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="แผนก"
                    value={rev.department}
                    onChange={(e) => {
                      const next = [...reviewers];
                      next[idx].department = e.target.value;
                      setReviewers(next);
                    }}
                    className="w-full text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xl shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการทบทวน Concise RCA'}
          </button>
        </div>
      </form>
    </div>
  );
}
