'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStudent, runSimulation } from '@/lib/api';
import { riskColor, riskBadge, riskBg, momentumIcon, momentumColor, fmt, fmtPct, cn } from '@/lib/utils';
import Link from 'next/link';
import * as echarts from 'echarts';
import { ArrowLeft, Activity, Zap, TrendingDown, TrendingUp, Brain, Target, ChevronRight, AlertCircle } from 'lucide-react';

/* ── Mini components ─────────────────────────────────── */
function ScoreRing({ val, label, color }: { val: number; label: string; color: string }) {
  const pct = Math.min(100, val ?? 0);
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="text-center -mt-14 mb-8">
        <p className="text-lg font-bold text-white">{fmt(val)}</p>
      </div>
      <p className="text-[10px] text-slate-400 text-center leading-tight">{label}</p>
    </div>
  );
}

function TrajectoryChart({ traj }: { traj: any[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current || !traj?.length) return;
    const chart = echarts.init(el.current, 'dark');
    chart.setOption({
      backgroundColor:'transparent',
      tooltip:{ trigger:'axis', axisPointer:{ type:'cross' } },
      legend:{ data:['SSI','Risk %','Attendance','Coding'], textStyle:{ color:'#94a3b8', fontSize:10 }, bottom:0 },
      grid:{ left:40, right:20, top:20, bottom:40, containLabel:false },
      xAxis:{ type:'category', data:traj.map(t=>t.period), axisLabel:{ color:'#64748b', fontSize:10 } },
      yAxis:{ type:'value', axisLabel:{ color:'#64748b', fontSize:10 }, splitLine:{ lineStyle:{ color:'#1e293b' } } },
      series:[
        { name:'SSI', type:'line', data:traj.map(t=>t.successIndex?.toFixed(1)), lineStyle:{color:'#6366f1',width:2}, itemStyle:{color:'#6366f1'}, smooth:true, symbol:'circle', symbolSize:4 },
        { name:'Risk %', type:'line', data:traj.map(t=>((t.riskProb??0)*100).toFixed(1)), lineStyle:{color:'#ef4444',width:2}, itemStyle:{color:'#ef4444'}, smooth:true, symbol:'circle', symbolSize:4 },
        { name:'Attendance', type:'line', data:traj.map(t=>t.attendance?.toFixed(1)), lineStyle:{color:'#10b981',width:1.5,type:'dashed'}, itemStyle:{color:'#10b981'}, smooth:true, symbol:'none' },
        { name:'Coding', type:'line', data:traj.map(t=>t.codingScore?.toFixed(1)), lineStyle:{color:'#f59e0b',width:1.5,type:'dashed'}, itemStyle:{color:'#f59e0b'}, smooth:true, symbol:'none' },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el.current);
    return () => { chart.dispose(); ro.disconnect(); };
  }, [traj]);
  return <div ref={el} className="h-56 w-full" />;
}

function SkillRadar({ skills }: { skills: any }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current || !skills) return;
    const indicators = [
      {name:'Java',max:100},{name:'Python',max:100},{name:'DSA',max:100},
      {name:'SQL',max:100},{name:'Communication',max:100},{name:'Problem Solving',max:100},
    ];
    const vals = [skills.java??0, skills.python??0, skills.dsa??0, skills.sql??0, skills.communication??0, skills.problemSolving??0];
    const chart = echarts.init(el.current, 'dark');
    chart.setOption({
      backgroundColor:'transparent',
      radar:{ indicator:indicators, splitArea:{ areaStyle:{ color:['rgba(30,41,59,0.3)','rgba(30,41,59,0.1)'] } }, axisLine:{ lineStyle:{ color:'#1e293b' } }, splitLine:{ lineStyle:{ color:'#1e293b' } }, name:{ textStyle:{ color:'#94a3b8', fontSize:10 } } },
      series:[{ type:'radar', data:[{ value:vals, name:'Skills', areaStyle:{ color:'rgba(99,102,241,0.2)' }, lineStyle:{ color:'#6366f1' }, itemStyle:{ color:'#6366f1' } }] }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el.current);
    return () => { chart.dispose(); ro.disconnect(); };
  }, [skills]);
  return <div ref={el} className="h-48 w-full" />;
}

function SHAPBar({ drivers }: { drivers: any[] }) {
  if (!drivers?.length) return <p className="text-xs text-slate-500">No SHAP data available.</p>;
  const max = Math.max(...drivers.map(d => d.contribution));
  return (
    <div className="space-y-2.5">
      {drivers.slice(0,5).map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">{d.feature} <span className="text-slate-500">= {typeof d.value==='number'?fmt(d.value):d.value}</span></span>
            <span className={d.direction==='increases_risk'?'text-red-400':'text-emerald-400'}>
              {d.direction==='increases_risk'?'▲':'▼'} {(d.contribution*100).toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full">
            <div className={`h-full rounded-full ${d.direction==='increases_risk'?'bg-red-500':'bg-emerald-500'}`}
              style={{ width: `${(d.contribution/max)*100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main (inner — must be inside Suspense because of useParams) ─── */
function Student360Content() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getStudent(id).then(setStudent).catch(() => setError('Student not found.')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout>
      <div className="space-y-4">
        {Array.from({length:4}).map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    </AppLayout>
  );

  if (error || !student) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-400">{error || 'Student not found'}</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-400 hover:underline">← Go back</button>
      </div>
    </AppLayout>
  );

  const s = student;
  const riskPct = Math.round((s.riskProbability ?? 0) * 100);

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1400px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/students" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />Students
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-200">{s.name}</span>
        </div>

        {/* Hero card */}
        <div className={cn('bg-[#0d1526] border rounded-2xl p-6', riskBg(s.riskLevel))}>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-300 flex-shrink-0">
                {s.name?.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{s.name}</h1>
                <p className="text-sm text-slate-400">{s.studentId} · {s.department} · Semester {s.semester}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-full border', riskBg(s.riskLevel), riskColor(s.riskLevel))}>
                    {riskBadge(s.riskLevel)}
                  </span>
                  <span className={`text-xs font-medium ${momentumColor(s.momentum)}`}>{momentumIcon(s.momentum)} {s.momentum}</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{s.segmentLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/simulator?student=${s.studentId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-all">
                <Zap className="w-4 h-4" />What-If Simulator
              </Link>
            </div>
          </div>
        </div>

        {/* Score rings */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { val:s.successIndex,        label:'Success Index',       color:'#6366f1' },
            { val:s.academicReadiness,   label:'Academic Health',     color:'#10b981' },
            { val:s.placementReadiness,  label:'Placement Readiness', color:'#3b82f6' },
            { val:s.engagementHealth,    label:'Engagement Health',   color:'#8b5cf6' },
            { val:riskPct,               label:'Risk Probability',    color:'#ef4444' },
            { val:s.recoveryPotential,   label:'Recovery Potential',  color:'#f59e0b' },
          ].map(p => (
            <div key={p.label} className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-4 flex flex-col items-center gap-2">
              <ScoreRing val={p.val} label={p.label} color={p.color} />
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            {label:'CGPA',       val:fmt(s.cgpa)},
            {label:'Attendance', val:fmtPct(s.attendancePct)},
            {label:'Coding',     val:fmt(s.codingScore)},
            {label:'Aptitude',   val:fmt(s.aptitudeScore)},
            {label:'Mock Intv.', val:fmt(s.mockInterviewScore)},
            {label:'LMS',        val:fmtPct(s.lmsConsistency)},
            {label:'Backlogs',   val:s.backlogCount},
            {label:'Data Conf.', val:fmtPct(s.dataConfidence)},
          ].map(m => (
            <div key={m.label} className="bg-[#0d1526] border border-slate-700/60 rounded-xl px-3 py-3 text-center">
              <p className="text-lg font-bold text-white">{m.val}</p>
              <p className="text-[10px] text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Middle section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Trajectory */}
          <div className="lg:col-span-3 bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Performance Trajectory</h3>
            <p className="text-xs text-slate-500 mb-3">Longitudinal view across 6 periods</p>
            {s.trajectory?.length ? <TrajectoryChart traj={s.trajectory} /> :
              <p className="text-xs text-slate-500 py-8 text-center">No trajectory data available</p>}
          </div>
          {/* Skill radar */}
          <div className="lg:col-span-2 bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Skill Profile</h3>
            <p className="text-xs text-slate-500 mb-1">Assessed skill scores</p>
            {s.skills ? <SkillRadar skills={s.skills} /> :
              <p className="text-xs text-slate-500 py-8 text-center">No skill data</p>}
          </div>
        </div>

        {/* SHAP + Interventions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SHAP */}
          <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Risk Drivers (SHAP)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Top factors contributing to risk score. Not causal — observational attribution.</p>
            <SHAPBar drivers={s.shapDrivers ?? []} />
          </div>

          {/* Recommended Interventions */}
          <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Recommended Interventions</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Targeted support — not generic advice.</p>
            <div className="space-y-2.5">
              {(s.recommendedInterventions ?? []).slice(0, 3).map((int: any) => (
                <div key={int.interventionId} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200">{int.name}</p>
                    <span className="text-[10px] bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full whitespace-nowrap">{int.durationDays}d</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{int.reason}</p>
                  <p className="text-xs text-emerald-400 mt-1">Expected: {int.expectedImpact}</p>
                </div>
              ))}
              {!(s.recommendedInterventions?.length) && <p className="text-xs text-slate-500">No urgent interventions needed.</p>}
            </div>
          </div>
        </div>

        {/* Intervention History */}
        {s.interventionHistory?.length > 0 && (
          <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Intervention History</h3>
            <div className="space-y-3">
              {s.interventionHistory.map((h: any, i: number) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-200">{h.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${h.status==='COMPLETED'?'bg-emerald-500/20 text-emerald-400':'bg-amber-500/20 text-amber-400'}`}>{h.status}</span>
                  </div>
                  {h.beforeMetrics && h.afterMetrics && (
                    <div className="flex flex-wrap gap-4 text-xs">
                      {Object.entries(h.beforeMetrics).map(([k,v]: [string,any]) => (
                        <span key={k} className="text-slate-400">
                          {k}: <span className="text-red-400">{typeof v==='number'?fmt(v):v}</span>
                          {h.afterMetrics[k] && <> → <span className="text-emerald-400">{fmt(h.afterMetrics[k])}</span></>}
                        </span>
                      ))}
                    </div>
                  )}
                  {h.observedImpact && <p className="text-xs text-slate-500 mt-2 italic">{h.observedImpact}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* ── Page export with Suspense wrapper (required for useParams in Next 16) ── */
export default function Student360Page() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="space-y-4 max-w-[1400px]">
          {Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </AppLayout>
    }>
      <Student360Content />
    </Suspense>
  );
}

