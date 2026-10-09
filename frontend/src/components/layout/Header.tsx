'use client';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

const PAGE_TITLES: Record<string,string> = {
  '/dashboard': 'Campus Mission Control', '/students': 'Student Explorer',
  '/risk': 'Risk Intelligence', '/simulator': 'What-If Simulator',
  '/interventions': 'Intervention Center', '/placement': 'Placement Intelligence',
  '/copilot': 'AI Campus Copilot', '/data-quality': 'Data Quality',
};

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const base = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[base] ?? 'Campus Pulse AI';

  return (
    <header className="h-14 border-b border-slate-800/60 bg-[#0a1120]/70 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-10">
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2 px-3 h-8 rounded-xl bg-slate-800/60 border border-slate-700/40">
          <div className="w-5 h-5 rounded-full bg-indigo-600/40 flex items-center justify-center text-[10px] font-bold text-indigo-300">
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <span className="text-xs text-slate-300 hidden sm:block">{user?.name?.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
}
