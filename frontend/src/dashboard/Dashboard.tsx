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
  Layers,
  Video,
  Camera,
  Compass,
  Radio,
  User,
  Clock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Phone,
  Shield
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
import { api, User as UserType, RoadVideoRecord, DetectionEventRecord, GpsLogPoint, DashboardStats } from '../services/api';

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
  currentUser?: UserType | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, currentUser }) => {
  const [stats, setStats] = useState<DashboardStats>({
    total_events: 0,
    total_videos: 0,
    total_video_duration_seconds: 0,
    vehicles_detected: 0,
    persons_detected: 0,
    potholes_detected: 0,
    hazards_detected: 0,
    recent_activity: []
  });

  const [recentVideos, setRecentVideos] = useState<RoadVideoRecord[]>([]);
  const [latestGps, setLatestGps] = useState<GpsLogPoint | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, videosData, gpsData] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getSavedVideos(),
        api.getLatestGps()
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }
      if (videosData.status === 'fulfilled') {
        setRecentVideos((videosData.value.videos || []).slice(0, 4));
      }
      if (gpsData.status === 'fulfilled') {
        setLatestGps(gpsData.value);
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const damageDistribution = [
    { name: 'Potholes', value: stats.potholes_detected, color: '#EF4444' },
    { name: 'Hazards & Defects', value: stats.hazards_detected, color: '#F97316' },
    { name: 'Vehicles Monitored', value: stats.vehicles_detected, color: '#3B82F6' },
    { name: 'Pedestrians', value: stats.persons_detected, color: '#22C55E' }
  ].filter(d => d.value > 0);

  // Group real recent activity into timeline chart or display active events
  const trafficActivity = stats.recent_activity && stats.recent_activity.length > 0
    ? stats.recent_activity.slice(0, 7).map((act, idx) => ({
        time: act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `T-${idx}`,
        vehicles: act.object_label?.toLowerCase().includes('car') || act.object_label?.toLowerCase().includes('truck') ? 1 : 0,
        pedestrians: act.object_label?.toLowerCase().includes('person') || act.object_label?.toLowerCase().includes('pedestrian') ? 1 : 0,
        hazards: act.object_label?.toLowerCase().includes('pothole') || act.object_label?.toLowerCase().includes('crack') ? 1 : 0
      }))
    : [
        { time: 'Live', vehicles: stats.vehicles_detected, pedestrians: stats.persons_detected, hazards: stats.hazards_detected + stats.potholes_detected }
      ];

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Vehicles Monitored</p>
            <p className="text-2xl font-black font-mono text-white">{stats.vehicles_detected}</p>
            <span className="text-[11px] text-blue-400 font-medium">Cars, Trucks, Bikes</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pedestrians Detected</p>
            <p className="text-2xl font-black font-mono text-white">{stats.persons_detected}</p>
            <span className="text-[11px] text-emerald-400 font-medium">Crossing & Danger Zones</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Potholes & Defects</p>
            <p className="text-2xl font-black font-mono text-white">{stats.potholes_detected}</p>
            <span className="text-[11px] text-red-400 font-medium">AI Verified Road Hazards</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Saved Video Clips</p>
            <p className="text-2xl font-black font-mono text-white">{stats.total_videos}</p>
            <span className="text-[11px] text-purple-400 font-medium">Indexed in MongoDB</span>
          </div>
        </div>
      </div>

      {/* Middle Row: User Profile Card & GPS Real-Time Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* User Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">Authenticated Profile</h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                MongoDB Active
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Full Name</span>
                <span className="font-semibold text-white">{currentUser?.full_name || 'Guest User'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role</span>
                <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-md font-mono text-[11px]">
                  {currentUser?.role || 'Guest / Unauthenticated'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email</span>
                <span className="font-mono text-slate-300">{currentUser?.email || 'Not signed in'}</span>
              </div>
              {currentUser?.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-mono text-slate-300">{currentUser.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Default Language</span>
                <span className="font-semibold text-cyan-400 uppercase">
                  {currentUser?.default_language || 'EN'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Security: JWT Bearer + MongoDB</span>
            <div className="flex items-center space-x-1 text-emerald-400 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>{currentUser ? 'Protected Session' : 'Unauthenticated'}</span>
            </div>
          </div>
        </div>

        {/* GPS Live Coordinates & Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-teal-600 rounded-xl">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">Live Device GPS Coordinates</h3>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('navigation')}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Full Map</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              {latestGps ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono">
                  <div className="flex justify-between text-cyan-400">
                    <span>Latitude</span>
                    <span>{latestGps.latitude.toFixed(6)}° N</span>
                  </div>
                  <div className="flex justify-between text-cyan-400">
                    <span>Longitude</span>
                    <span>{latestGps.longitude.toFixed(6)}° E</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Accuracy</span>
                    <span>±{Math.round(latestGps.accuracy_meters || 1)} meters</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/70 border border-dashed border-slate-800 rounded-xl text-center text-slate-400 text-xs py-4">
                  <span>No GPS logged yet. Start Live Camera AI to broadcast device coordinates.</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Speed (GPS)</span>
                <span className="font-mono font-bold text-white">
                  {latestGps?.speed_kmh ? latestGps.speed_kmh.toFixed(1) : '0.0'} km/h
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">Live Satellite Telemetry</span>
            <button
              onClick={() => onNavigateTab && onNavigateTab('camera')}
              className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg text-xs font-semibold"
            >
              Start Camera AI
            </button>
          </div>
        </div>

        {/* Quick Launch & AI Monitoring Hub */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white">Road Monitoring Shortcuts</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('camera')}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-left transition-all"
              >
                <Camera className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="font-bold text-xs text-white block">Start Camera</span>
                <span className="text-[10px] text-slate-400">YOLO live inference</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('videos')}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-left transition-all"
              >
                <Video className="w-5 h-5 text-purple-400 mb-1" />
                <span className="font-bold text-xs text-white block">Saved Videos</span>
                <span className="text-[10px] text-slate-400">{stats.total_videos} clips recorded</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('navigation')}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-left transition-all"
              >
                <Compass className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="font-bold text-xs text-white block">GPS Navigation</span>
                <span className="text-[10px] text-slate-400">1km advance alerts</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('safety')}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-left transition-all"
              >
                <ShieldAlert className="w-5 h-5 text-amber-400 mb-1" />
                <span className="font-bold text-xs text-white block">Human Safety</span>
                <span className="text-[10px] text-slate-400">Worker & crossing alerts</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>YOLOv8 + ByteTrack Active</span>
            <span className="text-emerald-400 font-mono">100% Ready</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Event History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Real-Time Detection Activity Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Road Monitoring Activity Trend</h3>
              <p className="text-xs text-slate-400">Hourly object detections and road hazard events</p>
            </div>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficActivity}>
                <defs>
                  <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPedestrians" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="vehicles" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicles)" />
                <Area type="monotone" dataKey="pedestrians" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorPedestrians)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Road Damage Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Road Hazard Distribution</h3>
              <p className="text-xs text-slate-400">Potholes, surface cracks, flooding, and debris</p>
            </div>
            <Layers className="w-4 h-4 text-red-400" />
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={damageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {damageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center flex-wrap gap-3 mt-2 text-xs">
            {damageDistribution.map(d => (
              <span key={d.name} className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name} ({d.value})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Detection Videos Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2.5">
            <Video className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Recent Road Detection Recordings</h3>
              <p className="text-xs text-slate-400">Clips automatically saved during hazard events</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('videos')}
            className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All ({stats.total_videos})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentVideos.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No saved videos yet. Start the live camera and click Record to capture road monitoring clips.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentVideos.map(video => (
              <div
                key={video.video_id}
                onClick={() => onNavigateTab && onNavigateTab('videos')}
                className="bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl overflow-hidden cursor-pointer transition-all group"
              >
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="Clip" className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-8 h-8 text-slate-700" />
                  )}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-mono text-cyan-300">
                    {Math.round(video.duration)}s
                  </span>
                </div>
                <div className="p-2.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(video.date_time).toLocaleDateString()}</span>
                    <span className="uppercase text-[9px] font-bold text-purple-400">{video.trigger_event}</span>
                  </div>
                  <p className="text-white font-medium truncate mt-1">
                    {video.detection_summary || 'Road Event Recording'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
