import React, { useState, useEffect, useRef } from 'react';
import { FileText, Bot, Send, Calendar, Clock, MapPin, AlertTriangle, Search, User, PenTool, CheckCircle, Stethoscope, FileSearch } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function IncidentForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data options
  const [departments, setDepartments] = useState<any[]>([]);
  const [riskGroups, setRiskGroups] = useState<any[]>([]);
  const [, setPrograms] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Searchable combobox state for Risk Topic
  const [riskSearch, setRiskSearch] = useState('');
  const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);
  const riskComboboxRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (riskComboboxRef.current && !riskComboboxRef.current.contains(e.target as Node)) {
        setIsRiskDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    date_report: format(new Date(), 'yyyy-MM-dd'),
    time_report: format(new Date(), 'HH:mm'),
    shift: '',
    department_id: user?.department_id ? String(user.department_id) : '',
    reportType: 'self',
    reportToDepartment: '', // แผนกที่รายงานถึง (กรณีรายงานผู้อื่น)
    group_id: '',
    program_id: '',
    risk_id: '',
    riskstore_text: '', // full riskstore text e.g. "IC/02 วัสดุ..."
    detail: '',
    detail_hosxp: '', // HN / ข้อมูลผู้ป่วย
    affected: [] as string[], // ผู้ได้รับผลกระทบ (เลือกได้หลายข้อ)
    incidentSource: 'เกิดขณะให้บริการ', // ที่มาของรายงาน (Default: เกิดขณะให้บริการ)
    isResolved: 'yes', // ควบคุม/แก้ไขได้หรือไม่
    edit: '', // วิธีแก้ปัญหาเบื้องต้น
    inform_id: '', // ผู้รับทราบเหตุการณ์
    level_id: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch form data
    axios.get('http://localhost:3000/incidents/form-data')
      .then(res => {
        setDepartments(res.data.departments || []);
        setRiskGroups(res.data.riskGroups || []);
        setPrograms(res.data.programs || []);
        setRisks(res.data.risks || []);
      })
      .catch(console.error)
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => {
        const currentAffected = [...prev.affected];
        if (checked) {
          return { ...prev, affected: [...currentAffected, value] };
        } else {
          return { ...prev, affected: currentAffected.filter(item => item !== value) };
        }
      });
      return;
    }

    if (name === 'risk_id') {
      // Auto-fill group_id and program_id when risk is selected
      const selectedRisk = risks.find(r => r.id.toString() === value);
      
      setFormData(prev => ({
        ...prev,
        risk_id: value,
        riskstore_text: selectedRisk ? (selectedRisk.riskstore_full || `${selectedRisk.clear_id} ${selectedRisk.risk_name}`) : '',
        group_id: selectedRisk ? selectedRisk.group_id?.toString() : '',
        program_id: selectedRisk ? selectedRisk.program_id?.toString() : '',
        level_id: '' // Force user to re-select severity to avoid invalid data
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.level_id) {
      alert('กรุณาระบุระดับความรุนแรงของอุบัติการณ์');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date_report: formData.date_report,
        time_report: `${formData.date_report}T${formData.time_report || '00:00'}:00.000Z`,
        user_ir_type: formData.reportType === 'self' ? 'ตนเอง' : 'ผู้อื่น',
        department_id: String(formData.department_id || (user?.department_id ? user.department_id.toString() : '1')),
        program_id: formData.program_id ? Number(formData.program_id) : null,
        riskstore_id: formData.risk_id ? Number(formData.risk_id) : 1,
        riskstore_text: formData.riskstore_text || '',
        level_id: formData.level_id,
        detail: formData.detail,
        detail_hosxp: formData.detail_hosxp,
        affected: Array.isArray(formData.affected) ? formData.affected.join(',') : (formData.affected || ''),
        edit: formData.isResolved === 'yes' ? formData.edit : 'ยังไม่สามารถแก้ไขได้',
        problem_basic: formData.incidentSource || null,
        status_risk: 'รายงาน', // Default status: รายงาน (รอยืนยัน)
      };

      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/incidents', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert('✅ บันทึกรายงานความเสี่ยงเรียบร้อยแล้ว! (สถานะ: รอยืนยัน)');
      navigate('/incidents');
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Determine if selected group is clinical
  const selectedGroup = riskGroups.find(g => g.id.toString() === formData.group_id);
  const isClinical = selectedGroup?.risk_group_name?.includes('คลินิก') ?? false;
  // If we have a group but it's not clinical, it's general (1-5)
  const isGeneral = selectedGroup && !isClinical;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">รายงานอุบัติการณ์</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">อ้างอิงจากคู่มือการรายงานความเสี่ยง (Incident Report)</p>
        </div>
        <button type="button" className="flex items-center justify-center gap-2 bg-info/10 text-info hover:bg-info/20 dark:bg-info/20 dark:text-info px-5 py-2.5 rounded-[8px] font-medium text-sm transition-all shadow-sm">
          <Bot className="w-5 h-5" />
          ให้น้อง AI ช่วยกรอก
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col bg-card-light dark:bg-card-dark rounded-[12px] shadow-sm border border-border-light dark:border-border-dark overflow-hidden relative">
        {/* Loading Overlay for Options */}
        {loadingOptions && (
          <div className="absolute inset-0 bg-bg-light/50 dark:bg-bg-dark/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">กำลังโหลดข้อมูลฟอร์ม...</span>
            </div>
          </div>
        )}

        <div className="bg-primary px-6 sm:px-8 py-5 flex items-center gap-3 text-white">
          <div className="bg-white/20 p-2 rounded-[8px] backdrop-blur-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg sm:text-[18px] tracking-wide">แบบฟอร์มรายงานความเสี่ยง (Risk Report)</h2>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5 opacity-90">ข้อมูลที่มีเครื่องหมาย <span className="text-danger">*</span> จำเป็นต้องระบุ</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-10">
          {/* Section 1 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
              <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">ข้อมูลเบื้องต้น</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400" /> วันที่เกิดเหตุ <span className="text-danger">*</span>
                </label>
                <input type="date" name="date_report" required value={formData.date_report} onChange={handleChange} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-slate-400" /> เวลา <span className="text-danger">*</span>
                </label>
                <input type="time" name="time_report" required value={formData.time_report} onChange={handleChange} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">เวรที่เกิดเหตุ <span className="text-danger">*</span></label>
                <select name="shift" required value={formData.shift} onChange={handleChange} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow">
                  <option value="">-- เลือกเวร --</option>
                  <option value="เช้า">เช้า</option>
                  <option value="บ่าย">บ่าย</option>
                  <option value="ดึก">ดึก</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ประเภทการรายงาน <span className="text-danger">*</span></label>
                <div className="flex bg-bg-light dark:bg-bg-dark p-1 rounded-[8px] border border-border-light dark:border-border-dark h-[42px]">
                  <button type="button" onClick={() => setFormData({...formData, reportType: 'self'})} className={`flex-1 text-sm font-medium rounded-md transition-colors ${formData.reportType === 'self' ? 'bg-card-light dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ตนเอง</button>
                  <button type="button" onClick={() => setFormData({...formData, reportType: 'other'})} className={`flex-1 text-sm font-medium rounded-md transition-colors ${formData.reportType === 'other' ? 'bg-card-light dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ผู้อื่น</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400" /> สถานที่เกิดความเสี่ยง <span className="text-danger">*</span>
                </label>
                <select name="department_id" required value={formData.department_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow">
                  <option value="">-- เลือกแผนก หรือสถานที่ --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.depart_name}</option>
                  ))}
                </select>
              </div>
              
              {formData.reportType === 'other' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <AlertTriangle className="w-4 h-4 text-warning" /> แผนกที่รายงานถึง <span className="text-danger">*</span>
                  </label>
                  <select name="reportToDepartment" required={formData.reportType === 'other'} value={formData.reportToDepartment} onChange={handleChange} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow">
                    <option value="">-- เลือกแผนกที่ต้องการรายงานข้อผิดพลาด --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.depart_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</div>
              <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">ข้อมูลความเสี่ยง (Risk Details)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2" ref={riskComboboxRef}>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ชื่อความเสี่ยง (Risk Topic) <span className="text-danger">*</span></label>
                <div className="relative">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={formData.risk_id ? `[${risks.find(r => r.id.toString() === formData.risk_id)?.clear_id || ''}] ${risks.find(r => r.id.toString() === formData.risk_id)?.risk_name || ''}` : 'พิมพ์เพื่อค้นหาชื่อความเสี่ยง...'}
                      value={riskSearch}
                      onChange={e => { setRiskSearch(e.target.value); setIsRiskDropdownOpen(true); }}
                      onFocus={() => setIsRiskDropdownOpen(true)}
                      className="w-full pl-9 pr-9 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                    {/* Clear / Selected indicator */}
                    {formData.risk_id && !riskSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, risk_id: '', riskstore_text: '', group_id: '', program_id: '', level_id: '' }));
                          setRiskSearch('');
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-danger transition-colors"
                        title="ล้างการเลือก"
                      >
                        ✕
                      </button>
                    )}
                    {riskSearch && (
                      <button
                        type="button"
                        onClick={() => setRiskSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Selected badge */}
                  {formData.risk_id && !riskSearch && (() => {
                    const sel = risks.find(r => r.id.toString() === formData.risk_id);
                    return sel ? (
                      <div className="mt-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <span className="text-primary">✓</span>
                        <span>[{sel.clear_id}] {sel.risk_name}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Dropdown List */}
                  {isRiskDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-[10px] shadow-xl max-h-64 overflow-y-auto">
                      {(() => {
                        const filtered = risks.filter(r => {
                          if (!riskSearch.trim()) return true;
                          const q = riskSearch.toLowerCase();
                          return (
                            (r.clear_id || '').toLowerCase().includes(q) ||
                            (r.risk_name || '').toLowerCase().includes(q)
                          );
                        });
                        if (filtered.length === 0) {
                          return <div className="p-4 text-sm text-slate-400 text-center">ไม่พบความเสี่ยงที่ตรงกับ "{riskSearch}"</div>;
                        }
                        return filtered.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              // Simulate the same logic as handleChange for risk_id
                              setFormData(prev => ({
                                ...prev,
                                risk_id: r.id.toString(),
                                riskstore_text: r.riskstore_full || `${r.clear_id} ${r.risk_name}`,
                                group_id: r.group_id?.toString() || '',
                                program_id: r.program_id?.toString() || '',
                                level_id: '',
                              }));
                              setRiskSearch('');
                              setIsRiskDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors flex items-start gap-2 ${
                              formData.risk_id === r.id.toString() ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <span className="shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 w-16">{r.clear_id}</span>
                            <span className="leading-snug">{r.risk_name}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                {/* Hidden input for required validation */}
                <input type="hidden" name="risk_id" value={formData.risk_id} required />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-slate-400" /> ระดับความรุนแรง <span className="text-danger">*</span>
                </label>
                <select name="level_id" required value={formData.level_id} onChange={handleChange} disabled={!formData.group_id} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-semibold text-danger disabled:opacity-70 disabled:cursor-not-allowed">
                  <option value="">{formData.group_id ? '-- เลือกระดับความรุนแรง --' : '-- รอเลือกชื่อความเสี่ยง --'}</option>
                  {isClinical && (
                    <>
                      <option value="A">ระดับ A (เกิดขึ้นแต่ยังไม่ถึงตัวผู้ป่วย)</option>
                      <option value="B">ระดับ B (ถึงตัวผู้ป่วย แต่ไม่เกิดอันตราย)</option>
                      <option value="C">ระดับ C (ถึงตัวผู้ป่วย เกิดอันตรายเล็กน้อย)</option>
                      <option value="D">ระดับ D (ถึงตัวผู้ป่วย ต้องติดตามอาการ)</option>
                      <option value="E">ระดับ E (อันตรายชั่วคราว ต้องรักษา)</option>
                      <option value="F">ระดับ F (อันตรายชั่วคราว นอนนานขึ้น)</option>
                      <option value="G">ระดับ G (อันตรายถาวร)</option>
                      <option value="H">ระดับ H (ต้องช่วยชีวิต)</option>
                      <option value="I">ระดับ I (เสียชีวิต)</option>
                    </>
                  )}
                  {isGeneral && (
                    <>
                      <option value="1">ระดับ 1 (น้อยมาก)</option>
                      <option value="2">ระดับ 2 (น้อย)</option>
                      <option value="3">ระดับ 3 (ปานกลาง)</option>
                      <option value="4">ระดับ 4 (รุนแรง)</option>
                      <option value="5">ระดับ 5 (รุนแรงสูงสุด)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            
            {isClinical && (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Stethoscope className="w-4 h-4 text-slate-400" /> ข้อมูลผู้ป่วย / HN (ถ้ามี)
                </label>
                <input type="text" name="detail_hosxp" value={formData.detail_hosxp} onChange={handleChange} placeholder="ระบุ HN, AN หรือข้อมูลสำคัญของผู้ป่วย" className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">เหตุการณ์/ผลกระทบที่เกิดขึ้น <span className="text-danger">*</span></label>
              <textarea 
                name="detail"
                required
                value={formData.detail}
                onChange={handleChange}
                rows={4} 
                className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
                placeholder="บรรยายเหตุการณ์ที่เกิดขึ้นโดยสรุป พร้อมระบุผลกระทบที่ตามมาอย่างชัดเจน..."
              />
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">3</div>
              <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">ข้อมูลเพิ่มเติมและการแก้ไข</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileSearch className="w-4 h-4 text-slate-400" /> ที่มาของรายงาน <span className="text-danger">*</span>
                </label>
                <select name="incidentSource" required value={formData.incidentSource} onChange={handleChange} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow">
                  <option value="เกิดขณะให้บริการ">เกิดในขณะให้บริการ (การปฏิบัติงานปกติ)</option>
                  <option value="การเดินตรวจ (Round)">การเดินสำรวจความเสี่ยง / Round</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <User className="w-4 h-4 text-slate-400" /> ผู้เสียหาย/ผู้ได้รับผลกระทบ (เลือกได้มากกว่า 1) <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['ผู้ป่วย', 'ญาติ', 'เจ้าหน้าที่', 'โรงพยาบาล', 'ชุมชน', 'อื่นๆ'].map(item => (
                    <label key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="affected" 
                        value={item} 
                        checked={formData.affected.includes(item)}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 border border-border-light dark:border-border-dark p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/50">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-4 h-4 text-slate-400" /> การแก้ปัญหาเบื้องต้น <span className="text-danger">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">หน้างานสามารถควบคุมหรือแก้ไขปัญหาได้หรือไม่?</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="isResolved" value="yes" checked={formData.isResolved === 'yes'} onChange={handleChange} className="w-4 h-4 text-primary focus:ring-primary" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">ควบคุม/แก้ไขได้</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="isResolved" value="no" checked={formData.isResolved === 'no'} onChange={handleChange} className="w-4 h-4 text-danger focus:ring-danger" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">ไม่ได้ (ส่งต่อ)</span>
                  </label>
                </div>
              </div>

              {formData.isResolved === 'yes' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-border-light dark:border-border-dark">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <PenTool className="w-4 h-4 text-slate-400" /> วิธีแก้ปัญหาเบื้องต้น <span className="text-danger">*</span>
                  </label>
                  <textarea 
                    name="edit"
                    required={formData.isResolved === 'yes'}
                    value={formData.edit}
                    onChange={handleChange}
                    rows={3} 
                    className="w-full px-4 py-3 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
                    placeholder="บรรยายสั้นๆ ว่าดำเนินการอย่างไรไปบ้างเพื่อควบคุมสถานการณ์..."
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-5 border-t border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <Link to="/incidents" className="w-full sm:w-auto px-6 py-2.5 text-center text-sm font-semibold text-slate-600 hover:text-slate-900 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-[8px] transition-all shadow-sm">
            ยกเลิก
          </Link>
          <button type="submit" disabled={saving || loadingOptions} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-bold rounded-[8px] transition-all shadow-sm">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังส่ง...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                ส่งรายงาน
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
