import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Car,
  Users,
  ShieldAlert,
  Hammer,
  DollarSign,
  TrendingUp,
  FileText,
  CloudRain,
  Ambulance,
  CheckCircle2,
  MapPin,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalInspections: 148,
    totalPotholes: 312,
    totalCracks: 489,
    vehiclesMonitored: 5240,
    pedestriansMonitored: 1845,
    nearMissIncidents: 14,
    emergencyDispatches: 26,
    floodAlerts: 4,
    activeConstruction: 8,
    totalSpentINR: 1845000
  });

  const damageDistribution = [
    { name: 'Potholes', value: 312, color: '#EF4444' },
    { name: 'Cracks', value: 489, color: '#F97316' },
    { name: 'Waterlogging', value: 76, color: '#3B82F6' },
    { name: 'Debris & Objects', value: 42, color: '#EAB308' },
    { name: 'Open Manholes', value: 18, color: '#A855F7' }
  ];

  const weeklyTraffic = [
    { day: 'Mon', vehicles: 420, pedestrians: 180, hazards: 12 },
    { day: 'Tue', vehicles: 580, pedestrians: 210, hazards: 15 },
    { day: 'Wed', vehicles: 640, pedestrians: 240, hazards: 9 },
    { day: 'Thu', vehicles: 710, pedestrians: 290, hazards: 18 },
    { day: 'Fri', vehicles: 850, pedestrians: 340, hazards: 22 },
    { day: 'Sat', vehicles: 920, pedestrians: 410, hazards: 14 },
    { day: 'Sun', vehicles: 620, pedestrians: 280, hazards: 8 }
  ];

  const expenditureComparison = [
    { month: 'May', estimated: 320000, actual: 305000 },
    { month: 'Jun', estimated: 450000, actual: 480000 },
    { month: 'Jul', estimated: 520000, actual: 510000 },
    { month: 'Aug', estimated: 380000, actual: 365000 },
    { month: 'Sep', estimated: 410000, actual: 395000 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Road Defects Detected</p>
            <p className="text-2xl font-black font-mono text-white">801</p>
            <span className="text-[11px] text-red-400 font-medium">312 Potholes + 489 Cracks</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Vehicles Tracked</p>
            <p className="text-2xl font-black font-mono text-white">5,240</p>
            <span className="text-[11px] text-emerald-400 font-medium">ByteTrack Continuous ID</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pedestrians Protected</p>
            <p className="text-2xl font-black font-mono text-white">1,845</p>
            <span className="text-[11px] text-amber-400 font-medium">No Facial ID (Privacy First)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Municipal Repair Budget</p>
            <p className="text-2xl font-black font-mono text-emerald-400">₹18.45 L</p>
            <span className="text-[11px] text-slate-400 font-medium">Across 8 Active Projects</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Near-Miss Incidents</p>
            <p className="text-base font-bold text-white">14 Logged</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
          <Ambulance className="w-5 h-5 text-pink-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Emergency Dispatches</p>
            <p className="text-base font-bold text-white">26 Priority Alerts</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
          <CloudRain className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Flood / Waterlogging</p>
            <p className="text-base font-bold text-white">4 Active Spots</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Avg Repair Quality</p>
            <p className="text-base font-bold text-white">93.4 / 100</p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Traffic & Pedestrian Inflow Chart */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Weekly Vehicle, Pedestrian & Road Defect Observations
            </h3>
            <span className="text-xs text-slate-400">Corridor Telemetry</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTraffic}>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="vehicles" name="Vehicles" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pedestrians" name="Pedestrians" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hazards" name="Hazards" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Damage Distribution Donut Chart */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Surface Defect Categories
          </h3>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={damageDistribution}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {damageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {damageDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

