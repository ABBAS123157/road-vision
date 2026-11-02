import React, { useState, useEffect } from 'react';
import {
  Camera,
  Navigation,
  Compass,
  Hammer,
  ShieldCheck,
  TrendingUp,
  ShieldAlert,
  Car,
  Activity,
  FileText,
  User,
  Menu,
  X,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff
} from 'lucide-react';
import { LiveCamera } from './camera/LiveCamera';
import { NavigationMap } from './maps/NavigationMap';
import { DigitalTwin } from './digital-twin/DigitalTwin';
import { ConstructionModule } from './construction/ConstructionModule';
import { RepairVerificationModule } from './construction/RepairVerificationModule';
import { MaintenanceModule } from './maintenance/MaintenanceModule';
import { SafetyModule } from './safety/SafetyModule';
import { TrafficModule } from './traffic/TrafficModule';
import { WeatherModule } from './weather/WeatherModule';
import { Dashboard } from './dashboard/Dashboard';
import { ReportsModule } from './reports/ReportsModule';
import { api } from './services/api';
import { audioAlerts } from './services/audio';

type ActiveTab =
  | 'camera'
  | 'navigation'
  | 'twin'
  | 'construction'
  | 'verification'
  | 'maintenance'
  | 'safety'
  | 'traffic'
  | 'weather'
  | 'dashboard'
  | 'reports';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('camera');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('Road Inspector');
  const [isMuted, setIsMuted] = useState(audioAlerts.getMuted());

  useEffect(() => {
    // Check AI Model status from backend
    api.getModelStatus()
      .then(res => setModelStatus(res))
      .catch(err => console.warn('Model status check:', err));
  }, []);

  const navItems = [
    { id: 'camera', label: 'Live Camera AI', icon: Camera, highlight: true },
    { id: 'navigation', label: 'GPS Navigation', icon: Navigation },
    { id: 'twin', label: '3D Digital Twin', icon: Compass },
    { id: 'construction', label: 'BOQ & Tenders', icon: Hammer },
    { id: 'verification', label: 'Repair Verify', icon: ShieldCheck },
    { id: 'maintenance', label: 'Priority Rank', icon: TrendingUp },
    { id: 'safety', label: 'Human Safety', icon: ShieldAlert },
    { id: 'traffic', label: 'Traffic Flow', icon: Car },
    { id: 'weather', label: 'Weather & Flood', icon: Activity },
    { id: 'dashboard', label: 'Analytics', icon: Activity },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col font-sans selection:bg-blue-600">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
              RV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base md:text-lg tracking-tight text-white">RoadVision AI</h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                  v1.0 Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Autonomous Road Intelligence, Navigation, Vehicle & Pedestrian Safety Platform
              </p>
            </div>
          </div>

          {/* Model Status & Telemetry Pill */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${modelStatus?.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>YOLOv8 + ByteTrack: {modelStatus?.status || 'Online'}</span>
            </span>

            {/* Role Switcher */}
            <select
              value={userRole}
              onChange={e => setUserRole(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="Road Inspector">Inspector Mode</option>
              <option value="Civil Engineer">Civil Engineer Mode</option>
              <option value="Driver">Driver / Navigation Mode</option>
              <option value="Contractor">Contractor Mode</option>
              <option value="Administrator">Administrator</option>
            </select>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const muted = audioAlerts.toggleMute();
                setIsMuted(muted);
              }}
              className={`p-1.5 rounded-lg border text-xs transition ${
                isMuted ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-blue-600/20 border-blue-500 text-blue-300'
              }`}
              title="Toggle Audio Announcements"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => {
                const muted = audioAlerts.toggleMute();
                setIsMuted(muted);
              }}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tab Bar */}
        <div className="max-w-7xl mx-auto hidden lg:flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/80 overflow-x-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : item.highlight
                    ? 'bg-blue-950/60 border border-blue-500/40 text-blue-300 hover:bg-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2 z-30">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Role:</span>
            <select
              value={userRole}
              onChange={e => setUserRole(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-2 py-1"
            >
              <option value="Road Inspector">Road Inspector</option>
              <option value="Civil Engineer">Civil Engineer</option>
              <option value="Driver">Driver</option>
              <option value="Contractor">Contractor</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'camera' && <LiveCamera />}
        {activeTab === 'navigation' && <NavigationMap />}
        {activeTab === 'twin' && <DigitalTwin />}
        {activeTab === 'construction' && <ConstructionModule />}
        {activeTab === 'verification' && <RepairVerificationModule />}
        {activeTab === 'maintenance' && <MaintenanceModule />}
        {activeTab === 'safety' && <SafetyModule />}
        {activeTab === 'traffic' && <TrafficModule />}
        {activeTab === 'weather' && <WeatherModule />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'reports' && <ReportsModule />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 RoadVision AI – Open-Source Autonomous Road Intelligence Platform.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Zero-Cost Open Stack</span>
            <span>•</span>
            <span>PyTorch YOLOv8 & ByteTrack</span>
            <span>•</span>
            <span>FastAPI & SQLite/PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

