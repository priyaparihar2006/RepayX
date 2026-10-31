import React from 'react';
import { AnimatedCounter } from '../common/AnimatedCounter';

/** Stat tile: label, headline value, optional context line, and an optional colored key mark. */
export const MetricCard: React.FC<{
  label: string;
  value: string;
  detail?: React.ReactNode;
  keyColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, value, detail, keyColor, icon: Icon }) => (
  <div className="bg-white rounded-[20px] border border-[#E7EBE3] p-5 shadow-fintech hover:shadow-fintech-card hover:border-[#D1E8BC] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-0.5 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#777E77] flex items-center gap-2">
          {keyColor && (
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white transition-transform duration-300 group-hover:scale-125"
              style={{ backgroundColor: keyColor }}
            />
          )}
          {label}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-[#EDF5E5] text-[#245C35] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#245C35] group-hover:text-white transition-all duration-300 shadow-xs">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl sm:text-[26px] font-bold text-[#171A17] tracking-tight font-heading">
        <AnimatedCounter value={value} duration={1300} />
      </p>
    </div>
    {detail && (
      <div className="mt-2.5 pt-2 border-t border-[#F5F7F3] text-[11px] font-medium text-[#777E77] relative z-10">
        {detail}
      </div>
    )}
    {/* Subtle light sweep shimmer on hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#EDF5E5]/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
  </div>
);
