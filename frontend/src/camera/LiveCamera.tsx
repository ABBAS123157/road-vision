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
  XCircle
} from 'lucide-react';
import { DetectionItem, LiveDetectionResponse } from '../services/api';
import { audioAlerts } from '../services/audio';

interface LiveCameraProps {
  onSnapshotCaptured?: (dataUrl: string, detections: DetectionItem[]) => void;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({ onSnapshotCaptured }) => {
  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(audioAlerts.getMuted());

  // AI & Detection Telemetry
  const [fps, setFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [prestartStatus, setPrestartStatus] = useState<string>('SAFE TO PROCEED');
  const [prestartReasons, setPrestartReasons] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFlash, setCapturedFlash] = useState<boolean>(false);

  // Counts
  const [counts, setCounts] = useState({
    vehicles: 0,
    pedestrians: 0,
    hazards: 0,
    potholes: 0,
    total: 0
  });

  // GPS state for saving detections
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Track previous prestart status to trigger audio on change
  const prevPrestartRef = useRef<string>('SAFE TO PROCEED');

  // Enumerate camera devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setCameraError('MediaDevices API not supported in this browser.');
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

  useEffect(() => {
    updateDeviceList();
    navigator.mediaDevices?.addEventListener('devicechange', updateDeviceList);

    // Watch GPS location if user consented
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.log('Geolocation note:', err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', updateDeviceList);
      stopCamera();
    };
  }, []);

  // Initialize or connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-detection`;

    setWsStatus('connecting');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[RoadVision AI] WebSocket connected');
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

        // Trigger Audio Chime & Speech when status changes
        if (newPrestart !== prevPrestartRef.current) {
          if (newPrestart === 'STOP – DANGER DETECTED') {
            audioAlerts.playAlertBeep('critical');
            audioAlerts.speak('Warning! Stop. Danger detected in path.');
          } else if (newPrestart === 'CAUTION') {
            audioAlerts.playAlertBeep('warning');
            audioAlerts.speak('Caution. Surrounding traffic or road defect nearby.');
          } else if (newPrestart === 'SAFE TO PROCEED' && prevPrestartRef.current !== 'SAFE TO PROCEED') {
            audioAlerts.playAlertBeep('success');
            audioAlerts.speak('Forward road clear. Safe to proceed.');
          }
          prevPrestartRef.current = newPrestart;
        }

        // Draw bounding boxes on canvas
        drawBoundingBoxes(data.detections || []);
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[RoadVision AI] WebSocket error:', err);
      setWsStatus('disconnected');
    };

    ws.onclose = () => {
      console.log('[RoadVision AI] WebSocket closed');
      setWsStatus('disconnected');
    };

    wsRef.current = ws;
  }, []);

  // Start Camera
  const startCamera = async (targetDeviceId?: string, targetFacing?: 'user' | 'environment') => {
    setCameraError(null);
    try {
      // Release existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const activeFacing = targetFacing || facingMode;
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: activeFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      await updateDeviceList();
      connectWebSocket();
      startFrameStreaming();
      audioAlerts.playAlertBeep('info');
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please grant camera permission in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please connect an external USB webcam.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access camera.'}`);
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
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
    // Clear canvas overlay
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setIsCameraActive(false);
    setWsStatus('disconnected');
    setDetections([]);
    setFps(0);
    setLatencyMs(0);
  };

  // Switch between front and rear cameras (Mobile support)
  const switchCameraFacing = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (isCameraActive) {
      await startCamera(undefined, newFacing);
    }
  };

  // Device dropdown selection
  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      await startCamera(deviceId);
    }
  };

  // Capture Image
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth || 640;
    captureCanvas.height = video.videoHeight || 480;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    // Flash animation
    setCapturedFlash(true);
    setTimeout(() => setCapturedFlash(false), 200);
    audioAlerts.playAlertBeep('info');

    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
    if (onSnapshotCaptured) {
      onSnapshotCaptured(dataUrl, detections);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
      setIsFullscreen(false);
    }
  };

  // Stream frames to WebSocket with dynamic throttling (~10 FPS)
  const startFrameStreaming = () => {
    let lastSent = 0;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 480; // Optimized resolution for low-latency YOLO inference
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
        // Send every ~90ms (~11 FPS) to maintain real-time responsiveness without network bloat
        if (now - lastSent >= 90) {
          captureCtx?.drawImage(videoRef.current, 0, 0, 480, 360);
          const base64Data = captureCanvas.toDataURL('image/jpeg', 0.65);
          const payload = {
            image: base64Data,
            latitude: gpsCoords?.lat,
            longitude: gpsCoords?.lng,
            user_id: 1
          };
          wsRef.current.send(JSON.stringify(payload));
          lastSent = now;
        }
      }
      animationFrameRef.current = requestAnimationFrame(sendLoop);
    };

    animationFrameRef.current = requestAnimationFrame(sendLoop);
  };

  // Canvas Bounding Box Renderer
  const drawBoundingBoxes = (items: DetectionItem[]) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synchronize canvas coordinate resolution with video
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = vw / 480;
    const scaleY = vh / 360;

    items.forEach(det => {
      const [origX1, origY1, origX2, origY2] = det.box;
      const x1 = origX1 * scaleX;
      const y1 = origY1 * scaleY;
      const x2 = origX2 * scaleX;
      const y2 = origY2 * scaleY;
      const boxW = x2 - x1;
      const boxH = y2 - y1;

      // Color scheme based on category
      let strokeColor = '#3B82F6'; // Blue
      let fillColor = 'rgba(59, 130, 246, 0.15)';
      if (det.category === 'Pedestrian') {
        strokeColor = '#FBBF24'; // Yellow
        fillColor = 'rgba(251, 191, 36, 0.2)';
      } else if (det.category === 'Road Damage') {
        strokeColor = '#EF4444'; // Red
        fillColor = 'rgba(239, 68, 68, 0.25)';
      } else if (det.category === 'Emergency Vehicle') {
        strokeColor = '#EC4899'; // Pink / Magenta
        fillColor = 'rgba(236, 72, 153, 0.25)';
      } else if (det.category === 'Safety Gear') {
        strokeColor = '#10B981'; // Green
        fillColor = 'rgba(16, 185, 129, 0.2)';
      }

      if (det.danger_level === 'Danger Zone' || det.is_wrong_way) {
        strokeColor = '#DC2626';
        fillColor = 'rgba(220, 38, 38, 0.35)';
      }

      // Draw box
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.rect(x1, y1, boxW, boxH);
      ctx.stroke();
      ctx.fill();

      // Corner accent brackets
      const corner = Math.min(12, boxW / 4, boxH / 4);
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(x1, y1 + corner);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + corner, y1);
      // Top-Right
      ctx.moveTo(x2 - corner, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + corner);
      // Bottom-Left
      ctx.moveTo(x1, y2 - corner);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + corner, y2);
      // Bottom-Right
      ctx.moveTo(x2 - corner, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - corner);
      ctx.stroke();

      // Label background & text
      let caption = `${det.tracking_id ? '#' + det.tracking_id + ' ' : ''}${det.label} ${Math.round(det.confidence * 100)}%`;
      if (det.speed_kmh && det.speed_kmh > 0) {
        caption += ` | ${det.speed_kmh}km/h`;
      }
      if (det.is_wrong_way) {
        caption += ' [WRONG WAY]';
      }

      ctx.font = 'bold 12px Inter, sans-serif';
      const textWidth = ctx.measureText(caption).width;
      const textHeight = 16;

      ctx.fillStyle = strokeColor;
      ctx.fillRect(x1, Math.max(0, y1 - textHeight - 4), textWidth + 10, textHeight + 4);

      ctx.fillStyle = '#000000';
      ctx.fillText(caption, x1 + 5, Math.max(12, y1 - 4));
    });
  };

  return (
    <div className="space-y-4">
      {/* Pre-Start Safety Advisory Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg transition-all duration-300 ${
          prestartStatus === 'STOP – DANGER DETECTED'
            ? 'bg-red-950/80 border-red-500 text-red-200 animate-pulse'
            : prestartStatus === 'CAUTION'
            ? 'bg-amber-950/70 border-amber-500 text-amber-200'
            : 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {prestartStatus === 'STOP – DANGER DETECTED' && <ShieldAlert className="w-8 h-8 text-red-400 shrink-0 animate-bounce" />}
          {prestartStatus === 'CAUTION' && <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />}
          {prestartStatus === 'SAFE TO PROCEED' && <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold opacity-75">Pre-Start Advisory:</span>
              <span className="font-black text-lg tracking-wide">{prestartStatus}</span>
            </div>
            {prestartReasons.length > 0 && (
              <p className="text-xs opacity-90 mt-0.5 line-clamp-1">{prestartReasons[0]}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const muted = audioAlerts.toggleMute();
              setIsMuted(muted);
            }}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition ${
              isMuted ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-blue-600/30 border-blue-500 text-blue-300'
            }`}
            title="Toggle audio voice & chimes"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Voice On'}</span>
          </button>
        </div>
      </div>

      {/* Camera Viewport & Overlay Container */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl aspect-video w-full flex items-center justify-center group"
      >
        {/* Flash effect on snapshot capture */}
        {capturedFlash && <div className="absolute inset-0 bg-white/70 z-50 pointer-events-none transition-opacity duration-200" />}

        {/* Video feed element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
        />

        {/* Real-time HTML5 Canvas bounding box overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${!isCameraActive ? 'hidden' : ''}`}
        />

        {/* Camera Inactive Placeholder */}
        {!isCameraActive && (
          <div className="text-center p-6 space-y-4 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-blue-400 shadow-inner">
              <Camera className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Live Camera AI Detection</h3>
              <p className="text-sm text-slate-400 mt-1">
                Real-time YOLO object detection, road damage recognition, pedestrian safety, and ByteTrack tracking.
              </p>
            </div>
            <button
              onClick={() => startCamera()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 mx-auto active:scale-95"
            >
              <Camera className="w-5 h-5" />
              <span>Start Camera</span>
            </button>
          </div>
        )}

        {/* Camera Error Message Banner */}
        {cameraError && (
          <div className="absolute inset-x-4 top-4 z-40 bg-red-950/90 border border-red-500/80 text-red-200 p-3.5 rounded-xl text-xs md:text-sm flex items-start gap-2.5 shadow-xl backdrop-blur-md">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Camera Access Warning</p>
              <p className="mt-0.5 opacity-90">{cameraError}</p>
            </div>
            <button
              onClick={() => startCamera()}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-700 rounded-lg text-white font-medium text-xs shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live Top Status Telemetry HUD */}
        {isCameraActive && (
          <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
            {/* Left Status Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur border border-slate-700/70 rounded-lg text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>REC LIVE</span>
              </span>

              <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur border border-slate-700/70 rounded-lg text-xs font-mono text-slate-200 shadow">
                {fps} FPS
              </span>

              <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur border border-slate-700/70 rounded-lg text-xs font-mono text-slate-200 shadow">
                {latencyMs} ms
              </span>

              <span
                className={`px-2.5 py-1 backdrop-blur border rounded-lg text-xs font-mono shadow ${
                  wsStatus === 'connected'
                    ? 'bg-blue-950/80 border-blue-500/70 text-blue-300'
                    : 'bg-amber-950/80 border-amber-500/70 text-amber-300'
                }`}
              >
                AI WS: {wsStatus.toUpperCase()}
              </span>
            </div>

            {/* Right Detection Summary */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-900/80 backdrop-blur border border-slate-700/70 rounded-lg text-xs font-medium text-slate-200 shadow">
                Objects: <strong className="text-white">{counts.total}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Bottom Floating Control Bar */}
        {isCameraActive && (
          <div className="absolute bottom-3 inset-x-3 z-30 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-xl">
            {/* Camera selector & Switch */}
            <div className="flex items-center gap-2">
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px] md:max-w-[200px] truncate"
                >
                  {devices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={switchCameraFacing}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Switch front/rear camera (Mobile)"
              >
                <SwitchCamera className="w-4 h-4 text-blue-400" />
                <span className="hidden md:inline">{facingMode === 'environment' ? 'Rear' : 'Front'}</span>
              </button>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={captureSnapshot}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition active:scale-95"
                title="Capture and save inspection image"
              >
                <Aperture className="w-4 h-4" />
                <span>Capture</span>
              </button>

              <button
                onClick={stopCamera}
                className="px-3.5 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                title="Stop camera and release hardware"
              >
                <VideoOff className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
                title="Toggle fullscreen mode"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live AI Statistics Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Vehicles</p>
            <p className="text-xl font-bold text-white">{counts.vehicles}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Pedestrians</p>
            <p className="text-xl font-bold text-white">{counts.pedestrians}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Hazards</p>
            <p className="text-xl font-bold text-white">{counts.hazards}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Potholes</p>
            <p className="text-xl font-bold text-white">{counts.potholes}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Tracked</p>
            <p className="text-xl font-bold text-white">{counts.total}</p>
          </div>
        </div>
      </div>

      {/* Active Detections Feed Table */}
      {detections.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Active Real-Time Tracked Objects ({detections.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {detections.map((det, idx) => (
              <div
                key={idx}
                className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                  det.danger_level === 'Danger Zone' || det.is_wrong_way
                    ? 'bg-red-950/60 border-red-500/50 text-red-200'
                    : det.category === 'Road Damage'
                    ? 'bg-orange-950/60 border-orange-500/50 text-orange-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}
              >
                <span className="font-mono text-blue-400 font-bold">#{det.tracking_id || idx + 1}</span>
                <span className="font-semibold">{det.label}</span>
                <span className="opacity-75">{Math.round(det.confidence * 100)}%</span>
                {det.speed_kmh && det.speed_kmh > 0 && (
                  <span className="text-emerald-400 font-mono">({det.speed_kmh} km/h)</span>
                )}
                {det.is_wrong_way && <span className="font-bold text-red-400 animate-pulse">[WRONG WAY]</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

