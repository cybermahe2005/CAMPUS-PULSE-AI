'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { getInterventions, approveIntervention } from '@/lib/api';
import { riskColor, riskBadge, riskBg, momentumColor, momentumIcon, fmt, cn } from '@/lib/utils';
import Link from 'next/link';
import { Target, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

const STATUS_STYLE: Record<string,string> = {
  RECOMMENDED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  APPROVED:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  COMPLETED:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function InterventionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string>('');
  const [approved, setApproved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getInterventions().then(r => setData(r.students ?? [])).finally(() => setLoading(false));
  }, []);

  const approve = async (studentId: string, interventionId: string) => {
    setApproving(`${studentId}-${interventionId}`);
    try {
      await approveIntervention(studentId, interventionId, 'Approved via Intervention Center');
      setApproved(prev => new Set([...prev, `${studentId}-${interventionId}`]));
    } finally { setApproving(''); }
  };

  const critical = data.filter(s => s.riskLevel === 'critical');
  const atRisk   = data.filter(s => s.riskLevel === 'at_risk');

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1300px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Intervention Center</h1>
            <p className="text-sm text-slate-400">{data.length} students requiring intervention · Sorted by urgency</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">🚨 {critical.length} Critical</span>
            <span className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">⚠️ {atRisk.length} At Risk</span>
          </div>
        </div>

        {/* Priority grid */}
        <div className="space-y-3">
          {loading ? Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" />) :
            data.map(s => {
              const topInt = s.recommendedInterventions?.[0];
              return (
                <div key={s.studentId} className={cn('bg-[#0d1526] border rounded-2xl p-5 transition-all hover:border-opacity-80', riskBg(s.riskLevel))}>
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Student info */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 flex-shrink-0">
                        {s.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/students/${s.studentId}`} className="text-sm font-semibold text-white hover:text-indigo-300 transition-colors">{s.name}</Link>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', riskBg(s.riskLevel), riskColor(s.riskLevel))}>{riskBadge(s.riskLevel)}</span>
                          <span className={`text-xs ${momentumColor(s.momentum)}`}>{momentumIcon(s.momentum)} {s.momentum}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{s.department} · SSI: {fmt(s.successIndex)} · Recovery: {s.recoveryLabel}</p>
                        {/* SHAP driver */}
                        {s.shapDrivers?.[0] && (
                          <p className="text-xs text-amber-400 mt-1">
                            ⚡ Top driver: <span className="font-medium">{s.shapDrivers[0].feature}</span> = {s.shapDrivers[0].value?.toString?.()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Recommended interventions */}
                    <div className="flex-1 space-y-2">
                      {(s.recommendedInterventions ?? []).slice(0,2).map((int: any) => {
                        const key = `${s.studentId}-${int.interventionId}`;
                        const isApproved = approved.has(key);
                        const isApproving = approving === key;
                        return (
                          <div key={int.interventionId} className="flex items-center justify-between gap-3 bg-slate-800/50 rounded-xl px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-200">{int.name}</p>
                              <p className="text-[10px] text-slate-500">{int.expectedImpact} · {int.durationDays}d · {int.ownerRole}</p>
                            </div>
                            <button onClick={() => approve(s.studentId, int.interventionId)}
                              disabled={isApproved || !!isApproving}
                              className={cn(
                                'text-xs px-3 py-1.5 rounded-xl font-medium transition-all border flex items-center gap-1.5 flex-shrink-0',
                                isApproved
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cursor-default'
                                  : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/40'
                              )}>
                              {isApproved ? <><CheckCircle className="w-3 h-3" />Approved</> : isApproving ? <><Clock className="w-3 h-3 animate-spin" />…</> : <><Target className="w-3 h-3" />Approve</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <Link href={`/students/${s.studentId}`} className="flex-shrink-0 text-slate-600 hover:text-indigo-400 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </AppLayout>
  );
}
