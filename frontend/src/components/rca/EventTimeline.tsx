import React, { useState } from 'react';
import { Plus, Trash2, Clock, AlertTriangle, Flag, ShieldAlert } from 'lucide-react';

export interface TimelineItem {
  id?: number;
  event_time: string;
  event_date?: string;
  event_description: string;
  is_critical_point?: boolean;
  tag?: string; // 'normal' | 'cmp' | 'intervention'
  sort_order?: number;
}

interface EventTimelineProps {
  items: TimelineItem[];
  onChange: (items: TimelineItem[]) => void;
  readOnly?: boolean;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ items, onChange, readOnly = false }) => {
  const [newTime, setNewTime] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDesc, setNewDesc] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [tag, setTag] = useState('normal');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime.trim() || !newDesc.trim()) return;

    const newItem: TimelineItem = {
      event_time: newTime.trim(),
      event_date: newDate,
      event_description: newDesc.trim(),
      is_critical_point: isCritical,
      tag: isCritical ? 'cmp' : tag,
      sort_order: items.length + 1,
    };

    onChange([...items, newItem]);
    setNewTime('');
    setNewDesc('');
    setIsCritical(false);
    setTag('normal');
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    onChange(updated);
  };

  const handleToggleCritical = (index: number) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        const nextVal = !item.is_critical_point;
        return {
          ...item,
          is_critical_point: nextVal,
          tag: nextVal ? 'cmp' : 'normal',
        };
      }
      return item;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            ไทม์ไลน์ลำดับเหตุการณ์ตามเวลา (Chronological Event Timeline)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            บันทึกลำดับเหตุการณ์ตั้งแต่แรกรับจนถึงจุดสิ้นสุด พร้อมระบุจุดวิกฤต/ปัญหาการดูแลรักษา (CMP)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">
            <AlertTriangle className="w-3 h-3" /> จุดวิกฤต (CMP)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
            <Clock className="w-3 h-3" /> ลำดับปกติ
          </span>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-indigo-500 before:to-slate-300 dark:before:to-slate-700">
        {items.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
            ยังไม่มีข้อมูลไทม์ไลน์ลำดับเหตุการณ์ กรุณาเพิ่มลำดับเหตุการณ์ด้านล่าง
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Marker Dot */}
              <div
                className={`absolute -left-[27px] sm:-left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  item.is_critical_point
                    ? 'bg-rose-500 border-rose-200 text-white ring-4 ring-rose-500/20 shadow-md shadow-rose-500/30 animate-pulse'
                    : 'bg-white dark:bg-slate-900 border-blue-500 text-blue-500 ring-2 ring-blue-500/10'
                }`}
              >
                {item.is_critical_point ? <AlertTriangle size={12} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
              </div>

              {/* Event Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  item.is_critical_point
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-sm'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <Clock size={11} /> {item.event_time}
                    </span>
                    {item.event_date && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.event_date}
                      </span>
                    )}
                    {item.is_critical_point && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                        <ShieldAlert size={10} /> จุดวิกฤต / CMP
                      </span>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleToggleCritical(idx)}
                        title={item.is_critical_point ? 'ยกเลิกจุดวิกฤต' : 'กำหนดเป็นจุดวิกฤต (CMP)'}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                          item.is_critical_point
                            ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Flag size={12} />
                        {item.is_critical_point ? 'CMP' : 'ตั้งเป็น CMP'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        title="ลบจุดนี้"
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-2.5 leading-relaxed font-normal whitespace-pre-wrap">
                  {item.event_description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Timeline Item Form */}
      {!readOnly && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Plus size={14} className="text-blue-500" /> เพิ่มลำดับเหตุการณ์ใหม่
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                วันที่
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                เวลา (เช่น 08:30 หรือ 10:15 น.) *
              </label>
              <input
                type="text"
                placeholder="เช่น 09:30 น."
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-6 flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isCritical}
                  onChange={(e) => setIsCritical(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <ShieldAlert size={14} /> จุดวิกฤต / ปัญหาการดูแลรักษา (CMP)
                </span>
              </label>
            </div>

            <div className="sm:col-span-12">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                รายละเอียดเหตุการณ์ ณ จุดเวลานี้ *
              </label>
              <textarea
                rows={2}
                placeholder="ระบุสิ่งที่เกิดขึ้น กิจกรรมการดูแล หรือข้อผิดพลาดที่เกิดขึ้น..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!newTime.trim() || !newDesc.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
            >
              <Plus size={14} /> บันทึกลงไทม์ไลน์
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
