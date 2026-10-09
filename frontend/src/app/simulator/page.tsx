'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getStudents, runSimulation } from '@/lib/api';
import { riskColor, riskBadge, riskBg, fmt, fmtPct, cn } from '@/lib/utils';
import * as echarts from 'echarts';
import { Zap, Search, ArrowRight, TrendingDown, TrendingUp, Minus, RotateCcw } from 'lucide-react';

function DeltaBadge({ val, unit='' }: { val: number; unit?: string }) {
  if (!val) return <span className="text-slate-500 text-xs">—</span>;
  const pos = val > 0;
  return <span className={`text-xs font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '▲' : '▼'} {Math.abs(val).toFixed(1)}{unit}</span>;
}

function CompareChart({ current, scenario }: { current: any; scenario: any }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current || !current) return;
    const chart = echarts.init(el.current, 'dark');
    const metrics = ['SSI', 'Academic', 'Placement', 'Engagement', 'Risk %'];
    const curVals = [
      current.successIndex, current.academicReadiness, current.placementReadiness,
      current.engagementHealth, (current.riskProbability ?? 0) * 100,
    ].map(v => parseFloat((v ?? 0).toFixed(1)));
    const scnVals = scenario ? [
      scenario.successIndex, scenario.academicReadiness, scenario.placementReadiness,
      scenario.engagementHealth, (scenario.riskProbability ?? 0) * 100,
    ].map(v => parseFloat((v ?? 0).toFixed(1))) : null;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Current', 'Scenario'], textStyle: { color: '#94a3b8', fontSize: 10 }, top: 0 },
      grid: { left: 80, right: 20, top: 35, bottom: 10, containLabel: false },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } } },
      yAxis: { type: 'category', data: metrics, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      series: [
        { name: 'Current', type: 'bar', data: curVals, barMaxWidth: 16, itemStyle: { color: '#475569' }, label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 } },
        ...(scnVals ? [{ name: 'Scenario', type: 'bar', data: scnVals, barMaxWidth: 16, itemStyle: { color: '#6366f1' }, label: { show: true, position: 'right', color: '#a5b4fc', fontSize: 10 } }] : []),
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el.current);
    return () => { chart.dispose(); ro.disconnect(); };
  }, [current, scenario]);
  return <div ref={el} className="h-52 w-full" />;
}

function Slider({ label, value, onChange, min=0, max=100, step=1, color='text-indigo-400' }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className={`font-bold ${color}`}>{value.toFixed(0)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full accent-indigo-500 cursor-pointer bg-slate-700" />
      <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function SimContent() {
  const searchParams = useSearchParams();
  const preStudent = searchParams.get('student') ?? '';
  const [query, setQuery] = useState('');
  const [suggestions, setSugg] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [attendance, setAttendance] = useState(75);
  const [coding, setCoding] = useState(50);
  const [mock, setMock] = useState(50);
  const [aptitude, setAptitude] = useState(55);
  const [lms, setLms] = useState(55);

  const loadPreStudent = useCallback(async (id: string) => {
    const res = await getStudents({ q: id, perPage: 1 });
    if (res.students[0]) { const s = res.students[0]; selectStudent(s); }
  }, []);

  useEffect(() => { if (preStudent) loadPreStudent(preStudent); }, [preStudent, loadPreStudent]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSugg([]); return; }
    const res = await getStudents({ q, perPage: 5 });
    setSugg(res.students);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  const selectStudent = (s: any) => {
    setSelected(s); setResult(null); setSugg([]); setQuery('');
    setAttendance(Math.round(s.attendancePct ?? 75));
    setCoding(Math.round(s.codingScore ?? 50));
    setMock(Math.round(s.mockInterviewScore ?? 50));
    setAptitude(Math.round(s.aptitudeScore ?? 55));
    setLms(Math.round(s.lmsConsistency ?? 55));
  };

  const runSim = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const res = await runSimulation(selected.studentId, { attendancePct: attendance, codingScore: coding, mockInterviewScore: mock, aptitudeScore: aptitude, lmsConsistency: lms });
      setResult(res);
    } finally { setRunning(false); }
  };

  const reset = () => {
    if (!selected) return;
    setAttendance(Math.round(selected.attendancePct ?? 75));
    setCoding(Math.round(selected.codingScore ?? 50));
    setMock(Math.round(selected.mockInterviewScore ?? 50));
    setAptitude(Math.round(selected.aptitudeScore ?? 55));
    setLms(Math.round(selected.lmsConsistency ?? 55));
    setResult(null);
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-bold text-white">What-If Simulator</h1>
        <p className="text-sm text-slate-400 mt-0.5">Explore alternative futures — never modifies real student data</p>
      </div>

      {/* Student selector */}
      <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-3">1 · Select a Student</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or student ID…"
            className="w-full bg-[#080d1a] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-[#0d1526] border border-slate-700 rounded-xl overflow-hidden z-20 shadow-xl">
              {suggestions.map(s => (
                <button key={s.studentId} onClick={() => selectStudent(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left">
                  <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">{s.name?.charAt(0)}</div>
                  <div>
                    <p className="text-sm text-slate-200">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.department} · SSI: {fmt(s.successIndex)} · {riskBadge(s.riskLevel)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <div className={cn('mt-3 flex items-center gap-3 p-3 rounded-xl border', riskBg(selected.riskLevel))}>
            <div className="w-9 h-9 rounded-full bg-indigo-600/25 flex items-center justify-center text-sm font-bold text-indigo-300">{selected.name?.charAt(0)}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-200">{selected.name}</p>
              <p className="text-xs text-slate-400">{selected.department} · SSI: <span className="font-bold text-white">{fmt(selected.successIndex)}</span></p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${riskBg(selected.riskLevel)} ${riskColor(selected.riskLevel)}`}>{riskBadge(selected.riskLevel)}</span>
          </div>
        )}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Sliders */}
          <div className="lg:col-span-2 bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5 space-y-5">
            <p className="text-sm font-semibold text-white">2 · Adjust Scenario</p>
            <Slider label="Attendance %" value={attendance} onChange={setAttendance} min={30} max={100} color={attendance>=75?'text-emerald-400':'text-red-400'} />
            <Slider label="Coding Score" value={coding} onChange={setCoding} color={coding>=60?'text-emerald-400':'text-amber-400'} />
            <Slider label="Mock Interview" value={mock} onChange={setMock} color={mock>=60?'text-emerald-400':'text-amber-400'} />
            <Slider label="Aptitude Score" value={aptitude} onChange={setAptitude} />
            <Slider label="LMS Consistency %" value={lms} onChange={setLms} />
            <div className="flex gap-2 pt-2">
              <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-slate-600 transition-all">
                <RotateCcw className="w-3 h-3" />Reset
              </button>
              <button onClick={runSim} disabled={running}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition-all">
                <Zap className="w-4 h-4" />{running ? 'Running…' : 'Run Scenario'}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">Outputs are model estimates — not causal guarantees. Real student data is never modified.</p>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-3">3 · Compare Outcomes</p>
              <CompareChart current={result?.current ?? { successIndex:selected.successIndex, academicReadiness:selected.academicReadiness, placementReadiness:selected.placementReadiness, engagementHealth:selected.engagementHealth, riskProbability:selected.riskProbability }}
                scenario={result?.scenario} />
            </div>
            {result && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Success Index', curr:result.current.successIndex, scn:result.scenario.successIndex, delta:result.delta.successIndex },
                  { label:'Placement', curr:fmtPct(result.current.placementReadiness), scn:fmtPct(result.scenario.placementReadiness), delta:result.delta.placementReadiness },
                  { label:'Risk', curr:fmtPct((result.current.riskProbability??0)*100), scn:fmtPct((result.scenario.riskProbability??0)*100), delta:result.delta.riskProbability*100, invert:true },
                ].map(m => (
                  <div key={m.label} className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">{m.label}</p>
                    <p className="text-xs text-slate-500">Was: <span className="text-slate-300 font-medium">{m.curr}</span></p>
                    <p className="text-lg font-bold text-white my-1">{m.scn}</p>
                    <DeltaBadge val={m.invert ? -m.delta : m.delta} />
                  </div>
                ))}
              </div>
            )}
            {result?.tierChanged && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400">
                ✅ Risk tier changed: <strong>{riskBadge(result.current.riskLevel)}</strong> → <strong>{riskBadge(result.scenario.riskLevel)}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimulatorPage() {
  return <AppLayout><Suspense><SimContent /></Suspense></AppLayout>;
}
