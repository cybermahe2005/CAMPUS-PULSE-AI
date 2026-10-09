import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskColor(level: string): string {
  return { healthy:'text-emerald-400', watch:'text-amber-400', at_risk:'text-orange-400', critical:'text-red-400' }[level] ?? 'text-slate-400';
}
export function riskBg(level: string): string {
  return { healthy:'bg-emerald-500/10 border-emerald-500/30', watch:'bg-amber-500/10 border-amber-500/30', at_risk:'bg-orange-500/10 border-orange-500/30', critical:'bg-red-500/10 border-red-500/30' }[level] ?? 'bg-slate-500/10 border-slate-500/30';
}
export function riskBadge(level: string): string {
  return { healthy:'Healthy', watch:'Watch', at_risk:'At Risk', critical:'Critical' }[level] ?? level;
}
export function momentumColor(m: string): string {
  return { POSITIVE:'text-emerald-400', STABLE:'text-amber-400', NEGATIVE:'text-red-400' }[m] ?? 'text-slate-400';
}
export function momentumIcon(m: string): string {
  return { POSITIVE:'↗', STABLE:'→', NEGATIVE:'↘' }[m] ?? '→';
}
export function ssiColor(v: number): string {
  if (v >= 75) return 'text-emerald-400';
  if (v >= 55) return 'text-amber-400';
  if (v >= 35) return 'text-orange-400';
  return 'text-red-400';
}
export function fmt(v: number | undefined | null, dec = 1): string {
  if (v == null) return '—';
  return v.toFixed(dec);
}
export function fmtPct(v: number | undefined | null): string {
  if (v == null) return '—';
  return `${v.toFixed(0)}%`;
}
