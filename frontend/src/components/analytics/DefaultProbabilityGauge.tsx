import React from 'react';
import { motion } from 'motion/react';
import { AnimatedCounter } from '../common/AnimatedCounter';

interface DefaultProbabilityGaugeProps {
  probability: number; // e.g. 0.4183 (0 to 1) or 41.83 (0 to 100)
  size?: number;
}

export const DefaultProbabilityGauge: React.FC<DefaultProbabilityGaugeProps> = ({
  probability,
  size = 110,
}) => {
  // Normalize probability to 0-100 range
  const pct = probability > 1 ? probability : probability * 100;
  const clampedPct = Math.min(Math.max(pct, 0), 100);

  // Circle parameters
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covering 270 degrees (3/4 of a circle) with gap at the bottom
  const arcCoverage = 0.75;
  const totalArcLength = circumference * arcCoverage;
  const offset = totalArcLength * (1 - clampedPct / 100);

  // Color selection based on risk level
  const isHigh = clampedPct >= 60;
  const isMed = clampedPct >= 30 && clampedPct < 60;
  const strokeColor = isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#10B981';
  const glowColor = isHigh ? 'rgba(239, 68, 68, 0.25)' : isMed ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)';

  return (
    <div className="relative inline-flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform rotate-[135deg] overflow-visible"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="1" />
          </linearGradient>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={glowColor} />
          </filter>
        </defs>

        {/* Background track arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E7EBE3"
          strokeWidth={strokeWidth}
          strokeDasharray={`${totalArcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Foreground animated value arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${totalArcLength} ${circumference}`}
          strokeDashoffset={totalArcLength}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
        />
      </svg>

      {/* Center text container */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 text-center pointer-events-none">
        <span className="text-sm sm:text-base font-bold text-[#171A17] font-heading tracking-tight">
          <AnimatedCounter value={`${clampedPct.toFixed(1)}%`} duration={1400} />
        </span>
        <span className="text-[9px] uppercase tracking-wider font-semibold text-[#777E77] -mt-0.5">
          {isHigh ? 'High Risk' : isMed ? 'Moderate' : 'Low Risk'}
        </span>
      </div>
    </div>
  );
};
