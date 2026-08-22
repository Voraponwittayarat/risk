import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, BookOpen, Edit, X, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

export default function NrlsManagement() {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { token, isAdmin } = useAuth();
  const [editingRisk, setEditingRisk] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/nrls-riskstore', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRisks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (risk: any) => {
    setEditingRisk(risk.nrls_code);
    setEditForm({ ...risk });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.patch(`http://localhost:3000/nrls-riskstore/${editForm.nrls_code}`, {
        name: editForm.name,
        group: editForm.group,
        category: editForm.category,
        type: editForm.type,
        sub_type: editForm.sub_type,
        definition: editForm.definition,
        remark: editForm.remark
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        showConfirmButton: false,
        timer: 1500
      });
      setEditingRisk(null);
      fetchRisks();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้'
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = risks.filter(r => 
    r.nrls_code?.toLowerCase().includes(search.toLowerCase()) ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.group?.toLowerCase().includes(search.toLowerCase()) ||
    r.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">จัดการชื่อความเสี่ยง NRLS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ฐานข้อมูลความเสี่ยงมาตรฐานระดับประเทศ (National Reporting and Learning System)</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อ, หมวดหมู่..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            กำลังโหลดข้อมูล NRLS...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold w-24">รหัส</th>
                  <th className="px-4 py-3 font-semibold w-1/4">ชื่อความเสี่ยง</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด (กลุ่ม / หมวด / ประเภท)</th>
                  <th className="px-4 py-3 font-semibold">นิยาม / หมายเหตุ</th>
                  {isAdmin && <th className="px-4 py-3 font-semibold w-24 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((risk) => {
                  const isEditing = editingRisk === risk.nrls_code;
                  return (
                  <tr key={risk.nrls_code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md font-bold text-xs border border-blue-100 dark:border-blue-800">
                        {risk.nrls_code}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top font-medium text-slate-800 dark:text-slate-200">
                      {isEditing ? (
                        <textarea 
                          value={editForm.name} 
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="w-full p-2 border rounded text-sm dark:bg-slate-800 dark:border-slate-700" 
                          rows={3}
                        />
                      ) : risk.name}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input type="text" placeholder="กลุ่ม" value={editForm.group || ''} onChange={(e) => setEditForm({...editForm, group: e.target.value})} className="w-full p-1.5 border rounded text-xs dark:bg-slate-800 dark:border-slate-700" />
                          <input type="text" placeholder="หมวด" value={editForm.category || ''} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="w-full p-1.5 border rounded text-xs dark:bg-slate-800 dark:border-slate-700" />
                          <input type="text" placeholder="ประเภท" value={editForm.type || ''} onChange={(e) => setEditForm({...editForm, type: e.target.value})} className="w-full p-1.5 border rounded text-xs dark:bg-slate-800 dark:border-slate-700" />
                          <input type="text" placeholder="ประเภทย่อย" value={editForm.sub_type || ''} onChange={(e) => setEditForm({...editForm, sub_type: e.target.value})} className="w-full p-1.5 border rounded text-xs dark:bg-slate-800 dark:border-slate-700" />
                        </div>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                          {risk.group && <li><strong className="text-slate-800 dark:text-slate-300 font-semibold">กลุ่ม:</strong> {risk.group}</li>}
                          {risk.category && <li><strong className="text-slate-800 dark:text-slate-300 font-semibold">หมวด:</strong> {risk.category}</li>}
                          {risk.type && <li><strong className="text-slate-800 dark:text-slate-300 font-semibold">ประเภท:</strong> {risk.type}</li>}
                          {risk.sub_type && <li><strong className="text-slate-800 dark:text-slate-300 font-semibold">ประเภทย่อย:</strong> {risk.sub_type}</li>}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-3">
                        {isEditing ? (
                          <>
                            <textarea placeholder="นิยาม" value={editForm.definition || ''} onChange={(e) => setEditForm({...editForm, definition: e.target.value})} className="w-full p-2 border rounded text-xs dark:bg-slate-800 dark:border-slate-700" rows={3} />
                            <textarea placeholder="หมายเหตุ" value={editForm.remark || ''} onChange={(e) => setEditForm({...editForm, remark: e.target.value})} className="w-full p-2 border rounded text-xs dark:bg-slate-800 dark:border-slate-700" rows={2} />
                          </>
                        ) : (
                          <>
                            {risk.definition && (
                              <div className="text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                <strong className="text-slate-700 dark:text-slate-300 block mb-1">นิยาม:</strong>
                                <span className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{risk.definition}</span>
                              </div>
                            )}
                            {risk.remark && (
                              <div className="text-xs">
                                <strong className="text-slate-700 dark:text-slate-300">หมายเหตุ:</strong> <span className="text-slate-500">{risk.remark}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4 align-top text-center">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <button disabled={saving} onClick={handleSave} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg flex items-center justify-center">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditingRisk(null)} className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center justify-center">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(risk)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg">
                            <Edit size={16} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )})}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบข้อมูลที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
