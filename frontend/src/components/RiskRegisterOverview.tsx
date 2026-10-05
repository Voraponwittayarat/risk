import type { ReactNode } from 'react';
import { reviewDue } from '../utils/riskReviewDue';

interface Risk {
  id: number; risk_code: string; risk_title: string; risk_owner_name?: string; nrls_code?: string | null;
  department_name?: string; scope_level: string; status: string; is_never_event?: number;
  initial_risk_score: number; initial_risk_level: string; next_review_date?: string;
  latest_review?: { current_risk_score: number | null; current_risk_level: string; review_date: string };
}
interface Props {
  risks: Risk[]; loading: boolean; failed: boolean;
  badge: (level: string, score: number) => ReactNode;
  canEdit: (risk: Risk) => boolean;
  onDetail: (risk: Risk) => void; onReview: (risk: Risk) => void;
}
export default function RiskRegisterOverview({ risks, loading, failed, badge, canEdit, onDetail, onReview }: Props) {
  return <div className="overflow-x-auto no-print">
    <table className="w-full text-sm text-left text-slate-700">
      <caption className="text-left px-4 py-3 text-slate-600">เลือกชื่อความเสี่ยงเพื่อดูมาตรการ RCA, CAPA และประวัติทบทวน · คะแนนตั้งต้นและหลังทบทวนใช้ L × C</caption>
      <thead className="bg-slate-100"><tr>{['ความเสี่ยง', 'เจ้าของ / หน่วยงาน', 'ตั้งต้น → หลังทบทวน', 'กำหนดทบทวน', 'สถานะ / ดำเนินการ'].map(title => <th key={title} className="p-4">{title}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-200">
        {loading || failed || !risks.length ? <tr><td colSpan={5} className="p-8 text-center">{loading ? 'กำลังโหลดทะเบียนความเสี่ยง...' : failed ? 'โหลดทะเบียนไม่สำเร็จ กรุณาลองใหม่' : 'ไม่พบรายการตามเงื่อนไขที่เลือก'}</td></tr> : risks.map(risk => {
          const due = reviewDue(risk.next_review_date);
          const needsMapping = risk.risk_code.startsWith('LEGACY-HOSP-') && !risk.nrls_code;
          const review = risk.latest_review;
          const assessed = review?.current_risk_score != null;
          const delta = assessed ? review.current_risk_score! - risk.initial_risk_score : null;
          return <tr key={risk.id} className="align-top hover:bg-slate-50">
            <td className="p-4 min-w-60"><div className="text-xs text-indigo-700 mb-1">{risk.risk_code}{risk.is_never_event === 1 && ' · Never Event'}</div><button className="font-semibold text-left text-indigo-800 underline decoration-indigo-200 hover:decoration-indigo-800" onClick={() => onDetail(risk)}>{risk.risk_title}</button>{needsMapping && <div className="mt-2 text-xs text-amber-700">ทะเบียนเดิม · รอเชื่อม NRLS ก่อนนับอุบัติการณ์/ทบทวน</div>}</td>
            <td className="p-4"><div>{risk.risk_owner_name || 'ยังไม่ระบุเจ้าของ'}</div><div className="text-xs text-slate-500 mt-1">{risk.scope_level === 'hospital' ? 'ระดับโรงพยาบาล' : risk.department_name || 'ระดับหน่วยงาน'}</div></td>
            <td className="p-4 min-w-56"><div className="flex flex-wrap items-center gap-2">{badge(risk.initial_risk_level, risk.initial_risk_score)}<span>→</span>{assessed ? badge(review.current_risk_level, review.current_risk_score!) : <span>ยังไม่ประเมินความเสี่ยงคงเหลือ</span>}</div>{assessed && <div className="mt-2 text-xs">{delta === 0 ? 'คะแนนเท่าเดิม' : delta! < 0 ? `คะแนนลดลง ${-delta!}` : `คะแนนเพิ่มขึ้น ${delta}`} เทียบตั้งต้น · {new Date(review.review_date).toLocaleDateString('th-TH')}</div>}</td>
            <td className="p-4 min-w-44"><div className={`font-semibold ${due.className}`}>{due.label}</div>{risk.next_review_date && Number.isFinite(Date.parse(risk.next_review_date)) && <div className="mt-1 text-xs">{new Date(risk.next_review_date).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</div>}</td>
            <td className="p-4"><div>{risk.status === 'closed' ? 'ปิดแบบเฝ้าระวัง' : risk.status === 'monitoring' ? 'เฝ้าระวัง' : 'เปิด'}</div>{canEdit(risk) && <button onClick={() => onReview(risk)} className="mt-2 rounded border border-emerald-700 px-3 py-1 text-emerald-800 hover:bg-emerald-50">{needsMapping ? 'จัดประเภท NRLS' : 'ทบทวน'}</button>}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
