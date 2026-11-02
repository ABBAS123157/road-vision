import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Users,
  Eye,
  CheckCircle,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { api } from '../services/api';

export const SafetyModule: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any | null>(null);

  // Risk Score Inputs
  const [potholes, setPotholes] = useState(2);
  const [cracks, setCracks] = useState(4);
  const [density, setDensity] = useState('Medium');
  const [isWaterlogged, setIsWaterlogged] = useState(false);

  useEffect(() => {
    loadIncidents();
    recalculateRisk();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await api.getNearMissIncidents();
      setIncidents(data);
    } catch (e) {
      console.warn('Failed to load incidents:', e);
    }
  };

  const recalculateRisk = async () => {
    try {
      const data = await api.getRoadRiskScore(potholes, cracks, density, isWaterlogged);
      setRiskData(data);
    } catch (e) {
      console.warn('Risk score error:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Human & Pedestrian Safety, Pre-Start Surroundings & Conflict Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Surroundings hazard verification before vehicle motion, near-miss proximity analysis, and multi-factor road risk scoring.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Calculator Card */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            Advisory Road Safety Risk Scoring Engine
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Active Potholes</label>
                <input
                  type="number"
                  min="0"
                  value={potholes}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setPotholes(val);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Active Surface Cracks</label>
                <input
                  type="number"
                  min="0"
                  value={cracks}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setCracks(val);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Traffic Density</label>
              <select
                value={density}
                onChange={e => setDensity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="Low">Low Density (&lt; 20 veh/min)</option>
                <option value="Medium">Medium Density (20-60 veh/min)</option>
                <option value="High">High Density (60-120 veh/min)</option>
                <option value="Severe">Severe Congestion / Bottleneck</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="waterlogCheck"
                checked={isWaterlogged}
                onChange={e => setIsWaterlogged(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <label htmlFor="waterlogCheck" className="text-xs text-slate-300">
                Waterlogging / Surface Ponding Active
              </label>
            </div>

            <button
              onClick={recalculateRisk}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition"
            >
              Recompute Advisory Risk Score
            </button>
          </div>

          {/* Risk Results */}
          {riskData && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Road Safety Risk Index:</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-3xl font-black font-mono ${
                      riskData.risk_score >= 60 ? 'text-red-400' : riskData.risk_score >= 35 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {riskData.risk_score}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  riskData.risk_score >= 60
                    ? 'bg-red-950 border-red-500 text-red-300'
                    : riskData.risk_score >= 35
                    ? 'bg-amber-950 border-amber-500 text-amber-300'
                    : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                }`}>
                  {riskData.risk_category}
                </span>
              </div>

              {riskData.contributing_factors.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="text-slate-400 font-semibold">Contributing Factors:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                    {riskData.contributing_factors.map((f: string, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Near-Miss Conflict Incidents Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Near-Miss & Proximity Conflict Register ({incidents.length})
          </h3>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {incidents.map(inc => (
              <div key={inc.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-xs md:text-sm">{inc.incident_type}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{inc.description}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-red-950 border border-red-500 text-red-300 shrink-0">
                    {inc.risk_level} Risk
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                  <span>GPS: {inc.latitude?.toFixed(4)}° N, {inc.longitude?.toFixed(4)}° E</span>
                  <span>{new Date(inc.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

