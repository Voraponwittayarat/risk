import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, ChevronDown, Info, X } from 'lucide-react';
import { searchStandardRisks } from '../utils/standardRiskSearch';
import { getNrlsRiskKindLabel } from '../utils/nrlsClassification';
import { isSelectableLocalRisk } from '../utils/localRiskStatus';

interface StandardRiskSelectorProps {
  onSelect: (nrlsCode: string | null, localRiskId: number | null, nrlsRisk?: any) => void;
  selectedNrlsCode?: string | null;
  selectedLocalRiskId?: number | null;
  required?: boolean;
}

export const StandardRiskSelector: React.FC<StandardRiskSelectorProps> = ({ 
  onSelect, 
  selectedNrlsCode,
  selectedLocalRiskId,
  required = true,
}) => {
  const [standardRisks, setStandardRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Standard Risk selection
  const [isNrlsDropdownOpen, setIsNrlsDropdownOpen] = useState(false);
  const [nrlsSearch, setNrlsSearch] = useState('');
  const [selectedNrls, setSelectedNrls] = useState<any | null>(null);

  // States for Local Risk selection
  const [isLocalDropdownOpen, setIsLocalDropdownOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<any | null>(null);

  const nrlsRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchStandardRisks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/nrls-riskstore', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setStandardRisks(response.data);
    } catch (err) {
      console.error('Failed to load NRLS riskstore', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandardRisks();
  }, [fetchStandardRisks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nrlsRef.current && !nrlsRef.current.contains(e.target as Node)) {
        setIsNrlsDropdownOpen(false);
      }
      if (localRef.current && !localRef.current.contains(e.target as Node)) {
        setIsLocalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (standardRisks.length > 0 && selectedNrlsCode) {
      const found = standardRisks.find((r: any) => r.nrls_code === selectedNrlsCode);
      if (found) {
        setSelectedNrls(found);
      }
    } else if (!selectedNrlsCode) {
      setSelectedNrls(null);
    }
  }, [selectedNrlsCode, standardRisks]);

  useEffect(() => {
    if (!selectedNrls || !selectedLocalRiskId) {
      setSelectedLocal(null);
      return;
    }
    setSelectedLocal(selectedNrls.local_risks?.find((r: any) => Number(r.riskstore_id) === Number(selectedLocalRiskId)) || null);
  }, [selectedNrls, selectedLocalRiskId]);

  const filteredNrls = useMemo(
    () => searchStandardRisks(standardRisks, nrlsSearch),
    [standardRisks, nrlsSearch],
  );

  const selectableLocalRisks = useMemo(
    () => (selectedNrls?.local_risks || []).filter(isSelectableLocalRisk),
    [selectedNrls],
  );
  const selectedLocalIsInactive = Boolean(selectedLocal && !isSelectableLocalRisk(selectedLocal));
  const filteredLocal = selectableLocalRisks.filter((lr: any) =>
    lr.riskstore_name?.toLowerCase().includes(localSearch.toLowerCase()),
  );

  const handleNrlsSelect = (risk: any) => {
    setSelectedNrls(risk);
    setSelectedLocal(null);
    setIsNrlsDropdownOpen(false);
    onSelect(risk.nrls_code, null, risk);
  };

  const handleLocalSelect = (localRisk: any) => {
    setSelectedLocal(localRisk);
    setIsLocalDropdownOpen(false);
    onSelect(selectedNrls?.nrls_code, localRisk.riskstore_id, selectedNrls);
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 h-20 rounded-md"></div>;
  }

  return (
    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
      
      {/* 1. Standard Risk Selection */}
      <div className="relative" ref={nrlsRef}>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          ความเสี่ยงตามมาตรฐาน NRLS {required ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="font-normal text-slate-400">(แนะนำ แต่ยังไม่บังคับสำหรับเหตุการณ์ก่อน 1 ต.ค. 2569)</span>
          )}
        </label>
        
        <div className="flex gap-2 items-center">
          <div 
            onClick={() => setIsNrlsDropdownOpen(true)}
            className="flex-1 min-h-[42px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer flex items-center justify-between"
          >
            <span className="text-sm truncate">
              {selectedNrls ? `${selectedNrls.nrls_code} : ${selectedNrls.name}` : 'เลือกอุบัติการณ์มาตรฐาน...'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          {selectedNrls && (
            <button 
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
              title="แสดงรายละเอียด"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </div>

        {isNrlsDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา เช่น ตกเตียง, ยาผิด, เครื่องมือชำรุด..."
                  value={nrlsSearch}
                  onChange={(e) => setNrlsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border-none rounded-md outline-none"
                />
              </div>
              <div className="mt-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                ค้นจากชื่อ NRLS ชื่อความเสี่ยงเดิม นิยาม หมวดหมู่ และคำใกล้เคียง • พบ {filteredNrls.length} รายการ
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredNrls.map(({ risk, matchedSources, matchedLegacyNames, definitionSnippet }) => (
                <div 
                  key={risk.nrls_code}
                  onClick={() => handleNrlsSelect(risk)}
                  className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700/50"
                >
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{risk.nrls_code}</span> : {risk.name}
                  <div className="text-[11px] text-slate-500 mt-0.5">{risk.program?.program_name || 'ยังไม่กำหนดโปรแกรม'} • {getNrlsRiskKindLabel(risk.nrls_code)}</div>
                  {nrlsSearch.trim() && matchedSources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {matchedSources.includes('legacy') && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">พบจากชื่อเดิม</span>}
                      {matchedSources.includes('definition') && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">พบจากนิยาม</span>}
                      {matchedSources.includes('metadata') && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">พบจากหมวดหมู่</span>}
                    </div>
                  )}
                  {matchedLegacyNames.length > 0 && (
                    <div className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                      ชื่อเดิม: {matchedLegacyNames.join(' • ')}
                    </div>
                  )}
                  {definitionSnippet && (
                    <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                      นิยาม: {definitionSnippet}
                    </div>
                  )}
                </div>
              ))}
              {filteredNrls.length === 0 && (
                <div className="px-3 py-5 text-center text-sm text-slate-500">
                  ไม่พบหัวข้อความเสี่ยง ลองใช้คำสั้นลงหรือคำที่อธิบายเหตุการณ์ เช่น “หกล้ม” “ยา” หรือ “เครื่องมือ”
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Local Risk Selection (only shown if nrls is selected) */}
      {selectedNrls && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-white dark:bg-slate-900 border p-3"><span className="text-slate-500">โปรแกรม (กำหนดโดย NRLS)</span><div className="font-bold mt-1">{selectedNrls.program?.program_name || '-'}</div></div>
          <div className="rounded-lg bg-white dark:bg-slate-900 border p-3"><span className="text-slate-500">ประเภท</span><div className="font-bold mt-1">{getNrlsRiskKindLabel(selectedNrls.nrls_code)}</div></div>
        </div>
      )}

      {selectedNrls && (
        <div className="relative" ref={localRef}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ชื่อความเสี่ยงเดิมของโรงพยาบาล <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
          </label>
          <div 
            onClick={() => setIsLocalDropdownOpen(true)}
            className="w-full min-h-[42px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer flex items-center justify-between"
          >
            <span className="text-sm truncate text-slate-600 dark:text-slate-400">
              {selectedLocal ? `${selectedLocal.riskstore_name}${selectedLocalIsInactive ? ' (ยกเลิก)' : ''}` : (
                selectableLocalRisks.length > 0
                  ? 'เลือกอุบัติการณ์ย่อย...' 
                  : 'ไม่มีอุบัติการณ์ย่อยที่แมปกับรหัสนี้'
              )}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          {selectedLocalIsInactive && (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              รายการนี้ถูกยกเลิกแล้วและคงไว้เพื่อแสดงประวัติ กรุณาเลือกชื่อความเสี่ยงเดิมรายการใหม่ หรือเว้นว่างไว้
            </div>
          )}

          {isLocalDropdownOpen && selectableLocalRisks.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาอุบัติการณ์ย่อย..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border-none rounded-md outline-none"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredLocal.map((lr: any) => (
                  <div 
                    key={lr.riskstore_id}
                    onClick={() => handleLocalSelect(lr)}
                    className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700/50"
                  >
                    {lr.riskstore_name}
                  </div>
                ))}
                {filteredLocal.length === 0 && (
                  <div className="px-3 py-4 text-sm text-center text-slate-500">ไม่พบข้อมูล</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedNrls && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                รายละเอียดรหัส {selectedNrls.nrls_code}
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่ออุบัติการณ์</label>
                <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{selectedNrls.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">กลุ่ม</label>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{selectedNrls.group || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมวด</label>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{selectedNrls.category || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภท</label>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{selectedNrls.type || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภทย่อย</label>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{selectedNrls.sub_type || '-'}</p>
                </div>
              </div>

              {selectedNrls.definition && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">นิยาม / คำอธิบาย</label>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    {selectedNrls.definition}
                  </div>
                </div>
              )}

              {selectedNrls.remark && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมายเหตุ</label>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedNrls.remark}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
