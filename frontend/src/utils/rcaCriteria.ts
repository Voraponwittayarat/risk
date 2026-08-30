// Wang Chao Hospital RCA Criteria 1/2568 & Rule Engine Helper

export interface IncidentData {
  id?: number;
  level_id?: string;
  riskstore_id?: number;
  is_sec41?: boolean;
  is_potential_harm?: boolean;
  source_trigger?: boolean;
  risk_name?: string;
  department_id?: string;
  detail?: string;
}

export interface CriteriaEvaluationResult {
  rca_required: boolean;
  matched_criteria: string[];
  recommended_mode: 'mini' | 'concise' | 'standard';
  badge_color: string;
  badge_text: string;
}

// Display-only policy descriptions. Eligibility is returned by the backend on Incident.
export const WANG_CHAO_RCA_CRITERIA = [
  {
    id: 1,
    title: 'มาตรฐานสำคัญจำเป็น 9 ด้าน (3P Safety)',
    description: 'อุบัติการณ์ที่ตรงกับรหัสความเสี่ยง 9 มาตรฐานสำคัญจำเป็น และระดับความรุนแรง C - I หรือ ระดับ 3 - 5',
    suggestedMode: 'mini' as const,
  },
  {
    id: 2,
    title: 'ความรุนแรงระดับสูง (Severe Harm)',
    description: 'อุบัติการณ์ทางคลินิกระดับ G, H, I หรือระดับ 4 - 5 ส่งผลให้เกิดการบาดเจ็บถาวร คุกคามต่อชีวิต หรือเสียชีวิต',
    suggestedMode: 'standard' as const,
  },
  {
    id: 3,
    title: 'Adverse Event จาก Trigger Tool หรือ ม.41 สปสช.',
    description: 'ตรวจพบเหตุการณ์ไม่พึงประสงค์ (AE) หรือความคลาดเคลื่อนจากการทบทวนเวชระเบียน หรือมีข้อร้องเรียน ม.41',
    suggestedMode: 'standard' as const,
  },
  {
    id: 4,
    title: 'เหตุการณ์ที่ไม่ควรเกิดขึ้นเด็ดขาด (Never Events)',
    description: 'เช่น ให้เลือดผิดคน/ผิดกรุ๊ป, ผ่าตัดผิดข้าง/ผิดตำแหน่ง, สั่งยาแพ้ซ้ำรุนแรง',
    suggestedMode: 'standard' as const,
  },
  {
    id: 5,
    title: 'เหตุการณ์ไม่พึงประสงค์ขั้นวิกฤต (Sentinel Events)',
    description: 'เช่น การฆ่าตัวตายขณะรักษา, การพลัดตกหกล้มระดับ E ขึ้นไป, มารดาเสียชีวิตจากการคลอด',
    suggestedMode: 'standard' as const,
  },
  {
    id: 6,
    title: 'Near Miss ร้ายแรงที่เกือบเกิดอันตราย (High Potential Harm)',
    description: 'เหตุการณ์ระดับ A-D ที่หากไม่มีการตรวจพบหรือยับยั้งทันเวลา อาจก่อให้เกิดอันตรายระดับ G-I ได้',
    suggestedMode: 'mini' as const,
  },
];

export const SWISS_CHEESE_LAYERS = [
  {
    key: 'org',
    name: '1. องค์กรและนโยบาย (Organizational)',
    color: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    description: 'โครงสร้าง นโยบาย วัฒนธรรมความปลอดภัย งบประมาณ อัตรากำลังคน',
  },
  {
    key: 'supervision',
    name: '2. การกำกับดูแลและหัวหน้างาน (Supervision)',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    description: 'การนิเทศงาน การมอบหมายงาน การฝึกอบรม การสื่อสารคำสั่ง',
  },
  {
    key: 'precondition',
    name: '3. สภาพแวดล้อมและเงื่อนไข (Preconditions)',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    description: 'ความเหนื่อยล้า แสงสว่าง อุปกรณ์ไม่พร้อม ภาระงานล้น สิ่งรบกวน',
  },
  {
    key: 'act',
    name: '4. การกระทำที่ไม่ปลอดภัย (Unsafe Acts)',
    color: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    description: 'ความพลั้งเผลอ (Slip/Lapse), ความเข้าใจผิด (Mistake), การละเลยขั้นตอน (Violation)',
  },
];

export const FISHBONE_CATEGORIES = [
  { key: 'people', name: '👨‍⚕️ บุคลากร (People / Man)', placeholder: 'เช่น ทักษะ, ความเหนื่อยล้า, ประสบการณ์, การสื่อสาร' },
  { key: 'method', name: '🩺 วิธีการปฏิบัติงาน (Method / Process)', placeholder: 'เช่น ขั้นตอน CPG ไม่ชัดเจน, ไม่ได้ Double check, ขาดแนวทาง' },
  { key: 'machine', name: '🔬 เครื่องมือและอุปกรณ์ (Machine / Tools)', placeholder: 'เช่น เครื่องมือชำรุด, ขาดการ Calibrate, ระบบ IT ขัดข้อง' },
  { key: 'material', name: '💊 ยาและเวชภัณฑ์ (Material)', placeholder: 'เช่น ยา Look-alike/Sound-alike, ฉลากไม่ชัดเจน, ยาหมด' },
  { key: 'measurement', name: '📏 การประเมินและวัดผล (Measurement)', placeholder: 'เช่น แปลผล Lab คลาดเคลื่อน, ประเมิน Early Warning Score ช้า' },
  { key: 'environment', name: '🏥 สภาพแวดล้อมและสถานที่ (Environment)', placeholder: 'เช่น เสียงรบกวน, แสงสว่างไม่พอ, ความแออัดในพื้นที่' },
];
