'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { getStudents } from '@/lib/api';
import { riskColor, riskBadge, riskBg, momentumColor, momentumIcon, fmt, cn } from '@/lib/utils';
import Link from 'next/link';
import { AlertTriangle, TrendingDown, RefreshCw, ChevronRight } from 'lucide-react';

export default function RiskPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState('at_risk,critical');
  const [momentum, setMomentum] = useState('All');
  const [dept, setDept] = useState('All');
  const [sortBy, setSortBy] = useState('riskProbability');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { perPage: 50, sortBy, sortAsc: false };
      if (dept !== 'All') params.department = dept;
      if (momentum !== 'All') params.momentum = momentum;
      // For risk filter, handle multiple values by loading separately if needed
      if (risk !== 'all') {
        // Load critical and at_risk together
        const r1 = await getStudents({ ...params, riskLevel: 'critical' });
        const r2 = await getStudents({ ...params, riskLevel: 'at_risk' });
        const combined = [...r1.students, ...r2.students];
        combined.sort((a, b) => (b.riskProbability ?? 0) - (a.riskProbability ?? 0));
        setStudents(combined); setTotal(combined.length);
      } else {
        const res = await getStudents(params);
        setStudents(res.students); setTotal(res.total);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [dept, momentum, sortBy, risk]);

  const DEPTS = ['All','Computer Science','Electronics','Mechanical','Civil','MBA'];

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1300px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />Risk Intelligence
            </h1>
            <p className="text-sm text-slate-400">{total} students requiring attention</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-indigo-500/50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          {[
            { label:'Risk', opts:[{v:'at_risk,critical',l:'At Risk + Critical'},{v:'critical',l:'Critical Only'},{v:'at_risk',l:'At Risk Only'},{v:'all',l:'All Levels'}], val:risk, set:setRisk },
            { label:'Momentum', opts:[{v:'All',l:'All Momentum'},{v:'NEGATIVE',l:'Negative'},{v:'STABLE',l:'Stable'}], val:momentum, set:setMomentum },
            { label:'Sort', opts:[{v:'riskProbability',l:'Risk %'},{v:'riskVelocity',l:'Velocity'},{v:'recoveryPotential',l:'Recovery'},{v:'successIndex',l:'SSI'}], val:sortBy, set:setSortBy },
          ].map(f => (
            <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
              className="bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer">
              {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <select value={dept} onChange={e => setDept(e.target.value)}
            className="bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer">
            {DEPTS.map(d => <option key={d} value={d}>Dept: {d}</option>)}
          </select>
        </div>

        {/* Risk table */}
        <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Student','Risk Tier','Risk %','SSI','Velocity','Recovery','Momentum','Segment',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:6}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({length:9}).map((_,j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}
                  </tr>
                )) : students.map(s => (
                  <tr key={s.studentId} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div>
                        <Link href={`/students/${s.studentId}`} className="font-medium text-slate-200 hover:text-indigo-300 transition-colors">{s.name}</Link>
                        <p className="text-[10px] text-slate-500">{s.department} · Sem {s.semester}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', riskBg(s.riskLevel), riskColor(s.riskLevel))}>
                        {riskBadge(s.riskLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-base ${riskColor(s.riskLevel)}`}>{((s.riskProbability??0)*100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{fmt(s.successIndex)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${s.riskVelocity < 0 ? 'text-red-400' : s.riskVelocity > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {s.riskVelocity > 0 ? '▼' : s.riskVelocity < 0 ? '▲' : '—'} {Math.abs(s.riskVelocity ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${s.recoveryPotential>=65?'text-emerald-400':s.recoveryPotential>=40?'text-amber-400':'text-red-400'}`}>
                        {fmt(s.recoveryPotential)} <span className="text-slate-500 font-normal">({s.recoveryLabel})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${momentumColor(s.momentum)}`}>{momentumIcon(s.momentum)} {s.momentum}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.segmentLabel}</td>
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.studentId}`}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
