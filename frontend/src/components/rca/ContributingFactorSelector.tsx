import { useMemo, useState } from 'react';
import { BookOpen, Check, Plus, Search, Trash2 } from 'lucide-react';
import {
  CONTRIBUTING_FACTOR_CATEGORIES,
  CONTRIBUTING_FACTOR_VERSION,
  CONTRIBUTING_FACTORS,
  getContributingFactor,
  type ContributingFactorSelection,
  type LegacyCauseFactor,
} from '../../utils/contributingFactors';

interface ContributingFactorSelectorProps {
  value: ContributingFactorSelection[];
  onChange: (value: ContributingFactorSelection[]) => void;
  readOnly?: boolean;
  legacyItems?: LegacyCauseFactor[];
  otherCause?: string;
  onOtherCauseChange?: (value: string) => void;
}

export function ContributingFactorSelector({
  value,
  onChange,
  readOnly = false,
  legacyItems = [],
  otherCause = '',
  onOtherCauseChange,
}: ContributingFactorSelectorProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const selectedCodes = useMemo(() => new Set(value.map((item) => item.code)), [value]);

  const filteredFactors = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return CONTRIBUTING_FACTORS.filter((factor) => {
      if (category !== 'all' && factor.category !== category) return false;
      if (!needle) return true;
      return [factor.code, factor.name, factor.labelTh, factor.definition]
        .some((field) => field.toLowerCase().includes(needle));
    });
  }, [category, search]);

  const groupedFactors = useMemo(() => CONTRIBUTING_FACTOR_CATEGORIES
    .map((group) => ({
      ...group,
      factors: filteredFactors.filter((factor) => factor.category === group.key),
    }))
    .filter((group) => group.factors.length > 0), [filteredFactors]);

  const addFactor = (code: string) => {
    if (selectedCodes.has(code)) return;
    onChange([...value, { code }]);
  };

  const removeFactor = (code: string) => {
    onChange(value.filter((item) => item.code !== code));
  };

  const updateDetail = (code: string, detail: string) => {
    onChange(value.map((item) => (item.code === code ? { ...item, detail } : item)));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Contributing Factors ตามมาตรฐาน NRLS
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            เลือกได้มากกว่า 1 รหัสจาก 10 กลุ่ม {CONTRIBUTING_FACTORS.length} รายการ แล้วระบุข้อเท็จจริงที่เชื่อมโยงกับเหตุการณ์นี้
            ({CONTRIBUTING_FACTOR_VERSION})
          </p>
        </div>
        <span className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
          เลือกแล้ว {value.length} ปัจจัย
        </span>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">ปัจจัยที่เลือกและข้อค้นพบเฉพาะเหตุการณ์</div>
          {value.map((selection) => {
            const factor = getContributingFactor(selection.code);
            if (!factor) return null;
            const group = CONTRIBUTING_FACTOR_CATEGORIES.find((item) => item.key === factor.category);
            return (
              <div key={selection.code} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-indigo-600 px-2 py-0.5 font-mono text-[11px] font-black text-white">{factor.code}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{factor.labelTh}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{group?.nameTh}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">{factor.name}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{factor.definition}</p>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeFactor(selection.code)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50"
                      aria-label={`ลบ ${factor.code}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  readOnly={readOnly}
                  value={selection.detail || ''}
                  onChange={(event) => updateDetail(selection.code, event.target.value)}
                  placeholder="ระบุข้อเท็จจริง/หลักฐานว่าเหตุการณ์นี้เกี่ยวข้องกับปัจจัยดังกล่าวอย่างไร"
                  className="mt-3 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            );
          })}
        </div>
      )}

      {legacyItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="text-xs font-bold text-amber-800 dark:text-amber-300">ข้อมูลสาเหตุเดิม (ก่อนใช้รหัส NRLS 2569)</div>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">ระบบเก็บข้อมูลเดิมไว้เพื่อไม่ให้สูญหาย กรุณาเลือกรหัสมาตรฐานด้านล่างเพิ่มเมื่อต้องการปรับข้อมูล</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {legacyItems.map((item, index) => (
              <li key={`${item.category}-${index}`}>• {item.factor}{item.sub_factor ? ` — ${item.sub_factor}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {!readOnly && (
        <details className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <summary className="cursor-pointer text-sm font-semibold text-indigo-700">ค้นหาหรือเพิ่มปัจจัยที่เกี่ยวข้อง</summary>
          <div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหารหัส ชื่อ หรือคำอธิบาย เช่น F0021, ส่งเวร, อุปกรณ์"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="หมวดหมู่ Contributing Factor">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${category === 'all'
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              ทุกหมวด ({CONTRIBUTING_FACTORS.length})
            </button>
            {CONTRIBUTING_FACTOR_CATEGORIES.map((item) => {
              const count = CONTRIBUTING_FACTORS.filter((factor) => factor.category === item.key).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${category === item.key
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  {item.nameTh} ({count})
                </button>
              );
            })}
            {onOtherCauseChange && (
              <button type="button" onClick={() => setCategory('other')} aria-pressed={category === 'other'}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${category === 'other' ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                ไม่พบปัจจัยที่ตรง / พิมพ์อื่น ๆ
              </button>
            )}
          </div>

      {onOtherCauseChange && (category === 'other' || Boolean(otherCause)) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-slate-900">
          <label className="block text-sm font-semibold">
            สาเหตุอื่น ๆ
            <textarea value={otherCause} readOnly={readOnly} maxLength={255} rows={2}
              onChange={(event) => onOtherCauseChange(event.target.value)}
              placeholder="หากไม่พบปัจจัยที่ตรง กรุณาพิมพ์สาเหตุที่พบในการทบทวน"
              className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm dark:bg-slate-800" />
          </label>
          <p className="text-xs text-slate-500">พิมพ์สาเหตุอื่นแล้ว ไม่จำเป็นต้องเลือกรหัสปัจจัย • {otherCause.length}/255</p>
        </div>
      )}

          <div hidden={category === 'other'} className="max-h-72 space-y-4 overflow-y-auto pr-1">
            {groupedFactors.map((group) => (
              <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-100/95 px-3 py-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-slate-100">{group.nameTh}</div>
                    <div className="text-[10px] text-slate-500">{group.nameEn}</div>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{group.factors.length} รายการ</span>
                </div>
                <div className="space-y-2 p-2">
                  {group.factors.map((factor) => {
                    const selected = selectedCodes.has(factor.code);
                    return (
                      <button
                        key={factor.code}
                        type="button"
                        onClick={() => addFactor(factor.code)}
                        disabled={selected}
                        className={`w-full rounded-xl border p-3 text-left transition ${selected
                          ? 'cursor-default border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-700'}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-6 min-w-16 items-center justify-center rounded-md px-2 font-mono text-[11px] font-black ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-700'}`}>
                            {factor.code}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{factor.labelTh}</span>
                              {selected ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Plus className="h-4 w-4 shrink-0 text-indigo-500" />}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{factor.name}</div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{factor.definition}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {groupedFactors.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">ไม่พบปัจจัยที่ตรงกับคำค้น</div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
