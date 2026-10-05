// Chart colors. Validated with the dataviz palette checker on a white surface (all pairs):
// Low/Medium/High CVD ΔE >= 15.3, normal-vision ΔE >= 16.9, contrast >= 3:1.
import type { RiskCategory } from '../types/api';

export const RISK_COLORS: Record<RiskCategory, string> = {
  'Low Risk': '#2a78d6',
  'Medium Risk': '#c98500',
  'High Risk': '#b8322f',
};

// Single-series measures that are not risk tiers (kept off the risk hues so they don't read as a tier).
export const SERIES_COLOR = '#4a3aa7';

export const CHART = {
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  tick: '#898781',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  track: '#f0efec',
};

export function riskCategoryForScore(score: number, mediumFrom = 30, highFrom = 60): RiskCategory {
  return score >= highFrom ? 'High Risk' : score >= mediumFrom ? 'Medium Risk' : 'Low Risk';
}
