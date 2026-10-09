'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, Suspense } from 'react';
import { getPlacementOverview, getPlacementStudents } from '@/lib/api';
import { fmt, cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Briefcase, TrendingUp, AlertTriangle, Users, Star, ChevronRight,
  Search, RefreshCw, Award, Target, Loader2, Building2, GraduationCap, BarChart3
} from 'lucide-react';

const SEGMENT_COLOR: Record<string, string> = {
  PLACEMENT_READY:              'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  NEAR_READY:                   'text-blue-400 bg-blue-500/10 border-blue-500/25',
  ACADEMICALLY_STRONG_CAREER_GAP: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  INTERVIEW_GAP:                'text-purple-400 bg-purple-500/10 border-purple-500/25',
  SKILL_GAP:                    'text-orange-400 bg-orange-500/10 border-orange-500/25',
  HIDDEN_TALENT:                'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  CRITICAL_PLACEMENT_RISK:      'text-red-400 bg-red-500/10 border-red-500/25',
};

const RISK_COLOR: Record<string, string> = {
  Low: 'text-emerald-400', Medium: 'text-amber-400', High: 'text-orange-400', Critical: 'text-red-400',
};

function KPI({ label, val, sub, color, icon: Icon }: any) {
  return (
    <div className={`bg-[#0d1526] border rounded-2xl p-5 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <p className="text-3xl font-bold text-white">{val ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function SegBadge({ seg, label }: { seg: string; label: string }) {
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', SEGMENT_COLOR[seg] ?? 'text-slate-400 bg-slate-800 border-slate-700')}>
      {label}
    </span>
  );
}

function ReadinessBar({ val }: { val: number }) {
  const color = val >= 80 ? 'bg-emerald-500' : val >= 65 ? 'bg-blue-500' : val >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, val ?? 0)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-8 text-right">{fmt(val)}</span>
    </div>
  );
}

const TABS = ['overview', 'students', 'hidden_talent', 'mismatch'] as const;
type Tab = typeof TABS[number];

export default function PlacementPage() {
  const [overview, setOverview] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('overview');
  const [q, setQ]               = useState('');
  const [readiness, setReadiness] = useState('');
  const [dept, setDept]         = useState('');
  const [page, setPage]         = useState(1);

  const loadOverview = async () => {
    setLoading(true);
    try { setOverview(await getPlacementOverview()); } finally { setLoading(false); }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params: any = { page, perPage: 25, sortBy: 'placementReadiness', sortAsc: false };
      if (q) params.q = q;
      if (readiness) params.readiness = readiness;
      if (dept) params.department = dept;
      const res = await getPlacementStudents(params);
      setStudents(res.students ?? []); setTotal(res.total ?? 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { if (tab === 'students') loadStudents(); }, [tab, page, q, readiness, dept]);

  const ov = overview;
  const DEPTS = ['', 'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'MBA'];

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1400px]">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-400" />
              Placement Intelligence Hub
            </h1>
            <p className="text-sm text-slate-400">Decision intelligence for placement readiness, skills, interventions & outcomes</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/placement/jobs" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-indigo-500/50 transition-all">
              <Building2 className="w-3.5 h-3.5" />Job Board
            </Link>
            <Link href="/placement/training" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-indigo-500/50 transition-all">
              <GraduationCap className="w-3.5 h-3.5" />Training
            </Link>
            <Link href="/placement/analytics" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/30 text-xs text-amber-300 hover:bg-amber-600/30 transition-all">
              <BarChart3 className="w-3.5 h-3.5" />Analytics
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading && !ov ? Array.from({length:8}).map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl" />) : [
            { label:'Total Students',         val: ov?.total,             sub:'Across all departments',    color:'border-slate-700/60',          icon: Users },
            { label:'Placement Ready',         val: ov?.readyCount,        sub:`Score ≥ ${ov?.thresholds?.placement_ready ?? 80}`, color:'border-emerald-500/25', icon: TrendingUp },
            { label:'Near Ready',              val: ov?.nearReadyCount,    sub:'65–79 readiness band',      color:'border-blue-500/20',           icon: Target },
            { label:'Critical Risk',           val: ov?.criticalRiskCount, sub:'Score < 40',                color:'border-red-500/20',            icon: AlertTriangle },
            { label:'Avg Readiness',           val: ov?.avgPlacementReadiness, sub:'Campus-wide average',   color:'border-indigo-500/20',         icon: BarChart3 },
            { label:'Readiness %',             val: ov?.readinessPct ? `${ov.readinessPct}%` : '—', sub:'Students placement ready',  color:'border-amber-500/20',  icon: Award },
            { label:'Academic–Career Gap',     val: ov?.mismatchCount,     sub:'High CGPA · Low placement', color:'border-amber-500/25',          icon: Star },
            { label:'Hidden Talents',          val: ov?.hiddenTalents?.length, sub:'Strong skills · overlooked',color:'border-cyan-500/20',      icon: Star },
          ].map(k => <KPI key={k.label} {...k} />)}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {([['overview','Overview'], ['students','Student Table'], ['hidden_talent','Hidden Talents'], ['mismatch','Academic–Career Gap']] as [Tab,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all border', tab===t ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 bg-slate-800/40 border-slate-700/40')}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Department breakdown */}
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Department Placement Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-800">
                    {['Department','Total','Avg Readiness','Ready','Critical Risk','Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(ov?.deptBreakdown ?? []).map((d: any) => (
                      <tr key={d._id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-200">{d._id}</td>
                        <td className="px-4 py-3 text-slate-400">{d.count}</td>
                        <td className="px-4 py-3 w-40"><ReadinessBar val={d.avgPR} /></td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">{d.readyCount}</td>
                        <td className="px-4 py-3 text-red-400 font-semibold">{d.riskCount}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setDept(d._id); setTab('students'); }}
                            className="text-xs text-indigo-400 hover:underline">View →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top ready */}
            <div className="bg-[#0d1526] border border-emerald-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />Top Placement Ready Students
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(ov?.topReady ?? []).slice(0,9).map((s: any) => (
                  <Link key={s.studentId} href={`/placement/students/${s.studentId}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 hover:border-emerald-500/30 transition-all group">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300">
                      {s.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.department}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-lg font-bold text-emerald-400">{fmt(s.placementReadiness)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Student Table ── */}
        {tab === 'students' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search student or ID…"
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              <select value={readiness} onChange={e => { setReadiness(e.target.value); setPage(1); }}
                className="bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="">All Readiness</option>
                <option value="ready">Placement Ready</option>
                <option value="near">Near Ready</option>
                <option value="risk">Placement Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
              <select value={dept} onChange={e => { setDept(e.target.value); setPage(1); }}
                className="bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
                {DEPTS.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
              </select>
              <button onClick={() => { setQ(''); setReadiness(''); setDept(''); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all">
                <RefreshCw className="w-3.5 h-3.5" />Reset
              </button>
            </div>

            {/* Table */}
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-400"><span className="text-white font-semibold">{total}</span> students</p>
                <div className="flex gap-2">
                  {page > 1 && <button onClick={() => setPage(p=>p-1)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800">← Prev</button>}
                  {students.length === 25 && <button onClick={() => setPage(p=>p+1)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800">Next →</button>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-800">
                    {['Student','Dept','Readiness','Technical','Aptitude','Interview','Segment','Risk','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {loading ? Array.from({length:8}).map((_,i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        {Array.from({length:9}).map((_,j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}
                      </tr>
                    )) : students.map(s => (
                      <tr key={s.studentId} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/placement/students/${s.studentId}`} className="font-medium text-slate-200 hover:text-indigo-300 transition-colors">{s.name}</Link>
                          <p className="text-[10px] text-slate-500">{s.studentId}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{s.department}</td>
                        <td className="px-4 py-3 w-32"><ReadinessBar val={s.placementReadiness} /></td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-300">{fmt(s.codingScore)}</td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-300">{fmt(s.aptitudeScore)}</td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-300">{fmt(s.mockInterviewScore)}</td>
                        <td className="px-4 py-3"><SegBadge seg={s.placementSegment ?? ''} label={s.placementSegmentLabel ?? s.placementSegment ?? '—'} /></td>
                        <td className={`px-4 py-3 text-xs font-semibold ${RISK_COLOR[s.placementRiskLabel ?? ''] ?? 'text-slate-400'}`}>{s.placementRiskLabel ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Link href={`/placement/students/${s.studentId}`}
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            Profile <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Hidden Talents ── */}
        {tab === 'hidden_talent' && (
          <div className="bg-[#0d1526] border border-cyan-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Hidden Talent Detection</h3>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full">AI-assisted recommendation</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Students with strong technical & aptitude indicators but lower placement readiness — may be overlooked by GPA-first filtering.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(ov?.hiddenTalents ?? []).map((s: any) => (
                <Link key={s.studentId} href={`/placement/students/${s.studentId}`}
                  className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-cyan-500/15 hover:border-cyan-500/35 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-cyan-600/20 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-300">{s.name?.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.department}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Coding', s.codingScore,'text-indigo-400'],['Aptitude',s.aptitudeScore,'text-amber-400'],['Placement',s.placementReadiness,'text-cyan-400']].map(([l,v,c]:any) => (
                      <div key={l} className="bg-slate-900/50 rounded-lg p-2">
                        <p className={`text-sm font-bold ${c}`}>{fmt(v)}</p>
                        <p className="text-[9px] text-slate-600">{l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-cyan-400/70 mt-3">Strong technical indicators · Needs placement skills focus</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Mismatch ── */}
        {tab === 'mismatch' && (
          <div className="bg-[#0d1526] border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Academic Stars with Career Gap</h3>
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">High CGPA · Low Placement Readiness</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800">
                  {['Student','Dept','CGPA','Academic','Placement','Gap','Action'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(ov?.mismatchStudents ?? []).map((s: any) => (
                    <tr key={s.studentId} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/placement/students/${s.studentId}`} className="font-medium text-slate-200 hover:text-amber-300">{s.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{s.department}</td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{fmt(s.cgpa)}</td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">{fmt(s.academicReadiness)}</td>
                      <td className="px-4 py-3 text-red-400 font-semibold">{fmt(s.placementReadiness)}</td>
                      <td className="px-4 py-3 font-bold text-amber-400">{fmt((s.academicReadiness??0)-(s.placementReadiness??0))}</td>
                      <td className="px-4 py-3">
                        <Link href={`/placement/students/${s.studentId}`} className="text-xs text-indigo-400 hover:underline">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
