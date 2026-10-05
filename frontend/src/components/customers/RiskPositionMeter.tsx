import React from 'react';
import type { RiskCategory } from '../../types/api';
import { RISK_COLORS } from '../../lib/chartTheme';
import { formatScore } from '../../lib/format';

/**
 * Where the customer's 0-100 risk score sits relative to the presentation bands,
 * with the classification threshold marked separately.
 */
export const RiskPositionMeter: React.FC<{
  score: number;
  category: RiskCategory;
  threshold: number | null; // probability 0-1
  mediumFrom?: number;
  highFrom?: number;
}> = ({ score, category, threshold, mediumFrom = 30, highFrom = 60 }) => {
  const bands: { category: RiskCategory; from: number; to: number }[] = [
    { category: 'Low Risk', from: 0, to: mediumFrom },
    { category: 'Medium Risk', from: mediumFrom, to: highFrom },
    { category: 'High Risk', from: highFrom, to: 100 },
  ];
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const thresholdScore = threshold === null ? null : threshold * 100;
  return (
    <div>
      <div
        className="relative h-14"
        role="img"
        aria-label={`Risk score ${formatScore(score)} of 100, ${category}${
          thresholdScore !== null ? `; classification threshold ${thresholdScore.toFixed(0)}` : ''
        }`}
      >
        {/* Score label above the needle */}
        <div className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold text-slate-900 whitespace-nowrap" style={{ left: `${clamp(score)}%` }}>
          {formatScore(score)}
        </div>
        {/* Band track: light tints of the risk colours, separated by 2px gaps */}
        <div className="absolute top-6 left-0 right-0 flex h-3 gap-[2px]">
          {bands.map((b, i) => (
            <div
              key={b.category}
              className={`h-full ${i === 0 ? 'rounded-l' : ''} ${i === bands.length - 1 ? 'rounded-r' : ''}`}
              style={{ width: `${b.to - b.from}%`, backgroundColor: RISK_COLORS[b.category], opacity: b.category === category ? 0.9 : 0.25 }}
            />
          ))}
        </div>
        {/* Customer needle */}
        <div className="absolute top-4 h-7 w-[3px] -translate-x-1/2 rounded bg-slate-900 ring-2 ring-white" style={{ left: `${clamp(score)}%` }} />
        {/* Classification threshold marker, labelled below the track */}
        {thresholdScore !== null && (
          <>
            <div className="absolute top-[22px] h-5 w-px -translate-x-1/2 bg-slate-500" style={{ left: `${thresholdScore}%` }} />
            <div className="absolute top-[42px] -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap" style={{ left: `${thresholdScore}%` }}>
              Threshold {thresholdScore.toFixed(0)}
            </div>
          </>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>0</span>
        <span>Low &lt; {mediumFrom} · Medium {mediumFrom}–{highFrom} · High ≥ {highFrom}</span>
        <span>100</span>
      </div>
    </div>
  );
};
