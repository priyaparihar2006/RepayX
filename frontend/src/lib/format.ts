// Display helpers for API values. Missing values (null/undefined) render as an em dash.

const DASH = '—';

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? DASH : `${formatNumber(value, digits)}%`;
}

export function formatAmount(value: number | null | undefined): string {
  return formatNumber(value, 2);
}

export function formatScore(value: number | null | undefined): string {
  return formatNumber(value, 2);
}

export function formatRatio(value: number | null | undefined): string {
  return formatNumber(value, 2);
}
