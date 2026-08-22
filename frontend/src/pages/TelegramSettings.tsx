import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Send, Settings as SettingsIcon, Save, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface Department {
  id: number;
  depart_name: string;
  telegram_token: string | null;
  telegram_chat_id: string | null;
}

const TelegramSettings = () => {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editToken, setEditToken] = useState('');
  const [editChatId, setEditChatId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(res.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลหน่วยงานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (dept: Department) => {
    setEditingId(dept.id);
    setEditToken(dept.telegram_token || '');
    setEditChatId(dept.telegram_chat_id || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveTelegramConfig = async (id: number) => {
    try {
      setSaving(true);
      await axios.patch(`http://localhost:3000/departments/${id}/telegram`, {
        telegram_token: editToken,
        telegram_chat_id: editChatId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Swal.fire({
        title: 'บันทึกสำเร็จ',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      
      setEditingId(null);
      fetchDepartments();
    } catch (error) {
      console.error('Error saving telegram config:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testTelegramConfig = async (id: number) => {
    try {
      Swal.fire({
        title: 'กำลังส่งทดสอบ...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      await axios.post(`http://localhost:3000/departments/${id}/telegram/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Swal.fire({
        title: 'สำเร็จ!',
        text: 'ส่งข้อความทดสอบไปยัง Telegram ของหน่วยงานแล้ว',
        icon: 'success',
      });
    } catch (error: any) {
      console.error('Error testing telegram config:', error);
      Swal.fire('ข้อผิดพลาด', error.response?.data?.message || 'ไม่สามารถส่งข้อความทดสอบได้', 'error');
    }
  };

  const filteredDepts = departments.filter(d => 
    d.depart_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
          <Send className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">จัดการแจ้งเตือน Telegram (รายหน่วยงาน)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ตั้งค่า Bot Token และ Chat ID สำหรับแต่ละหน่วยงาน เพื่อแจ้งเตือนทันทีที่มีความเสี่ยงใหม่เกิดขึ้น
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหน่วยงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">หน่วยงาน</th>
                <th className="px-6 py-4 font-semibold w-1/4">สถานะ</th>
                <th className="px-6 py-4 font-semibold">การตั้งค่า Telegram</th>
                <th className="px-6 py-4 font-semibold text-center w-32">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">ไม่พบข้อมูลหน่วยงาน</td>
                </tr>
              ) : (
                filteredDepts.map(dept => {
                  const isEditing = editingId === dept.id;
                  const hasConfig = !!(dept.telegram_token && dept.telegram_chat_id);
                  
                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">{dept.depart_name}</div>
                        <div className="text-xs text-slate-500 mt-1">ID: {dept.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        {hasConfig ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ตั้งค่าแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            ยังไม่ตั้งค่า
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="space-y-3 min-w-[300px]">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Bot Token</label>
                              <input
                                type="text"
                                value={editToken}
                                onChange={(e) => setEditToken(e.target.value)}
                                placeholder="เช่น 8866061704:AA..."
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Chat ID</label>
                              <input
                                type="text"
                                value={editChatId}
                                onChange={(e) => setEditChatId(e.target.value)}
                                placeholder="เช่น -100123456789"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-slate-500 w-20 inline-block">Bot Token:</span>
                              <span className="text-slate-900 dark:text-slate-300 font-mono text-xs">
                                {dept.telegram_token ? (dept.telegram_token.substring(0, 15) + '...') : '-'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-slate-500 w-20 inline-block">Chat ID:</span>
                              <span className="text-slate-900 dark:text-slate-300 font-mono text-xs">
                                {dept.telegram_chat_id || '-'}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg"
                            >
                              ยกเลิก
                            </button>
                            <button
                              onClick={() => saveTelegramConfig(dept.id)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              บันทึก
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startEditing(dept)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg inline-flex items-center gap-1.5"
                            >
                              <SettingsIcon className="w-3.5 h-3.5" />
                              ตั้งค่า
                            </button>
                            {hasConfig && (
                              <button
                                onClick={() => testTelegramConfig(dept.id)}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-lg inline-flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                ทดสอบ
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;
