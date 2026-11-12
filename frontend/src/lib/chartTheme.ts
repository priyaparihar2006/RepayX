// Chart colors. Validated with the dataviz palette checker on a white surface:
// Low/Medium/High normal-vision contrast >= 3:1.
import type { RiskCategory } from '../types/api';

export const RISK_COLORS: Record<RiskCategory, string> = {
  'Low Risk': '#198754',      // Primary fintech green
  'Medium Risk': '#F59E0B',   // Accessible amber/yellow
  'High Risk': '#E63946',     // Accessible coral red
};

// Single-series measures that are not risk tiers (deep forest green).
export const SERIES_COLOR = '#198754';

export const CHART = {
  grid: '#E5EBE7',
  axis: '#E5EBE7',
  tick: '#77827B',
  textPrimary: '#202B25',
  textSecondary: '#77827B',
  track: '#EAF5ED',
};

export function riskCategoryForScore(score: number, mediumFrom = 30, highFrom = 60): RiskCategory {
  return score >= highFrom ? 'High Risk' : score >= mediumFrom ? 'Medium Risk' : 'Low Risk';
}
