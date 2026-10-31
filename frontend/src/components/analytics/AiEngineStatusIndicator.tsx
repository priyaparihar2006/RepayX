import React from 'react';
import { Cpu, Sparkles, Activity } from 'lucide-react';

interface AiEngineStatusIndicatorProps {
  modelVersion?: string | null;
  isFallback?: boolean;
  totalScored?: number;
}

export const AiEngineStatusIndicator: React.FC<AiEngineStatusIndicatorProps> = ({
  modelVersion,
  isFallback = false,
  totalScored,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 3D Gyroscopic AI Core Widget */}
      <div
        className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-300 shadow-xs backdrop-blur-md ${
          isFallback
            ? 'bg-[#FEF7EA]/90 text-[#B45309] border-[#FDE68A] hover:border-[#F59E0B]/50'
            : 'bg-white/80 text-[#245C35] border-[#D1E8BC] hover:border-[#10B981]/50 shadow-[0_2px_12px_rgba(36,92,53,0.08)]'
        }`}
        title={
          isFallback
            ? 'Warming Cloud API: Using local model weights while the serverless container initializes'
            : `Live AI Engine Active: Real-time risk scoring enabled (${totalScored ? totalScored.toLocaleString() + ' customers' : 'Active'})`
        }
      >
        {/* Animated 3D Gyroscope Rings */}
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          {/* Outer ring */}
          <span
            className={`absolute inset-0 rounded-full border border-dashed animate-spin ${
              isFallback ? 'border-[#D97706]/60' : 'border-[#10B981]/70'
            }`}
            style={{ animationDuration: isFallback ? '3s' : '6s' }}
          />

          {/* Middle tilted orbital ring */}
          <span
            className={`absolute inset-0.5 rounded-full border border-dotted animate-spin ${
              isFallback ? 'border-[#B45309]/50' : 'border-[#059669]/60'
            }`}
            style={{ animationDuration: isFallback ? '2s' : '4s', animationDirection: 'reverse' }}
          />

          {/* Central Pulsing 3D Nucleus */}
          <span
            className={`relative w-2 h-2 rounded-full shadow-sm transition-transform duration-300 ${
              isFallback
                ? 'bg-[#D97706] animate-pulse shadow-[#D97706]/40'
                : 'bg-[#10B981] animate-ping opacity-75'
            }`}
          />
          <span
            className={`absolute w-1.5 h-1.5 rounded-full ${
              isFallback ? 'bg-[#B45309]' : 'bg-[#245C35]'
            }`}
          />
        </div>

        {/* Status text */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold tracking-tight">
            {isFallback ? '⚡ Warming Cloud API...' : 'Live Engine Connected'}
          </span>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isFallback ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
            }`}
          />
        </div>
      </div>

      {/* Scored Model Information Pill */}
      {modelVersion && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[#777E77] bg-white/70 px-2.5 py-1 rounded-full border border-[#E7EBE3]">
          <Cpu className="w-3 h-3 text-[#245C35]" />
          <span>Scored by</span>
          <span className="font-mono text-[#171A17] font-semibold">{modelVersion}</span>
        </div>
      )}
    </div>
  );
};
