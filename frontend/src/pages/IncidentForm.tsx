import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Bot, Send, Calendar, Clock, MapPin, AlertTriangle, 
  User, PenTool, Stethoscope, FileSearch, Upload,
  X, Sparkles, BookOpen, Check, Info, ArrowRight, Search, ChevronDown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { AiChatbotModal } from '../components/AiChatbotModal';
import { StandardRiskSelector } from '../components/StandardRiskSelector';
import { getNrlsTypeId } from '../utils/nrlsClassification';

interface NrlsSampleTemplate {
  id: string;
  title: string;
  category: 'clinical' | 'general';
  tag: string;
  nrls_code: string;
  type_id: string; // '2' = Clinical, '1' = General
  level_id: string;
  shift: string;
  location_group: 'LG001' | 'LG002';
  location_type?: 'LT009' | 'LT010';
  ex_hos_name?: string;
  ex_province_name?: string;
  affected_receiver: 'รายบุคคล' | 'กลุ่มบุคคล' | 'หน่วยงาน/องค์กร';
  gender?: 'M' | 'W' | 'O' | 'N';
  age_type?: 'N' | 'I' | 'A';
  age?: string | number;
  incidentSource: string;
  detail_hosxp: string;
  detail: string;
  edit: string;
  isResolved: 'yes' | 'no';
}

const NRLS_SAMPLE_TEMPLATES: NrlsSampleTemplate[] = [
  {
    id: 'med_error',
    title: '1. ความคลาดเคลื่อนทางยา (Medication Error - หยิบยาผิดชนิด)',
    category: 'clinical',
    tag: 'ยาและความปลอดภัยทางยา (PTC)',
    nrls_code: 'CPM205',
    type_id: '2',
    level_id: 'C',
    shift: 'วันราชการ-เวรเช้า',
    location_group: 'LG001',
    affected_receiver: 'รายบุคคล',
    gender: 'W',
    age_type: 'A',
    age: '65',
    incidentSource: 'เกิดขณะให้บริการ',
    detail_hosxp: 'HN: 660012345 (ผู้ป่วยหญิงไทย 65 ปี Dx: CAP)',
    detail: 'ผู้ป่วยได้รับคำสั่งการรักษาให้ยา Ceftriaxone 1g IV OD แต่พยาบาลผู้ปฏิบัติงานหยิบยา Cefazolin 1g ฉีดให้ผู้ป่วยแทน หลังฉีดเสร็จ 5 นาที ผู้ปฏิบัติงานตรวจสอบซ้ำพบข้อผิดพลาด จึงรายงานแพทย์เจ้าของไข้ทันทีและติดตามอาการ สัญญาณชีพคงที่ ไม่พบอาการแพ้ยาหรืออาการไม่พึงประสงค์ (Harm Level C: เกิดข้อผิดพลาดถึงตัวผู้ป่วยแต่ไม่เกิดอันตราย)',
    isResolved: 'yes',
    edit: '1. รายงานแพทย์เจ้าของไข้ทันทีเพื่อประเมินและตรวจร่างกายผู้ป่วย\n2. ตรวจวัดสัญญาณชีพและเฝ้าระวังอาการแพ้ยาต่อเนื่อง 2 ชั่วโมง (V/S ปกติ)\n3. ดำเนินการบริหารยา Ceftriaxone 1g IV ตามคำสั่งแพทย์ที่ถูกต้อง\n4. บันทึกรายงานเหตุการณ์ในเวชระเบียน และนำส่งยาที่หยิบผิดให้ห้องยาตรวจสอบ',
  },
  {
    id: 'patient_fall',
    title: '2. ผู้ป่วยพลัดตกหกล้มขณะรักษาตัวในหอผู้ป่วย (Inpatient Fall)',
    category: 'clinical',
    tag: 'ความปลอดภัยของผู้ป่วย (PT)',
    nrls_code: 'CPP405',
    type_id: '2',
    level_id: 'D',
    shift: 'วันราชการ-เวรดึก',
    location_group: 'LG001',
    affected_receiver: 'รายบุคคล',
    gender: 'M',
    age_type: 'A',
    age: '74',
    incidentSource: 'เกิดขณะให้บริการ',
    detail_hosxp: 'HN: 660023456 (ผู้ป่วยชายไทย 74 ปี Dx: Urosepsis)',
    detail: 'ผู้ป่วยรู้สึกตัวดีแต่มีอาการอ่อนเพลีย ลุกจากเตียงเพื่อจะเดินไปเข้าห้องน้ำด้วยตนเองโดยไม่ได้กดกริ่งเรียกพยาบาล เกิดลื่นล้มก้นกระแทกพื้นข้างเตียง มีอาการปวดบริเวณสะโพกซ้ายเล็กน้อย ไม่มีแผลเปิด ศีรษะไม่ได้กระแทกพื้น (Harm Level D: ถึงตัวผู้ป่วย ต้องติดตามเฝ้าระวังอาการเพิ่มเติม)',
    isResolved: 'yes',
    edit: '1. พยาบาลและผู้ช่วยเหลือคนไข้เข้าประเมินและช่วยพยุงผู้ป่วยขึ้นเตียงทันที\n2. ตรวจวัดสัญญาณชีพและ Neuro signs ปกติ\n3. แพทย์เวรตรวจร่างกายและส่งถ่ายภาพรังสี (X-ray Pelvis & Hip) ผลปกติ ไม่พบกระดูกหัก\n4. ประเมิน Morse Fall Scale ซ้ำ (คะแนนความเสี่ยงสูง) ติดป้ายเตือน Fall Risk หน้าเตียง และกำชับญาติกดกริ่งเรียกพยาบาลทุกครั้งก่อนลุก',
  },
  {
    id: 'patient_misid',
    title: '3. การระบุตัวผู้ป่วยผิดพลาดก่อนทำหัตถการ (Near Miss)',
    category: 'clinical',
    tag: 'การระบุตัวผู้ป่วย (PT)',
    nrls_code: 'CPP101',
    type_id: '2',
    level_id: 'B',
    shift: 'วันราชการ-เวรเช้า',
    location_group: 'LG001',
    affected_receiver: 'รายบุคคล',
    gender: 'M',
    age_type: 'A',
    age: '58',
    incidentSource: 'เกิดขณะให้บริการ',
    detail_hosxp: 'HN: 660034567 (ผู้ป่วยนอก แผนก OPD)',
    detail: 'เจ้าหน้าที่ห้องปฏิบัติการเรียกชื่อผู้ป่วย "นายสมชาย..." เพื่อเจาะเลือดส่งตรวจน้ำตาลสะสม ปรากฏว่ามีผู้ป่วยอีกท่านหนึ่งที่มีชื่อคล้ายกันเดินเข้ามานั่งประจำจุดเจาะเลือด เจ้าหน้าที่ได้ทำ Patient Verification ถามชื่อ-นามสกุลจริงและวันเดือนปีเกิดซ้ำก่อนแทงเข็ม จึงตรวจพบว่าหยิบหลอดเลือดผิดคน และได้ทักท้วงแก้ไขก่อนทำหัตถการ (Harm Level B: เกิดความผิดพลาดแต่ยังไม่ถึงตัวผู้ป่วย)',
    isResolved: 'yes',
    edit: '1. หยุดทำหัตถการทันที และยกเลิกหลอดเก็บสิ่งส่งตรวจที่ผิดพลาด\n2. ดำเนินการระบุตัวตนด้วย 2 ตัวระบุ (ชื่อ-นามสกุล และ วันเดือนปีเกิด) ตามแนวทาง Patient Safety Goals\n3. ติดตามผู้ป่วยตัวจริงเข้ารับการเจาะเลือดได้อย่างถูกต้องและปลอดภัย',
  },
  {
    id: 'ssi_infection',
    title: '4. การติดเชื้อที่แผลผ่าตัดในโรงพยาบาล (Surgical Site Infection - SSI)',
    category: 'clinical',
    tag: 'การควบคุมการติดเชื้อ (IC)',
    nrls_code: 'CPS111',
    type_id: '2',
    level_id: 'E',
    shift: 'วันราชการ-เวรบ่าย',
    location_group: 'LG001',
    affected_receiver: 'รายบุคคล',
    gender: 'M',
    age_type: 'A',
    age: '52',
    incidentSource: 'เกิดขณะให้บริการ',
    detail_hosxp: 'HN: 660045678 (ผู้ป่วยชาย 52 ปี Post-op Appendectomy Day 4)',
    detail: 'ผู้ป่วยหลังผ่าตัดไส้ติ่งวันที่ 4 มีไข้ 38.5 C แผลผ่าตัดบวมแดง ปวด และมีหนองซึม (Pus discharge) แพทย์ตรวจวินิจฉัยเป็น Superficial Surgical Site Infection ส่งสิ่งส่งตรวจเพาะเชื้อและจำเป็นต้องเปิดแผลระบายหนองและปรับยาฆ่าเชื้อ (Harm Level E: เกิดอันตรายชั่วคราว ต้องได้รับการรักษา/ทำหัตถการ)',
    isResolved: 'yes',
    edit: '1. ทำแผลแบบปราศจากเชื้อ (Sterile dressing) และเก็บสิ่งส่งตรวจ Pus Gram stain & Culture\n2. แพทย์พิจารณาเปิดแผลระบายหนองและให้ยาปฏิชีวนะทางหลอดเลือดดำ\n3. ส่งปรึกษาและรายงานทีม IC เฝ้าระวังการติดเชื้อในโรงพยาบาลตามมาตรฐาน',
  },
  {
    id: 'facility_fire',
    title: '5. ความเสี่ยงด้านกายภาพและอัคคีภัย (Facility & Fire Hazard)',
    category: 'general',
    tag: 'สิ่งแวดล้อมและความปลอดภัย (ENV)',
    nrls_code: 'GOS301',
    type_id: '1',
    level_id: '3',
    shift: 'วันหยุดราชการ-เวรเช้า',
    location_group: 'LG001',
    affected_receiver: 'หน่วยงาน/องค์กร',
    incidentSource: 'การเดินตรวจ (Round)',
    detail_hosxp: '',
    detail: 'จากการเดินสำรวจความปลอดภัยประจำสัปดาห์ของทีม ENV พบตู้ควบคุมไฟฟ้าหลัก (MDB) บริเวณชั้น 1 มีเสียงดังผิดปกติและมีกลิ่นไหม้ฉนวนสายไฟ มีความเสี่ยงต่อการเกิดไฟฟ้าลัดวงจรและเพลิงไหม้ (ความรุนแรงระดับ 3: มีความเสียหายชั่วคราว ต้องดำเนินการแก้ไขทันที)',
    isResolved: 'yes',
    edit: '1. ช่างเทคนิคประจำอาคารเข้าตรวจสอบและตัดกระแสไฟฟ้าเฉพาะส่วนชั่วคราวอย่างปลอดภัย\n2. ทำการสับเปลี่ยนเบรกเกอร์และเดินสายไฟใหม่ที่ได้มาตรฐาน มอก.\n3. ตรวจวัดอุณหภูมิด้วยกล้อง Thermal Scanner ซ้ำจนอยู่ในเกณฑ์ปลอดภัยและจ่ายไฟตามปกติ',
  },
  {
    id: 'it_system_down',
    title: '6. ระบบสารสนเทศโรงพยาบาล (HOSxP / IT System Outage)',
    category: 'general',
    tag: 'ระบบสารสนเทศ (IM/IT)',
    nrls_code: 'GOI107',
    type_id: '1',
    level_id: '3',
    shift: 'วันราชการ-เวรบ่าย',
    location_group: 'LG001',
    affected_receiver: 'กลุ่มบุคคล',
    incidentSource: 'เกิดขณะให้บริการ',
    detail_hosxp: '',
    detail: 'ระบบฐานข้อมูล HOSxP เกิดการขัดข้องและไม่สามารถเชื่อมต่อได้ทั่วทั้งโรงพยาบาลเป็นเวลา 35 นาที ส่งผลกระทบให้แผนกผู้ป่วยนอก (OPD) และห้องยาไม่สามารถสั่ง/ตรวจสอบยาผ่านระบบได้ ต้องเปิดใช้แผนสำรองฉุกเฉิน (Downtime Protocol) (ความรุนแรงระดับ 3: ส่งผลต่อระบบงานและต้องใช้แผนสำรอง)',
    isResolved: 'yes',
    edit: '1. ประกาศใช้แผนสำรอง Manual System (Paper-based) ในทุกจุดบริการทันที\n2. ทีม IT ดำเนินการ Failover ระบบ Database ไปยัง Backup Server ภายใน 25 นาที\n3. ตรวจสอบความถูกต้องของ Data Integrity และเปิดให้ใช้งานระบบตามปกติ พร้อมบันทึกข้อมูลย้อนหลัง',
  },
];

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

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSuccessBanner, setTemplateSuccessBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date_report: format(new Date(), 'yyyy-MM-dd'),
    time_report: format(new Date(), 'HH:mm'),
    shift: '',
    department_id: user?.department_id ? String(user.department_id) : '',
    
    // 1. ประเภทสถานที่** (Location Group)
    location_group: 'LG001' as 'LG001' | 'LG002', // LG001 = ในพื้นที่ของโรงพยาบาล, LG002 = นอกพื้นที่ของโรงพยาบาล
    location_id: '', // สถานที่ภายใน รพ. (ตาราง location)
    location_type: 'LT009' as 'LT009' | 'LT010', // LT010 = ในเขต รพ.อื่น, LT009 = ไม่ใช่พื้นที่ในเขตโรงพยาบาล
    ex_hos_name: '', // ชื่อโรงพยาบาลอื่น
    ex_province_name: '', // จังหวัด

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
    
    // 2. ผู้ที่ได้รับผลกระทบ** (Affected Receiver)
    affected_receiver: 'รายบุคคล' as 'รายบุคคล' | 'กลุ่มบุคคล' | 'หน่วยงาน/องค์กร',
    gender: 'M' as 'M' | 'W' | 'O' | 'N' | '', // M: ชาย, W: หญิง, O: เพศทางเลือก, N: ไม่ทราบเพศ
    age_type: 'A' as 'N' | 'I' | 'A', // N: 0-28 วัน (Neonate), I: 28 วัน-1 ปี (Infant), A: ตั้งแต่ 1 ปีขึ้นไป
    age: '', // ตัวเลขอายุ (ปี)

    incidentSource: 'เกิดขณะให้บริการ', // ที่มาของรายงาน (Default: เกิดขณะให้บริการ)
    isResolved: 'yes', // ควบคุม/แก้ไขได้หรือไม่
    edit: '', // วิธีแก้ปัญหาเบื้องต้น
    inform_id: '', // ผู้รับทราบเหตุการณ์
    level_id: '',
  });

  const [saving, setSaving] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationPickerRef = useRef<HTMLDivElement>(null);

  // States and helper functions for image uploads
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleApplyTemplate = (tpl: NrlsSampleTemplate) => {
    // Find matching local risk if any
    const matchedLocal = risks.find(r => r.clear_id === tpl.nrls_code || r.risk_name?.includes(tpl.nrls_code));
    
    setFormData(prev => ({
      ...prev,
      shift: tpl.shift,
      nrls_code: tpl.nrls_code,
      type_id: tpl.type_id,
      level_id: tpl.level_id,
      // Never retain a local mapping from a previously selected NRLS code.
      risk_id: matchedLocal ? String(matchedLocal.id) : '',
      riskstore_text: matchedLocal ? (matchedLocal.riskstore_full || `${matchedLocal.clear_id} ${matchedLocal.risk_name}`) : `${tpl.nrls_code} : ${tpl.title}`,
      location_group: tpl.location_group || 'LG001',
      location_type: tpl.location_type || 'LT009',
      ex_hos_name: tpl.ex_hos_name || '',
      ex_province_name: tpl.ex_province_name || '',
      affected_receiver: tpl.affected_receiver || 'รายบุคคล',
      gender: tpl.gender || 'M',
      age_type: tpl.age_type || 'A',
      age: tpl.age ? String(tpl.age) : '',
      detail: tpl.detail,
      detail_hosxp: tpl.detail_hosxp,
      incidentSource: tpl.incidentSource,
      isResolved: tpl.isResolved,
      edit: tpl.edit,
    }));

    setSelectedTemplateId(tpl.id);
    setIsTemplateModalOpen(false);
    setTemplateSuccessBanner(`✅ โหลดข้อมูลตัวอย่าง "${tpl.title}" ตามเกณฑ์ Standard Data Set (NRLS) เรียบร้อยแล้ว!`);
    setTimeout(() => setTemplateSuccessBanner(null), 6000);
  };

  const handleApplyAiData = (aiData: any) => {
    setFormData(prev => {
      const selectedRisk = risks.find(r => r.id.toString() === aiData.risk_id);
      const selectedNrlsCode = String(aiData.nrls_code || '').trim().toUpperCase();
      const selectedType = getNrlsTypeId(selectedNrlsCode)
        || selectedRisk?.type_id?.toString()
        || prev.type_id;
      const typeChanged = Boolean(selectedNrlsCode) && selectedType !== prev.type_id;
      const suggestedLevel = String(aiData.level_id || '').trim().toUpperCase();
      const isSuggestedLevelValid = selectedType === '2'
        ? /^[A-I]$/.test(suggestedLevel)
        : selectedType === '1'
          ? /^[1-5]$/.test(suggestedLevel)
          : /^(?:[A-I]|[1-5])$/.test(suggestedLevel);
      const riskstoreText = selectedRisk
        ? (selectedRisk.riskstore_full || `${selectedRisk.clear_id} ${selectedRisk.risk_name}`)
        : selectedNrlsCode
          ? `${selectedNrlsCode} : ${aiData.nrls_name || aiData.riskstore_name || 'หัวข้อความเสี่ยงตามมาตรฐาน NRLS'}`
          : prev.riskstore_text;
      return {
        ...prev,
        date_report: aiData.date_report || prev.date_report,
        time_report: aiData.time_report || prev.time_report,
        shift: aiData.duration_name || prev.shift,
        location_id: aiData.location_id || prev.location_id,
        nrls_code: selectedNrlsCode || prev.nrls_code,
        risk_id: aiData.risk_id || (selectedNrlsCode ? '' : prev.risk_id),
        riskstore_text: riskstoreText,
        group_id: selectedRisk ? selectedRisk.group_id?.toString() : prev.group_id,
        program_id: aiData.program_id
          ? String(aiData.program_id)
          : selectedRisk ? selectedRisk.program_id?.toString() : prev.program_id,
        type_id: selectedType,
        level_id: isSuggestedLevelValid ? suggestedLevel : typeChanged ? '' : prev.level_id,
        detail: aiData.detail || prev.detail,
      };
    });
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

  useEffect(() => {
    const closeLocationMenu = (event: PointerEvent) => {
      if (!locationPickerRef.current?.contains(event.target as Node)) {
        setIsLocationMenuOpen(false);
        setLocationQuery('');
      }
    };
    document.addEventListener('pointerdown', closeLocationMenu);
    return () => document.removeEventListener('pointerdown', closeLocationMenu);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'age_type') {
      setFormData(prev => ({
        ...prev,
        age_type: value as 'N' | 'I' | 'A',
        age: value === 'A' ? prev.age : '0'
      }));
      return;
    }

    if (name === 'location_group') {
      setIsLocationMenuOpen(false);
      setLocationQuery('');
      setFormData(prev => ({
        ...prev,
        location_group: value as 'LG001' | 'LG002',
        location_id: value === 'LG001' ? prev.location_id : '',
        location_type: value === 'LG002' ? 'LT009' : 'LT009',
        ex_hos_name: '',
        ex_province_name: ''
      }));
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
    if (!formData.nrls_code) {
      alert('รายงานใหม่ทุกวันที่เกิดเหตุต้องเลือกความเสี่ยงตามมาตรฐาน NRLS');
      return;
    }
    if (!formData.level_id) {
      alert('กรุณาระบุระดับความรุนแรงของอุบัติการณ์ตามเกณฑ์ NRLS');
      return;
    }

    if (formData.location_group === 'LG001' && !formData.location_id) {
      alert('กรุณาเลือกสถานที่เกิดเหตุภายในโรงพยาบาล');
      return;
    }

    if (formData.location_group === 'LG002' && formData.location_type === 'LT010') {
      if (!formData.ex_hos_name.trim() || !formData.ex_province_name.trim()) {
        alert('กรณีเกิดเหตุในเขต รพ.อื่น กรุณาระบุชื่อโรงพยาบาลและจังหวัด');
        return;
      }
    }

    if (formData.affected_receiver === 'รายบุคคล') {
      if (!formData.gender) {
        alert('กรุณาเลือกเพศของผู้ได้รับผลกระทบ');
        return;
      }
      if (formData.age_type === 'A' && (!formData.age || Number(formData.age) < 1)) {
        alert('กรุณาระบุอายุ (ปี) ของผู้ได้รับผลกระทบ');
        return;
      }
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

      // 2. Format NRLS Affected and Location Data
      let formattedAffected: string = formData.affected_receiver;
      if (formData.affected_receiver === 'รายบุคคล') {
        const genderMap: Record<string, string> = { M: 'ชาย', W: 'หญิง', O: 'เพศทางเลือก', N: 'ไม่ทราบเพศ' };
        const genderText = genderMap[formData.gender] || formData.gender || 'ไม่ระบุเพศ';
        let ageText = '';
        if (formData.age_type === 'N') {
          ageText = 'ทารกแรกเกิด 0-28 วัน (0 ปี)';
        } else if (formData.age_type === 'I') {
          ageText = 'ทารก 28 วัน-1 ปี (0 ปี)';
        } else {
          ageText = `${formData.age || '0'} ปี`;
        }
        formattedAffected = `รายบุคคล (เพศ: ${genderText}, อายุ: ${ageText})`;
      }

      let locationNote = '';
      if (formData.location_group === 'LG002') {
        if (formData.location_type === 'LT010') {
          locationNote = `นอกพื้นที่ รพ. (ในเขต รพ.${formData.ex_hos_name} จ.${formData.ex_province_name})`;
        } else {
          locationNote = 'นอกพื้นที่ รพ. (ไม่ใช่พื้นที่ในเขตโรงพยาบาล)';
        }
      }

      // 3. Submit incident data
      const payload = {
        date_report: formData.date_report,
        time_report: `${formData.date_report}T${formData.time_report || '00:00'}:00.000Z`,
        user_ir_type: 'หน่วยงาน',
        department_id: String(user?.department_id || (user as any)?.departmentId || formData.department_id || '1'),
        sendto_department_id: formData.reportToDepartment ? String(formData.reportToDepartment) : null,
        location_id: formData.location_group === 'LG001' ? (formData.location_id ? Number(formData.location_id) : null) : null,
        riskstore_id: formData.risk_id ? Number(formData.risk_id) : null,
        riskstore_text: formData.riskstore_text || '',
        nrls_code: formData.nrls_code || null,
        level_id: formData.level_id,
        detail: formData.detail,
        detail_hosxp: formData.detail_hosxp,
        affected: formattedAffected,
        edit: formData.edit || '',
        problem_basic: locationNote ? `[ที่มา: ${formData.incidentSource}] [สถานที่: ${locationNote}]` : formData.incidentSource,
        status_risk: 'รายงาน', // Default status: รายงาน (รอยืนยัน)
        image: uploadedFilenames || null,
      };

      const token = localStorage.getItem('token');
      await axios.post('/incidents', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert('✅ บันทึกรายงานความเสี่ยงเข้าสู่ระบบ NRLS เรียบร้อยแล้ว! (สถานะ: รอยืนยัน)');
      navigate('/my-reported');
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Determine if selected risk is clinical based on type_id (2 = Clinical, 1 = General)
  const effectiveTypeId = getNrlsTypeId(formData.nrls_code) || formData.type_id;
  const isClinical = effectiveTypeId === '2';
  const isGeneral = effectiveTypeId === '1';
  const selectedLocation = locations.find(loc => String(loc.id) === String(formData.location_id));
  const normalizedLocationQuery = locationQuery.trim().toLocaleLowerCase('th-TH');
  const filteredLocations = locations.filter(loc => (
    !normalizedLocationQuery
    || String(loc.name || '').toLocaleLowerCase('th-TH').includes(normalizedLocationQuery)
  ));

  const selectLocation = (location: any) => {
    setFormData(prev => ({ ...prev, location_id: String(location.id) }));
    setLocationQuery('');
    setIsLocationMenuOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold text-slate-900 dark:text-white tracking-tight">รายงานอุบัติการณ์ความเสี่ยง</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
              NRLS Standard
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            อ้างอิงตามเกณฑ์ Standard Data Set & Terminologies (สรพ. / ระบบรายงานอุบัติการณ์ระดับชาติ)
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sample Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/10 to-amber-600/15 hover:from-amber-500/20 hover:to-amber-600/25 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 px-4 py-2.5 rounded-[8px] font-bold text-sm transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ตัวอย่างการกรอก (NRLS)
          </button>

          {/* AI Assistant Button */}
          <button 
            type="button" 
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-info/10 text-info hover:bg-info/20 dark:bg-info/20 dark:text-info px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            ให้น้อง AI ช่วยกรอก
          </button>
        </div>
      </div>

      {/* Success Banner when template applied */}
      {templateSuccessBanner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{templateSuccessBanner}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setTemplateSuccessBanner(null)} 
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

        <div className="bg-primary px-6 sm:px-8 py-5 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-[8px] backdrop-blur-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-[18px] tracking-wide">แบบฟอร์มรายงานความเสี่ยง (Risk Incident Report)</h2>
              <p className="text-white/80 text-xs sm:text-sm mt-0.5 opacity-90">
                ข้อมูลที่มีสัญลักษณ์ <span className="font-bold text-amber-300">**</span> จะถูกจัดเก็บเข้าสู่ NRLS Dataset
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
            title="คลิกเพื่อเลือกตัวอย่างการกรอกข้อมูล"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>ดูตัวอย่างข้อมูล</span>
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-10">
          {/* Section 1 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
                <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">
                  ข้อมูลวันเวลาและสถานที่เกิดเหตุ (Incident Time & Location)
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                ** NRLS Data Set
              </span>
            </div>
            
            {/* Discovering Department Info Banner */}
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-indigo-600 text-white font-bold">🏢</span>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    หน่วยงานผู้ค้นพบ/บันทึกรายงาน** : 
                  </span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm ml-1.5">
                    {user?.departmentName || (user as any)?.department_name || `หน่วยงานรหัส ${user?.department_id || (user as any)?.departmentId || '1'}`}
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    * ผูกอัตโนมัติตามหน่วยงานสังกัดหลักของคุณ — รายงานนี้จะส่งให้หัวหน้างาน/Manager ในหน่วยงานของคุณเห็นและกดยืนยันเป็นด่านแรก
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400" /> 
                    วันที่บันทึกรายงาน
                  </label>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">Auto วันปัจจุบัน</span>
                </div>
                <input 
                  type="date" 
                  disabled 
                  value={format(new Date(), 'yyyy-MM-dd')} 
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-border-light dark:border-border-dark rounded-[8px] text-sm text-slate-500 font-semibold cursor-not-allowed" 
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-primary" /> 
                  วันที่เกิดอุบัติการณ์** <span className="text-danger">*</span>
                </label>
                <input 
                  type="date" 
                  name="date_report" 
                  required 
                  value={formData.date_report} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-medium" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-slate-400" /> 
                  เวลาที่เกิดเหตุ** <span className="text-danger">*</span>
                </label>
                <input 
                  type="time" 
                  name="time_report" 
                  required 
                  value={formData.time_report} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ช่วงเวลา / เวรที่เกิดเหตุ (Work Period)** <span className="text-danger">*</span>
                </label>
                <select 
                  name="shift" 
                  required 
                  value={formData.shift} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-medium"
                >
                  <option value="">-- เลือกเวรตามมาตรฐาน NRLS --</option>
                  <optgroup label="🏢 วันราชการ (จันทร์ - ศุกร์)">
                    <option value="วันราชการ-เวรเช้า">1. วันราชการ - เวรเช้า (08:00 - 16:00 น.)</option>
                    <option value="วันราชการ-เวรบ่าย">2. วันราชการ - เวรบ่าย (16:00 - 24:00 น.)</option>
                    <option value="วันราชการ-เวรดึก">3. วันราชการ - เวรดึก (24:00 - 08:00 น.)</option>
                  </optgroup>
                  <optgroup label="🏖️ วันหยุดราชการ (เสาร์ - อาทิตย์)">
                    <option value="วันหยุดราชการ-เวรเช้า">4. วันหยุดราชการ - เวรเช้า (08:00 - 16:00 น.)</option>
                    <option value="วันหยุดราชการ-เวรบ่าย">5. วันหยุดราชการ - เวรบ่าย (16:00 - 24:00 น.)</option>
                    <option value="วันหยุดราชการ-เวรดึก">6. วันหยุดราชการ - เวรดึก (24:00 - 08:00 น.)</option>
                  </optgroup>
                  <optgroup label="🎉 วันหยุดพิเศษ / วันหยุดนักขัตฤกษ์">
                    <option value="วันหยุดพิเศษ/นักขัตฤกษ์-เวรเช้า">7. วันหยุดพิเศษ/นักขัตฤกษ์ - เวรเช้า (08:00 - 16:00 น.)</option>
                    <option value="วันหยุดพิเศษ/นักขัตฤกษ์-เวรบ่าย">8. วันหยุดพิเศษ/นักขัตฤกษ์ - เวรบ่าย (16:00 - 24:00 น.)</option>
                    <option value="วันหยุดพิเศษ/นักขัตฤกษ์-เวรดึก">9. วันหยุดพิเศษ/นักขัตฤกษ์ - เวรดึก (24:00 - 08:00 น.)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* 1. ประเภทสถานที่** (Location Group) */}
            <div className="space-y-4 p-4 sm:p-5 rounded-xl border border-border-light dark:border-border-dark bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="w-4 h-4 text-primary" />
                  ประเภทสถานที่เกิดเหตุ (Location Group)** <span className="text-danger">*</span>
                </label>
                <span className="text-[11px] text-slate-500">เลือกพื้นที่ภายใน หรือ ภายนอกโรงพยาบาล</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label 
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    formData.location_group === 'LG001'
                      ? 'border-primary bg-primary/5 text-primary shadow-xs font-bold'
                      : 'border-border-light dark:border-border-dark hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="location_group"
                    value="LG001"
                    checked={formData.location_group === 'LG001'}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>🏥 ในพื้นที่ของโรงพยาบาล</span>
                </label>

                <label 
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    formData.location_group === 'LG002'
                      ? 'border-primary bg-primary/5 text-primary shadow-xs font-bold'
                      : 'border-border-light dark:border-border-dark hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="location_group"
                    value="LG002"
                    checked={formData.location_group === 'LG002'}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>🚑 นอกพื้นที่ของโรงพยาบาล</span>
                </label>
              </div>

              {/* Sub-block: ในพื้นที่ของโรงพยาบาล */}
              {formData.location_group === 'LG001' && (
                <div className="space-y-2 pt-2 border-t border-border-light dark:border-border-dark animate-in fade-in slide-in-from-top-1 duration-200">
                  <label htmlFor="incident-location-search" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    สถานที่เกิดเหตุภายในโรงพยาบาล (Specific Location) <span className="text-danger">*</span>
                  </label>
                  <div ref={locationPickerRef} className="relative">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="incident-location-search"
                        type="text"
                        role="combobox"
                        aria-label="ค้นหาสถานที่เกิดเหตุภายในโรงพยาบาล"
                        aria-expanded={isLocationMenuOpen}
                        aria-controls="incident-location-options"
                        aria-autocomplete="list"
                        autoComplete="off"
                        disabled={loadingOptions}
                        value={isLocationMenuOpen ? locationQuery : (selectedLocation?.name || '')}
                        onFocus={() => {
                          setLocationQuery('');
                          setIsLocationMenuOpen(true);
                        }}
                        onChange={(event) => {
                          setLocationQuery(event.target.value);
                          setIsLocationMenuOpen(true);
                          if (formData.location_id) {
                            setFormData(prev => ({ ...prev, location_id: '' }));
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setIsLocationMenuOpen(false);
                            setLocationQuery('');
                          } else if (event.key === 'Enter' && isLocationMenuOpen && filteredLocations.length > 0) {
                            event.preventDefault();
                            selectLocation(filteredLocations[0]);
                          }
                        }}
                        placeholder={loadingOptions ? 'กำลังโหลดสถานที่...' : 'พิมพ์ชื่อสถานที่ เช่น ER, OPD, ห้องยา'}
                        className="w-full rounded-[8px] border border-primary/40 bg-white py-2.5 pl-10 pr-20 text-sm font-medium text-slate-800 transition-shadow placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-wait disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100"
                      />
                      {formData.location_id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, location_id: '' }));
                            setLocationQuery('');
                            setIsLocationMenuOpen(true);
                          }}
                          aria-label="ล้างสถานที่ที่เลือก"
                          className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={loadingOptions}
                        onClick={() => setIsLocationMenuOpen(open => !open)}
                        aria-label="เปิดรายการสถานที่"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isLocationMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isLocationMenuOpen && (
                      <div
                        id="incident-location-options"
                        role="listbox"
                        className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                      >
                        {filteredLocations.length > 0 ? filteredLocations.map(loc => {
                          const selected = String(loc.id) === String(formData.location_id);
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => selectLocation(loc)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${selected
                                ? 'bg-primary/10 font-semibold text-primary'
                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="truncate">{loc.name}</span>
                              </span>
                              {selected && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                          );
                        }) : (
                          <div className="px-3 py-5 text-center text-sm text-slate-500">
                            ไม่พบสถานที่ที่ตรงกับ “{locationQuery}”
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    พิมพ์บางส่วนของชื่อ แล้วเลือกสถานที่จากรายการ
                  </p>
                </div>
              )}

              {/* Sub-block: นอกพื้นที่ของโรงพยาบาล */}
              {formData.location_group === 'LG002' && (
                <div className="space-y-3 pt-2 border-t border-border-light dark:border-border-dark animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ชนิดสถานที่ภายนอก* <span className="text-danger">*</span>
                    </label>
                    <select
                      name="location_type"
                      required={formData.location_group === 'LG002'}
                      value={formData.location_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    >
                      <option value="LT009">ไม่ใช่พื้นที่ในเขตโรงพยาบาล (เช่น บ้านผู้ป่วย, ชุมชน, ระหว่างทางส่งต่อ)</option>
                      <option value="LT010">ในเขต รพ.อื่น (ต้องระบุชื่อโรงพยาบาลและจังหวัด)</option>
                    </select>
                  </div>

                  {formData.location_type === 'LT010' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          ชื่อโรงพยาบาล* <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          name="ex_hos_name"
                          required={formData.location_type === 'LT010'}
                          value={formData.ex_hos_name}
                          onChange={handleChange}
                          placeholder="ระบุชื่อโรงพยาบาล (เช่น รพ.สมเด็จพระเจ้าตากสินฯ)"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          จังหวัด* <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          name="ex_province_name"
                          required={formData.location_type === 'LT010'}
                          value={formData.ex_province_name}
                          onChange={handleChange}
                          placeholder="ระบุจังหวัด (เช่น ตาก, เชียงใหม่)"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</div>
                <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">
                  การจำแนกความเสี่ยงตามมาตรฐาน NRLS (Risk Classification & Severity)
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                ** NRLS Data Set
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                เปิดใช้ NRLS เต็มรูปแบบสำหรับ<strong>รายงานใหม่แล้ว</strong> — ทุกวันที่เกิดเหตุต้องเลือกรหัส NRLS ส่วนประวัติเดิมก่อน 1 ตุลาคม 2569 ที่ไม่มีรหัสยังคงเก็บเป็น Legacy
              </div>
              <StandardRiskSelector
                selectedNrlsCode={formData.nrls_code}
                selectedLocalRiskId={formData.risk_id ? Number(formData.risk_id) : null}
                required
                onSelect={(nrlsCode, localRiskId, nrlsRisk) => {
                  const canonicalTypeId = getNrlsTypeId(nrlsCode || nrlsRisk?.nrls_code);
                  let type_id = canonicalTypeId || formData.type_id;
                  let riskstore_text = formData.riskstore_text;
                  
                  if (localRiskId) {
                    const selectedLocal = risks.find(r => r.id.toString() === String(localRiskId))
                      || nrlsRisk?.local_risks?.find((risk: any) => Number(risk.riskstore_id) === Number(localRiskId));
                    riskstore_text = selectedLocal
                      ? (selectedLocal.riskstore_full || selectedLocal.riskstore_name || `${selectedLocal.clear_id || ''} ${selectedLocal.risk_name || ''}`.trim())
                      : `${nrlsCode || nrlsRisk?.nrls_code || ''} : ${nrlsRisk?.name || ''}`.trim();
                  } else if (nrlsRisk) {
                    riskstore_text = `${nrlsRisk.nrls_code} : ${nrlsRisk.name}`;
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    nrls_code: nrlsCode || '',
                    risk_id: localRiskId ? String(localRiskId) : '',
                    type_id: type_id,
                    program_id: nrlsRisk?.program_id ? String(nrlsRisk.program_id) : '',
                    riskstore_text: riskstore_text,
                    level_id: prev.type_id !== type_id ? '' : prev.level_id
                  }));
                }}
              />
              <input type="hidden" name="nrls_code" value={formData.nrls_code} required />
              <input type="hidden" name="risk_id" value={formData.risk_id} />

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-slate-400" /> 
                  ระดับความรุนแรงของอุบัติการณ์ (Severity Level / Impact)** <span className="text-danger">*</span>
                </label>
                <select 
                  name="level_id" 
                  required 
                  value={formData.level_id} 
                  onChange={handleChange} 
                  disabled={!effectiveTypeId}
                  className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-semibold text-danger disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="">{effectiveTypeId ? '-- เลือกระดับความรุนแรง --' : '-- กรุณาเลือกอุบัติการณ์มาตรฐานด้านบนก่อน --'}</option>
                  {isClinical && (
                    <>
                      <option value="A">ระดับ A (เกิดที่นี่: มีโอกาสเกิดเหตุการณ์/พบได้เอง ปรับแก้ไขได้ ไม่กระทบผู้ป่วย)</option>
                      <option value="B">ระดับ B (เกิดที่ไกล: เกิดความผิดพลาดส่งต่อ แต่ตรวจพบแก้ไขได้ ยังไม่ถึงตัวผู้ป่วย)</option>
                      <option value="C">ระดับ C (เกิดกับใคร: ถึงตัวผู้ป่วยหรือบุคลากร แต่ไม่เกิดอันตราย)</option>
                      <option value="D">ระดับ D (ให้ระวัง: ถึงตัวผู้ป่วยหรือบุคลากร ต้องเฝ้าระวังดูแลเป็นพิเศษ)</option>
                      <option value="E">ระดับ E (ต้องรักษา: เกิดอันตรายชั่วคราว ต้องให้การบำบัดรักษาเพิ่มขึ้น)</option>
                      <option value="F">ระดับ F (เยียวยานาน: เกิดอันตรายชั่วคราว ต้องรักษา/นอน รพ. นานขึ้น)</option>
                      <option value="G">ระดับ G (ต้องพิการ: เกิดอันตรายถาวร พิการ หรือเสียชื่อเสียง)</option>
                      <option value="H">ระดับ H (ต้องการปั๊ม: เกิดอันตรายวิกฤต ต้องช่วยชีวิต CPR / ดูแลตลอดชีวิต)</option>
                      <option value="I">ระดับ I (จำใจลา: ผู้ป่วยหรือบุคลากรเสียชีวิต)</option>
                    </>
                  )}
                  {isGeneral && (
                    <>
                      <option value="1">ระดับ 1 (ผลกระทบด้านการเงิน &lt; 10,000 บาท หรือ ล่าช้า &lt; 1.5 เดือน ดำเนินงานสำเร็จ &gt; 90%)</option>
                      <option value="2">ระดับ 2 (ผลกระทบด้านการเงิน 10,001 - 100,000 บาท หรือ ล่าช้า 1.5 - 3 เดือน ดำเนินงานสำเร็จ 81-90%)</option>
                      <option value="3">ระดับ 3 (ผลกระทบด้านการเงิน 100,001 - 500,000 บาท หรือ ล่าช้า 3 - 4.5 เดือน ดำเนินงานสำเร็จ 71-80%)</option>
                      <option value="4">ระดับ 4 (ผลกระทบด้านการเงิน 500,001 - 10,000,000 บาท หรือ ล่าช้า 4.5 - 6 เดือน ดำเนินงานสำเร็จ 60-70%)</option>
                      <option value="5">ระดับ 5 (ผลกระทบด้านการเงิน &gt; 10,000,000 บาท เสียหายร้ายแรง ล่าช้า &gt; 6 เดือน ดำเนินงานสำเร็จ &lt; 60%)</option>
                    </>
                  )}
                </select>
                
                {isGeneral && (
                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300 shadow-sm">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> คำอธิบายเกณฑ์ความรุนแรงทั่วไป (Non-Clinical Matrix)
                    </div>
                    <ul className="space-y-1.5">
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">1:</span> มีโอกาสเกิดความเสี่ยง ความผิดพลาดเกิดขึ้น แต่ยังไม่ถึงผู้รับบริการ/บุคลากร/ทรัพย์สิน/ระบบงาน (เสียหาย &lt; 10k)</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">2:</span> ความผิดพลาดเกิดขึ้น ส่งผลถึงผู้รับบริการ/บุคลากร/ทรัพย์สิน แต่ยังไม่ก่อให้เกิดอันตราย (เสียหาย 10k - 100k)</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">3:</span> ความผิดพลาดเกิดขึ้น ส่งผลให้เกิดความเสียหายชั่วคราวต้องบำบัดแก้ไข (เสียหาย 100k - 500k)</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">4:</span> เสียหายร้ายแรง / ถูกร้องเรียนสื่อภายนอก (เสียหาย 500k - 10M)</li>
                      <li><span className="font-bold text-slate-700 dark:text-slate-300">5:</span> เสียหายถาวร / ฟ้องร้อง / Sentinel Event (เสียหาย &gt; 10M)</li>
                    </ul>
                  </div>
                )}

                {isClinical && (
                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300 shadow-sm">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" /> คำอธิบายเกณฑ์ความรุนแรงด้านคลินิก (Clinical Matrix)
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">A:</span> มีโอกาสเกิดความคลาดเคลื่อน แต่ยังไม่เกิดเหตุ</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">B:</span> เกิดความคลาดเคลื่อน แต่ยังไม่ถึงผู้ป่วย</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">C:</span> ถึงผู้ป่วย แต่ไม่เกิดอันตราย</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">D:</span> ถึงผู้ป่วย ต้องเฝ้าระวังหรือดูแลเพิ่ม</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">E:</span> อันตรายชั่วคราว ต้องรักษาเพิ่ม</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">F:</span> อันตรายชั่วคราว ต้องนอน รพ. หรือนานขึ้น</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">G:</span> เกิดอันตรายถาวร / พิการ</div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300">H:</span> วิกฤต ต้องช่วยชีวิต (CPR)</div>
                      <div className="col-span-2"><span className="font-bold text-slate-700 dark:text-slate-300">I:</span> ผู้ป่วยเสียชีวิต (Sentinel Event)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {isClinical && (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Stethoscope className="w-4 h-4 text-slate-400" /> 
                  ข้อมูลผู้ป่วย / HN / AN (กรณีความเสี่ยงทางคลินิก)**
                </label>
                <input 
                  type="text" 
                  name="detail_hosxp" 
                  value={formData.detail_hosxp} 
                  onChange={handleChange} 
                  placeholder="ระบุ HN, AN หรือข้อมูลสำคัญของผู้ป่วย (เช่น HN: 66xxxxxxx ผู้ป่วยหญิง 65 ปี Dx: ...)" 
                  className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow" 
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  รายละเอียดเหตุการณ์และผลกระทบที่เกิดขึ้น (Incident Narrative)** <span className="text-danger">*</span>
                </label>
                <span className="text-[11px] text-slate-400">ระบุข้อเท็จจริง สิ่งที่เกิดขึ้น ผลกระทบ และผู้เกี่ยวข้อง</span>
              </div>
              <textarea 
                name="detail"
                required
                value={formData.detail}
                onChange={handleChange}
                rows={4} 
                className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none leading-relaxed"
                placeholder="บรรยายเหตุการณ์ที่เกิดขึ้นโดยสรุปตามลำดับเวลา พร้อมระบุผลกระทบที่ตามมาอย่างชัดเจน (ตามหลัก SBAR: เกิดอะไรขึ้น เมื่อไหร่ ใครได้รับผลกระทบ ผลลัพธ์เบื้องต้นคืออะไร)..."
              />
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">3</div>
                <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">
                  ผู้ได้รับผลกระทบและการแก้ไขปัญหาเบื้องต้น (Impact & Immediate Action)
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                ** NRLS Data Set
              </span>
            </div>

            {/* 2. ผู้ที่ได้รับผลกระทบ** (Affected Receiver) */}
            <div className="space-y-4 p-4 sm:p-5 rounded-xl border border-border-light dark:border-border-dark bg-slate-50/60 dark:bg-slate-800/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <FileSearch className="w-4 h-4 text-slate-400" /> 
                    ที่มาของรายงาน (Incident Source)** <span className="text-danger">*</span>
                  </label>
                  <select 
                    name="incidentSource" 
                    required 
                    value={formData.incidentSource} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-medium"
                  >
                    <option value="เกิดขณะให้บริการ">ขณะปฏิบัติงาน (เกิดขณะให้บริการ)</option>
                    <option value="ใบข้อเสนอแนะ/ คำร้องของผู้รับบริการ">ใบข้อเสนอแนะ / คำร้องของผู้รับบริการ</option>
                    <option value="การทบทวนกิจกรรม/ กระบวนงานหลัก">การทบทวนกิจกรรม / กระบวนงานหลัก</option>
                    <option value="การทบทวนเวชระเบียน">การทบทวนเวชระเบียน</option>
                    <option value="การตรวจนิเทศทางการพยาบาล/ พยาบาลเวรตรวจการ">การตรวจนิเทศทางการพยาบาล / พยาบาลเวรตรวจการ</option>
                    <option value="การทำ Internal Survey (IS)">การทำ Internal Survey (IS)</option>
                    <option value="การเดินตรวจ (Round)">การทำ Quality Round (Risk, IC, ENV, etc.)</option>
                    <option value="Trigger Tool">Trigger Tool</option>
                    <option value="การประชุม">การประชุม</option>
                    <option value="การรับ-ส่งเวร">การรับ-ส่งเวร</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <User className="w-4 h-4 text-slate-400" /> 
                    ผู้ที่ได้รับผลกระทบ (Affected Receiver)** <span className="text-danger">*</span>
                  </label>
                  <select 
                    name="affected_receiver" 
                    required 
                    value={formData.affected_receiver} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark border border-primary/40 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-bold text-indigo-700 dark:text-indigo-300"
                  >
                    <option value="รายบุคคล">👤 รายบุคคล (Individual)</option>
                    <option value="กลุ่มบุคคล">👥 กลุ่มบุคคล (Group of people)</option>
                    <option value="หน่วยงาน/องค์กร">🏢 หน่วยงาน / องค์กร (Hospital Department/Organization)</option>
                  </select>
                </div>
              </div>

              {/* Sub-block for รายบุคคล (Individual): เพศ* และ อายุ** */}
              {formData.affected_receiver === 'รายบุคคล' && (
                <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <span className="p-1 bg-blue-100 dark:bg-blue-900/60 rounded">ℹ️</span>
                    <span>ข้อมูลจำแนกตามมาตรฐาน NRLS สำหรับผู้ได้รับผลกระทบ "รายบุคคล"</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        เพศ (Gender)** <span className="text-danger">*</span>
                      </label>
                      <select
                        name="gender"
                        required={formData.affected_receiver === 'รายบุคคล'}
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                      >
                        <option value="">-- เลือกเพศ --</option>
                        <option value="M">ชาย (Male)</option>
                        <option value="W">หญิง (Female)</option>
                        <option value="O">เพศทางเลือก (LGBTQ+)</option>
                        <option value="N">ไม่ทราบเพศ (Unknown)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ช่วงอายุ (Age Category)** <span className="text-danger">*</span>
                      </label>
                      <select
                        name="age_type"
                        required={formData.affected_receiver === 'รายบุคคล'}
                        value={formData.age_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                      >
                        <option value="A">อายุตั้งแต่ 1 ปีขึ้นไป</option>
                        <option value="N">0 - 28 วัน (Neonate: ทารกแรกเกิด)</option>
                        <option value="I">28 วัน แต่ไม่ถึง 1 ปี (Infant: ทารก)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          อายุ (ปี)** <span className="text-danger">*</span>
                        </label>
                      </div>
                      {formData.age_type === 'A' ? (
                        <div className="relative">
                          <input
                            type="number"
                            name="age"
                            min="1"
                            max="130"
                            required={formData.affected_receiver === 'รายบุคคล' && formData.age_type === 'A'}
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="เช่น 25, 45, 65"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium pr-10"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">ปี</span>
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span>0 ปี</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                            {formData.age_type === 'N' ? '(Neonate 0-28 วัน)' : '(Infant 28 วัน-1 ปี)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * หมายเหตุ: เศษของปีน้อยกว่า 6 เดือนให้นับเป็น 0 ปี ตั้งแต่ 6 เดือนขึ้นไปนับเป็น 1 ปี
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <PenTool className="w-4 h-4 text-slate-400" /> 
                  การจัดการเบื้องต้น <span className="text-danger">*</span>
                </label>
                <span className="text-[11px] text-slate-400">ระบุการแก้ไขหรือดูแลช่วยเหลือทันที ณ จุดเกิดเหตุ</span>
              </div>
              <textarea 
                name="edit"
                required
                value={formData.edit}
                onChange={handleChange}
                rows={3} 
                className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none leading-relaxed"
                placeholder="บรรยายขั้นตอนการปฏิบัติการจัดการเบื้องต้นทันที เช่น รายงานแพทย์, ตรวจประเมินสัญญาณชีพ, ปฐมพยาบาล, เปลี่ยนอุปกรณ์, สับสวิตช์ตัดไฟ ฯลฯ..."
              />
            </div>

          </div>

          {/* Section 4 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">4</div>
              <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-200">รูปภาพและหลักฐานประกอบ (Attached Files & Images)</h3>
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
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
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
          <button type="submit" disabled={saving || loadingOptions} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-bold rounded-[8px] transition-all shadow-sm cursor-pointer">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังส่งรายงาน...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                ส่งรายงานเข้าสู่ระบบ
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal: NRLS Sample Case Templates */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    ตัวอย่างการกรอกข้อมูลตามเกณฑ์ NRLS Standard Data Set
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    เลือกกรณีตัวอย่างเพื่อโหลดข้อมูลลงในแบบฟอร์ม (สำหรับการเรียนรู้หรือปรับใช้รายงานจริง)
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of Templates */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 gap-3.5">
                {NRLS_SAMPLE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div 
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-blue-500 hover:shadow-md group ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {tpl.title}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {tpl.tag}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ความรุนแรง {tpl.level_id}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {tpl.detail}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>NRLS Code: <strong className="text-blue-600 dark:text-blue-400">{tpl.nrls_code}</strong></span>
                          <span>•</span>
                          <span>เวร: <strong>{tpl.shift}</strong></span>
                          <span>•</span>
                          <span>ผู้ได้รับผลกระทบ: <strong>{tpl.affected_receiver}{tpl.affected_receiver === 'รายบุคคล' && tpl.age ? ` (${tpl.gender === 'W' ? 'หญิง' : 'ชาย'}, ${tpl.age} ปี)` : ''}</strong></span>
                        </div>

                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                          <span>โหลดข้อมูลนี้</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Info className="w-4 h-4 text-blue-500" />
                คลิกที่รายการใดก็ได้เพื่อนำข้อมูลไปเติมในฟอร์มอัตโนมัติ
              </span>
              <button 
                type="button" 
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot Assistant Modal */}
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
