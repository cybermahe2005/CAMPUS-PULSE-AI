'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useState } from 'react';
import { queryCopilot } from '@/lib/api';
import { Brain, Send, Loader2, Database, Sparkles } from 'lucide-react';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

const PROMPTS = [
  'Which students need attention this week?',
  'Which department has the highest risk?',
  'Show me students who are rapidly deteriorating',
  'Give me a placement readiness overview',
  'How is campus attendance looking?',
  'Which students should be prioritized for intervention?',
];

function DataChart({ points }: { points: { label: string; value: number }[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current || !points?.length) return;
    const chart = echarts.init(el.current, 'dark');
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 100, right: 20, top: 10, bottom: 10, containLabel: false },
      xAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } } },
      yAxis: { type: 'category', data: points.map(p => p.label), axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series: [{ type: 'bar', data: points.map(p => p.value), barMaxWidth: 18, itemStyle: { color: '#6366f1' }, label: { show: true, position: 'right', color: '#a5b4fc', fontSize: 10 } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el.current);
    return () => { chart.dispose(); ro.disconnect(); };
  }, [points]);
  return <div ref={el} className={`w-full`} style={{ height: Math.max(80, points.length * 32) }} />;
}

interface Message { role: 'user' | 'assistant'; content: string; sources?: string; dataPoints?: any[]; }

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '**Welcome to AI Campus Copilot** 👋\n\nAsk me anything about your students. All answers are grounded in your campus data — no hallucinations.\n\nTry one of the suggested prompts below, or type your own question.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setLoading(true);
    try {
      const res = await queryCopilot(q);
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.answer,
        sources: res.sources, dataPoints: res.dataPoints,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't retrieve that data right now. Please try again." }]);
    } finally { setLoading(false); }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5 h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />AI Campus Copilot
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Grounded analytics — all answers sourced from campus data</p>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-[#0d1526] border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600/20 border border-indigo-500/30 text-slate-200 rounded-br-sm' : 'bg-slate-800/60 border border-slate-700/40 rounded-bl-sm'}`}>
                  <p className="text-sm text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  {m.dataPoints && m.dataPoints.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/40">
                      <DataChart points={m.dataPoints} />
                    </div>
                  )}
                  {m.sources && (
                    <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center gap-1.5 text-[10px] text-slate-600">
                      <Database className="w-3 h-3" />Source: {m.sources}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center mr-3">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />Querying campus data…
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800/60">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask about students, risk, interventions…"
                className="flex-1 bg-[#080d1a] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all" />
              <button onClick={() => send(input)} disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center transition-all">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Prompt suggestions */}
        <div>
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)} disabled={loading}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-indigo-500/40 transition-all">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
