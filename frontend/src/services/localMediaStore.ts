import { RoadVideoRecord, DetectionEventRecord, DashboardStats } from './api';

const DB_NAME = 'RoadVisionLocalDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, { keyPath: 'video_id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const localMediaStore = {
  async saveVideo(record: RoadVideoRecord, videoBlob: Blob): Promise<RoadVideoRecord> {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(VIDEO_STORE, 'readwrite');
        const store = tx.objectStore(VIDEO_STORE);
        const item = {
          ...record,
          blob: videoBlob,
          is_local: true,
          saved_locally_at: new Date().toISOString()
        };
        const req = store.put(item);
        req.onsuccess = () => {
          // Keep a cache of video metadata in localStorage for instant access
          try {
            const list = localMediaStore.getMetaList();
            const filtered = list.filter(v => v.video_id !== record.video_id);
            filtered.unshift(record);
            localStorage.setItem('rv_cached_videos', JSON.stringify(filtered.slice(0, 50)));
          } catch {}
          resolve(record);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e: any) {
      console.warn('[LocalMediaStore] IndexedDB save warning:', e.message);
      return record;
    }
  },

  getMetaList(): RoadVideoRecord[] {
    try {
      const raw = localStorage.getItem('rv_cached_videos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async getAllVideos(): Promise<RoadVideoRecord[]> {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve) => {
        const tx = db.transaction(VIDEO_STORE, 'readonly');
        const store = tx.objectStore(VIDEO_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          const records: RoadVideoRecord[] = items.map((item: any) => {
            const { blob, ...meta } = item;
            if (blob && (!meta.file_path || meta.file_path.startsWith('/uploads'))) {
              try {
                meta.file_path = URL.createObjectURL(blob);
              } catch {}
            }
            return meta;
          });
          resolve(records.reverse());
        };
        req.onerror = () => {
          resolve(localMediaStore.getMetaList());
        };
      });
    } catch {
      return localMediaStore.getMetaList();
    }
  },

  async getVideoBlob(videoId: string): Promise<Blob | null> {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve) => {
        const tx = db.transaction(VIDEO_STORE, 'readonly');
        const store = tx.objectStore(VIDEO_STORE);
        const req = store.get(videoId);
        req.onsuccess = () => {
          resolve(req.result?.blob || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async deleteVideo(videoId: string): Promise<void> {
    try {
      const db = await openIndexedDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(VIDEO_STORE, 'readwrite');
        const store = tx.objectStore(VIDEO_STORE);
        const req = store.delete(videoId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    try {
      const list = localMediaStore.getMetaList().filter(v => v.video_id !== videoId);
      localStorage.setItem('rv_cached_videos', JSON.stringify(list));
    } catch {}
  },

  // Detection events persistence in localStorage
  saveDetectionEvent(event: DetectionEventRecord) {
    try {
      const raw = localStorage.getItem('rv_recent_detections');
      const list: DetectionEventRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(event);
      localStorage.setItem('rv_recent_detections', JSON.stringify(list.slice(0, 100)));
    } catch {}
  },

  getLocalDetections(): DetectionEventRecord[] {
    try {
      const raw = localStorage.getItem('rv_recent_detections');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getLocalDashboardStats(): DashboardStats {
    const detections = localMediaStore.getLocalDetections();
    const videos = localMediaStore.getMetaList();

    let vehicleCount = 0;
    let personCount = 0;
    let potholeCount = 0;
    let hazardCount = 0;

    detections.forEach(d => {
      const l = (d.object_label || '').toLowerCase();
      if (['car', 'vehicle', 'truck', 'bus', 'motorcycle'].includes(l)) vehicleCount++;
      else if (['person', 'pedestrian', 'worker'].includes(l)) personCount++;
      else if (l.includes('pothole') || l.includes('crack')) potholeCount++;
      else hazardCount++;
    });

    const totalSecs = videos.reduce((acc, v) => acc + (v.duration || 0), 0);

    return {
      total_events: detections.length,
      total_videos: videos.length,
      total_video_duration_seconds: Math.round(totalSecs),
      vehicles_detected: vehicleCount,
      persons_detected: personCount,
      potholes_detected: potholeCount,
      hazards_detected: hazardCount,
      recent_activity: detections.slice(0, 10)
    };
  }
};
