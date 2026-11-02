import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Download,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Car,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  FileVideo,
  Layers,
  Sparkles,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';
import { api, RoadVideoRecord } from '../services/api';

export const VideoGalleryModule: React.FC = () => {
  const [videos, setVideos] = useState<RoadVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<RoadVideoRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'hazard' | 'vehicle' | 'pedestrian'>('all');

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const data = await api.getSavedVideos();
      setVideos(data.videos || []);
    } catch (err: any) {
      console.warn('Error fetching videos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (videoId: string) => {
    setDeleting(true);
    try {
      await api.deleteVideo(videoId);
      setStatusMsg('Video successfully removed from storage.');
      setVideos(videos.filter(v => v.video_id !== videoId));
      if (selectedVideo?.video_id === videoId) {
        setSelectedVideo(null);
      }
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filteredVideos = videos.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (v.detection_summary && v.detection_summary.toLowerCase().includes(q)) ||
      (v.trigger_event && v.trigger_event.toLowerCase().includes(q)) ||
      (v.date_time && v.date_time.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (filterCategory === 'hazard') {
      return (
        v.trigger_event?.includes('hazard') ||
        v.detection_summary?.toLowerCase().includes('pothole') ||
        v.detection_summary?.toLowerCase().includes('crack')
      );
    }
    if (filterCategory === 'vehicle') {
      return (
        v.detection_summary?.toLowerCase().includes('vehicle') ||
        v.detection_summary?.toLowerCase().includes('car') ||
        v.detection_summary?.toLowerCase().includes('truck') ||
        v.detection_summary?.toLowerCase().includes('bus')
      );
    }
    if (filterCategory === 'pedestrian') {
      return (
        v.detection_summary?.toLowerCase().includes('person') ||
        v.detection_summary?.toLowerCase().includes('pedestrian')
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Saved Road Detection Videos <Sparkles className="w-4 h-4 text-purple-400" />
            </h2>
            <p className="text-xs text-slate-400">
              Automatic event recordings & manual captures stored securely in MongoDB & disk
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchVideos}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center space-x-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Gallery</span>
          </button>
          <div className="px-3 py-1.5 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-300">
            {videos.length} {videos.length === 1 ? 'Video' : 'Videos'} Saved
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings by object, date, or event..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center space-x-1 text-xs">
            {(['all', 'hazard', 'vehicle', 'pedestrian'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  filterCategory === cat
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Videos' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <span>✓</span>
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Videos Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading saved detection clips...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6">
          <FileVideo className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No Detection Recordings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery || filterCategory !== 'all'
              ? 'No recordings match your current search/filter.'
              : 'Start the Live Camera and click "Start Recording" or trigger an automatic hazard detection event to save MP4 videos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map(video => {
            const vehicleCount = (video.detected_objects || []).filter((o: any) =>
              ['car', 'motorcycle', 'bus', 'truck', 'vehicle'].includes((o.label || o.category || '').toLowerCase())
            ).length;
            const personCount = (video.detected_objects || []).filter((o: any) =>
              ['person', 'pedestrian', 'worker'].includes((o.label || o.category || '').toLowerCase())
            ).length;
            const hazardCount = (video.detected_objects || []).filter((o: any) =>
              (o.label || o.category || '').toLowerCase().includes('pothole') ||
              (o.label || o.category || '').toLowerCase().includes('crack')
            ).length;

            return (
              <div
                key={video.video_id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col group"
              >
                {/* Thumbnail / Video header */}
                <div
                  onClick={() => setSelectedVideo(video)}
                  className="relative aspect-video bg-slate-950 cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt="Recording snapshot"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-600">
                      <FileVideo className="w-10 h-10" />
                      <span className="text-[10px] mt-1 text-slate-500 font-mono">MP4 Video</span>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                    <div className="p-3 bg-purple-600/90 text-white rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded-md text-[11px] font-mono text-white flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>

                  {/* Event tag */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-950/80 border border-purple-500/40 rounded-md text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    {video.trigger_event || 'Manual'}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(video.date_time).toLocaleDateString()}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {new Date(video.date_time).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* GPS Coordinates */}
                    <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-mono bg-cyan-950/30 px-2 py-1 rounded-lg border border-cyan-900/40 mt-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {video.gps.latitude ? (
                        <span>
                          {video.gps.latitude.toFixed(5)}, {video.gps.longitude?.toFixed(5)} (±{Math.round(video.gps.accuracy_meters || 0)}m)
                        </span>
                      ) : (
                        <span className="text-slate-500">Location not attached</span>
                      )}
                    </div>

                    {/* Detected objects summary tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {vehicleCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-950/70 text-blue-300 border border-blue-800/40 rounded-md text-[10px] font-medium flex items-center gap-1">
                          <Car className="w-3 h-3" /> {vehicleCount} Vehicles
                        </span>
                      )}
                      {personCount > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-950/70 text-emerald-300 border border-emerald-800/40 rounded-md text-[10px] font-medium flex items-center gap-1">
                          <Users className="w-3 h-3" /> {personCount} Pedestrians
                        </span>
                      )}
                      {hazardCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-950/70 text-red-300 border border-red-800/40 rounded-md text-[10px] font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {hazardCount} Defects
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono">{formatFileSize(video.file_size_bytes)}</span>

                    <div className="flex items-center space-x-2">
                      <a
                        href={video.file_path}
                        download={`road_video_${video.video_id}.mp4`}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title="Download MP4"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(video.video_id)}
                        className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete Recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-base">Delete Recording?</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete this road detection video? The MP4 file and associated detection metadata will be permanently removed from MongoDB and disk.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-semibold text-white shadow-lg shadow-red-600/30"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Video className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Road Detection Video Player</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{selectedVideo.video_id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="bg-black aspect-video w-full flex items-center justify-center">
              <video
                src={selectedVideo.file_path}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Video Telemetry breakdown */}
            <div className="p-4 md:p-6 bg-slate-900 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Recording Date</span>
                  <span className="font-semibold text-white">{new Date(selectedVideo.date_time).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Duration</span>
                  <span className="font-semibold text-cyan-400 font-mono">{formatDuration(selectedVideo.duration)}</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">File Size</span>
                  <span className="font-semibold text-white font-mono">{formatFileSize(selectedVideo.file_size_bytes)}</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Trigger</span>
                  <span className="font-semibold text-purple-400 uppercase tracking-wider">{selectedVideo.trigger_event}</span>
                </div>
              </div>

              {/* GPS Information */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Device GPS Location</span>
                    <span className="font-mono text-white">
                      {selectedVideo.gps.latitude
                        ? `${selectedVideo.gps.latitude.toFixed(6)}, ${selectedVideo.gps.longitude?.toFixed(6)}`
                        : 'No GPS data'}
                    </span>
                  </div>
                </div>
                {selectedVideo.gps.latitude && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedVideo.gps.latitude}&mlon=${selectedVideo.gps.longitude}#map=17/${selectedVideo.gps.latitude}/${selectedVideo.gps.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-lg hover:bg-cyan-900 transition-colors"
                  >
                    View on Map ↗
                  </a>
                )}
              </div>

              {/* Detected Objects in Video */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Objects Detected in this Clip ({(selectedVideo.detected_objects || []).length})
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {(selectedVideo.detected_objects || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No objects recorded in this clip.</p>
                  ) : (
                    (selectedVideo.detected_objects || []).map((obj: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700/40 rounded-lg text-xs"
                      >
                        <span className="font-medium text-white">
                          {obj.label || obj.category || 'Object'} {obj.tracking_id ? `(#${obj.tracking_id})` : ''}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-cyan-400">{Math.round((obj.confidence || 0.8) * 100)}% conf</span>
                          {obj.danger_level && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                              {obj.danger_level}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 flex justify-end space-x-3">
                <a
                  href={selectedVideo.file_path}
                  download={`road_video_${selectedVideo.video_id}.mp4`}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-xs font-semibold text-white shadow-lg flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

