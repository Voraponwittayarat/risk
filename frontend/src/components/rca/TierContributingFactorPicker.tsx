import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import {
  CONTRIBUTING_FACTORS,
  getContributingFactor,
  type ContributingFactorSelection,
} from '../../utils/contributingFactors';
import { getSuggestedFactorCodesForTier } from '../../utils/nrls5TierMapping';

interface TierContributingFactorPickerProps {
  tier: number;
  cause: string;
  value: ContributingFactorSelection[];
  onChange: (value: ContributingFactorSelection[]) => void;
}

export function TierContributingFactorPicker({ tier, cause, value, onChange }: TierContributingFactorPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const selectedCodes = useMemo(() => new Set(value.map((item) => item.code)), [value]);
  const suggestedCodes = useMemo(() => new Set(getSuggestedFactorCodesForTier(tier)), [tier]);
  const visibleFactors = showAll
    ? CONTRIBUTING_FACTORS
    : CONTRIBUTING_FACTORS.filter((factor) => suggestedCodes.has(factor.code));

  const toggleFactor = (code: string) => {
    if (selectedCodes.has(code)) {
      onChange(value.filter((factor) => factor.code !== code));
      return;
    }
    onChange([...value, { code, detail: cause.trim() }]);
  };

  return (
    <div className="mt-2 space-y-2 border-t border-current/10 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          <Sparkles className="h-3 w-3" /> NRLS Factors
        </div>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          เลือก {value.length}
        </span>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((selection) => {
            const factor = getContributingFactor(selection.code);
            return (
              <button
                key={selection.code}
                type="button"
                onClick={() => toggleFactor(selection.code)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-left text-[10px] font-bold text-white"
                title={`ยกเลิก ${factor?.labelTh || selection.code}`}
              >
                {selection.code} {factor?.labelTh}<X className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      )}

      {!cause.trim() ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
          เขียนสาเหตุใน Tier นี้ก่อน จึงจะเลือก Contributing Factor ที่เกี่ยวข้องได้
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {showAll ? 'Factor ทั้งหมด 35 รายการ (Override)' : `Suggested จาก master CSV (${visibleFactors.length})`}
            </span>
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300"
            >
              {showAll ? 'แสดง Suggested' : 'แสดงทั้งหมด'}
              {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {visibleFactors.length === 0 ? (
            <div className="rounded-lg bg-slate-100 px-2.5 py-2 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Tier นี้ไม่มี Suggested ใน master CSV — กด “แสดงทั้งหมด” เพื่อเลือก Factor แบบ Override
            </div>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {visibleFactors.map((factor) => {
                const selected = selectedCodes.has(factor.code);
                return (
                  <button
                    key={factor.code}
                    type="button"
                    onClick={() => toggleFactor(factor.code)}
                    className={`flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition ${selected
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                    title={factor.definition}
                  >
                    <span className={`mt-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] font-black ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>{factor.code}</span>
                    <span className="min-w-0 flex-1 text-[10px] font-semibold leading-relaxed">{factor.labelTh}</span>
                    {selected && <Check className="mt-0.5 h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
