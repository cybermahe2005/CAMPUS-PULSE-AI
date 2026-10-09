'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { getDataQuality } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Database, CheckCircle, AlertTriangle, XCircle, RefreshCw, Clock } from 'lucide-react';

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass' || status === 'healthy') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function CompletionBar({ val, color }: { val: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, val)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-300 w-10 text-right">{val?.toFixed(0)}%</span>
    </div>
  );
}

export default function DataQualityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await getDataQuality()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-400" />Data Quality Dashboard
            </h1>
            <p className="text-sm text-slate-400">Source completeness, freshness, and integrity checks</p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <div className="text-center px-4 py-2 rounded-xl bg-indigo-600/15 border border-indigo-500/25">
                <p className="text-xl font-bold text-indigo-300">{data.overallCompleteness?.toFixed(0)}%</p>
                <p className="text-[10px] text-slate-500">Overall Completeness</p>
              </div>
            )}
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-indigo-500/50 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {/* Source completeness grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({length:8}).map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl" />) :
            (data?.sources ?? []).map((src: any) => {
              const color = src.complete >= 90 ? 'bg-emerald-500' : src.complete >= 75 ? 'bg-amber-500' : 'bg-red-500';
              const borderColor = src.status === 'healthy' ? 'border-slate-700/60' : 'border-amber-500/30';
              return (
                <div key={src.name} className={`bg-[#0d1526] border rounded-2xl p-4 ${borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-200">{src.name}</p>
                    <StatusIcon status={src.status} />
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{src.records?.toLocaleString()} records</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Completeness</span><span>{src.complete}%</span>
                      </div>
                      <CompletionBar val={src.complete} color={color} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Freshness</span><span>{src.freshness}%</span>
                      </div>
                      <CompletionBar val={src.freshness} color={src.freshness>=85?'bg-emerald-500':src.freshness>=70?'bg-amber-500':'bg-red-500'} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-600">
                    <Clock className="w-3 h-3" />Updated: {src.lastUpdated}
                  </div>
                  {src.anomalies > 0 && (
                    <p className="text-[10px] text-amber-400 mt-1">⚠ {src.anomalies} anomalies detected</p>
                  )}
                </div>
              );
            })
          }
        </div>

        {/* Validation checks */}
        <div className="bg-[#0d1526] border border-slate-700/60 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Data Validation Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Check', 'Data Source', 'Issues Found', 'Action Taken', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:4}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({length:5}).map((_,j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}
                  </tr>
                )) : (data?.checks ?? []).map((c: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{c.check}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.source}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{c.issues}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.action}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={c.status} />
                        <span className={`text-xs font-medium capitalize ${c.status==='pass'?'text-emerald-400':'text-amber-400'}`}>{c.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-300 leading-relaxed">
          <strong>Data Quality vs Model Confidence:</strong> Data completeness affects how much we trust the inputs to the model. Low completeness reduces Data Confidence Score. Model Confidence is separately derived from the XGBoost calibration on held-out validation data. These are tracked independently.
        </div>
      </div>
    </AppLayout>
  );
}
