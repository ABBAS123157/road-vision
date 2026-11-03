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
  Languages,
  Video,
  LogIn,
  LogOut,
  Sparkles,
  Database,
  Radio
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
import { VideoGalleryModule } from './videos/VideoGalleryModule';
import { AuthModal } from './auth/AuthModal';
import { VoiceSettingsModal } from './settings/VoiceSettingsModal';
import { api, User as UserType } from './services/api';
import { voiceAssistant, SUPPORTED_LANGUAGES } from './services/voiceAssistant';

type ActiveTab =
  | 'camera'
  | 'videos'
  | 'dashboard'
  | 'navigation'
  | 'twin'
  | 'construction'
  | 'verification'
  | 'maintenance'
  | 'safety'
  | 'traffic'
  | 'weather'
  | 'reports';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState<any>(null);

  // Auth state (Phase 1)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Multilingual voice assistant modal state (Phase 11)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>(voiceAssistant.getDefaultLanguage());

  useEffect(() => {
    // 1. Check AI Model status from backend
    api.getModelStatus()
      .then(res => setModelStatus(res))
      .catch(err => console.warn('Model status check:', err));

    // 2. Load stored or verified user from MongoDB
    api.getCurrentUser()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          if (user.default_language) {
            setCurrentLang(user.default_language);
            voiceAssistant.saveSettings(user.default_language, user.preferred_languages || [user.default_language], user.voice_settings || {});
          }
        } else {
          const localU = api.getStoredUser();
          if (localU) setCurrentUser(localU);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, highlight: true },
    { id: 'camera', label: 'Live Camera AI', icon: Camera, highlight: true },
    { id: 'videos', label: 'Saved Videos', icon: Video },
    { id: 'navigation', label: 'GPS Navigation', icon: Navigation },
    { id: 'safety', label: 'Human Safety', icon: ShieldAlert },
    { id: 'traffic', label: 'Traffic Flow', icon: Car },
    { id: 'twin', label: '3D Digital Twin', icon: Compass },
    { id: 'construction', label: 'BOQ & Tenders', icon: Hammer },
    { id: 'verification', label: 'Repair Verify', icon: ShieldCheck },
    { id: 'maintenance', label: 'Priority Rank', icon: TrendingUp },
    { id: 'weather', label: 'Weather & Flood', icon: Activity },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const currentLangName = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name || 'English';

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col font-sans selection:bg-cyan-600">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              RV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
                  RoadVision AI <Sparkles className="w-4 h-4 text-cyan-400" />
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                  v2.0 Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Real-Time AI Road Monitoring, YOLO Object Detection, GPS & Multilingual Platform
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 text-xs">
            {/* MongoDB & AI Engine Live Status */}
            <div className="hidden xl:flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>MongoDB: Connected</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${modelStatus?.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                <span>YOLOv8 + ByteTrack</span>
              </span>
            </div>

            {/* Multilingual Voice Assistant Button (Phase 11) */}
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
              title="Multilingual Voice Assistant Settings"
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">{currentLang}</span>
            </button>

            {/* User Profile / Auth Button (Phase 1) */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer hover:border-cyan-500 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-[11px] font-bold text-white">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <span className="block font-semibold text-white leading-tight">{currentUser.full_name}</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">{currentUser.role}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tab Bar */}
        <div className="max-w-7xl mx-auto hidden lg:flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                    : item.highlight
                    ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40'
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
          <div className="grid grid-cols-2 gap-2">
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
                      ? 'bg-cyan-600 border-cyan-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 pb-24 lg:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
          />
        )}
        {activeTab === 'camera' && (
          <LiveCamera
            onOpenVideos={() => setActiveTab('videos')}
            onOpenMap={() => setActiveTab('navigation')}
          />
        )}
        {activeTab === 'videos' && <VideoGalleryModule />}
        {activeTab === 'navigation' && <NavigationMap />}
        {activeTab === 'safety' && <SafetyModule />}
        {activeTab === 'traffic' && <TrafficModule />}
        {activeTab === 'twin' && <DigitalTwin />}
        {activeTab === 'construction' && <ConstructionModule />}
        {activeTab === 'verification' && <RepairVerificationModule />}
        {activeTab === 'maintenance' && <MaintenanceModule />}
        {activeTab === 'weather' && <WeatherModule />}
        {activeTab === 'reports' && <ReportsModule />}
      </main>

      {/* Mobile Sticky Bottom Navigation Bar (Phase 6 Mobile-First Redesign) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all active:scale-95 ${
            activeTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('camera');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all active:scale-95 ${
            activeTab === 'camera' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Camera className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <span className="text-[10px] mt-0.5">Camera AI</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('videos');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all active:scale-95 ${
            activeTab === 'videos' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Videos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('navigation');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all active:scale-95 ${
            activeTab === 'navigation' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">GPS Map</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all active:scale-95 ${
            mobileMenuOpen ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] mt-0.5">Modules</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 RoadVision AI – Real-Time AI Road Monitoring & Object Detection Platform.</p>
          <div className="flex items-center gap-3 text-slate-400">
            <span>React & Tailwind</span>
            <span>•</span>
            <span>Node.js & MongoDB</span>
            <span>•</span>
            <span>Python OpenCV & YOLOv8</span>
            <span>•</span>
            <span>Multilingual 12 Languages</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.default_language) {
            setCurrentLang(user.default_language);
          }
        }}
      />

      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaved={() => {
          setCurrentLang(voiceAssistant.getDefaultLanguage());
        }}
      />
    </div>
  );
};

export default App;
