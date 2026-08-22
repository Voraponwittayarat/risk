import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Link as LinkIcon, Check, X, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

export default function RiskMapping() {
  const [nrlsRisks, setNrlsRisks] = useState<any[]>([]);
  const [localRisks, setLocalRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'mapped', 'unmapped'
  
  const [mappingModal, setMappingModal] = useState<any>(null); // holds the nrls risk being mapped
  const [selectedLocalIds, setSelectedLocalIds] = useState<number[]>([]);
  const [modalSearch, setModalSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { token } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [nrlsRes, localRes] = await Promise.all([
        axios.get('http://localhost:3000/nrls-riskstore', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/risk-topics', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setNrlsRisks(nrlsRes.data);
      setLocalRisks(localRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openMappingModal = (nrlsRisk: any) => {
    setMappingModal(nrlsRisk);
    const mappedIds = nrlsRisk.local_risks.map((lr: any) => lr.riskstore_id);
    setSelectedLocalIds(mappedIds);
    setModalSearch('');
  };

  const toggleLocalRisk = (id: number) => {
    setSelectedLocalIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveMapping = async () => {
    try {
      setSaving(true);
      await axios.patch(`http://localhost:3000/nrls-riskstore/${mappingModal.nrls_code}/mapping`, {
        riskstore_ids: selectedLocalIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 });
      setMappingModal(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' });
    } finally {
      setSaving(false);
    }
  };

  const filteredNrls = nrlsRisks.filter(r => {
    const matchSearch = r.nrls_code?.toLowerCase().includes(search.toLowerCase()) || r.name?.toLowerCase().includes(search.toLowerCase());
    const activeLocalRisks = r.local_risks ? r.local_risks.filter((lr: any) => lr.status !== '0') : [];
    const isMapped = activeLocalRisks.length > 0;
    if (filterStatus === 'mapped' && !isMapped) return false;
    if (filterStatus === 'unmapped' && isMapped) return false;
    return matchSearch;
  });

  const filteredLocalRisks = localRisks.filter(lr => 
    lr.active &&
    (lr.fullName.toLowerCase().includes(modalSearch.toLowerCase()) || 
    lr.code.toLowerCase().includes(modalSearch.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <LinkIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mapping ความเสี่ยง NRLS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">จับคู่หัวข้อความเสี่ยงมาตรฐานประเทศ (NRLS) เข้ากับบริบทโรงพยาบาล</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
          >
            <option value="all">ทั้งหมด</option>
            <option value="mapped">✅ Mapped แล้ว</option>
            <option value="unmapped">⚠️ ยังไม่ Map</option>
          </select>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา NRLS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold w-24">NRLS Code</th>
                  <th className="px-4 py-3 font-semibold w-1/3">ชื่อความเสี่ยง NRLS</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center">สถานะ</th>
                  <th className="px-4 py-3 font-semibold">ความเสี่ยงบริบทโรงพยาบาลที่เชื่อมโยง (Local Risks)</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNrls.map((risk) => {
                  const activeLocalRisks = risk.local_risks ? risk.local_risks.filter((lr: any) => lr.status !== '0') : [];
                  const isMapped = activeLocalRisks.length > 0;
                  return (
                  <tr key={risk.nrls_code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md font-bold text-xs border border-indigo-100 dark:border-indigo-800">
                        {risk.nrls_code}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top font-medium text-slate-800 dark:text-slate-200">
                      {risk.name}
                    </td>
                    <td className="px-4 py-4 align-top text-center">
                      {isMapped ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                          <Check size={12} /> Mapped
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
                          <AlertCircle size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {isMapped ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeLocalRisks.map((lr: any) => (
                            <span key={lr.riskstore_id} className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg border border-slate-200 dark:border-slate-700">
                              {lr.riskstore_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">- ยังไม่ได้เชื่อมโยงข้อมูล -</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-center">
                      <button onClick={() => openMappingModal(risk)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg inline-flex items-center justify-center">
                        <LinkIcon size={16} />
                      </button>
                    </td>
                  </tr>
                )})}
                {filteredNrls.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบข้อมูลที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mapping Modal */}
      {mappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mapping บริบทโรงพยาบาล</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">NRLS: {mappingModal.nrls_code} - {mappingModal.name}</p>
              </div>
              <button onClick={() => setMappingModal(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อความเสี่ยงโรงพยาบาล..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none dark:text-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredLocalRisks.map(lr => {
                const isSelected = selectedLocalIds.includes(lr.id);
                // Also highlight if it's mapped to a DIFFERENT nrls_code
                const mappedToOther = lr.nrlsCode && lr.nrlsCode !== mappingModal.nrls_code;
                
                return (
                  <label key={lr.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleLocalRisk(lr.id)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                        {lr.fullName}
                      </p>
                      {mappedToOther && !isSelected && (
                        <p className="text-xs text-amber-500 mt-0.5">⚠️ ปัจจุบัน Mapped อยู่กับ {lr.nrlsCode} (หากเลือก จะถูกดึงมาที่นี่แทน)</p>
                      )}
                    </div>
                  </label>
                );
              })}
              {filteredLocalRisks.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">ไม่พบความเสี่ยงที่ค้นหา</div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setMappingModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl">
                ยกเลิก
              </button>
              <button disabled={saving} onClick={saveMapping} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2">
                <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึก Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
