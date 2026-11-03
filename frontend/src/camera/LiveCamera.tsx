import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  VideoOff,
  SwitchCamera,
  Maximize,
  Minimize,
  Aperture,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Car,
  Users,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  MapPin,
  Compass,
  Radio,
  Square,
  Play,
  Download,
  Mic,
  MicOff,
  Sparkles,
  Navigation
} from 'lucide-react';
import { api, DetectionItem, LiveDetectionResponse } from '../services/api';
import { voiceAssistant, SUPPORTED_LANGUAGES } from '../services/voiceAssistant';

interface LiveCameraProps {
  onSnapshotCaptured?: (dataUrl: string, detections: DetectionItem[]) => void;
  onOpenVideos?: () => void;
  onOpenMap?: () => void;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({
  onSnapshotCaptured,
  onOpenVideos,
  onOpenMap
}) => {
  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // AI & Detection Telemetry
  const [fps, setFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [prestartStatus, setPrestartStatus] = useState<string>('SAFE TO PROCEED');
  const [prestartReasons, setPrestartReasons] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFlash, setCapturedFlash] = useState<boolean>(false);

  // Object Counts
  const [counts, setCounts] = useState({
    vehicles: 0,
    pedestrians: 0,
    hazards: 0,
    potholes: 0,
    total: 0
  });

  // Secure Context & Insecure Origin helper
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  );
  const isSecure = typeof window !== 'undefined' && (window.isSecureContext || isLocalhost);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState<boolean>(!isSecure);

  // GPS State (Phase 3)
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [gpsActive, setGpsActive] = useState<boolean>(true);
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    altitude: number | null;
    timestamp: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Video Recording State (Phase 5)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingTrigger, setRecordingTrigger] = useState<'manual' | 'auto_hazard'>('manual');
  const recordingTimerRef = useRef<any>(null);
  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  // Voice Assistant State (Phase 11)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

  // Track previous detections to detect persons entering/leaving view (Phase 7)
  const prevTrackedPersonsRef = useRef<Set<number>>(new Set());
  const prevPrestartRef = useRef<string>('SAFE TO PROCEED');

  // Enumerate camera devices (safe: does not show error on initial mount)
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.warn('Error enumerating devices:', err);
    }
  }, [selectedDeviceId]);

  // ==========================================
  // PHASE 3: Real-Time Device GPS Location
  // ==========================================
  const startGpsTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError(null);
    setGpsActive(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          altitude: position.coords.altitude,
          timestamp: new Date(position.timestamp).toLocaleTimeString()
        };
        setGpsCoords(coords);
        setGpsError(null);

        // Sync GPS coordinates to MongoDB
        api.sendGpsUpdate({
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude ?? undefined,
          accuracy: coords.accuracy ?? undefined,
          speed: coords.speed ?? undefined,
          heading: coords.heading ?? undefined
        }).catch(() => {});
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        if (err.code === 1) {
          setGpsError('GPS permission denied. Please allow location access in your browser.');
        } else if (err.code === 2) {
          setGpsError('GPS position unavailable. Check device GPS service.');
        } else {
          setGpsError('GPS signal timed out. Acquiring satellite fix...');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    setGpsWatchId(watchId);
  }, []);

  const stopGpsTracking = () => {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
    }
    setGpsActive(false);
  };

  useEffect(() => {
    updateDeviceList();
    navigator.mediaDevices?.addEventListener('devicechange', updateDeviceList);
    startGpsTracking();

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', updateDeviceList);
      stopCamera();
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
  }, []);

  // ==========================================
  // PHASE 4: Real-Time WebSocket for YOLO Inference
  // ==========================================
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const defaultWsUrl = `${protocol}//${host}/ws/live-detection`;
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

    setWsStatus('connecting');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsStatus('connected');
      setCameraError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data: LiveDetectionResponse = JSON.parse(event.data);
        setFps(data.fps || 0);
        setLatencyMs(data.processing_time_ms || 0);
        setDetections(data.detections || []);
        setCounts({
          vehicles: data.vehicles_count || 0,
          pedestrians: data.pedestrians_count || 0,
          hazards: data.hazards_count || 0,
          potholes: data.potholes_count || 0,
          total: data.total_detected || 0
        });

        const newPrestart = data.prestart_advisory || 'SAFE TO PROCEED';
        setPrestartStatus(newPrestart);
        if (data.prestart_details) {
          setPrestartReasons(data.prestart_details.reasons || []);
        }

        // ==========================================
        // PHASE 7: Person & Vehicle Tracking Events
        // ==========================================
        const currentPersonIds = new Set<number>();
        (data.detections || []).forEach(d => {
          if (d.category === 'Pedestrian' && d.tracking_id) {
            currentPersonIds.add(d.tracking_id);
            if (!prevTrackedPersonsRef.current.has(d.tracking_id)) {
              // Person entered view
              api.recordDetectionEvent({
                event_type: 'PERSON_ENTERED_VIEW',
                object_label: 'Pedestrian',
                confidence: d.confidence,
                tracking_id: d.tracking_id,
                gps_lat: gpsCoords?.latitude,
                gps_lng: gpsCoords?.longitude,
                severity: d.danger_level === 'Danger Zone' ? 'danger' : 'info'
              }).catch(() => {});
            }
          }
        });
        prevTrackedPersonsRef.current = currentPersonIds;

        // ==========================================
        // PHASE 11: Multilingual Voice Alert Announcements
        // ==========================================
        if (data.pedestrians_count > 0) {
          voiceAssistant.speak('person_detected');
        } else if (data.potholes_count > 0) {
          voiceAssistant.speak('pothole_detected');
          if (!isRecording && data.potholes_count > 0) {
            triggerAutoEventRecording();
          }
        } else if (data.vehicles_count > 0) {
          voiceAssistant.speak('vehicle_detected');
        }

        if (newPrestart !== prevPrestartRef.current) {
          if (newPrestart === 'STOP – DANGER DETECTED') {
            voiceAssistant.speak('danger_stop', undefined, true);
          } else if (newPrestart === 'CAUTION') {
            voiceAssistant.speak('caution', undefined, true);
          } else if (newPrestart === 'SAFE TO PROCEED' && prevPrestartRef.current !== 'SAFE TO PROCEED') {
            voiceAssistant.speak('safe_proceed', undefined, true);
          }
          prevPrestartRef.current = newPrestart;
        }

        // Draw Bounding Boxes on Canvas Overlay
        drawBoundingBoxes(data.detections || []);
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
      setWsStatus('disconnected');
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      if (streamRef.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          if (streamRef.current) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    wsRef.current = ws;
  }, [gpsCoords, isRecording]);

  // ==========================================
  // PHASE 2: Live Device Camera Start / Stop
  // ==========================================
  const startCamera = async (deviceId?: string, facing?: 'user' | 'environment') => {
    setCameraError(null);
    stopCamera();

    if (!isSecure && !navigator.mediaDevices?.getUserMedia) {
      setIsInsecureOrigin(true);
      setCameraError(
        `Browser security restriction: Camera hardware cannot be accessed over plain HTTP on network IP (${window.location.host}). Please open http://localhost:${window.location.port || '5173'} on this PC or switch to HTTPS.`
      );
      return;
    }

    const targetFacing = facing || facingMode;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
    };

    try {
      let stream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        const legacyGetUserMedia =
          (navigator as any).getUserMedia ||
          (navigator as any).webkitGetUserMedia ||
          (navigator as any).mozGetUserMedia ||
          (navigator as any).msGetUserMedia;

        if (legacyGetUserMedia) {
          stream = await new Promise<MediaStream>((resolve, reject) => {
            legacyGetUserMedia.call(navigator, constraints, resolve, reject);
          });
        } else {
          throw new Error('MediaDevices API not supported in this browser context.');
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsInsecureOrigin(false);
      await updateDeviceList();
      connectWebSocket();
      startFrameStreaming();
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please click the camera icon in your browser address bar to grant permission.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please connect a webcam or enable your device camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access camera.'}`);
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (isRecording) {
      stopRecording();
    }

    setIsCameraActive(false);
    setWsStatus('disconnected');
    setDetections([]);
    setFps(0);
    setLatencyMs(0);
  };

  const switchCameraFacing = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (isCameraActive) {
      await startCamera(undefined, newFacing);
    }
  };

  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      await startCamera(deviceId);
    }
  };

  // ==========================================
  // PHASE 5: Automatic & Manual Road Video Recording
  // ==========================================
  const startRecording = (trigger: 'manual' | 'auto_hazard' = 'manual') => {
    if (!streamRef.current || isRecording) return;

    try {
      recordedChunksRef.current = [];
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      let selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      const recorder = new MediaRecorder(streamRef.current, { mimeType: selectedMime });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: selectedMime });
        if (blob.size < 5000) return;

        setSavingNotice('Uploading video & indexing telemetry in MongoDB...');
        try {
          let thumbDataUrl = '';
          if (videoRef.current) {
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 320;
            thumbCanvas.height = 180;
            const tctx = thumbCanvas.getContext('2d');
            tctx?.drawImage(videoRef.current, 0, 0, 320, 180);
            thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
          }

          const formData = new FormData();
          formData.append('video', blob, `road_monitoring_${Date.now()}.mp4`);
          formData.append('duration', recordingSeconds.toString());
          formData.append('trigger_event', trigger);
          if (gpsCoords) {
            formData.append('gps_lat', gpsCoords.latitude.toString());
            formData.append('gps_lng', gpsCoords.longitude.toString());
            formData.append('gps_accuracy', (gpsCoords.accuracy || 0).toString());
          }
          formData.append('detected_objects', JSON.stringify(detections));
          formData.append('detection_summary', `${counts.vehicles} vehicles, ${counts.pedestrians} pedestrians, ${counts.hazards} defects`);
          if (thumbDataUrl) {
            formData.append('thumbnail_base64', thumbDataUrl);
          }

          await api.uploadRoadVideo(formData);
          setSavingNotice('✓ Road detection video saved in MongoDB!');
          voiceAssistant.speak('recording_stopped', undefined, true);
          setTimeout(() => setSavingNotice(null), 3000);
        } catch (err: any) {
          setSavingNotice(`Save error: ${err.message}`);
          setTimeout(() => setSavingNotice(null), 4000);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTrigger(trigger);
      setRecordingSeconds(0);
      voiceAssistant.speak('recording_started', undefined, true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.error('MediaRecorder start error:', e);
      setCameraError('Recording failed: ' + e.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const triggerAutoEventRecording = () => {
    if (isRecording) return;
    startRecording('auto_hazard');
    setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, 10000);
  };

  // ==========================================
  // PHASE 11: Multilingual Voice Command Handler
  // ==========================================
  const toggleVoiceListening = () => {
    if (isListening) {
      voiceAssistant.stopListening();
      setIsListening(false);
      setVoiceTranscript('');
    } else {
      const started = voiceAssistant.startListening(
        (text, isFinal) => {
          setVoiceTranscript(text);
          if (isFinal) {
            setTimeout(() => setVoiceTranscript(''), 4000);
          }
        },
        (command) => {
          handleVoiceCommand(command);
        }
      );
      setIsListening(started);
    }
  };

  const handleVoiceCommand = (command: string) => {
    switch (command) {
      case 'START_CAMERA':
        if (!isCameraActive) startCamera();
        break;
      case 'STOP_CAMERA':
        if (isCameraActive) stopCamera();
        break;
      case 'START_RECORDING':
        if (isCameraActive && !isRecording) startRecording('manual');
        break;
      case 'STOP_RECORDING':
        if (isRecording) stopRecording();
        break;
      case 'SHOW_LOCATION':
        if (onOpenMap) onOpenMap();
        break;
      case 'OPEN_VIDEOS':
        if (onOpenVideos) onOpenVideos();
        break;
      default:
        break;
    }
  };

  // Stream video frames to WebSocket
  const startFrameStreaming = () => {
    let lastSent = 0;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 480;
    captureCanvas.height = 360;
    const captureCtx = captureCanvas.getContext('2d');

    const sendLoop = () => {
      const now = performance.now();
      if (
        isCameraActive &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        if (now - lastSent >= 90) {
          captureCtx?.drawImage(videoRef.current, 0, 0, 480, 360);
          const base64Data = captureCanvas.toDataURL('image/jpeg', 0.65);
          const payload = {
            image: base64Data,
            latitude: gpsCoords?.latitude,
            longitude: gpsCoords?.longitude,
            user_id: api.getStoredUser()?.id || 'guest'
          };
          wsRef.current.send(JSON.stringify(payload));
          lastSent = now;
        }
      }
      animationFrameRef.current = requestAnimationFrame(sendLoop);
    };

    animationFrameRef.current = requestAnimationFrame(sendLoop);
  };

  // Draw Bounding Boxes on Overlay
  const drawBoundingBoxes = (dets: DetectionItem[]) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (video.videoWidth || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);

    dets.forEach(det => {
      const [x1, y1, x2, y2] = det.box;
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      let color = '#06b6d4'; // cyan default
      if (det.category === 'Pedestrian') color = '#22c55e'; // green
      if (det.category === 'Road Damage') color = '#ef4444'; // red
      if (det.category === 'Vehicle') color = '#3b82f6'; // blue
      if (det.danger_level === 'Danger Zone' || det.danger_level === 'Critical') color = '#dc2626';

      // Draw box
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.strokeRect(bx, by, bw, bh);

      // Label tag with Tracking ID
      const labelText = `${det.label}${det.tracking_id ? ` #${det.tracking_id}` : ''} ${Math.round(det.confidence * 100)}%`;
      ctx.font = 'bold 11px sans-serif';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = color;
      ctx.fillRect(bx, Math.max(0, by - 18), textWidth + 8, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, bx + 4, Math.max(12, by - 5));
    });
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth || 640;
    captureCanvas.height = video.videoHeight || 480;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    setCapturedFlash(true);
    setTimeout(() => setCapturedFlash(false), 200);

    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
    if (onSnapshotCaptured) {
      onSnapshotCaptured(dataUrl, detections);
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-lg">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Live AI Road Camera & Object Detection
              {isCameraActive && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              YOLO real-time object tracking, live GPS coordinates & automatic event video recording
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceListening}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title={isListening ? 'Stop Listening' : 'Start Voice Commands'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-slate-400" />}
            <span>{isListening ? 'Listening...' : 'Voice Command'}</span>
          </button>

          {/* Device Camera Switching (Mobile front/rear) */}
          <button
            type="button"
            onClick={switchCameraFacing}
            disabled={!isCameraActive}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 rounded-xl text-slate-300 transition-all"
            title="Switch Front/Rear Camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Start / Stop Camera Button */}
          {!isCameraActive ? (
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 flex items-center space-x-2 transition-all"
            >
              <VideoOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}

          {/* Manual Start / Stop Recording Button */}
          {isCameraActive && (
            !isRecording ? (
              <button
                type="button"
                onClick={() => startRecording('manual')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-2 transition-all"
              >
                <Radio className="w-4 h-4 text-red-400" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-2 animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Recording ({formatRecordingTime(recordingSeconds)})</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Voice Transcript Toast */}
      {voiceTranscript && (
        <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-xs text-cyan-200 flex items-center space-x-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Recognized speech: <strong>"{voiceTranscript}"</strong></span>
        </div>
      )}

      {/* Saving Notice */}
      {savingNotice && (
        <div className="p-3 bg-purple-950/80 border border-purple-500/50 rounded-xl text-xs text-purple-200 flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>{savingNotice}</span>
        </div>
      )}

      {/* Camera Permission / Device Error Banner */}
      {cameraError && (
        <div className="p-4 bg-red-950/90 border border-red-500/70 rounded-2xl text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-white">Camera Access Notice</p>
              <p className="text-[11px] text-red-300 mt-0.5">{cameraError}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {!isLocalhost && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `http://localhost:${window.location.port || '5173'}${window.location.pathname}`;
                }}
                className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-white font-medium text-xs shadow transition-colors flex items-center space-x-1"
                title="Switch to http://localhost on this computer for immediate webcam access"
              >
                <span>Switch to localhost</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 rounded-lg text-white font-medium text-xs transition-colors"
            >
              Retry Camera
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center"
      >
        {/* Flash effect on snapshot */}
        {capturedFlash && <div className="absolute inset-0 bg-white z-40 animate-fadeOut" />}

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-contain ${!isCameraActive ? 'hidden' : 'block'}`}
        />

        {/* Bounding Box Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 pointer-events-none z-10 w-full h-full object-contain ${!isCameraActive ? 'hidden' : 'block'}`}
        />

        {/* Inactive Camera Placeholder */}
        {!isCameraActive && (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-full shadow-inner">
              <Camera className="w-12 h-12 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Camera is Inactive</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Click "Start Camera" to access your laptop webcam or mobile camera for real-time YOLO detection and hazard alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-600/30 flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          </div>
        )}

        {/* Live Overlays (When Camera is Active) */}
        {isCameraActive && (
          <>
            {/* Top Left: Prestart Vehicle Safety Advisory Badge */}
            <div className="absolute top-3 left-3 z-20 flex flex-col space-y-1">
              <div
                className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg flex items-center space-x-2 ${
                  prestartStatus === 'STOP – DANGER DETECTED'
                    ? 'bg-red-950/80 border-red-500 text-red-200'
                    : prestartStatus === 'CAUTION'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                }`}
              >
                {prestartStatus === 'STOP – DANGER DETECTED' ? (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                ) : prestartStatus === 'CAUTION' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">{prestartStatus}</span>
              </div>

              {/* Prestart reasons */}
              {prestartReasons.length > 0 && (
                <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-slate-300 max-w-xs">
                  {prestartReasons[0]}
                </div>
              )}
            </div>

            {/* Top Right: Telemetry & Recording Indicator */}
            <div className="absolute top-3 right-3 z-20 flex items-center space-x-2">
              {/* Visible Recording Indicator (Phase 5) */}
              {isRecording && (
                <div className="px-3 py-1 bg-red-950/90 border border-red-500 rounded-xl flex items-center space-x-2 text-xs font-mono font-bold text-red-300 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>REC {formatRecordingTime(recordingSeconds)}</span>
                </div>
              )}

              {/* FPS & Latency Counter */}
              <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md border border-slate-700/80 rounded-xl text-[11px] font-mono text-cyan-400 flex items-center space-x-2">
                <span>{fps} FPS</span>
                <span className="text-slate-600">|</span>
                <span>{latencyMs}ms</span>
              </div>
            </div>

            {/* Bottom Left: Live Counts HUD */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2">
              <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md border border-slate-700/80 rounded-xl text-xs flex items-center space-x-3 text-white">
                <span className="flex items-center gap-1 text-blue-400">
                  <Car className="w-3.5 h-3.5" /> {counts.vehicles}
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Users className="w-3.5 h-3.5" /> {counts.pedestrians}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> {counts.hazards}
                </span>
              </div>
            </div>

            {/* Bottom Right: Quick Snapshot Button */}
            <div className="absolute bottom-3 right-3 z-20">
              <button
                type="button"
                onClick={captureSnapshot}
                className="p-2.5 bg-black/75 hover:bg-slate-800 text-white rounded-xl border border-slate-700 backdrop-blur-md transition-all shadow-lg"
                title="Capture Snapshot Evidence"
              >
                <Aperture className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* PHASE 3: Live GPS Device Location & Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl ${gpsCoords ? 'bg-cyan-950 border border-cyan-800' : 'bg-slate-800'}`}>
            <MapPin className={`w-4 h-4 ${gpsCoords ? 'text-cyan-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Device GPS Location</span>
              {gpsActive ? (
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                  Tracking Active
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
                  Tracking Stopped
                </span>
              )}
            </div>

            {gpsError ? (
              <p className="text-xs text-amber-400 mt-0.5">{gpsError}</p>
            ) : gpsCoords ? (
              <p className="text-xs font-mono text-cyan-300 mt-0.5">
                Lat: {gpsCoords.latitude.toFixed(6)}, Lng: {gpsCoords.longitude.toFixed(6)} | Accuracy: ±{Math.round(gpsCoords.accuracy || 0)}m | Time: {gpsCoords.timestamp}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">Acquiring live browser geolocation...</p>
            )}
          </div>
        </div>

        {/* GPS Controls */}
        <div className="flex items-center space-x-2.5">
          {gpsActive ? (
            <button
              type="button"
              onClick={stopGpsTracking}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              Stop GPS
            </button>
          ) : (
            <button
              type="button"
              onClick={startGpsTracking}
              className="px-3 py-1.5 bg-cyan-900/60 hover:bg-cyan-900 text-cyan-300 rounded-xl text-xs font-semibold border border-cyan-800 transition-colors"
            >
              Resume GPS
            </button>
          )}

          {onOpenMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Map</span>
            </button>
          )}
        </div>
      </div>

      {/* PHASE 7: Ethics & Responsible AI Notice */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex items-center space-x-2">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span>
          <strong>Safety & Ethics:</strong> YOLO object tracking assigns spatial IDs (e.g. Pedestrian #1) for proximity and collision prevention. The platform does not use facial recognition, biometric identity, or claim to determine driver identities.
        </span>
      </div>
    </div>
  );
};
