'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createJob, extractJD, getStreams } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Building2, Briefcase, MapPin, DollarSign, Calendar, Users, ChevronLeft,
  Plus, X, Loader2, Zap, CheckCircle, AlertCircle, Eye, Save,
  GraduationCap, Award, BookOpen, Target
} from 'lucide-react';

// ── Stream catalog (mirror of backend) ────────────────────────────────────────
const CS_STREAMS    = ['CSE','IT','AIDS','AIML','CSBS','CYBER'];
const CORE_STREAMS  = ['EEE','ECE','MECH','CIVIL','MECHATRONICS'];
const ALL_STREAMS   = [...CS_STREAMS, ...CORE_STREAMS];

const OPPORTUNITY_TYPES = [
  { value:'ON_CAMPUS_DRIVE',        label:'On-Campus Drive',    icon:'🏢' },
  { value:'OFF_CAMPUS_DRIVE',       label:'Off-Campus Drive',   icon:'🌍' },
  { value:'ONLINE_JOB',             label:'Online Job',         icon:'💻' },
  { value:'REFERRAL',               label:'Referral',           icon:'🤝' },
  { value:'INTERNSHIP',             label:'Internship',         icon:'📚' },
  { value:'FULL_TIME',              label:'Full-Time',          icon:'💼' },
  { value:'INTERNSHIP_TO_FULL_TIME',label:'Intern → Full-Time', icon:'📈' },
];
const SOURCES = [
  'COLLEGE_PLACEMENT_TEAM','COMPANY_RECRUITMENT_TEAM','COMPANY_CAREER_WEBSITE',
  'EXTERNAL_JOB_PORTAL','LINKEDIN','REFERRAL','OTHER',
];
const WORK_MODES = ['ONSITE','REMOTE','HYBRID'];
const EMP_TYPES  = ['FULL_TIME','INTERNSHIP','PART_TIME','CONTRACT'];

const POPULAR_SKILLS = [
  'Java','Python','JavaScript','C++','SQL','DSA','React','NodeJS','Spring Boot',
  'Git','Docker','AWS','Azure','Machine Learning','Communication','Aptitude','TypeScript',
];

const HISTORY_RULES  = [
  { value:'NO_HISTORY',       label:'No historical arrears allowed' },
  { value:'HISTORY_ALLOWED',  label:'Historical arrears allowed' },
];
const CURRENT_RULES  = [
  { value:'NO_CURRENT',              label:'No current arrears allowed' },
  { value:'CURRENT_ARREARS_ALLOWED', label:'Current arrears allowed' },
];

// ── Field helpers ──────────────────────────────────────────────────────────────
const FLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs text-slate-400 font-medium mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);
const FInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(
    'w-full bg-[#0a1020] border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all',
    props.className
  )} />
);
const FTextarea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className="w-full bg-[#0a1020] border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none" />
);
const FSelect = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className="w-full bg-[#0a1020] border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-all" />
);

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="bg-[#0d1526] border border-slate-700/50 rounded-2xl overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
      <Icon className="w-4 h-4 text-indigo-400" />
      <h2 className="text-sm font-bold text-white">{title}</h2>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
interface SkillEntry { skillName: string; type: 'MANDATORY' | 'PREFERRED'; }

const CURRENT_YEAR = new Date().getFullYear();
const BATCH_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR+1, CURRENT_YEAR+2];

export default function CreateJobPage() {
  const router = useRouter();

  // ── Form state ─────────────────────────────────────────────────────────────
  // Company
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  // Opportunity
  const [oppType, setOppType]   = useState('ON_CAMPUS_DRIVE');
  const [source, setSource]     = useState('COLLEGE_PLACEMENT_TEAM');
  const [jobTitle, setJobTitle] = useState('');
  const [jobRole, setJobRole]   = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [selectionProcess, setSelectionProcess] = useState<string[]>(['']);

  // Location & type
  const [jobLocation, setJobLocation] = useState('');
  const [workMode, setWorkMode]       = useState('ONSITE');
  const [empType, setEmpType]         = useState('FULL_TIME');

  // Salary
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryDisplay, setSalaryDisplay] = useState('');

  // Dates
  const [deadline, setDeadline]   = useState('');
  const [driveDate, setDriveDate] = useState('');
  const [appUrl, setAppUrl]       = useState('');
  const [appMethod, setAppMethod] = useState('ONLINE_FORM');

  // Eligibility
  const [gradYears, setGradYears] = useState<number[]>([]);
  const [degrees, setDegrees]     = useState<string[]>(['BE', 'BTECH']);
  const [streams, setStreams]      = useState<string[]>([]);
  const [anyStream, setAnyStream]  = useState(false);

  const [tenthReq, setTenthReq]   = useState(false);
  const [tenthMin, setTenthMin]   = useState('');
  const [twelfthReq, setTwelfthReq] = useState(false);
  const [twelfthMin, setTwelfthMin] = useState('');
  const [cgpaReq, setCgpaReq]     = useState(false);
  const [cgpaMin, setCgpaMin]     = useState('');
  const [dipReq, setDipReq]       = useState(false);
  const [dipMin, setDipMin]       = useState('');

  const [historyRule, setHistoryRule] = useState('HISTORY_ALLOWED');
  const [currentRule, setCurrentRule] = useState('CURRENT_ARREARS_ALLOWED');

  // Skills
  const [skills, setSkills]                 = useState<SkillEntry[]>([]);
  const [strictMandatory, setStrictMandatory] = useState(true);
  const [skillGapOpp, setSkillGapOpp]         = useState(true);
  const [skillInput, setSkillInput]           = useState('');
  const [skillType, setSkillType]             = useState<'MANDATORY'|'PREFERRED'>('MANDATORY');

  // JD extraction
  const [jdText, setJdText]       = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');

  // Form state
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [step, setStep]       = useState<'form'|'preview'>('form');
  const [activeTab, setActiveTab] = useState('company');

  // ── JD extraction ──────────────────────────────────────────────────────────
  const handleExtractJD = async () => {
    if (!jdText.trim()) return;
    setExtracting(true); setExtractMsg('');
    try {
      const res = await extractJD(jdText);
      // Apply extracted fields (require user review before saving)
      if (res.companyName)   setCompanyName(res.companyName);
      if (res.jobTitle)      setJobTitle(res.jobTitle);
      if (res.jobRole)       setJobRole(res.jobRole);
      if (res.description)   setDescription(res.description);
      if (res.jobLocation)   setJobLocation(res.jobLocation);
      if (res.salaryDisplay) setSalaryDisplay(res.salaryDisplay);
      if (res.workMode)      setWorkMode(res.workMode);
      if (res.requiredSkills) {
        const extracted: SkillEntry[] = res.requiredSkills.map((s: any) => ({
          skillName: s.skillName,
          type: s.type ?? 'MANDATORY',
        }));
        setSkills(prev => {
          const existing = new Set(prev.map(s => s.skillName.toLowerCase()));
          return [...prev, ...extracted.filter(s => !existing.has(s.skillName.toLowerCase()))];
        });
      }
      setExtractMsg('✅ Fields extracted. Please review and confirm before publishing.');
      setActiveTab('company');
    } catch (e: any) {
      setExtractMsg('❌ Extraction failed: ' + (e?.response?.data?.detail ?? 'Try again'));
    } finally { setExtracting(false); }
  };

  // ── Skill management ───────────────────────────────────────────────────────
  const addSkill = (name: string, type: 'MANDATORY'|'PREFERRED') => {
    const n = name.trim();
    if (!n) return;
    if (skills.some(s => s.skillName.toLowerCase() === n.toLowerCase())) return;
    setSkills(prev => [...prev, { skillName: n, type }]);
    setSkillInput('');
  };
  const removeSkill = (i: number) => setSkills(prev => prev.filter((_, idx) => idx !== i));
  const toggleSkillType = (i: number) => setSkills(prev => prev.map((s, idx) =>
    idx === i ? { ...s, type: s.type === 'MANDATORY' ? 'PREFERRED' : 'MANDATORY' } : s
  ));

  // ── Stream helpers ─────────────────────────────────────────────────────────
  const toggleStream = (s: string) => setStreams(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );
  const selectAllCS   = () => setStreams(prev => Array.from(new Set([...prev, ...CS_STREAMS])));
  const selectAllCore = () => setStreams(prev => Array.from(new Set([...prev, ...CORE_STREAMS])));
  const selectAll     = () => setStreams(ALL_STREAMS);
  const clearStreams   = () => setStreams([]);

  const toggleYear = (y: number) => setGradYears(prev =>
    prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (publish = false) => {
    setError('');
    if (!companyName.trim()) { setError('Company name is required'); return; }
    if (!jobTitle.trim())    { setError('Job title is required'); return; }
    if (!jobRole.trim())     { setError('Job role is required'); return; }
    if (gradYears.length === 0) { setError('At least one graduation year must be selected'); return; }
    if (!anyStream && streams.length === 0) { setError('Select at least one stream, or check "Any Stream"'); return; }
    if (!deadline) { setError('Application deadline is required'); return; }

    setSaving(true);
    const payload = {
      companyName, companyWebsite,
      opportunityType: oppType, source,
      jobTitle, jobRole, description,
      responsibilities: responsibilities.filter(Boolean),
      selectionProcess: selectionProcess.filter(Boolean),
      jobLocation, workMode, employmentType: empType,
      salaryMin: salaryMin ? parseFloat(salaryMin) : null,
      salaryMax: salaryMax ? parseFloat(salaryMax) : null,
      salaryDisplay,
      applicationDeadline: deadline,
      driveDate: driveDate || null,
      applicationUrl: appUrl,
      applicationMethod: appMethod,
      eligibility: {
        graduationYears: gradYears,
        degrees,
        streams: anyStream ? [] : streams,
        anyStream,
        academics: {
          tenth:   { required: tenthReq,   minimumPercentage: tenthReq   ? parseFloat(tenthMin)   : null },
          twelfth: { required: twelfthReq, minimumPercentage: twelfthReq ? parseFloat(twelfthMin) : null },
          cgpa:    { required: cgpaReq,    minimum:           cgpaReq    ? parseFloat(cgpaMin)    : null },
          diploma: { required: dipReq,     minimumPercentage: dipReq     ? parseFloat(dipMin)     : null },
          ugPercentage: { required: false },
        },
        arrears: {
          historyRule,
          currentRule,
          maxHistoricalArrears: 0,
          maxCurrentArrears: 0,
        },
        experience: { required: true, maximumYears: 0 },
      },
      requiredSkills: skills,
      strictMandatorySkills: strictMandatory,
      allowSkillGapOpportunities: skillGapOpp,
      publish,
    };

    try {
      const res = await createJob(payload);
      if (publish && res.jobId) {
        router.push(`/placement/jobs/${res.jobId}`);
      } else {
        router.push('/placement/jobs');
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to save job');
    } finally { setSaving(false); }
  };

  const TABS = [
    { id:'company',     label:'1. Company & Role',   icon: Building2 },
    { id:'eligibility', label:'2. Eligibility',      icon: GraduationCap },
    { id:'skills',      label:'3. Skills',           icon: Award },
    { id:'jd',          label:'4. JD Extraction',    icon: Zap },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-xl transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Post New Opportunity</h1>
            <p className="text-xs text-slate-500">Fill details, configure eligibility, then publish</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/40">
          {TABS.map(t => (
            <button key={t.id} id={`tab-${t.id}`} onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              )}>
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Company & Role ─────────────────────────────────────────── */}
        {activeTab === 'company' && (
          <div className="space-y-4">
            <Section title="Company" icon={Building2}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FLabel required>Company Name</FLabel>
                  <FInput id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. TechCorp India Pvt. Ltd." />
                </div>
                <div>
                  <FLabel>Company Website</FLabel>
                  <FInput value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="https://company.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FLabel required>Opportunity Type</FLabel>
                  <FSelect value={oppType} onChange={e => setOppType(e.target.value)}>
                    {OPPORTUNITY_TYPES.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                  </FSelect>
                </div>
                <div>
                  <FLabel>Source</FLabel>
                  <FSelect value={source} onChange={e => setSource(e.target.value)}>
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </FSelect>
                </div>
              </div>
            </Section>

            <Section title="Job Role" icon={Briefcase}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FLabel required>Job Title</FLabel>
                  <FInput id="job-title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Java Developer" />
                </div>
                <div>
                  <FLabel required>Job Role</FLabel>
                  <FInput value={jobRole} onChange={e => setJobRole(e.target.value)} placeholder="e.g. Software Engineer" />
                </div>
              </div>
              <div>
                <FLabel>Description</FLabel>
                <FTextarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief role description..." />
              </div>
              <div>
                <FLabel>Responsibilities</FLabel>
                {responsibilities.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <FInput value={r} onChange={e => setResponsibilities(prev => prev.map((x, j) => j===i ? e.target.value : x))} placeholder={`Responsibility ${i+1}`} />
                    {responsibilities.length > 1 && (
                      <button onClick={() => setResponsibilities(prev => prev.filter((_, j) => j!==i))} className="text-slate-500 hover:text-red-400 p-1"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setResponsibilities(prev => [...prev, ''])} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add responsibility
                </button>
              </div>
            </Section>

            <Section title="Location & Compensation" icon={MapPin}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FLabel>Location</FLabel>
                  <FInput value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="Chennai, TN" />
                </div>
                <div>
                  <FLabel>Work Mode</FLabel>
                  <FSelect value={workMode} onChange={e => setWorkMode(e.target.value)}>
                    {WORK_MODES.map(w => <option key={w} value={w}>{w}</option>)}
                  </FSelect>
                </div>
                <div>
                  <FLabel>Employment Type</FLabel>
                  <FSelect value={empType} onChange={e => setEmpType(e.target.value)}>
                    {EMP_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                  </FSelect>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FLabel>Salary Min (LPA)</FLabel>
                  <FInput type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="6.5" min="0" step="0.1" />
                </div>
                <div>
                  <FLabel>Salary Max (LPA)</FLabel>
                  <FInput type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="9.0" min="0" step="0.1" />
                </div>
                <div>
                  <FLabel>Display Text</FLabel>
                  <FInput value={salaryDisplay} onChange={e => setSalaryDisplay(e.target.value)} placeholder="6.5 – 9 LPA" />
                </div>
              </div>
            </Section>

            <Section title="Dates & Application" icon={Calendar}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FLabel required>Application Deadline</FLabel>
                  <FInput id="app-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div>
                  <FLabel>Drive Date</FLabel>
                  <FInput type="date" value={driveDate} onChange={e => setDriveDate(e.target.value)} />
                </div>
                <div>
                  <FLabel>Application Method</FLabel>
                  <FSelect value={appMethod} onChange={e => setAppMethod(e.target.value)}>
                    {['ONLINE_FORM','EMAIL','DIRECT_APPLY','REFERRAL_ONLY'].map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
                  </FSelect>
                </div>
              </div>
              <div>
                <FLabel>Application URL</FLabel>
                <FInput value={appUrl} onChange={e => setAppUrl(e.target.value)} placeholder="https://company.com/apply" />
              </div>
            </Section>
          </div>
        )}

        {/* ── Tab: Eligibility ────────────────────────────────────────────── */}
        {activeTab === 'eligibility' && (
          <div className="space-y-4">
            <Section title="Batch & Degree" icon={GraduationCap}>
              <div>
                <FLabel required>Eligible Graduation Years</FLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {BATCH_OPTIONS.map(y => (
                    <button key={y} id={`batch-${y}`} onClick={() => toggleYear(y)}
                      className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        gradYears.includes(y)
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/30'
                      )}>
                      Batch {y}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FLabel>Eligible Degrees</FLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['BE','BTECH','MCA','MSC','MBA','DIPLOMA'].map(d => (
                    <button key={d} onClick={() => setDegrees(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])}
                      className={cn('px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
                        degrees.includes(d)
                          ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-violet-500/30'
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Stream / Branch" icon={BookOpen}>
              <div className="flex gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                  <input type="checkbox" checked={anyStream} onChange={e => { setAnyStream(e.target.checked); if(e.target.checked) setStreams([]); }}
                    className="w-3.5 h-3.5 accent-indigo-500" />
                  Any stream (no restriction)
                </label>
              </div>
              {!anyStream && (
                <>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <button onClick={selectAllCS} className="px-2.5 py-1 text-[10px] bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all">CS/Computing</button>
                    <button onClick={selectAllCore} className="px-2.5 py-1 text-[10px] bg-orange-600/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-600/30 transition-all">Core Engineering</button>
                    <button onClick={selectAll} className="px-2.5 py-1 text-[10px] bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-600/30 transition-all">Select All</button>
                    <button onClick={clearStreams} className="px-2.5 py-1 text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-700 transition-all">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STREAMS.map(s => (
                      <button key={s} id={`stream-${s}`} onClick={() => toggleStream(s)}
                        className={cn('px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
                          streams.includes(s)
                            ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                            : CS_STREAMS.includes(s)
                              ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500/30'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-orange-500/30'
                        )}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {streams.length > 0 && (
                    <p className="text-[10px] text-indigo-400 mt-2">Selected: {streams.join(', ')}</p>
                  )}
                </>
              )}
            </Section>

            <Section title="Academic Thresholds" icon={Award}>
              <div className="grid grid-cols-2 gap-4">
                {/* 10th */}
                <div className="bg-slate-800/30 rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={tenthReq} onChange={e => setTenthReq(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                    <span className="text-xs text-slate-300 font-medium">10th Percentage Required</span>
                  </label>
                  {tenthReq && <FInput id="tenth-min" type="number" value={tenthMin} onChange={e => setTenthMin(e.target.value)} placeholder="Minimum %" min="0" max="100" step="0.1" />}
                </div>
                {/* 12th */}
                <div className="bg-slate-800/30 rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={twelfthReq} onChange={e => setTwelfthReq(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                    <span className="text-xs text-slate-300 font-medium">12th Percentage Required</span>
                  </label>
                  {twelfthReq && <FInput id="twelfth-min" type="number" value={twelfthMin} onChange={e => setTwelfthMin(e.target.value)} placeholder="Minimum %" min="0" max="100" step="0.1" />}
                </div>
                {/* CGPA */}
                <div className="bg-slate-800/30 rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={cgpaReq} onChange={e => setCgpaReq(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                    <span className="text-xs text-slate-300 font-medium">CGPA Required</span>
                  </label>
                  {cgpaReq && <FInput id="cgpa-min" type="number" value={cgpaMin} onChange={e => setCgpaMin(e.target.value)} placeholder="Minimum CGPA (e.g. 8.0)" min="0" max="10" step="0.1" />}
                </div>
                {/* Diploma */}
                <div className="bg-slate-800/30 rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={dipReq} onChange={e => setDipReq(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                    <span className="text-xs text-slate-300 font-medium">Diploma % Required</span>
                  </label>
                  {dipReq && <FInput type="number" value={dipMin} onChange={e => setDipMin(e.target.value)} placeholder="Minimum %" min="0" max="100" step="0.1" />}
                </div>
              </div>
            </Section>

            <Section title="Arrear Rules" icon={AlertCircle}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FLabel>Historical Arrears</FLabel>
                  <FSelect id="history-rule" value={historyRule} onChange={e => setHistoryRule(e.target.value)}>
                    {HISTORY_RULES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </FSelect>
                </div>
                <div>
                  <FLabel>Current Arrears</FLabel>
                  <FSelect id="current-rule" value={currentRule} onChange={e => setCurrentRule(e.target.value)}>
                    {CURRENT_RULES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </FSelect>
                </div>
              </div>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400/80">
                ⚠️ Historical and current arrears are evaluated separately. Students with current arrears will be blocked even if historical arrears are allowed.
              </div>
            </Section>
          </div>
        )}

        {/* ── Tab: Skills ─────────────────────────────────────────────────── */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <Section title="Required Skills" icon={Award}>
              {/* Quick-add popular skills */}
              <div>
                <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Quick Add</p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SKILLS.map(sk => (
                    <button key={sk} onClick={() => addSkill(sk, skillType)}
                      disabled={skills.some(s => s.skillName.toLowerCase() === sk.toLowerCase())}
                      className="px-2.5 py-1 text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-indigo-500/30 hover:text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      + {sk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom skill input */}
              <div className="flex gap-2">
                <FInput
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill(skillInput, skillType)}
                  placeholder="Type skill name and press Enter..."
                  className="flex-1"
                />
                <FSelect value={skillType} onChange={e => setSkillType(e.target.value as any)} className="w-36">
                  <option value="MANDATORY">Mandatory</option>
                  <option value="PREFERRED">Preferred</option>
                </FSelect>
                <button onClick={() => addSkill(skillInput, skillType)}
                  className="px-3 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl hover:bg-indigo-600/30 transition-all text-xs font-medium">
                  Add
                </button>
              </div>

              {/* Skill list */}
              {skills.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    {skills.map((sk, i) => (
                      <div key={i} className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl border',
                        sk.type === 'MANDATORY'
                          ? 'bg-red-600/10 border-red-500/25'
                          : 'bg-emerald-600/10 border-emerald-500/25'
                      )}>
                        <span className="text-xs font-medium text-slate-200">{sk.skillName}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleSkillType(i)} className={cn('text-[9px] px-2 py-0.5 rounded-full font-semibold border transition-all',
                            sk.type === 'MANDATORY'
                              ? 'text-red-300 border-red-500/30 hover:bg-red-500/10'
                              : 'text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'
                          )}>
                            {sk.type === 'MANDATORY' ? 'MANDATORY' : 'PREFERRED'}
                          </button>
                          <button onClick={() => removeSkill(i)} className="text-slate-600 hover:text-red-400 p-0.5 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 text-center py-4">No skills added yet</p>
              )}

              {/* Skill options */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={strictMandatory} onChange={e => setStrictMandatory(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                  <span className="text-xs text-slate-300">Strict mandatory skills — students missing any mandatory skill are blocked from normal feed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={skillGapOpp} onChange={e => setSkillGapOpp(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500" />
                  <span className="text-xs text-slate-300">Show as skill-gap opportunity for students with learning interest but missing skills</span>
                </label>
              </div>
            </Section>
          </div>
        )}

        {/* ── Tab: JD Extraction ──────────────────────────────────────────── */}
        {activeTab === 'jd' && (
          <div className="space-y-4">
            <Section title="AI JD Extraction" icon={Zap}>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400/80">
                ⚠️ AI extraction is an assistive tool. Always review extracted fields before publishing. The AI cannot invent eligibility requirements — only you can set them.
              </div>
              <div>
                <FLabel>Paste Job Description Text</FLabel>
                <FTextarea
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  rows={10}
                  placeholder="Paste the full job description here. The system will extract company name, job title, role, location, skills, and other structured fields for your review..."
                />
              </div>
              <button
                id="extract-jd-btn"
                onClick={handleExtractJD}
                disabled={!jdText.trim() || extracting}
                className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {extracting ? 'Extracting...' : 'Extract Fields from JD'}
              </button>
              {extractMsg && (
                <div className={cn(
                  'rounded-xl px-4 py-2.5 text-sm',
                  extractMsg.startsWith('✅')
                    ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/25 text-red-400'
                )}>
                  {extractMsg}
                  {extractMsg.startsWith('✅') && (
                    <button onClick={() => setActiveTab('company')} className="ml-3 text-indigo-400 hover:text-indigo-300 underline text-xs">
                      Review extracted fields →
                    </button>
                  )}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── Action bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-[#0d1526] border border-slate-700/50 rounded-2xl px-5 py-4">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Cancel</button>
          <div className="flex items-center gap-3">
            <button
              id="save-draft-btn"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save as Draft
            </button>
            <button
              id="publish-job-btn"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Publish Job
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
