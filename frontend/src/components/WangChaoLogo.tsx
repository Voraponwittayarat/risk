interface WangChaoHospitalLogoProps {
  className?: string;
  size?: number;
}

export function WangChaoHospitalLogo({ className = "w-10 h-10", size }: WangChaoHospitalLogoProps) {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden bg-white shadow-xs border border-slate-100 dark:border-slate-800 ${className}`}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    >
      <img 
        src="/wangchao-official-logo.png"
        alt="โลโก้โรงพยาบาลวังเจ้า" 
        className="w-full h-full object-contain p-0.5 select-none"
      />
    </div>
  );
}
