'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState, useCallback } from 'react';
import {
  getJobs, publishJob, closeJob, deleteJob, previewJobEligibility,
  getJobMatches, recalculateJobMatches
} from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Building2, Plus, Search, Loader2, ChevronRight, Eye, EyeOff,
  CheckCircle, Clock, XCircle, Archive, RefreshCw, BarChart3,
  Briefcase, MapPin, Calendar, DollarSign, Users, AlertTriangle,
  Star, ChevronDown, Filter, Edit, Trash2, Play, StopCircle, X
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:              { label: 'Draft',            color: 'text-slate-400 bg-slate-800 border-slate-700',          dot: 'bg-slate-500' },
  PENDING_REVIEW:     { label: 'Pending Review',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',    dot: 'bg-amber-400' },
  PUBLISHED:          { label: 'Published',        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' },
  APPLICATION_OPEN:   { label: 'Open',             color: 'text-blue-400 bg-blue-500/10 border-blue-500/25',       dot: 'bg-blue-400' },
  APPLICATION_CLOSED: { label: 'Closed',           color: 'text-orange-400 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400' },
  DRIVE_COMPLETED:    { label: 'Drive Completed',  color: 'text-violet-400 bg-violet-500/10 border-violet-500/25', dot: 'bg-violet-400' },
  CANCELLED:          { label: 'Cancelled',        color: 'text-red-400 bg-red-500/10 border-red-500/25',          dot: 'bg-red-400' },
  ARCHIVED:           { label: 'Archived',         color: 'text-slate-500 bg-slate-900 border-slate-800',          dot: 'bg-slate-600' },
};

const TYPE_META: Record<string, { label: string; icon: string }> = {
  ON_CAMPUS_DRIVE:       { label: 'On-Campus Drive',    icon: '🏢' },
  OFF_CAMPUS_DRIVE:      { label: 'Off-Campus Drive',   icon: '🌍' },
  ONLINE_JOB:            { label: 'Online Job',          icon: '💻' },
  REFERRAL:              { label: 'Referral',            icon: '🤝' },
  INTERNSHIP:            { label: 'Internship',          icon: '📚' },
  FULL_TIME:             { label: 'Full-Time',           icon: '💼' },
  INTERNSHIP_TO_FULL_TIME:{ label: 'Intern→Full-Time', icon: '📈' },
};

const MATCH_CAT_COLOR: Record<string, string> = {
  EXCELLENT_MATCH: 'text-emerald-400',
  GOOD_MATCH:      'text-blue-400',
  POTENTIAL_MATCH: 'text-amber-400',
  SKILL_GAP:       'text-orange-400',
  NOT_ELIGIBLE:    'text-red-400',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: 'text-slate-400 bg-slate-800 border-slate-700', dot: 'bg-slate-500' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold', m.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}

function MatchMini({ stats }: { stats: any }) {
  if (!stats) return <span className="text-xs text-slate-600">Not calculated</span>;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-emerald-400 font-semibold">{stats.eligible ?? 0} eligible</span>
      <span className="text-slate-600">·</span>
      <span className="text-blue-400">{stats.excellentMatch ?? 0} excellent</span>
      <span className="text-slate-600">·</span>
      <span className="text-slate-500">{stats.notEligible ?? 0} ineligible</span>
    </div>
  );
}

// ── Eligibility Preview Modal ─────────────────────────────────────────────────
function EligibilityPreviewModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    previewJobEligibility(jobId)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Eligibility Preview</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : !data ? (
            <p className="text-slate-500 text-sm text-center py-8">Could not load preview</p>
          ) : (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Evaluated', val: data.analytics?.total ?? 0,      color: 'text-white' },
                  { label: 'Eligible',        val: data.analytics?.eligible ?? 0,   color: 'text-emerald-400' },
                  { label: 'Not Eligible',    val: data.analytics?.notEligible ?? 0,color: 'text-red-400' },
                  { label: 'Excellent Match', val: data.analytics?.excellentMatch ?? 0, color: 'text-blue-400' },
                ].map(k => (
                  <div key={k.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className={cn('text-2xl font-bold', k.color)}>{k.val}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Fail reason breakdown */}
              {data.analytics?.failReasonCounts && Object.keys(data.analytics.failReasonCounts).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Exclusion Reasons</p>
                  <div className="space-y-1.5">
                    {Object.entries(data.analytics.failReasonCounts).sort((a: any, b: any) => b[1] - a[1]).map(([rule, cnt]: any) => (
                      <div key={rule} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-48 truncate">{rule.replace(/_/g,' ')}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                          <div className="h-full rounded-full bg-red-500/60" style={{ width: `${Math.min(100, (cnt / (data.analytics?.total||1))*100)}%` }} />
                        </div>
                        <span className="text-xs text-red-400 font-semibold w-6 text-right">{cnt}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">Note: one student may fail multiple rules</p>
                </div>
              )}

              {/* Stream breakdown */}
              {data.analytics?.streamBreakdown && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Eligible by Stream</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.analytics.streamBreakdown).map(([stream, cnt]: any) => (
                      <span key={stream} className="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/25 rounded-lg px-2 py-1">
                        {stream}: {cnt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top eligible students */}
              {data.eligibleStudents?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Top Eligible Students (by match score)</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {data.eligibleStudents.slice(0, 10).map((s: any) => (
                      <div key={s.studentId} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs font-medium text-slate-200">{s.name ?? s.studentId}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{s.streamCode ?? s.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-bold', MATCH_CAT_COLOR[s.matchCategory ?? ''])}>{s.overallMatchScore?.toFixed(0) ?? '—'}</span>
                          <span className="text-[10px] text-slate-600">{s.matchCategory?.replace(/_/g,' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobBoardPage() {
  const [jobs, setJobs]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL')   params.opportunityType = typeFilter;
      const res = await getJobs(params);
      setJobs(res.jobs ?? []);
    } finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await publishJob(jobId);
      showToast('Job published successfully — eligibility matches calculated.');
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail ?? 'Publish failed', 'err');
    } finally { setActionLoading(null); }
  };

  const handleClose = async (jobId: string) => {
    setActionLoading(jobId);
    try { await closeJob(jobId); showToast('Job closed.'); await load(); }
    catch { showToast('Action failed', 'err'); }
    finally { setActionLoading(null); }
  };

  const handleRecalculate = async (jobId: string) => {
    setActionLoading(jobId + '-calc');
    try { await recalculateJobMatches(jobId); showToast('Matches recalculated.'); await load(); }
    catch { showToast('Recalculation failed', 'err'); }
    finally { setActionLoading(null); }
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return !q || j.jobTitle?.toLowerCase().includes(q) || j.companyName?.toLowerCase().includes(q);
  });

  const kpis = {
    total: jobs.length,
    published: jobs.filter(j => ['PUBLISHED','APPLICATION_OPEN'].includes(j.status)).length,
    draft: jobs.filter(j => j.status === 'DRAFT').length,
    closed: jobs.filter(j => ['APPLICATION_CLOSED','DRIVE_COMPLETED'].includes(j.status)).length,
  };

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl border transition-all',
          toast.type === 'ok'
            ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
            : 'bg-red-900/90 border-red-500/30 text-red-300'
        )}>
          {toast.type === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Eligibility Preview Modal */}
      {previewJobId && (
        <EligibilityPreviewModal jobId={previewJobId} onClose={() => setPreviewJobId(null)} />
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Job Opportunities</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage placement opportunities and eligibility</p>
          </div>
          <Link
            href="/placement/jobs/create"
            id="create-job-btn"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> Post Opportunity
          </Link>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Jobs', val: kpis.total,     color: 'border-slate-700/50', icon: Briefcase },
            { label: 'Live / Published', val: kpis.published, color: 'border-emerald-500/25', icon: CheckCircle },
            { label: 'Drafts', val: kpis.draft,         color: 'border-amber-500/25', icon: Clock },
            { label: 'Closed / Completed', val: kpis.closed, color: 'border-slate-700/50', icon: Archive },
          ].map(k => (
            <div key={k.label} className={cn('bg-[#0d1526] border rounded-2xl p-4', k.color)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{k.label}</p>
                <k.icon className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-white">{k.val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs or companies..."
              className="w-full bg-[#0d1526] border border-slate-700/50 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50">
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50">
            <option value="ALL">All Types</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} className="p-2 border border-slate-700/50 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Job Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
            <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No job opportunities found</p>
            <Link href="/placement/jobs/create" className="text-indigo-400 text-xs mt-2 inline-block hover:text-indigo-300">
              Post your first opportunity →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => {
              const sm = STATUS_META[job.status] ?? STATUS_META.DRAFT;
              const tm = TYPE_META[job.opportunityType] ?? { label: job.opportunityType, icon: '💼' };
              const isLive = ['PUBLISHED','APPLICATION_OPEN'].includes(job.status);
              const isDraft = job.status === 'DRAFT';
              const acting = actionLoading === job.jobId;

              return (
                <div key={job.jobId} className="bg-[#0d1526] border border-slate-700/50 rounded-2xl p-4 hover:border-indigo-500/30 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm">{tm.icon}</span>
                        <h3 className="text-sm font-bold text-white">{job.jobTitle}</h3>
                        <StatusBadge status={job.status} />
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {tm.label}
                        </span>
                      </div>

                      {/* Company & meta */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {job.companyName}
                        </span>
                        {job.jobLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {job.jobLocation}
                          </span>
                        )}
                        {job.salaryDisplay && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> {job.salaryDisplay}
                          </span>
                        )}
                        {job.applicationDeadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Deadline: {new Date(job.applicationDeadline).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Eligibility summary */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.eligibility?.streams?.slice(0,5).map((s: string) => (
                          <span key={s} className="text-[10px] bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 rounded px-1.5 py-0.5">{s}</span>
                        ))}
                        {job.eligibility?.graduationYears?.map((y: number) => (
                          <span key={y} className="text-[10px] bg-violet-600/15 text-violet-300 border border-violet-500/20 rounded px-1.5 py-0.5">Batch {y}</span>
                        ))}
                        {job.eligibility?.academics?.cgpa?.minimum && (
                          <span className="text-[10px] bg-amber-600/15 text-amber-300 border border-amber-500/20 rounded px-1.5 py-0.5">CGPA ≥ {job.eligibility.academics.cgpa.minimum}</span>
                        )}
                        {job.eligibility?.arrears?.historyRule === 'NO_HISTORY' && (
                          <span className="text-[10px] bg-red-600/15 text-red-300 border border-red-500/20 rounded px-1.5 py-0.5">No Arrears</span>
                        )}
                      </div>

                      {/* Match stats */}
                      {job.matchStats && (
                        <div className="mt-2">
                          <MatchMini stats={job.matchStats} />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Preview eligibility */}
                      <button
                        id={`preview-${job.jobId}`}
                        onClick={() => setPreviewJobId(job.jobId)}
                        title="Preview eligible students"
                        className="p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all text-[10px]"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>

                      {/* Recalculate matches */}
                      {isLive && (
                        <button
                          id={`recalc-${job.jobId}`}
                          onClick={() => handleRecalculate(job.jobId)}
                          disabled={actionLoading === job.jobId + '-calc'}
                          title="Recalculate matches"
                          className="p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all"
                        >
                          <RefreshCw className={cn('w-3.5 h-3.5', actionLoading === job.jobId+'-calc' && 'animate-spin')} />
                        </button>
                      )}

                      {/* Edit */}
                      <Link
                        id={`edit-${job.jobId}`}
                        href={`/placement/jobs/${job.jobId}/edit`}
                        className="p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>

                      {/* Publish / Close */}
                      {isDraft && (
                        <button
                          id={`publish-${job.jobId}`}
                          onClick={() => handlePublish(job.jobId)}
                          disabled={acting}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium transition-all disabled:opacity-50"
                        >
                          {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          Publish
                        </button>
                      )}
                      {isLive && (
                        <button
                          id={`close-${job.jobId}`}
                          onClick={() => handleClose(job.jobId)}
                          disabled={acting}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-300 hover:bg-orange-600/30 text-xs font-medium transition-all disabled:opacity-50"
                        >
                          <StopCircle className="w-3 h-3" /> Close
                        </button>
                      )}

                      {/* View details */}
                      <Link
                        id={`view-${job.jobId}`}
                        href={`/placement/jobs/${job.jobId}`}
                        className="p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
