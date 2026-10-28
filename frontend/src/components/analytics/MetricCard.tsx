import React from 'react';

/** Stat tile: label, headline value, optional context line, and an optional colored key mark. */
export const MetricCard: React.FC<{
  label: string;
  value: string;
  detail?: React.ReactNode;
  keyColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, value, detail, keyColor, icon: Icon }) => (
  <div className="bg-white rounded-[20px] border border-[#E7EBE3] p-5 shadow-fintech hover:shadow-fintech-card hover:border-[#D5DCD0] transition-all duration-200 flex flex-col justify-between group">
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#777E77] flex items-center gap-2">
          {keyColor && (
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white"
              style={{ backgroundColor: keyColor }}
            />
          )}
          {label}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-[#EDF5E5] text-[#245C35] flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl sm:text-[26px] font-bold text-[#171A17] tracking-tight font-heading">
        {value}
      </p>
    </div>
    {detail && (
      <div className="mt-2.5 pt-2 border-t border-[#F5F7F3] text-[11px] font-medium text-[#777E77]">
        {detail}
      </div>
    )}
  </div>
);
