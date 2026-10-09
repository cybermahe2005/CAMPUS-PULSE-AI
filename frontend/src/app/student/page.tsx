'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getStudent, getStudentPlacementProfile, getStudentJobs, getTrainings } from '@/lib/api';
import { fmt } from '@/lib/utils';
import Link from 'next/link';
import {
  Brain, TrendingUp, AlertTriangle, BookOpen, Target, Zap,
  GraduationCap, Award, ChevronRight, LogOut, BarChart3,
  CheckCircle, Clock, Star, Activity, Loader2
} from 'lucide-react';

// ── Sub-components ─────────────────────────────────────────────────
function RingMeter({ val, size = 80, label }: { val: number; size?: number; label: string }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const color = val >= 80 ? '#10b981' : val >= 65 ? '#3b82f6' : val >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={size * 0.09} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size * 0.09}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(100, val || 0) / 100)}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: size * 0.22 }}>{Math.round(val || 0)}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 text-center leading-tight">{label}</p>
    </div>
  );
}

function SkillBar({ label, val, color = 'bg-indigo-500' }: { label: string; val: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, val || 0)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300 w-7 text-right">{Math.round(val || 0)}</span>
    </div>
  );
}

function KPICard({ icon: Icon, label, val, sub, color }: any) {
  return (
    <div className={`bg-[#0d1526] border rounded-2xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{val ?? '—'}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function StudentPortal() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile]     = useState<any>(null);
  const [placement, setPlacement] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'skills'|'placement'|'training'>('overview');

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toUpperCase() !== 'STUDENT')) {
      router.replace('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user?.userId) return;
    const id = user.userId;
    setLoading(true);
    Promise.allSettled([
      getStudent(id),
      getStudentPlacementProfile(),  // student self-access — no ID needed
      getTrainings(),
    ]).then(([p, pl, tr]) => {
      if (p.status === 'fulfilled')  setProfile(p.value);
      if (pl.status === 'fulfilled') setPlacement(pl.value);
      if (tr.status === 'fulfilled') setTrainings((tr.value as any).programs ?? []);
    }).finally(() => setLoading(false));
  }, [user?.userId]);

  const handleLogout = () => { logout(); router.replace('/login'); };

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#080d1a] flex items-center justify-center gap-3 text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      <span className="text-sm">Loading your profile…</span>
    </div>
  );

  const s  = profile ?? {};
  const pl = placement ?? {};
  const pr = pl.placementReadiness ?? 0;
  const si = s.successIndex ?? s.studentSuccessIndex ?? 0;
  const riskLevel = s.riskLevel ?? (si >= 70 ? 'Low' : si >= 50 ? 'Medium' : 'High');
  const RISK_COLOR: Record<string, string> = { Low:'text-emerald-400', Medium:'text-amber-400', High:'text-red-400', Critical:'text-red-400' };

  const myTrainings = trainings.filter(t =>
    (t.enrolledStudents ?? []).includes(user?.userId) ||
    (pl.trainingAssignments ?? []).some((a: any) => a.trainingId === t.trainingId)
  );

  return (
    <div className="min-h-screen bg-[#080d1a] text-white">
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-600/4 rounded-full blur-[80px]" />
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-[#080d1a]/90 backdrop-blur-sm border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-white">Campus Pulse AI</span>
            <span className="text-slate-700 text-xs">·</span>
            <span className="text-xs text-emerald-400 font-medium">Student Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user?.name}</p>
              <p className="text-[10px] text-slate-500">{user?.userId} · {user?.department}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-300">
              {user?.name?.charAt(0) ?? 'S'}
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all border border-slate-700">
              <LogOut className="w-3 h-3" />Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-[#0d1526] to-[#0a1020] border border-slate-700/60 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-300">
                {(s.name ?? user?.name ?? 'S').charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{s.name ?? user?.name}</h1>
                <p className="text-sm text-slate-400">{s.studentId ?? user?.userId} · {s.department ?? user?.department}</p>
                <p className="text-xs text-slate-500 mt-0.5">Semester {s.semester ?? '—'} · Batch {s.batch ?? '—'}</p>
              </div>
            </div>

            {/* Meters */}
            <div className="flex items-center gap-6 sm:ml-auto flex-wrap">
              <RingMeter val={si}   label="Success Index"     size={72} />
              <RingMeter val={s.cgpa ? s.cgpa * 10 : 0} label="CGPA Score"   size={72} />
              <RingMeter val={pr}   label="Placement Ready"   size={72} />
              <RingMeter val={s.attendance ?? 0} label="Attendance %"  size={72} />
            </div>
          </div>

          {/* Risk + CGPA inline */}
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-800/60">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-700 ${RISK_COLOR[riskLevel] ?? 'text-slate-400'}`}>
              Risk Level: {riskLevel}
            </span>
            {s.cgpa && <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-emerald-400 font-semibold">CGPA {fmt(s.cgpa)}</span>}
            {s.backlogs !== undefined && (
              <span className={`text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-700 font-semibold ${s.backlogs > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                Backlogs: {s.backlogs}
              </span>
            )}
            {s.internshipsCompleted !== undefined && (
              <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-blue-400">
                Internships: {s.internshipsCompleted}
              </span>
            )}
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            ['overview',  'Overview',          '🏠'],
            ['skills',    'Skills & Scores',   '💡'],
            ['placement', 'Placement Readiness','🎯'],
            ['training',  'My Training',        '📚'],
          ] as [typeof activeTab, string, string][]).map(([t, l, icon]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-1.5 ${
                activeTab === t
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                  : 'text-slate-400 bg-slate-800/40 border-slate-700/40 hover:text-slate-200'
              }`}>
              <span>{icon}</span>{l}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard icon={TrendingUp}   label="Success Index"    val={fmt(si)}       sub="Overall performance"         color="border-indigo-500/20" />
              <KPICard icon={GraduationCap} label="CGPA"            val={fmt(s.cgpa)}   sub="Academic score"              color="border-emerald-500/20" />
              <KPICard icon={Activity}     label="Attendance"       val={`${s.attendance ?? '—'}%`}  sub="Current semester" color="border-blue-500/20" />
              <KPICard icon={Target}       label="Placement Ready"  val={fmt(pr)}       sub={`${pr >= 80 ? 'Ready!' : pr >= 65 ? 'Near ready' : 'Needs focus'}`} color="border-amber-500/20" />
            </div>

            {/* Academic subjects */}
            {(s.subjectScores ?? s.subjects ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />Academic Performance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(s.subjectScores ?? s.subjects ?? []).map((sub: any, i: number) => {
                    const score = sub.score ?? sub.marks ?? 0;
                    const color = score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{sub.name ?? sub.subject}</span>
                          <span className="font-bold text-slate-300">{score}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full">
                          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => setActiveTab('skills')}
                className="bg-[#0d1526] border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-4 text-left transition-all group">
                <div className="text-2xl mb-2">💡</div>
                <p className="text-sm font-semibold text-white">View Skills</p>
                <p className="text-xs text-slate-500 mt-1">Coding · Aptitude · Communication</p>
                <ChevronRight className="w-4 h-4 text-indigo-400 mt-3 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setActiveTab('placement')}
                className="bg-[#0d1526] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4 text-left transition-all group">
                <div className="text-2xl mb-2">🎯</div>
                <p className="text-sm font-semibold text-white">Placement Readiness</p>
                <p className="text-xs text-slate-500 mt-1">Your skill gaps and what to improve</p>
                <ChevronRight className="w-4 h-4 text-emerald-400 mt-3 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link href="/student/placement"
                className="bg-[#0d1526] border border-blue-500/20 hover:border-blue-500/40 rounded-2xl p-4 text-left transition-all group block">
                <div className="text-2xl mb-2">💼</div>
                <p className="text-sm font-semibold text-white">Job Opportunities</p>
                <p className="text-xs text-slate-500 mt-1">Personalized eligible jobs for you</p>
                <ChevronRight className="w-4 h-4 text-blue-400 mt-3 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button onClick={() => setActiveTab('training')}
                className="bg-[#0d1526] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-4 text-left transition-all group">
                <div className="text-2xl mb-2">📚</div>
                <p className="text-sm font-semibold text-white">Training Programs</p>
                <p className="text-xs text-slate-500 mt-1">Your enrolled training & progress</p>
                <ChevronRight className="w-4 h-4 text-amber-400 mt-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ── SKILLS ── */}
        {activeTab === 'skills' && (
          <div className="space-y-5">
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Your Skill Scores</h3>
              <div className="space-y-3">
                <SkillBar label="Coding / DSA"   val={s.codingScore ?? pl.codingScore ?? 50}       color="bg-indigo-500" />
                <SkillBar label="Aptitude"        val={s.aptitudeScore ?? pl.aptitudeScore ?? 50}    color="bg-amber-500" />
                <SkillBar label="Mock Interview"  val={s.mockInterviewScore ?? pl.mockInterviewScore ?? 50} color="bg-purple-500" />
                <SkillBar label="Communication"   val={(pl.skills?.communication) ?? 60}             color="bg-blue-500" />
                <SkillBar label="Problem Solving" val={(pl.skills?.problemSolving) ?? (s.aptitudeScore ?? 55)} color="bg-cyan-500" />
                <SkillBar label="Projects"        val={Math.min(100, (s.projectsCompleted ?? 0) * 20)} color="bg-emerald-500" />
              </div>

              {/* Score summary cards */}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800">
                {[
                  ['Coding',    s.codingScore ?? pl.codingScore, 'text-indigo-400'],
                  ['Aptitude',  s.aptitudeScore ?? pl.aptitudeScore, 'text-amber-400'],
                  ['Interview', s.mockInterviewScore ?? pl.mockInterviewScore, 'text-purple-400'],
                ].map(([l, v, c]: any) => (
                  <div key={l} className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${c}`}>{fmt(v) || '—'}</p>
                    <p className="text-[10px] text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What-If simulator link */}
            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/10 border border-indigo-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">What-If Simulator</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Curious what happens if you improve your coding score? Use the simulator to explore how improving specific skills would affect your placement readiness.
              </p>
              <Link href={`/simulator?student=${user?.userId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-all">
                <Zap className="w-4 h-4" />Open Simulator
              </Link>
            </div>
          </div>
        )}

        {/* ── PLACEMENT ── */}
        {activeTab === 'placement' && (
          <div className="space-y-5">
            {/* Readiness overview */}
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Placement Readiness</h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  pr >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' :
                  pr >= 65 ? 'text-blue-400 bg-blue-500/10 border-blue-500/25' :
                  pr >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25' :
                             'text-red-400 bg-red-500/10 border-red-500/25'
                }`}>
                  {pr >= 80 ? '✅ Placement Ready' : pr >= 65 ? '🔵 Near Ready' : pr >= 40 ? '⚠️ Needs Improvement' : '🔴 Critical'}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <RingMeter val={pr} size={96} label="Readiness Score" />
                <div className="flex-1 space-y-2 text-sm">
                  <p className="text-slate-400">Your current placement readiness score is <span className="text-white font-bold">{Math.round(pr)}/100</span>.</p>
                  <p className="text-slate-500 text-xs">
                    {pr >= 80 ? 'Great! You are ready for campus placements. Keep maintaining your skills.' :
                     pr >= 65 ? 'You are close to placement readiness. Focus on interview skills and coding practice.' :
                     pr >= 40 ? 'You need to improve your technical and aptitude scores to become placement ready.' :
                     'Significant improvement needed. Enroll in training programs and practice regularly.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Segment',    pl.placementSegmentLabel ?? pl.placementSegment ?? '—'],
                  ['Acad. Ready', fmt(pl.academicReadiness)],
                  ['Coding',     fmt(pl.codingScore)],
                  ['Interview',  fmt(pl.mockInterviewScore)],
                ].map(([l, v]) => (
                  <div key={l} className="bg-slate-900/40 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-white">{v}</p>
                    <p className="text-[10px] text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Skill gaps — student-friendly version (no SHAP values, no raw risk scores) */}
            {(pl.genericSkillGaps ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-amber-500/20 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />Areas to Improve
                </h3>
                <p className="text-xs text-slate-500 mb-4">Focus on these skills to improve your placement readiness:</p>
                <div className="space-y-3">
                  {(pl.genericSkillGaps ?? []).slice(0, 4).map((g: any, i: number) => {
                    const LABELS: Record<string,string> = { python:'Python', java:'Java', dsa:'DSA / Coding', sql:'SQL', communication:'Communication', problemSolving:'Problem Solving', git:'Git', cloud:'Cloud' };
                    const score = g.studentScore ?? 0;
                    return (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${score < 40 ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{LABELS[g.skill] ?? g.skill}</p>
                          <p className="text-[10px] text-slate-500">Your score: {Math.round(score)} · Target: 75+</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${score < 40 ? 'text-red-400' : 'text-amber-400'}`}>{Math.round(score)}</p>
                          <p className="text-[9px] text-slate-600">/ 100</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                  <p className="text-xs text-indigo-300 font-medium mb-1">💡 Tip</p>
                  <p className="text-xs text-slate-400">Focus on your top weakness first — even a 10-point improvement in your weakest area can significantly boost your placement readiness.</p>
                  <button onClick={() => setActiveTab('training')} className="mt-2 text-xs text-indigo-400 hover:underline flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />View my training programs →
                  </button>
                </div>
              </div>
            )}

            {/* Placement history */}
            {(pl.placementOutcomes ?? []).length > 0 && (
              <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />Placement Applications
                </h3>
                <div className="space-y-2">
                  {pl.placementOutcomes.map((o: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{o.jobRole ?? o.companyId ?? 'Company'}</p>
                        <p className="text-[10px] text-slate-500">{o.applicationStatus}</p>
                      </div>
                      {o.offerReceived && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Offer ✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRAINING ── */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />My Training Programs
              </h3>

              {/* From placement assignments */}
              {(pl.trainingAssignments ?? []).length > 0 ? (
                <div className="space-y-3">
                  {(pl.trainingAssignments ?? []).map((t: any, i: number) => (
                    <div key={i} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{t.trainingId}</p>
                          <p className="text-[10px] text-slate-500">Assigned by Placement Coordinator</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          t.status === 'COMPLETED'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                            : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                        }`}>{t.status}</span>
                      </div>
                      {(t.progress ?? 0) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>Progress</span><span>{t.progress}%</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${t.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-600">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No training programs assigned yet.</p>
                  <p className="text-xs mt-1">Your placement coordinator will assign relevant programs based on your skill gaps.</p>
                </div>
              )}
            </div>

            {/* Available programs */}
            {trainings.filter(t => t.status === 'ACTIVE' || t.status === 'UPCOMING').length > 0 && (
              <div className="bg-[#0d1526] border border-emerald-500/15 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-emerald-400" />Available Programs
                </h3>
                <div className="space-y-2">
                  {trainings.filter(t => t.status === 'ACTIVE' || t.status === 'UPCOMING').slice(0, 5).map((t: any) => (
                    <div key={t.trainingId} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/40">
                      <div className="text-xl">{
                        t.category?.includes('DSA') ? '⌨️' :
                        t.category?.includes('Aptitude') ? '🧠' :
                        t.category?.includes('Mock') ? '🎯' :
                        t.category?.includes('Communication') ? '🗣️' : '📚'
                      }</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-500">{t.category} {t.duration ? `· ${t.duration}` : ''}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        t.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                      }`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
