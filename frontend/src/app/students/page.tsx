'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, useCallback } from 'react';
import { getStudents } from '@/lib/api';
import { riskColor, riskBadge, riskBg, momentumIcon, momentumColor, fmt, cn } from '@/lib/utils';
import Link from 'next/link';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ExternalLink } from 'lucide-react';

const DEPTS = ['All','Computer Science','Electronics','Mechanical','Civil','MBA'];
const RISKS = ['All','healthy','watch','at_risk','critical'];
const MOMENTS = ['All','POSITIVE','STABLE','NEGATIVE'];
const SORT_OPTIONS = [
  { value:'successIndex',     label:'Success Index' },
  { value:'riskProbability',  label:'Risk %' },
  { value:'riskVelocity',     label:'Risk Velocity' },
  { value:'recoveryPotential',label:'Recovery Potential' },
  { value:'cgpa',             label:'CGPA' },
];

function RiskBadge({ level }: { level: string }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', riskBg(level), riskColor(level))}>
      {riskBadge(level)}
    </span>
  );
}

function Bar({ val, color = 'bg-indigo-500' }: { val: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-slate-800 rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, val)}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-7 text-right">{val?.toFixed(0)}</span>
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');
  const [risk, setRisk] = useState('All');
  const [moment, setMoment] = useState('All');
  const [sortBy, setSortBy] = useState('riskProbability');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({
        q: q || undefined,
        department: dept === 'All' ? undefined : dept,
        riskLevel: risk === 'All' ? undefined : risk,
        momentum: moment === 'All' ? undefined : moment,
        sortBy, sortAsc, page, perPage: 25,
      });
      setStudents(res.students); setTotal(res.total); setPages(res.pages);
    } finally { setLoading(false); }
  }, [q, dept, risk, moment, sortBy, sortAsc, page]);

  useEffect(() => { setPage(1); }, [q, dept, risk, moment, sortBy, sortAsc]);
  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1400px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Student Explorer</h1>
            <p className="text-sm text-slate-400">{total} students found</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, ID…"
              className="w-full bg-[#080d1a] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all" />
          </div>
          {([{opts:DEPTS,val:dept,set:setDept,ph:'Department'},{opts:RISKS,val:risk,set:setRisk,ph:'Risk'},{opts:MOMENTS,val:moment,set:setMoment,ph:'Momentum'}] as any[]).map(({opts,val,set,ph}) => (
            <select key={ph} value={val} onChange={e=>set(e.target.value)}
              className="bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer">
              {opts.map((o:string) => <option key={o} value={o}>{ph}: {o}</option>)}
            </select>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>
          <button onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-indigo-500/50 transition-all">
            <ArrowUpDown className="w-3 h-3" />{sortAsc ? 'Asc' : 'Desc'}
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Student','Dept / Sem','SSI','Risk','Placement','Attendance','Momentum','Recovery',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:8}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({length:9}).map((_,j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}
                  </tr>
                )) : students.map(s => (
                  <tr key={s.studentId} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                          {s.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{s.name}</p>
                          <p className="text-[10px] text-slate-500">{s.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{s.department}<br/>Sem {s.semester} · CGPA {fmt(s.cgpa)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold ${s.successIndex>=75?'text-emerald-400':s.successIndex>=55?'text-amber-400':'text-red-400'}`}>{fmt(s.successIndex)}</span>
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={s.riskLevel} /></td>
                    <td className="px-4 py-3 w-28"><Bar val={s.placementReadiness??0} color={s.placementReadiness>=60?'bg-emerald-500':s.placementReadiness>=40?'bg-amber-500':'bg-red-500'} /></td>
                    <td className="px-4 py-3 w-28"><Bar val={s.attendancePct??0} color={s.attendancePct>=80?'bg-emerald-500':s.attendancePct>=65?'bg-amber-500':'bg-red-500'} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${momentumColor(s.momentum)}`}>{momentumIcon(s.momentum)} {s.momentum}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`text-xs font-medium ${s.recoveryPotential>=65?'text-emerald-400':s.recoveryPotential>=40?'text-amber-400':'text-red-400'}`}>{fmt(s.recoveryPotential)}</span>
                        <p className="text-[10px] text-slate-600">{s.recoveryLabel}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.studentId}`}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-all">
                        <ExternalLink className="w-3 h-3" />360°
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">Page {page} of {pages} · {total} students</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1 || loading}
                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages || loading}
                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
