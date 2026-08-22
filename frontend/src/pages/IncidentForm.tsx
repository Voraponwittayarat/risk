import React, { useState, useEffect, useRef } from 'react';
import { FileText, Bot, Send, Calendar, Clock, MapPin, AlertTriangle, Search, User, PenTool, CheckCircle, Stethoscope, FileSearch, Upload, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { AiChatbotModal } from '../components/AiChatbotModal';
import { StandardRiskSelector } from '../components/StandardRiskSelector';

export default function IncidentForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data options
  const [, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [, setRiskGroups] = useState<any[]>([]);
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
    location_id: '', // สถานที่เกิดความเสี่ยง (ตาราง location)
    reportType: 'self',
    reportToDepartment: '', // แผนกที่รายงานถึง (กรณีรายงานผู้อื่น)
    group_id: '',
    program_id: '',
    type_id: '',
    risk_id: '',
    nrls_code: '',
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

  // States and helper functions for image uploads
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleApplyAiData = (aiData: any) => {
    setFormData(prev => {
      const selectedRisk = risks.find(r => r.id.toString() === aiData.risk_id);
      return {
        ...prev,
        date_report: aiData.date_report || prev.date_report,
        time_report: aiData.time_report || prev.time_report,
        shift: aiData.duration_name || prev.shift,
        location_id: aiData.location_id || prev.location_id,
        risk_id: aiData.risk_id || prev.risk_id,
        riskstore_text: selectedRisk 
          ? (selectedRisk.riskstore_full || `${selectedRisk.clear_id} ${selectedRisk.risk_name}`) 
          : prev.riskstore_text,
        group_id: selectedRisk ? selectedRisk.group_id?.toString() : prev.group_id,
        program_id: selectedRisk ? selectedRisk.program_id?.toString() : prev.program_id,
        type_id: selectedRisk ? selectedRisk.type_id?.toString() : prev.type_id,
        level_id: aiData.level_id || prev.level_id,
        detail: aiData.detail || prev.detail,
        affected: aiData.affected || prev.affected,
      };
    });
    
    // Clear search value if matched topic is set
    if (aiData.riskstore_name) {
      setRiskSearch('');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addImages(files);
    }
  };

  const addImages = (files: File[]) => {
    setImageError(null);
    
    // Check total count limit
    if (selectedImages.length + files.length > 3) {
      setImageError('สามารถอัปโหลดรูปภาพได้สูงสุด 3 รูปเท่านั้น');
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
        setImageError(`ไฟล์ "${file.name}" ไม่ใช่ประเภทรูปภาพที่รองรับ (รองรับเฉพาะ JPG, PNG, WEBP)`);
        continue;
      }
      // Validate file size (3MB = 3 * 1024 * 1024 bytes)
      if (file.size > 3 * 1024 * 1024) {
        setImageError(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 3MB`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageError(null);
  };

  // Clean up object URLs on unmount to avoid memory leaks
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = imagePreviews;
  useEffect(() => {
    return () => {
      previewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    // Fetch form data
    axios.get('/incidents/form-data')
      .then(res => {
        setDepartments(res.data.departments || []);
        setLocations(res.data.locations || []);
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
        type_id: selectedRisk ? selectedRisk.type_id?.toString() : '',
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
      // 1. Upload images first if any
      let uploadedFilenames = '';
      if (selectedImages.length > 0) {
        const uploadFormData = new FormData();
        selectedImages.forEach(image => {
          uploadFormData.append('files', image);
        });

        const token = localStorage.getItem('token');
        const uploadRes = await axios.post('/incidents/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (Array.isArray(uploadRes.data)) {
          uploadedFilenames = uploadRes.data.map((f: any) => f.filename).join(',');
        }
      }

      // 2. Submit incident data
      const payload = {
        date_report: formData.date_report,
        time_report: `${formData.date_report}T${formData.time_report || '00:00'}:00.000Z`,
        user_ir_type: formData.reportType === 'self' ? 'ตนเอง' : 'ผู้อื่น',
        department_id: String(formData.department_id || (user?.department_id ? user.department_id.toString() : '1')),
        location_id: formData.location_id ? Number(formData.location_id) : null,
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
        image: uploadedFilenames || null,
      };

      const token = localStorage.getItem('token');
      await axios.post('/incidents', payload, {
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

  // Determine if selected risk is clinical based on type_id (2 = Clinical, 1 = General)
  const isClinical = formData.type_id === '2';
  const isGeneral = formData.type_id === '1';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">รายงานอุบัติการณ์</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">อ้างอิงจากคู่มือการรายงานความเสี่ยง (Incident Report)</p>
        </div>
        <button 
          type="button" 
          onClick={() => setIsAiModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-info/10 text-info hover:bg-info/20 dark:bg-info/20 dark:text-info px-5 py-2.5 rounded-[8px] font-medium text-sm transition-all shadow-sm cursor-pointer"
        >
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
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-primary" /> สถานที่เกิดเหตุเฉพาะจุด
                </label>
                <select name="location_id" value={formData.location_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-primary/40 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow">
                  <option value="">-- เลือกสถานที่เฉพาะจุด (เช่น หน้าโรงพยาบาล, OPD ฯลฯ) --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>📍 {loc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</div>
              <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">ข้อมูลความเสี่ยง (Risk Details)</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <StandardRiskSelector
                selectedNrlsCode={formData.nrls_code}
                selectedLocalRiskId={formData.risk_id ? Number(formData.risk_id) : null}
                onSelect={(nrlsCode, localRiskId, nrlsRisk) => {
                  let type_id = formData.type_id;
                  let riskstore_text = formData.riskstore_text;
                  
                  if (localRiskId) {
                    const selectedLocal = risks.find(r => r.id.toString() === String(localRiskId));
                    type_id = selectedLocal?.type_id?.toString() || '';
                    riskstore_text = selectedLocal ? (selectedLocal.riskstore_full || `${selectedLocal.clear_id} ${selectedLocal.risk_name}`) : '';
                  } else if (nrlsRisk) {
                    if (nrlsRisk.type && nrlsRisk.type.includes('คลินิก')) {
                      type_id = '2';
                    } else {
                      type_id = '1';
                    }
                    riskstore_text = `${nrlsRisk.nrls_code} : ${nrlsRisk.name}`;
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    nrls_code: nrlsCode || '',
                    risk_id: localRiskId ? String(localRiskId) : '',
                    type_id: type_id,
                    riskstore_text: riskstore_text,
                    level_id: prev.type_id !== type_id ? '' : prev.level_id
                  }));
                }}
              />
              <input type="hidden" name="nrls_code" value={formData.nrls_code} required />
              <input type="hidden" name="risk_id" value={formData.risk_id} />

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-slate-400" /> ระดับความรุนแรง <span className="text-danger">*</span>
                </label>
                <select name="level_id" required value={formData.level_id} onChange={handleChange} disabled={!formData.type_id} className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-semibold text-danger disabled:opacity-70 disabled:cursor-not-allowed">
                  <option value="">{formData.type_id ? '-- เลือกระดับความรุนแรง --' : '-- รอเลือกชื่อความเสี่ยง --'}</option>
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
                      <option value="1">ระดับ 1 (รุนแรงน้อยมาก)</option>
                      <option value="2">ระดับ 2 (รุนแรงน้อย)</option>
                      <option value="3">ระดับ 3 (รุนแรงปานกลาง)</option>
                      <option value="4">ระดับ 4 (ค่อนข้างรุนแรง)</option>
                      <option value="5">ระดับ 5 (รุนแรงที่สุด)</option>
                    </>
                  )}
                </select>
                
                {isGeneral && (
                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300 shadow-sm">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> คำอธิบายเกณฑ์ความรุนแรงทั่วไป (สรุป)
                    </div>
                    <ul className="space-y-1.5">
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">1:</span> มีโอกาสเกิดความเสี่ยง ความผิดพลาดเกิดขึ้น แต่ยังไม่ถึงผู้รับบริการ/บุคลากร/ทรัพย์สิน/ระบบงาน</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">2:</span> ความผิดพลาดเกิดขึ้น ส่งผลถึงผู้รับบริการ/บุคลากร/ทรัพย์สิน/ระบบงาน แต่ยังไม่ก่อให้เกิดอันตราย/ เสียหายไม่เกิน 5,000฿</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">3:</span> ความผิดพลาดเกิดขึ้น ส่งผลให้เกิดความเสียหายชั่วคราวต้องบำบัดแก้ไข / เสียหาย 5,001-10,000฿</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">4:</span> เสียหายร้ายแรง / ถูกร้องเรียนสื่อภายนอก / เสียหาย 10k-50k฿</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">5:</span> เสียหายถาวร / ฟ้องร้อง / Sentinel Event / เสียหาย &gt;50k฿</li>
                    </ul>
                  </div>
                )}
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

          {/* Section 4 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">4</div>
              <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">รูปภาพประกอบ (Attached Images)</h3>
            </div>

            <div className="space-y-4">
              {/* Drag and Drop Container */}
              {selectedImages.length < 3 ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 hover:border-primary bg-slate-50 dark:bg-slate-800/40 hover:bg-primary/5 p-6 rounded-xl cursor-pointer transition-all duration-200 group">
                  <div className="bg-primary/10 text-primary group-hover:scale-110 p-3 rounded-full transition-transform duration-200">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">คลิกเพื่อเลือกรูปภาพ หรือลากรูปภาพมาวางที่นี่</span>
                  <span className="mt-1.5 text-xs text-slate-400">อัปโหลดได้สูงสุด 3 รูป (ขนาดไม่เกิน 3MB ต่อรูป, รองรับเฉพาะ JPG, PNG, WEBP)</span>
                  <span className="text-xs font-medium text-primary mt-1">อัปโหลดแล้ว {selectedImages.length} จาก 3 รูป</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              ) : (
                <div className="border border-border-light dark:border-border-dark bg-slate-100 dark:bg-slate-800/40 p-4 rounded-xl text-center text-sm font-medium text-slate-500">
                  🚫 คุณเลือกรูปภาพครบ 3 รูปแล้ว (หากต้องการเปลี่ยนให้ลบรูปภาพเดิมออกก่อน)
                </div>
              )}

              {/* Error Alert */}
              {imageError && (
                <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger text-xs font-semibold px-4 py-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* Previews Grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {imagePreviews.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-slate-100 dark:bg-slate-900 shadow-sm transition-all duration-200 hover:shadow-md">
                      <img src={url} alt={`preview-${index}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="bg-danger hover:bg-danger/90 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg"
                          title="ลบรูปนี้"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                        {selectedImages[index] ? (selectedImages[index].size / 1024 / 1024).toFixed(2) : 0} MB
                      </span>
                    </div>
                  ))}
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
      <AiChatbotModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        risks={risks}
        locations={locations}
        onApply={handleApplyAiData}
      />
    </div>
  );
}
