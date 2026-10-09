'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { getTrainings, createTraining, getPlacementStudents, assignTraining } from '@/lib/api';
import { fmt, cn } from '@/lib/utils';
import { GraduationCap, Plus, X, Users, BookOpen, CheckCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['DSA & Coding','Aptitude','Communication','Mock Interview','Resume Workshop','Placement Prep','Technical Interview','Cloud & DevOps'];
const STATUS_COLOR: Record<string,string> = {
  UPCOMING:   'text-blue-400 bg-blue-500/10 border-blue-500/25',
  ACTIVE:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  COMPLETED:  'text-slate-400 bg-slate-800 border-slate-700',
};
const CAT_ICON: Record<string,string> = {
  'DSA & Coding':'⌨️','Aptitude':'🧠','Communication':'🗣️','Mock Interview':'🎯',
  'Resume Workshop':'📄','Placement Prep':'🏆','Technical Interview':'💻','Cloud & DevOps':'☁️',
};

interface TrainForm { name:string; category:string; duration:string; trainer:string; department:string; startDate:string; endDate:string; targetSkill:string; }
const EMPTY: TrainForm = { name:'', category:'DSA & Coding', duration:'', trainer:'', department:'', startDate:'', endDate:'', targetSkill:'' };

export default function TrainingPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<TrainForm>(EMPTY);
  const [saving, setSaving]     = useState(false);

  // Assign flow
  const [assigning, setAssigning]     = useState<any>(null); // selected program
  const [students, setStudents]       = useState<any[]>([]);
  const [studLoading, setStudLoading] = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [assignDone, setAssignDone]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await getTrainings(); setPrograms(r.programs ?? []); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);
    try { await createTraining(form); setShowForm(false); setForm(EMPTY); await load(); } finally { setSaving(false); }
  };

  const openAssign = async (prog: any) => {
    setAssigning(prog); setSelected(new Set()); setAssignDone(false);
    setStudLoading(true);
    try {
      const r = await getPlacementStudents({ perPage: 50, readiness: 'risk' });
      setStudents(r.students ?? []);
    } finally { setStudLoading(false); }
  };

  const handleAssign = async () => {
    if (!assigning || selected.size === 0) return;
    setSaving(true);
    try {
      await assignTraining(assigning.trainingId, Array.from(selected));
      setAssignDone(true); await load();
    } finally { setSaving(false); }
  };

  const toggleStudent = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1300px]">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" />Placement Training Center
            </h1>
            <p className="text-sm text-slate-400">Create training programs · Assign students · Track progress</p>
          </div>
          <div className="flex gap-2">
            <Link href="/placement" className="text-xs text-slate-400 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:text-slate-200 transition-all">← Hub</Link>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition-all">
              <Plus className="w-4 h-4" />New Program
            </button>
          </div>
        </div>

        {/* Category stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Total Programs', val: programs.length,                                icon:'📚' },
            { label:'Active',         val: programs.filter(p=>p.status==='ACTIVE').length,  icon:'▶️' },
            { label:'Upcoming',       val: programs.filter(p=>p.status==='UPCOMING').length,icon:'📅' },
            { label:'Total Enrolled', val: programs.reduce((a,p)=>a+(p.enrolledCount??0),0),icon:'👥' },
          ].map(k => (
            <div key={k.label} className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-4">
              <p className="text-2xl mb-1">{k.icon}</p>
              <p className="text-2xl font-bold text-white">{k.val}</p>
              <p className="text-xs text-slate-500">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Programs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array.from({length:6}).map((_,i) => <div key={i} className="skeleton h-52 rounded-2xl" />) :
          programs.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-500">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No training programs yet. Click <strong>New Program</strong> to create one.</p>
            </div>
          ) : programs.map(p => (
            <div key={p.trainingId} className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl">{CAT_ICON[p.category] ?? '📘'}</p>
                  <p className="text-sm font-semibold text-white mt-1">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.category}</p>
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[p.status] ?? STATUS_COLOR.UPCOMING)}>
                  {p.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {p.duration && <div className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3 h-3" />{p.duration}</div>}
                {p.trainer  && <div className="text-slate-500">Trainer: {p.trainer}</div>}
                {p.startDate && <div className="text-slate-500">From: {p.startDate}</div>}
                <div className="flex items-center gap-1.5 text-slate-400 font-medium"><Users className="w-3 h-3" />{p.enrolledCount ?? 0} enrolled</div>
              </div>

              {p.targetSkill && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full w-fit">
                  Target: {p.targetSkill}
                </span>
              )}

              <button onClick={() => openAssign(p)}
                className="mt-auto flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/25 text-xs text-emerald-300 transition-all">
                <Users className="w-3.5 h-3.5" />Assign Students
              </button>
            </div>
          ))}
        </div>

        {/* Create Program Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-[#0d1526] border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">New Training Program</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Program Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Category *</label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {([['Duration (e.g. 21 Days)','duration'],['Trainer Name','trainer'],['Department (blank = all)','department'],['Target Skill','targetSkill'],['Start Date','startDate'],['End Date','endDate']] as [string,string][]).map(([l,k]) => (
                  <div key={k}>
                    <label className="text-xs text-slate-400 block mb-1">{l}</label>
                    <input value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]:e.target.value}))}
                      className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name || !form.category}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-sm text-white font-medium transition-all">
                  {saving ? 'Creating…' : 'Create Program'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Students Modal */}
        {assigning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-[#0d1526] border border-slate-700 rounded-2xl p-6 w-full max-w-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{assigning.name}</h3>
                  <p className="text-xs text-slate-500">Select at-risk students to assign</p>
                </div>
                <button onClick={() => setAssigning(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
              </div>

              {assignDone ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                  <p className="text-white font-semibold">Assigned to {selected.size} students!</p>
                  <button onClick={() => setAssigning(null)} className="text-sm text-indigo-400 hover:underline">Close</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-2 my-3">
                    {studLoading ? Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-12 rounded-xl" />) :
                    students.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No at-risk students found</p> :
                    students.map(s => (
                      <label key={s.studentId} className={cn('flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border',
                        selected.has(s.studentId) ? 'bg-emerald-600/15 border-emerald-500/30' : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70')}>
                        <input type="checkbox" checked={selected.has(s.studentId)} onChange={() => toggleStudent(s.studentId)} className="accent-emerald-500 w-4 h-4" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.department} · PR: {fmt(s.placementReadiness)}</p>
                        </div>
                        <span className={`text-xs font-bold ${s.placementReadiness < 40 ? 'text-red-400' : 'text-amber-400'}`}>
                          {s.placementRiskLabel ?? '—'}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-3 border-t border-slate-800">
                    <button onClick={() => setAssigning(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
                    <button onClick={handleAssign} disabled={saving || selected.size === 0}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-sm text-white font-medium transition-all">
                      {saving ? 'Assigning…' : `Assign ${selected.size > 0 ? selected.size : ''} Students`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
