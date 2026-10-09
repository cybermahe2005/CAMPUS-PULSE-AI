'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  Brain, LayoutDashboard, Users, AlertTriangle, Zap, Target,
  Briefcase, MessageSquare, Database, LogOut, ChevronRight, Activity,
  GraduationCap, Building2, BookOpen, BarChart3, Home, Star
} from 'lucide-react';

// ── Navigation definitions by role ────────────────────────────────────────────
const STAFF_NAV = [
  { href: '/dashboard',           label: 'Mission Control',     icon: LayoutDashboard },
  { href: '/students',            label: 'Students',            icon: Users },
  { href: '/risk',                label: 'Risk Intelligence',   icon: AlertTriangle },
  { href: '/simulator',           label: 'What-If Simulator',   icon: Zap },
  { href: '/interventions',       label: 'Interventions',       icon: Target },
  // Placement sub-group
  { href: '/placement',           label: 'Placement Hub',       icon: Briefcase },
  { href: '/placement/jobs',      label: 'Job Opportunities',   icon: Building2,      indent: true },
  { href: '/placement/training',  label: 'Training Programs',   icon: GraduationCap,  indent: true },
  { href: '/placement/analytics', label: 'Analytics',           icon: BarChart3,      indent: true },
  // Tools
  { href: '/copilot',             label: 'AI Copilot',          icon: MessageSquare },
  { href: '/data-quality',        label: 'Data Quality',        icon: Database },
];

const STUDENT_NAV = [
  { href: '/student',           label: 'My Dashboard',        icon: Home },
  { href: '/student/placement', label: 'My Placement',        icon: Briefcase },
];

const ROLE_BADGE: Record<string, string> = {
  ADMIN:            'bg-violet-500/20 text-violet-300',
  JOINT_SECRETARY:  'bg-indigo-500/20 text-indigo-300',
  PRINCIPAL:        'bg-blue-500/20 text-blue-300',
  HOD:              'bg-sky-500/20 text-sky-300',
  FACULTY:          'bg-emerald-500/20 text-emerald-300',
  PLACEMENT_OFFICER:'bg-amber-500/20 text-amber-300',
  STUDENT:          'bg-slate-500/20 text-slate-300',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:            'Administrator',
  JOINT_SECRETARY:  'Joint Secretary',
  PRINCIPAL:        'Principal',
  HOD:              'HOD',
  FACULTY:          'Faculty',
  PLACEMENT_OFFICER:'Placement Officer',
  STUDENT:          'Student',
};

export default function Sidebar() {
  const pathname  = usePathname();
  const { user, logout } = useAuth();
  const router    = useRouter();

  const isStudent = user?.role === 'STUDENT';
  const nav = isStudent ? STUDENT_NAV : STAFF_NAV;

  const handleLogout = () => { logout(); router.replace('/login'); };

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0a1120]/95 border-r border-slate-800/60 flex flex-col h-screen sticky top-0 z-20 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800/60">
        <Link href={isStudent ? '/student' : '/dashboard'} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600/30 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/10">
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Campus Pulse</p>
            <p className="text-[9px] text-indigo-400/70 font-medium tracking-widest uppercase mt-0.5">AI Platform</p>
          </div>
        </Link>
      </div>

      {/* Status indicator */}
      <div className="px-4 py-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span className="text-[10px] text-slate-500 font-medium">LIVE · 900 students</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon, indent }: any) => {
          const isPlacementParent = href === '/placement' && pathname.startsWith('/placement');
          const isExactOrChild    = pathname === href || (!indent && href !== '/' && pathname.startsWith(href + '/'));
          const active = isExactOrChild || isPlacementParent;

          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group',
                indent ? 'ml-4 py-1.5 text-xs' : '',
                active
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                  : indent
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}>
              <Icon className={cn(
                'flex-shrink-0',
                indent ? 'w-3 h-3' : 'w-4 h-4',
                active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
              )} />
              {label}
              {active && !indent && <ChevronRight className="w-3 h-3 ml-auto text-indigo-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="px-3 py-3 border-t border-slate-800/60 space-y-2">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', ROLE_BADGE[user.role] ?? ROLE_BADGE.STUDENT)}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.department && (
                  <span className="text-[9px] text-slate-600 truncate">{user.department}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all group">
            <LogOut className="w-3.5 h-3.5 group-hover:text-red-400" /> Logout
          </button>
        </div>
      )}
    </aside>
  );
}
