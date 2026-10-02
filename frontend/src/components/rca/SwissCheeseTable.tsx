import React, { useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { SWISS_CHEESE_LAYERS } from '../../utils/rcaCriteria';

export interface SwissCheeseHole {
  layer: string; // 'org' | 'supervision' | 'precondition' | 'act'
  hole: string;
}

interface SwissCheeseTableProps {
  holes: SwissCheeseHole[];
  onChange: (holes: SwissCheeseHole[]) => void;
  readOnly?: boolean;
  controlsOnly?: boolean;
  fixedLayer?: string;
}

export const SwissCheeseTable: React.FC<SwissCheeseTableProps> = ({ holes, onChange, readOnly = false, controlsOnly = false, fixedLayer }) => {
  const [selectedLayer, setSelectedLayer] = useState('org');
  const [newHoleText, setNewHoleText] = useState('');

  const handleAddHole = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!newHoleText.trim()) return;

    onChange([...holes, { layer: fixedLayer || selectedLayer, hole: newHoleText.trim() }]);
    setNewHoleText('');
  };

  const handleRemoveHole = (index: number) => {
    onChange(holes.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      {!controlsOnly && <><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            แบบจำลองเนยแข็งสวิส (Swiss Cheese Model Defense Barriers)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            วิเคราะห์ช่องโหว่/ข้อบกพร่องในแต่ละชั้นด่านป้องกัน 4 ระดับ เพื่อหารูรั่วที่ทำให้เกิดอุบัติการณ์
          </p>
        </div>
      </div>

      {/* 4 Barrier Layers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SWISS_CHEESE_LAYERS.map((layer) => {
          const layerHoles = holes.filter((h) => h.layer === layer.key);

          return (
            <div
              key={layer.key}
              className="flex flex-col rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800"
            >
              {/* Card Header Slice Visual */}
              <div className={`p-3.5 border-b ${layer.color} border-current/20 flex items-center justify-between`}>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold truncate leading-tight">{layer.name}</h5>
                  <p className="text-[10px] opacity-80 mt-0.5 line-clamp-2 leading-normal">{layer.description}</p>
                </div>
                <span className="w-6 h-6 rounded-full bg-white/80 dark:bg-slate-900/80 font-bold text-xs flex items-center justify-center shrink-0 ml-2 shadow-xs">
                  {layerHoles.length}
                </span>
              </div>

              {/* Holes List */}
              <div className="flex-1 p-3 space-y-2 min-h-[140px] bg-slate-50/50 dark:bg-slate-900/30">
                {layerHoles.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-3 text-[11px] text-slate-400 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl">
                    ไม่มีช่องโหว่ในด่านนี้
                  </div>
                ) : (
                  layerHoles.map((h, hIdx) => {
                    const globalIdx = holes.findIndex((item) => item === h);
                    return (
                      <div
                        key={hIdx}
                        className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                          <span className="text-slate-800 dark:text-slate-200 leading-snug break-words">
                            {h.hole}
                          </span>
                        </div>

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveHole(globalIdx)}
                            className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
                          >
                            <Trash2 size={13} />
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

      </>}
      {/* Add New Hole Controls (Container is div, not form) */}
      {!readOnly && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {!fixedLayer && <div className="w-full sm:w-64 shrink-0">
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-amber-500"
            >
              {SWISS_CHEESE_LAYERS.map((layer) => (
                <option key={layer.key} value={layer.key}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>}

          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="ระบุข้อบกพร่อง/ช่องโหว่ (Hole in Swiss Cheese) เช่น นโยบายไม่ชัดเจน, พักผ่อนไม่เพียงพอ..."
              value={newHoleText}
              onChange={(e) => setNewHoleText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHole(e);
                }
              }}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAddHole}
            disabled={!newHoleText.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <Plus size={14} /> เพิ่มช่องโหว่
          </button>
        </div>
      )}
    </div>
  );
};
