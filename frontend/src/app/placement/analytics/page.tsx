'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { getPlacementAnalytics } from '@/lib/api';
import { fmt, cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';

function MiniBar({ val, max, color }: { val: number; max: number; color: string }) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="h-2 bg-slate-800 rounded-full">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function SegmentDoughnut({ data }: { data: any[] }) {
  const LABELS: Record<string, string> = { 0: 'Critical Risk', 40: 'Placement Risk', 65: 'Near Ready', 80: 'Placement Ready' };
  const COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981'];
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => {
        const label = LABELS[d._id] ?? d._id;
        const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] ?? '#64748b' }} />
            <span className="text-xs text-slate-400 flex-1">{label}</span>
            <span className="text-xs font-semibold text-slate-300 w-8 text-right">{d.count}</span>
            <div className="w-20 h-1.5 bg-slate-800 rounded-full">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i] }} />
            </div>
            <span className="text-[10px] text-slate-500 w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function SkillDonut({ label, strong, moderate, weak }: { label: string; strong: number; moderate: number; weak: number }) {
  const total = strong + moderate + weak;
  if (total === 0) return null;
  const sPct = (strong / total) * 100;
  const mPct = (moderate / total) * 100;
  const wPct = (weak / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${sPct}%` }} title={`Strong: ${strong}`} />
        <div className="bg-amber-500 h-full transition-all" style={{ width: `${mPct}%` }} title={`Moderate: ${moderate}`} />
        <div className="bg-red-500 h-full transition-all"  style={{ width: `${wPct}%` }} title={`Weak: ${weak}`} />
      </div>
      <div className="text-[10px] text-slate-500 w-28 flex-shrink-0 flex gap-2">
        <span className="text-emerald-400">{strong}</span>
        <span className="text-amber-400">{moderate}</span>
        <span className="text-red-400">{weak}</span>
      </div>
    </div>
  );
}

export default function PlacementAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    try { setAnalytics(await getPlacementAnalytics()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const a = analytics;
  const dept = a?.deptBreakdown ?? [];
  const skill = a?.skillStats ?? {};
  const seg   = a?.segmentDistribution ?? [];
  const forecast = a?.forecast ?? {};
  const maxPR = Math.max(...dept.map((d: any) => d.avgPR ?? 0), 1);

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />Placement Analytics
            </h1>
            <p className="text-sm text-slate-400">Department breakdown · Skill distribution · Segment analysis · Forecast</p>
          </div>
          <div className="flex gap-2">
            <Link href="/placement" className="text-xs text-slate-400 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:text-slate-200 transition-all">← Hub</Link>
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /><span>Loading analytics…</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Forecast Banner */}
            <div className="bg-gradient-to-r from-indigo-900/30 to-blue-900/20 border border-indigo-500/25 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-indigo-400 uppercase font-semibold tracking-wider mb-1">Placement Forecast</p>
                  <p className="text-sm text-slate-400">Current ready students: <span className="text-white font-bold text-lg">{forecast.currentReady}</span></p>
                  <p className="text-sm text-slate-400 mt-0.5">Projected after current interventions: <span className="text-emerald-400 font-bold text-lg">{forecast.projectedReady}</span></p>
                  <p className="text-xs text-slate-500 mt-1 italic">Model projection · Not a guaranteed count. Assumes 45% of near-ready students achieve readiness with active interventions.</p>
                </div>
                <div className="flex-shrink-0 text-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-3xl font-bold text-emerald-400">+{forecast.delta ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Projected lift</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Department Breakdown */}
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />Department-wise Readiness
                </h3>
                <div className="space-y-4">
                  {dept.map((d: any) => (
                    <div key={d._id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{d._id}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{d.total} students</span>
                          <span className="text-emerald-400 font-semibold">{d.ready} ready</span>
                          {d.critical > 0 && <span className="text-red-400">{d.critical} critical</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${d.total > 0 ? (d.ready/d.total)*100 : 0}%` }} title="Ready" />
                          <div className="bg-red-500/70 h-full" style={{ width: `${d.total > 0 ? (d.critical/d.total)*100 : 0}%` }} title="Critical" />
                        </div>
                        <span className="text-xs font-bold text-slate-300 w-8 text-right">{fmt(d.avgPR)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        {[['Avg PR', fmt(d.avgPR),'text-indigo-400'],['Avg AR', fmt(d.avgAR),'text-emerald-400'],['Coding',fmt(d.avgCoding),'text-amber-400'],['Interview',fmt(d.avgInterview),'text-purple-400']].map(([l,v,c]:any) => (
                          <div key={l} className="text-center bg-slate-900/40 rounded-lg p-1">
                            <p className={`font-bold ${c}`}>{v}</p>
                            <p className="text-slate-600">{l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segment Distribution */}
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />Readiness Segment Distribution
                </h3>
                <SegmentDoughnut data={seg} />

                {/* Avg scores */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Campus Averages</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Coding / DSA', fmt(skill.avgCoding), 'text-indigo-400'],
                      ['Aptitude',     fmt(skill.avgAptitude), 'text-amber-400'],
                      ['Mock Interview',fmt(skill.avgInterview), 'text-purple-400'],
                      ['Placement Readiness', fmt(skill.avgPR), 'text-emerald-400'],
                    ].map(([l, v, c]) => (
                      <div key={l} className="bg-slate-900/50 rounded-xl p-3 text-center">
                        <p className={`text-xl font-bold ${c}`}>{v}</p>
                        <p className="text-[10px] text-slate-500">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skill Distribution (stacked bars) */}
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />Skill Distribution
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  {[['Strong (≥75)','bg-emerald-500'],['Moderate (50–74)','bg-amber-500'],['Weak (<50)','bg-red-500']].map(([l,c]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${c}`} /><span className="text-[11px] text-slate-500">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <SkillDonut label="Coding/DSA"   strong={skill.dsa_strong??0}  moderate={skill.dsa_moderate??0} weak={skill.dsa_weak??0} />
                  <SkillDonut label="Aptitude"      strong={skill.apt_strong??0}  moderate={Math.max(0,(skill.apt_strong+skill.apt_weak < (skill.dsa_strong+skill.dsa_weak) ? 10 : 0))} weak={skill.apt_weak??0} />
                  <SkillDonut label="Mock Interview" strong={skill.int_strong??0} moderate={Math.max(0, 10)} weak={skill.int_weak??0} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
