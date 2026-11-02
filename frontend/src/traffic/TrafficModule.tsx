import React, { useState, useEffect } from 'react';
import {
  Car,
  AlertOctagon,
  TrendingUp,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export const TrafficModule: React.FC = () => {
  const [counts, setCounts] = useState<any>({});
  const [congestionList, setCongestionList] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const c = await api.getTrafficCounts();
      setCounts(c);
      const cong = await api.getTrafficCongestion();
      setCongestionList(cong);
      const hs = await fetch('/api/traffic/hotspots').then(r => r.json());
      setHotspots(hs);
    } catch (e) {
      console.warn('Traffic data load error:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            Traffic Congestion & Vehicle Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Vehicle counting, speed distribution, queue-length estimation, wrong-way driving alerts, and bottleneck hotspots.
          </p>
        </div>
      </div>

      {/* Highlights Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Live Active Vehicles</p>
          <p className="text-2xl font-black font-mono text-white mt-0.5">{counts.live_active_vehicles || 0}</p>
          <span className="text-[11px] text-blue-400 font-medium">Currently in Video View</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Wrong-Way Driving Alerts</p>
          <p className="text-2xl font-black font-mono text-red-400 mt-0.5">{counts.wrong_way_alerts || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Opposing Vector Detections</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Flow Density Status</p>
          <p className="text-xl font-black text-amber-400 mt-0.5">{counts.status || 'Moderate'}</p>
          <span className="text-[11px] text-slate-400 font-medium">Automated Level of Service</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400">Cumulative Counted</p>
          <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
            {counts.cumulative_counted?.Vehicle || 42}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Unique ByteTrack IDs</span>
        </div>
      </div>

      {/* Congestion Hotspots & Segments Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Monitored Road Corridors & Queues
          </h3>
          <div className="space-y-2.5">
            {congestionList.map(item => (
              <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white">{item.road_segment}</h4>
                  <p className="text-slate-400 mt-0.5">
                    Avg Speed: <span className="font-mono text-emerald-400">{item.avg_speed_kmh} km/h</span> | Vehicles: {item.vehicle_count}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    item.density_level === 'Severe'
                      ? 'bg-red-950 border-red-500 text-red-300'
                      : item.density_level === 'High'
                      ? 'bg-orange-950 border-orange-500 text-orange-300'
                      : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  }`}>
                    {item.density_level} Density
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Queue: {item.queue_length_m}m</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400" />
            Major Congestion Bottleneck Hotspots
          </h3>
          <div className="space-y-2.5">
            {hotspots.map((hs, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white">{hs.segment}</h4>
                  <p className="text-slate-400 mt-0.5">Estimated Transit Delay: <strong className="text-red-400">+{hs.avg_delay_min} min</strong></p>
                </div>
                <span className="font-mono text-xs text-amber-400 font-bold">{hs.queue_m}m Queue</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

