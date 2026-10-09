'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { getPlacementStudent, runSimulation } from '@/lib/api';
import { fmt, cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertCircle, Award, BookOpen, TrendingUp, TrendingDown } from 'lucide-react';

const SKILL_LABELS: Record<string, string> = {
  python: 'Python', java: 'Java', javascript: 'JavaScript', sql: 'SQL',
  dsa: 'DSA / Coding', communication: 'Communication', problemSolving: 'Problem Solving',
  git: 'Git / DevOps', cloud: 'Cloud', softSkill: 'Soft Skills',
};



function ReadinessRing({ val }: { val: number }) {
  const color = val >= 80 ? '#10b981' : val >= 65 ? '#3b82f6' : val >= 40 ? '#f59e0b' : '#ef4444';
  const r = 36; const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(100, val) / 100)}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-white">{fmt(val)}</p>
        <p className="text-[9px] text-slate-500">/ 100</p>
      </div>
    </div>
  );
}

function SkillBar({ label, val }: { label: string; val: number | undefined }) {
  const v = val ?? 0;
  const color = v >= 75 ? 'bg-emerald-500' : v >= 55 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = v >= 75 ? 'text-emerald-400' : v >= 55 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, v)}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${textColor}`}>{fmt(v)}</span>
    </div>
  );
}

function GapBadge({ skill, score, weight }: any) {
  const severity = score < 40 ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${severity}`}>
      <div>
        <p className="text-sm font-medium">{SKILL_LABELS[skill] ?? skill}</p>
        <p className="text-[10px] opacity-60">Weight: {(weight * 100).toFixed(0)}% in typical JDs</p>
      </div>
      <span className="text-lg font-bold">{fmt(score)}</span>
    </div>
  );
}

function StudentPlacementContent() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult]   = useState<any>(null);
  const [simInputs, setSimInputs]   = useState({ codingScore: 0, aptitudeScore: 0, mockInterviewScore: 0 });

  useEffect(() => {
    if (!id) return;
    getPlacementStudent(id)
      .then(d => { setStudent(d); setSimInputs({ codingScore: d.codingScore??50, aptitudeScore: d.aptitudeScore??50, mockInterviewScore: d.mockInterviewScore??50 }); })
      .catch(() => setError('Student not found or access denied'))
      .finally(() => setLoading(false));
  }, [id]);

  const runSim = async () => {
    if (!id) return;
    setSimLoading(true);
    try {
      const res = await runSimulation(id, {
        codingScore: simInputs.codingScore,
        aptitudeScore: simInputs.aptitudeScore,
        mockInterviewScore: simInputs.mockInterviewScore,
      });
      setSimResult(res);
    } finally { setSimLoading(false); }
  };

  if (loading) return (
    <AppLayout>
      <div className="space-y-4 max-w-[1200px]">{Array.from({length:4}).map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
    </AppLayout>
  );
  if (error || !student) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-400">{error || 'Student not found'}</p>
        <Link href="/placement" className="text-sm text-indigo-400 hover:underline">← Back to Placement Hub</Link>
      </div>
    </AppLayout>
  );

  const s = student;
  const pr = s.placementReadiness ?? 0;
  const riskLabel: string = s.placementRiskLabel ?? (pr >= 80 ? 'Low' : pr >= 65 ? 'Medium' : pr >= 40 ? 'High' : 'Critical');
  const RISK_COLORS: Record<string, string> = { Low:'text-emerald-400', Medium:'text-amber-400', High:'text-orange-400', Critical:'text-red-400' };
  const riskColor = RISK_COLORS[riskLabel] ?? 'text-slate-400';
  const skills = s.skills ?? {};

  const cod = s.codingScore ?? 50;
  const apt = s.aptitudeScore ?? 50;
  const SKILL_BARS: { k: string; v: number }[] = [
    { k:'dsa',           v: cod },
    { k:'python',        v: skills.python        ?? cod },
    { k:'java',          v: skills.java          ?? cod },
    { k:'sql',           v: skills.sql           ?? apt },
    { k:'communication', v: skills.communication ?? 60 },
    { k:'problemSolving',v: skills.problemSolving ?? apt },
    { k:'git',           v: skills.git           ?? Math.round(cod * 0.8) },
    { k:'cloud',         v: skills.cloud         ?? Math.round(cod * 0.7) },
  ];

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/placement" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Placement Hub
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-400">{s.name}</span>
        </div>

        {/* Profile header */}
        <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Readiness Ring */}
              <ReadinessRing val={pr} />
              <div>
                <h1 className="text-xl font-bold text-white">{s.name}</h1>
                <p className="text-sm text-slate-400">{s.studentId} · {s.department} · Sem {s.semester}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-sm font-bold ${riskColor}`}>Placement Risk: {riskLabel}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{s.placementSegmentLabel ?? s.placementSegment}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Academic Readiness: <span className="text-emerald-400 font-semibold">{fmt(s.academicReadiness)}</span> · CGPA: <span className="text-white font-semibold">{fmt(s.cgpa)}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/students/${s.studentId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:border-indigo-500/50 transition-all">
                Full 360 Profile
              </Link>
              <Link href={`/simulator?student=${s.studentId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-all">
                <Zap className="w-4 h-4" />What-If Simulator
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Skill Profile */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Skill Profile</h3>
              <div className="space-y-3">
                {SKILL_BARS.map(({ k, v }) => <SkillBar key={k} label={SKILL_LABELS[k] ?? k} val={v} />)}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800">
                {[['Coding/DSA', s.codingScore,'text-indigo-400'],['Aptitude', s.aptitudeScore,'text-amber-400'],['Mock Interview', s.mockInterviewScore,'text-purple-400']].map(([l,v,c]:any) => (
                  <div key={l} className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${c}`}>{fmt(v)}</p>
                    <p className="text-[10px] text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generic Skill Gaps (SWE profile) */}
            {(s.genericSkillGaps ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-white">Skill Gap Analysis</h3>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">vs. Generic SWE Profile</span>
                </div>
                <div className="space-y-3">
                  {(s.genericSkillGaps ?? []).map((g: any) => (
                    <GapBadge key={g.skill} skill={g.skill} score={g.studentScore} weight={g.weight} />
                  ))}
                </div>
                {/* Minimum effective intervention */}
                {s.genericSkillGaps?.[0] && (
                  <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                    <p className="text-xs font-semibold text-indigo-300 mb-1">Minimum Effective Intervention</p>
                    <p className="text-xs text-slate-400">
                      Primary gap: <span className="text-white font-medium">{SKILL_LABELS[s.genericSkillGaps[0].skill] ?? s.genericSkillGaps[0].skill}</span> — focusing here will have the highest impact on placement readiness.
                    </p>
                    <Link href="/placement/training" className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline">
                      <BookOpen className="w-3 h-3" />Assign Training Program →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* SHAP explanation */}
            {(s.shapDrivers ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">AI Risk Explanation (SHAP)</h3>
                <p className="text-xs text-slate-500 mb-3">Factors driving this student's overall success/risk score</p>
                <div className="space-y-2.5">
                  {s.shapDrivers.slice(0,6).map((d: any) => {
                    const pos = d.direction === 'positive';
                    return (
                      <div key={d.feature} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-300">{d.featureLabel ?? d.feature}</p>
                          <div className="h-1 bg-slate-800 rounded-full mt-1">
                            <div className={`h-full rounded-full ${pos ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, Math.abs(d.shapValue ?? 0) * 200)}%` }} />
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{(d.shapValue ?? 0).toFixed(3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Readiness Simulator + Outcomes */}
          <div className="space-y-5">
            {/* Placement What-If */}
            <div className="bg-[#0d1526] border border-indigo-500/25 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Placement What-If</h3>
              <p className="text-[10px] text-slate-500 mb-4">Model-based scenario estimate · Does not modify student data</p>
              <div className="space-y-4">
                {([['Coding/DSA', 'codingScore'], ['Aptitude', 'aptitudeScore'], ['Mock Interview','mockInterviewScore']] as [string,string][]).map(([label, key]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-white font-semibold">{(simInputs as any)[key]}</span>
                    </div>
                    <input type="range" min={0} max={100} value={(simInputs as any)[key]}
                      onChange={e => setSimInputs(prev => ({...prev, [key]: Number(e.target.value)}))}
                      className="w-full accent-indigo-500 cursor-pointer" />
                    <div className="flex justify-between text-[9px] text-slate-600"><span>0</span><span>50</span><span>100</span></div>
                  </div>
                ))}
                <button onClick={runSim} disabled={simLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition-all">
                  {simLoading
                    ? <span className="animate-pulse">Running…</span>
                    : <><Zap className="w-4 h-4" />Run Simulation</>}
                </button>
              </div>
              {simResult && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  {[
                    ['Placement Readiness', simResult.current?.placementReadiness, simResult.scenario?.placementReadiness, simResult.delta?.placementReadiness],
                    ['Success Index',       simResult.current?.successIndex,       simResult.scenario?.successIndex,       simResult.delta?.successIndex],
                  ].map(([l, cur, scen, d]: any) => (
                    <div key={l}>
                      <p className="text-xs text-slate-500 mb-1">{l}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-300">{fmt(cur)}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-sm font-bold text-white">{fmt(scen)}</span>
                        <span className={`text-xs font-bold ml-auto ${d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{d >= 0 ? '+' : ''}{fmt(d)}</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-600 italic">{simResult.disclaimer}</p>
                </div>
              )}
            </div>

            {/* Training assignments */}
            {(s.trainingAssignments ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />Training Assignments
                </h3>
                <div className="space-y-2">
                  {s.trainingAssignments.map((t: any) => (
                    <div key={t.trainingId} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-medium text-slate-200">{t.trainingId}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.status==='COMPLETED'?'text-emerald-400 bg-emerald-500/15':'text-amber-400 bg-amber-500/15'}`}>{t.status}</span>
                      </div>
                      {t.progress > 0 && (
                        <div className="mt-2 h-1.5 bg-slate-700 rounded-full">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.progress}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Placement outcomes */}
            {(s.placementOutcomes ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />Placement History
                </h3>
                <div className="space-y-2">
                  {s.placementOutcomes.map((o: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-medium text-slate-200">{o.jobRole ?? o.companyId}</p>
                          <p className="text-[10px] text-slate-500">{o.applicationStatus}</p>
                        </div>
                        {o.offerReceived && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Offer</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function PlacementStudentPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="space-y-4 max-w-[1200px]">{Array.from({length:4}).map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
      </AppLayout>
    }>
      <StudentPlacementContent />
    </Suspense>
  );
}
