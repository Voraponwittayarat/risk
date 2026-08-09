import React, { useState } from 'react';
import { Plus, Trash2, GitPullRequest } from 'lucide-react';
import { FISHBONE_CATEGORIES } from '../../utils/rcaCriteria';

export interface FishboneItem {
  category: string; // 'people' | 'method' | 'machine' | 'material' | 'measurement' | 'environment'
  factor: string;
  sub_factor?: string;
  sort_order?: number;
}

interface FishboneDiagramProps {
  factors: FishboneItem[];
  topic: string;
  onChange: (factors: FishboneItem[]) => void;
  readOnly?: boolean;
}

export const FishboneDiagram: React.FC<FishboneDiagramProps> = ({ factors, topic, onChange, readOnly = false }) => {
  const [selectedCat, setSelectedCat] = useState('people');
  const [factorText, setFactorText] = useState('');

  const handleAdd = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!factorText.trim()) return;

    onChange([
      ...factors,
      {
        category: selectedCat,
        factor: factorText.trim(),
        sort_order: factors.length + 1,
      },
    ]);
    setFactorText('');
  };

  const handleRemove = (index: number) => {
    onChange(factors.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-emerald-500" />
            แผนภูมิก้างปลา (Fishbone / Ishikawa Diagram 6M)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            วิเคราะห์สาเหตุและปัจจัยเชิงระบบ 6 ด้าน ที่ส่งผลให้เกิดปัญหา/อุบัติการณ์
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            รวม {factors.length} ปัจจัย
          </span>
        </div>
      </div>

      {/* Fishbone Diagram Spine & Head Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Top 3 Bones (People, Method, Machine) */}
          <div className="grid grid-cols-3 gap-6 mb-4">
            {FISHBONE_CATEGORIES.slice(0, 3).map((cat) => {
              const catFactors = factors.filter((f) => f.category === cat.key);
              return (
                <div key={cat.key} className="space-y-2 relative border-l-2 border-emerald-400/60 pl-3">
                  <div className="font-bold text-xs text-emerald-300 flex items-center justify-between">
                    <span>{cat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {catFactors.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[70px]">
                    {catFactors.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">ไม่มีปัจจัยระบุ</p>
                    ) : (
                      catFactors.map((f, idx) => {
                        const globalIdx = factors.findIndex((item) => item === f);
                        return (
                          <div
                            key={idx}
                            className="group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
                          >
                            <span className="truncate">{f.factor}</span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemove(globalIdx)}
                                className="text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Spine Arrow & Fish Head */}
          <div className="flex items-center my-3 relative">
            <div className="flex-1 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full" />
            <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-indigo-500 mr-2" />

            {/* Fish Head (Problem Statement) */}
            <div className="w-64 p-3.5 rounded-2xl bg-gradient-to-br from-rose-950 to-red-900 border border-rose-500/50 shadow-lg text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">
                🎯 ผลกระทบ/ปัญหาหลัก (Problem Effect)
              </span>
              <p className="text-xs font-bold mt-1 line-clamp-3 leading-snug">
                {topic || 'ระบุปัญหาที่เกิดขึ้น'}
              </p>
            </div>
          </div>

          {/* Bottom 3 Bones (Material, Measurement, Environment) */}
          <div className="grid grid-cols-3 gap-6 mt-4">
            {FISHBONE_CATEGORIES.slice(3, 6).map((cat) => {
              const catFactors = factors.filter((f) => f.category === cat.key);
              return (
                <div key={cat.key} className="space-y-2 relative border-l-2 border-teal-400/60 pl-3">
                  <div className="font-bold text-xs text-teal-300 flex items-center justify-between">
                    <span>{cat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800">
                      {catFactors.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[70px]">
                    {catFactors.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">ไม่มีปัจจัยระบุ</p>
                    ) : (
                      catFactors.map((f, idx) => {
                        const globalIdx = factors.findIndex((item) => item === f);
                        return (
                          <div
                            key={idx}
                            className="group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
                          >
                            <span className="truncate">{f.factor}</span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemove(globalIdx)}
                                className="text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Factor Controls (Container is div, not form) */}
      {!readOnly && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-72 shrink-0">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              {FISHBONE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder={FISHBONE_CATEGORIES.find((c) => c.key === selectedCat)?.placeholder || 'ระบุสาเหตุ...'}
              value={factorText}
              onChange={(e) => setFactorText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd(e);
                }
              }}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!factorText.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <Plus size={14} /> เพิ่มสาเหตุ
          </button>
        </div>
      )}
    </div>
  );
};
