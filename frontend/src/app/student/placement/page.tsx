'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  getStudentJobs, getStudentApplications, getStudentPlacementProfile,
  applyToJob, updateStudentSkills, updateStudentInterests
} from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Briefcase, Target, Star, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Building2, MapPin, DollarSign, Calendar, Zap, Award,
  BookOpen, TrendingUp, Users, Loader2, Eye, Send, RefreshCw, X,
  Plus, ThumbsUp, ThumbsDown, Info, BarChart3, GraduationCap
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MATCH_CAT_META: Record<string, { label: string; color: string; bg: string }> = {
  EXCELLENT_MATCH: { label: 'Excellent Match', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  GOOD_MATCH:      { label: 'Good Match',      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/25' },
  POTENTIAL_MATCH: { label: 'Potential',        color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25' },
  SKILL_GAP:       { label: 'Skill Gap',        color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' },
  NOT_ELIGIBLE:    { label: 'Not Eligible',     color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25' },
};

const APP_STATUS_META: Record<string, { label: string; color: string }> = {
  INTERESTED:      { label: 'Interested',       color: 'text-blue-400' },
  APPLIED:         { label: 'Applied',          color: 'text-indigo-400' },
  ASSESSMENT:      { label: 'Assessment',       color: 'text-amber-400' },
  SHORTLISTED:     { label: 'Shortlisted',      color: 'text-emerald-400' },
  INTERVIEW:       { label: 'Interview',        color: 'text-violet-400' },
  SELECTED:        { label: '🎉 Selected!',      color: 'text-emerald-300 font-bold' },
  REJECTED:        { label: 'Not Proceeding',   color: 'text-red-400' },
  WITHDRAWN:       { label: 'Withdrawn',        color: 'text-slate-400' },
  OFFER_RECEIVED:  { label: '🎊 Offer Received!',color: 'text-emerald-300 font-bold' },
  JOINED:          { label: '✅ Joined',         color: 'text-emerald-300 font-bold' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function MatchScore({ score, category }: { score: number; category: string }) {
  const m = MATCH_CAT_META[category] ?? MATCH_CAT_META.SKILL_GAP;
  return (
    <div className={cn('flex flex-col items-center px-3 py-2 rounded-xl border text-center', m.bg)}>
      <span className={cn('text-lg font-bold', m.color)}>{Math.round(score)}</span>
      <span className="text-[9px] font-semibold text-slate-500 mt-0.5">{m.label}</span>
    </div>
  );
}

function SkillTag({ name, matched, type }: { name: string; matched: boolean; type: 'MANDATORY'|'PREFERRED' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium',
      matched
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
        : type === 'MANDATORY'
          ? 'bg-red-500/10 border-red-500/25 text-red-300'
          : 'bg-slate-700 border-slate-600 text-slate-400'
    )}>
      {matched ? '✓' : '✗'} {name}
      {type === 'MANDATORY' && !matched && <span className="text-red-400">*</span>}
    </span>
  );
}

// ── Job Application Modal ──────────────────────────────────────────────────────
function ApplyModal({ job, match, onClose, onApplied }: {
  job: any; match: any; onClose: () => void; onApplied: () => void
}) {
  const [notes, setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const handleApply = async () => {
    setLoading(true); setError('');
    try {
      await applyToJob(job.jobId, notes);
      setDone(true);
      setTimeout(() => { onApplied(); onClose(); }, 1800);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Application failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Apply — {job.jobTitle}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Application Submitted!</p>
              <p className="text-xs text-slate-500 mt-1">Track your status in the Applications tab</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{job.companyName}</p>
                    <p className="text-xs text-slate-500">{job.jobRole} · {job.jobLocation}</p>
                  </div>
                  {match && <MatchScore score={match.overallMatchScore ?? 0} category={match.matchCategory ?? ''} />}
                </div>
                {job.salaryDisplay && (
                  <p className="text-xs text-emerald-400">💰 {job.salaryDisplay}</p>
                )}
              </div>

              {match?.missingMandatorySkills?.length > 0 && (
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-400 font-medium mb-1">⚠️ Note: You are missing some mandatory skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {match.missingMandatorySkills.map((s: string) => (
                      <span key={s} className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded px-1.5 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Notes (optional)</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a note about why you're interested in this role..."
                  className="w-full bg-[#0a1020] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              {job.applicationUrl && (
                <p className="text-[10px] text-slate-500">
                  Note: You'll also need to apply at: <a href={job.applicationUrl} target="_blank" className="text-indigo-400 hover:underline">{job.applicationUrl}</a>
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
                <button
                  id="confirm-apply-btn"
                  onClick={handleApply} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Confirm Application
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ entry, onApply }: { entry: any; onApply: (job: any, match: any) => void }) {
  const { job, match } = entry;
  const [expanded, setExpanded] = useState(false);
  const alreadyApplied = match?.alreadyApplied;
  const isEligible = match?.eligibilityStatus === 'PASS';
  const isUnknown  = match?.eligibilityStatus === 'ELIGIBILITY_UNKNOWN';

  const deadlineDays = job.applicationDeadline
    ? Math.ceil((new Date(job.applicationDeadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={cn(
      'bg-[#0d1526] border rounded-2xl overflow-hidden transition-all',
      isEligible ? 'border-slate-700/50 hover:border-indigo-500/30' : 'border-slate-800/50 opacity-80'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-white">{job.jobTitle}</h3>
              {entry.isPotentialOpportunity && (
                <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-full px-2 py-0.5">
                  💡 Potential (skill gap)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.companyName}</span>
              {job.jobLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.jobLocation}</span>}
              {job.salaryDisplay && <span className="flex items-center gap-1 text-emerald-400"><DollarSign className="w-3 h-3" />{job.salaryDisplay}</span>}
              {job.workMode && <span className="text-slate-600">{job.workMode}</span>}
            </div>
          </div>

          <div className="flex-shrink-0">
            {isEligible && match ? (
              <MatchScore score={match.overallMatchScore ?? 0} category={match.matchCategory ?? ''} />
            ) : isUnknown ? (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 text-center">
                <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />
                <span className="text-[9px] text-amber-400 font-semibold mt-0.5 block">Unknown</span>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2 text-center">
                <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                <span className="text-[9px] text-red-400 font-semibold mt-0.5 block">Not Eligible</span>
              </div>
            )}
          </div>
        </div>

        {/* Deadline */}
        {deadlineDays !== null && deadlineDays >= 0 && (
          <div className={cn('mt-2 text-[10px] flex items-center gap-1',
            deadlineDays <= 3 ? 'text-red-400' : deadlineDays <= 7 ? 'text-amber-400' : 'text-slate-500'
          )}>
            <Calendar className="w-3 h-3" />
            {deadlineDays === 0 ? 'Closes today' : `${deadlineDays} days left to apply`}
          </div>
        )}

        {/* Skills preview */}
        {isEligible && match && (
          <div className="mt-3 flex flex-wrap gap-1">
            {match.matchedMandatorySkills?.map((s: string) => (
              <SkillTag key={s} name={s} matched={true} type="MANDATORY" />
            ))}
            {match.missingMandatorySkills?.map((s: string) => (
              <SkillTag key={s} name={s} matched={false} type="MANDATORY" />
            ))}
            {match.matchedPreferredSkills?.slice(0,3).map((s: string) => (
              <SkillTag key={s} name={s} matched={true} type="PREFERRED" />
            ))}
          </div>
        )}

        {/* Eligibility fail reasons */}
        {!isEligible && !isUnknown && match?.eligibilityFailReasons?.length > 0 && (
          <div className="mt-3 space-y-1">
            {match.eligibilityFailReasons.slice(0,3).map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-red-400">
                <XCircle className="w-3 h-3 flex-shrink-0" />
                <span>{r.rule?.replace(/_/g,' ')}: required {r.required}, you have {r.actual}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expand / Action row */}
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
            <Eye className="w-3 h-3" /> {expanded ? 'Less' : 'More details'}
          </button>
          <div className="flex items-center gap-2">
            {alreadyApplied ? (
              <span className="flex items-center gap-1 text-xs text-indigo-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Applied
              </span>
            ) : isEligible ? (
              <button
                id={`apply-${job.jobId}`}
                onClick={() => onApply(job, match)}
                className="flex items-center gap-1.5 text-xs bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 px-3 py-1.5 rounded-lg font-medium transition-all"
              >
                <Send className="w-3 h-3" /> Apply Now
              </button>
            ) : null}
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            {job.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{job.description}</p>
            )}

            {match?.explanationPoints?.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Why this match?</p>
                <ul className="space-y-0.5">
                  {match.explanationPoints.map((pt: string, i: number) => (
                    <li key={i} className={cn('text-[10px] flex items-start gap-1.5',
                      pt.startsWith('✓') ? 'text-emerald-400' : pt.startsWith('✗') ? 'text-red-400' : 'text-slate-400'
                    )}>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {match?.learningInterestSignal?.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Your learning interests align:</p>
                <div className="flex flex-wrap gap-1">
                  {match.learningInterestSignal.map((s: string) => (
                    <span key={s} className="text-[10px] bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded px-1.5 py-0.5">
                      📚 {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.selectionProcess?.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Selection Process</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.selectionProcess.map((s: string, i: number) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded px-2 py-0.5">
                      {i+1}. {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentPlacementPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [tab, setTab]               = useState<'jobs'|'applied'|'profile'>('jobs');
  const [jobView, setJobView]       = useState<'recommended'|'eligible'|'potential'>('recommended');
  const [entries, setEntries]       = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [applyTarget, setApplyTarget] = useState<{ job: any; match: any } | null>(null);

  // Redirect non-students
  useEffect(() => {
    if (user && user.role !== 'STUDENT') router.replace('/placement');
  }, [user, router]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudentJobs(jobView);
      setEntries(res.jobs ?? []);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, [jobView]);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudentApplications();
      setApplications(res.applications ?? []);
    } catch { setApplications([]); }
    finally { setLoading(false); }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudentPlacementProfile();
      setProfile(res);
    } catch { setProfile(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'jobs')    loadJobs();
    if (tab === 'applied') loadApplications();
    if (tab === 'profile') loadProfile();
  }, [tab, loadJobs, loadApplications, loadProfile]);

  if (!user || user.role !== 'STUDENT') return null;

  const eligibleCount = entries.filter(e => e.match?.eligibilityStatus === 'PASS' && !e.isPotentialOpportunity).length;
  const potentialCount = entries.filter(e => e.isPotentialOpportunity).length;

  const TAB_ITEMS = [
    { id:'jobs',    label:'Job Recommendations', icon: Briefcase },
    { id:'applied', label:`Applications (${applications.length})`, icon: Send },
    { id:'profile', label:'Placement Profile',  icon: GraduationCap },
  ];

  return (
    <AppLayout>
      {applyTarget && (
        <ApplyModal
          job={applyTarget.job}
          match={applyTarget.match}
          onClose={() => setApplyTarget(null)}
          onApplied={loadJobs}
        />
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">My Placement</h1>
          <p className="text-xs text-slate-500 mt-0.5">Personalized opportunities based on your verified academic profile</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/40">
          {TAB_ITEMS.map(t => (
            <button key={t.id} id={`tab-${t.id}`} onClick={() => setTab(t.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Jobs Tab ─────────────────────────────────────────────────────── */}
        {tab === 'jobs' && (
          <div className="space-y-4">
            {/* View selector */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {([
                  { id:'recommended', label:`Recommended (${eligibleCount})` },
                  { id:'eligible',    label:'All Eligible' },
                  { id:'potential',   label:`Potential (${potentialCount})` },
                ] as const).map(v => (
                  <button key={v.id} onClick={() => setJobView(v.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      jobView === v.id
                        ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-300'
                    )}>
                    {v.label}
                  </button>
                ))}
              </div>
              <button onClick={loadJobs} className="p-1.5 text-slate-500 hover:text-slate-300 border border-slate-700/50 rounded-lg transition-all">
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>

            {/* Potential opportunity explanation */}
            {jobView === 'potential' && (
              <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400/80">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Potential Opportunities</strong> are jobs where you have learning interests in the required skills,
                  but haven't yet demonstrated verified proficiency. These are shown for your training goals — you are not currently
                  eligible to apply for them. Update your skills after completing training.
                </span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
                <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No opportunities in this view</p>
                {jobView === 'recommended' && (
                  <p className="text-slate-600 text-xs mt-2 max-w-sm mx-auto">
                    No published jobs match your verified academic profile right now. Eligibility is calculated by the backend using your verified records.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry: any) => (
                  <JobCard
                    key={entry.job?.jobId}
                    entry={entry}
                    onApply={(job, match) => setApplyTarget({ job, match })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Applications Tab ─────────────────────────────────────────────── */}
        {tab === 'applied' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : applications.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
                <Send className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No applications yet</p>
                <button onClick={() => setTab('jobs')} className="text-indigo-400 text-xs mt-2 hover:text-indigo-300">
                  Browse opportunities →
                </button>
              </div>
            ) : (
              applications.map((app: any) => {
                const sm = APP_STATUS_META[app.status] ?? { label: app.status, color: 'text-slate-400' };
                return (
                  <div key={app.applicationId} className="bg-[#0d1526] border border-slate-700/50 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{app.jobTitle}</p>
                        <p className="text-xs text-slate-500">{app.companyName}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn('text-xs font-semibold', sm.color)}>{sm.label}</span>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Status timeline */}
                    <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
                      {['APPLIED','ASSESSMENT','SHORTLISTED','INTERVIEW','SELECTED'].map((s, i, arr) => {
                        const statuses = ['APPLIED','ASSESSMENT','SHORTLISTED','INTERVIEW','SELECTED','OFFER_RECEIVED','JOINED'];
                        const currentIdx = statuses.indexOf(app.status);
                        const stepIdx    = statuses.indexOf(s);
                        const isPast    = stepIdx <= currentIdx;
                        const isCurrent = s === app.status;
                        return (
                          <div key={s} className="flex items-center gap-1 flex-shrink-0">
                            <div className={cn(
                              'w-2 h-2 rounded-full border transition-all',
                              isCurrent ? 'border-indigo-400 bg-indigo-400' : isPast ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700 bg-transparent'
                            )} />
                            <span className={cn('text-[9px]', isPast ? 'text-slate-400' : 'text-slate-700')}>{s}</span>
                            {i < arr.length - 1 && <div className={cn('w-4 h-px', isPast ? 'bg-emerald-700' : 'bg-slate-800')} />}
                          </div>
                        );
                      })}
                    </div>

                    {app.notes && <p className="mt-2 text-[10px] text-slate-500 italic">"{app.notes}"</p>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Profile Tab ──────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : !profile ? (
              <p className="text-slate-500 text-sm text-center py-12">Could not load placement profile</p>
            ) : (
              <>
                {/* Readiness */}
                <div className="bg-[#0d1526] border border-slate-700/50 rounded-2xl p-5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Placement Readiness</p>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="7" />
                        <circle cx="40" cy="40" r="32" fill="none"
                          stroke={profile.placementReadiness >= 80 ? '#10b981' : profile.placementReadiness >= 65 ? '#3b82f6' : profile.placementReadiness >= 40 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="7"
                          strokeDasharray={`${2*Math.PI*32}`}
                          strokeDashoffset={`${2*Math.PI*32*(1-Math.min(100,profile.placementReadiness??0)/100)}`}
                          strokeLinecap="round" className="transition-all duration-700" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{Math.round(profile.placementReadiness??0)}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {profile.placementBreakdown && Object.entries(profile.placementBreakdown).map(([k, v]: any) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-32 truncate">{k.replace(/([A-Z])/g,' $1').trim()}</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, v)}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{Math.round(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Academic snapshot */}
                <div className="bg-[#0d1526] border border-slate-700/50 rounded-2xl p-5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Academic Profile (verified)</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'CGPA', val: profile.cgpa ?? '—' },
                      { label: '10th %', val: profile.tenthPercentage != null ? `${profile.tenthPercentage}%` : '—' },
                      { label: '12th %', val: profile.twelfthPercentage != null ? `${profile.twelfthPercentage}%` : '—' },
                      { label: 'Current Arrears', val: profile.currentArrears ?? '—' },
                      { label: 'Historical Arrears', val: profile.historicalArrears ?? '—' },
                      { label: 'Graduation Year', val: profile.graduationYear ?? '—' },
                    ].map(k => (
                      <div key={k.label} className="bg-slate-800/40 rounded-xl py-3">
                        <p className="text-base font-bold text-white">{k.val}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{k.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-3">
                    ⚠️ Eligibility is always calculated from your verified backend records. Frontend values are display only.
                  </p>
                </div>

                {/* Skills */}
                {profile.studentSkills?.length > 0 && (
                  <div className="bg-[#0d1526] border border-slate-700/50 rounded-2xl p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Verified Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.studentSkills.map((sk: any) => (
                        <div key={sk.skillName} className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs',
                          sk.verified
                            ? 'bg-emerald-600/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        )}>
                          {sk.verified && <CheckCircle className="w-3 h-3" />}
                          <span className="font-medium">{sk.skillName}</span>
                          <span className="text-[9px] opacity-60">{sk.proficiencyScore}/100</span>
                          <span className={cn('text-[8px] px-1 py-0.5 rounded', sk.verified ? 'text-emerald-400' : 'text-slate-500')}>{sk.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learning interests */}
                {profile.learningInterests?.length > 0 && (
                  <div className="bg-[#0d1526] border border-slate-700/50 rounded-2xl p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Learning Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.learningInterests.map((li: any) => (
                        <span key={li.skillName} className="text-xs bg-violet-600/15 text-violet-300 border border-violet-500/20 rounded-lg px-2.5 py-1">
                          📚 {li.skillName}
                          {li.interestLevel && <span className="ml-1 text-[9px] opacity-60">({li.interestLevel})</span>}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">
                      Note: Learning interests inform potential opportunity recommendations but never override hard eligibility.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
