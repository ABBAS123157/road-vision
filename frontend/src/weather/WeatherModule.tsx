import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Thermometer,
  Droplets,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { api, WeatherData } from '../services/api';

export const WeatherModule: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [floodRecords, setFloodRecords] = useState<any[]>([]);

  useEffect(() => {
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    try {
      const w = await api.getWeather();
      setWeather(w);
      const res = await fetch('/api/weather/road-risks').then(r => r.json());
      setFloodRecords(res.flood_prone_road_register || []);
    } catch (e) {
      console.warn('Weather load error:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-400" />
            Weather, Waterlogging & Flood Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Meteorological observation integration, real-time road surface waterlogging detection, and flood-prone arterial warning register.
          </p>
        </div>
      </div>

      {/* Weather Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Thermometer className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Ambient Temperature</p>
            <p className="text-3xl font-black font-mono text-white">{weather?.temperature_c || 28}°C</p>
            <span className="text-[11px] text-slate-400">{weather?.condition || 'Clear'}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Droplets className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Precipitation Rate</p>
            <p className="text-3xl font-black font-mono text-white">{weather?.rainfall_mm || 0.0} mm</p>
            <span className="text-[11px] text-slate-400">Radar & Local Sensor</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Surface Flood Risk</p>
            <p className="text-2xl font-black text-emerald-400">{weather?.flood_risk_level || 'Low'}</p>
            <span className="text-[11px] text-slate-400">Source: {weather?.source || 'Open-Meteo'}</span>
          </div>
        </div>
      </div>

      {/* Route Warnings & Flood Prone Register */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Advisory Meteorological Warnings for Drivers
          </h3>
          {weather?.route_warnings && weather.route_warnings.length > 0 ? (
            <div className="space-y-2 text-xs">
              {weather.route_warnings.map((w, idx) => (
                <div key={idx} className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-amber-200">
                  {w}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Dry road conditions prevailing. Surface friction within optimal limits.</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            Flood-Prone Road Register
          </h3>
          <div className="space-y-2 text-xs">
            {floodRecords.map((rec, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{rec.road_name}</h4>
                  <p className="text-slate-400 mt-0.5">Drainage: {rec.drainage_capacity_pct}% Capacity</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                  rec.risk_level === 'Critical' || rec.risk_level === 'Severe'
                    ? 'bg-red-950 border-red-500 text-red-300'
                    : 'bg-amber-950 border-amber-500 text-amber-300'
                }`}>
                  {rec.risk_level} Risk
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

