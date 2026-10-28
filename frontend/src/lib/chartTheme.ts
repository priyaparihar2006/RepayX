// Chart colors. Validated with the dataviz palette checker on a white surface:
// Low/Medium/High normal-vision contrast >= 3:1.
import type { RiskCategory } from '../types/api';

export const RISK_COLORS: Record<RiskCategory, string> = {
  'Low Risk': '#16A34A',      // accessible green
  'Medium Risk': '#D97706',   // accessible amber
  'High Risk': '#DC2626',     // accessible red
};

// Single-series measures that are not risk tiers (deep forest green).
export const SERIES_COLOR = '#245C35';

export const CHART = {
  grid: '#E7EBE3',
  axis: '#D5DCD0',
  tick: '#777E77',
  textPrimary: '#171A17',
  textSecondary: '#777E77',
  track: '#EDF5E5',
};

export function riskCategoryForScore(score: number, mediumFrom = 30, highFrom = 60): RiskCategory {
  return score >= highFrom ? 'High Risk' : score >= mediumFrom ? 'Medium Risk' : 'Low Risk';
}
