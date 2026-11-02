import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';
import { api, MaintenancePriority } from '../services/api';

export const MaintenanceModule: React.FC = () => {
  const [priorities, setPriorities] = useState<MaintenancePriority[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPriorities();
  }, []);

  const loadPriorities = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMaintenancePriorities();
      setPriorities(data);
    } catch (e) {
      console.warn('Failed to load maintenance priorities:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setIsLoading(true);
    try {
      const data = await api.recalculatePriorities();
      setPriorities(data);
    } catch (e) {
      console.warn('Recalculate priorities error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Smart Road Maintenance Priority Engine (MCDA Ranking)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithmic prioritization ranking road corridors by damage severity, traffic volume, pedestrian exposure, flood risk, and emergency route importance.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg transition active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Recalculate Ranking</span>
        </button>
      </div>

      {/* Priority Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3.5 font-bold text-center">Rank</th>
                <th className="p-3.5 font-bold">Road Segment</th>
                <th className="p-3.5 font-bold text-center">Priority Score</th>
                <th className="p-3.5 font-bold">Risk Tier</th>
                <th className="p-3.5 font-bold">Damage Score</th>
                <th className="p-3.5 font-bold">Traffic Vol.</th>
                <th className="p-3.5 font-bold">Recommended Repair</th>
                <th className="p-3.5 font-bold text-right">Est. Budget (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {priorities.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold font-mono text-xs ${
                        p.rank === 1
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : p.rank === 2
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      #{p.rank}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-white">{p.road_segment}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-indigo-400">
                    {p.total_priority_score} / 100
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        p.risk_category.includes('Critical')
                          ? 'bg-red-950 border-red-500/60 text-red-300'
                          : p.risk_category.includes('High')
                          ? 'bg-orange-950 border-orange-500/60 text-orange-300'
                          : 'bg-blue-950 border-blue-500/60 text-blue-300'
                      }`}
                    >
                      {p.risk_category}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono">{p.damage_severity_score}</td>
                  <td className="p-3.5 font-mono">{p.traffic_volume_score}</td>
                  <td className="p-3.5 text-slate-200">{p.recommended_repair}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                    ₹{p.estimated_budget?.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

