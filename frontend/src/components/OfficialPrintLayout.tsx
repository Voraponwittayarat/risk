interface PrintMetadataItem {
  label: string;
  value?: string | number | null;
}

interface OfficialPrintHeaderProps {
  title: string;
  subtitle?: string;
  documentCode?: string;
  referenceNo?: string | number | null;
  metadata?: PrintMetadataItem[];
  orientation?: 'portrait' | 'landscape';
}

interface OfficialPrintSignaturesProps {
  roles: string[];
  names?: Array<string | null | undefined>;
}

const formatPrintedAt = () => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date());

export function OfficialPrintHeader({
  title,
  subtitle,
  documentCode = 'RM-FM',
  referenceNo,
  metadata = [],
  orientation = 'portrait',
}: OfficialPrintHeaderProps) {
  const pageMargin = orientation === 'landscape' ? '10mm 9mm 14mm' : '12mm 12mm 16mm';

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: ${pageMargin};
          }
        }
      `}</style>
      <header className="official-print-only official-print-header" aria-hidden="true">
        <div className="official-print-brand-row">
          <img
            src="/wangchao-official-logo.png"
            alt="ตราสัญลักษณ์โรงพยาบาลวังเจ้า"
            className="official-print-logo"
          />
          <div className="official-print-heading">
            <div className="official-print-hospital-name">โรงพยาบาลวังเจ้า</div>
            <div className="official-print-hospital-name-en">WANG CHAO HOSPITAL</div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="official-print-document-box">
            <div><span>รหัสเอกสาร</span><strong>{documentCode}</strong></div>
            <div><span>เลขที่อ้างอิง</span><strong>{referenceNo || '-'}</strong></div>
            <div><span>วันที่พิมพ์</span><strong>{formatPrintedAt()}</strong></div>
          </div>
        </div>

        {metadata.length > 0 && (
          <dl className="official-print-metadata">
            {metadata.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <dt>{item.label}</dt>
                <dd>{item.value === null || item.value === undefined || item.value === '' ? '-' : item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>
    </>
  );
}

export function OfficialPrintSignatures({ roles, names = [] }: OfficialPrintSignaturesProps) {
  return (
    <section className="official-print-only official-print-signatures" aria-hidden="true">
      <h2>การลงนามรับรองเอกสาร</h2>
      <div className="official-print-signature-grid" style={{ gridTemplateColumns: `repeat(${roles.length}, minmax(0, 1fr))` }}>
        {roles.map((role, index) => (
          <div key={`${role}-${index}`} className="official-print-signature-cell">
            <div className="official-print-signature-line">ลงชื่อ ................................................................</div>
            <div>({names[index] || '................................................................'})</div>
            <strong>{role}</strong>
            <div>วันที่ .......... / .......... / ..........</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OfficialPrintFooter() {
  return (
    <footer className="official-print-only official-print-footer" aria-hidden="true">
      <span>เอกสารภายในโรงพยาบาลวังเจ้า • ระบบบริหารความเสี่ยงและคุณภาพ</span>
      <span>ข้อมูล ณ วันที่พิมพ์ • โปรดตรวจสอบสถานะล่าสุดในระบบ RiskHRMS</span>
      <span className="official-print-page-label">หน้า <strong className="official-print-page-number" /></span>
    </footer>
  );
}
