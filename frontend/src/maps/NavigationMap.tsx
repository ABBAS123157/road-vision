import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  AlertTriangle,
  Gauge,
  Play,
  Square,
  Volume2,
  VolumeX,
  Compass,
  MapPin,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { api, HazardAlert, SpeedAdvisory } from '../services/api';
import { audioAlerts } from '../services/audio';

export const NavigationMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const hazardMarkersRef = useRef<L.Marker[]>([]);
  const simIntervalRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // User Telemetry
  const [userPos, setUserPos] = useState<[number, number]>([28.6139, 77.2090]);
  const [heading, setHeading] = useState<number>(0);
  const [gpsSpeed, setGpsSpeed] = useState<number>(0.0);
  const [roadType, setRoadType] = useState<string>('City Road');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'denied' | 'unavailable'>('acquiring');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Speed Advisory & Hazards
  const [speedAdvisory, setSpeedAdvisory] = useState<SpeedAdvisory | null>(null);
  const [activeHazards, setActiveHazards] = useState<HazardAlert[]>([]);
  const [topAlert, setTopAlert] = useState<HazardAlert | null>(null);

  // Real-time Geolocation tracking (Phase 5)
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setGpsErrorMsg('Geolocation API is not supported by your browser.');
      return;
    }

    setGpsStatus('acquiring');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const spd = pos.coords.speed !== null ? Math.round(Math.max(0, pos.coords.speed * 3.6)) : 0;
        const head = pos.coords.heading !== null ? Math.round(pos.coords.heading) : 0;
        const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;

        setUserPos([lat, lng]);
        setGpsSpeed(spd);
        if (head) setHeading(head);
        setGpsAccuracy(acc);
        setGpsStatus('locked');
        setGpsErrorMsg(null);

        updateUserPosition(lat, lng, head);

        // Fetch advance road hazard guidance for actual location
        fetchHazardsAndGuidance(lat, lng, head, spd);

        // Sync to backend DB
        api.sendGpsUpdate({
          latitude: lat,
          longitude: lng,
          accuracy: acc ?? undefined,
          speed: spd,
          heading: head
        }).catch(() => {});
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus('denied');
          setGpsErrorMsg('Location permission denied. Please allow GPS access in your browser settings.');
        } else if (err.code === 2) {
          setGpsStatus('unavailable');
          setGpsErrorMsg('GPS position unavailable. Check device location service.');
        } else {
          setGpsStatus('acquiring');
          setGpsErrorMsg('Acquiring satellite lock...');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userPos,
      zoom: 16,
      zoomControl: true
    });

    // OpenStreetMap CartoDB dark matter or standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom Vehicle Marker Icon
    const carIcon = L.divIcon({
      className: 'vehicle-nav-marker',
      html: `
        <div style="transform: rotate(${heading}deg); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #2563EB; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(37,99,235,0.7);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const userMarker = L.marker(userPos, { icon: carIcon }).addTo(map);
    userMarkerRef.current = userMarker;
    mapRef.current = map;

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update User Marker position & rotation
  const updateUserPosition = (lat: number, lng: number, head: number) => {
    setUserPos([lat, lng]);
    setHeading(head);

    if (userMarkerRef.current && mapRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      const carIcon = L.divIcon({
        className: 'vehicle-nav-marker',
        html: `
          <div style="transform: rotate(${head}deg); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #2563EB; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(37,99,235,0.7);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      userMarkerRef.current.setIcon(carIcon);
      mapRef.current.panTo([lat, lng], { animate: true });
    }
  };

  // Fetch advance hazard warnings and speed advisory
  const fetchHazardsAndGuidance = async (lat: number, lng: number, head: number, speed: number) => {
    try {
      // 1. Advance hazard query
      const hazards = await api.getRouteHazards(lat, lng, head);
      setActiveHazards(hazards);

      // Render hazard markers on map
      if (mapRef.current) {
        hazardMarkersRef.current.forEach(m => m.remove());
        hazardMarkersRef.current = [];

        hazards.forEach(h => {
          const color = h.severity === 'Critical' ? '#EF4444' : h.severity === 'High' ? '#F97316' : '#F59E0B';
          const hIcon = L.divIcon({
            className: 'hazard-pin',
            html: `
              <div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${color};">
                <span style="font-size: 13px;">⚠️</span>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          const marker = L.marker([h.latitude, h.longitude], { icon: hIcon }).addTo(mapRef.current!);
          marker.bindPopup(`<b>${h.hazard_type}</b><br/>${h.description}<br/>Distance: ${h.distance_meters}m`);
          hazardMarkersRef.current.push(marker);
        });
      }

      // Check top alert
      if (hazards.length > 0) {
        const closest = hazards[0];
        setTopAlert(closest);

        // Voice alerts based on advance stage
        if (closest.advance_stage === '1km') {
          audioAlerts.speak(`Advance notice: ${closest.hazard_type} reported approximately 1 kilometer ahead on your route.`);
        } else if (closest.advance_stage === '500m') {
          audioAlerts.playAlertBeep('warning');
          audioAlerts.speak(`Warning: ${closest.hazard_type} 500 meters ahead. Reduce speed.`);
        } else if (closest.advance_stage === '200m' || closest.advance_stage === 'immediate') {
          audioAlerts.playAlertBeep('critical');
          audioAlerts.speak(`Caution: ${closest.hazard_type} immediately ahead.`);
        }
      } else {
        setTopAlert(null);
      }

      // 2. Speed advisory query
      const adv = await api.getSpeedAdvisory(speed, roadType, hazards.length > 0);
      setSpeedAdvisory(adv);
    } catch (e) {
      console.warn('Navigation advisory fetch error:', e);
    }
  };

  // Toggle Live Driving Simulation along corridor
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      let step = 0;
      // Vehicle drives North-East along road
      const deltaLat = 0.00012; // ~13 meters per tick
      const deltaLng = 0.00004;

      simIntervalRef.current = setInterval(() => {
        step++;
        setUserPos(prev => {
          const nextLat = prev[0] + deltaLat;
          const nextLng = prev[1] + deltaLng;
          updateUserPosition(nextLat, nextLng, 45);

          // Fluctuating speed
          const currentSpeed = 52.0 + Math.sin(step * 0.3) * 8.0;
          setGpsSpeed(Math.round(currentSpeed));

          // Query hazards every 4 steps
          if (step % 3 === 0) {
            fetchHazardsAndGuidance(nextLat, nextLng, 45, currentSpeed);
          }
          return [nextLat, nextLng];
        });
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      {/* GPS Status & Hardware Connection Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${
            gpsStatus === 'locked' ? 'bg-emerald-500/20 text-emerald-400' :
            gpsStatus === 'denied' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'
          }`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white">Live Device GPS Stream</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                gpsStatus === 'locked' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                gpsStatus === 'denied' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {gpsStatus === 'locked' ? 'GPS Locked' : gpsStatus === 'denied' ? 'Permission Denied' : 'Acquiring Signal...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {gpsStatus === 'locked'
                ? `${userPos[0].toFixed(6)}° N, ${userPos[1].toFixed(6)}° E ${gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}`
                : gpsErrorMsg || 'Requesting browser location permission...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="text-right hidden md:block">
            <span className="text-slate-400 block text-[10px]">Heading Vector</span>
            <span className="font-mono font-bold text-cyan-400">{heading}°</span>
          </div>
        </div>
      </div>

      {/* 1-Kilometre Advance Hazard Alert Banner */}
      {topAlert && (
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl transition-all ${
            topAlert.advance_stage === 'immediate' || topAlert.advance_stage === '200m'
              ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
              : topAlert.advance_stage === '500m'
              ? 'bg-amber-950/90 border-amber-500 text-amber-200'
              : 'bg-blue-950/90 border-blue-500 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40">
                  {topAlert.advance_stage === 'immediate'
                    ? 'IMMEDIATE HAZARD'
                    : topAlert.advance_stage?.toUpperCase() + ' ADVANCE ALERT'}
                </span>
                <span className="font-extrabold text-white text-base md:text-lg">{topAlert.hazard_type}</span>
              </div>
              <p className="text-xs mt-1 font-medium">{topAlert.driving_guidance}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs opacity-75">Distance:</span>
              <p className="text-xl font-black font-mono text-white">{Math.round(topAlert.distance_meters)}m</p>
            </div>
          </div>
        </div>
      )}

      {/* Speed Guidance HUD & Navigation Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">GPS Speed</p>
            <p className="text-2xl font-black font-mono text-white">
              {gpsSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
            </p>
          </div>
          <Gauge className="w-6 h-6 text-blue-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Verified Legal Limit</p>
            <p className="text-2xl font-black font-mono text-slate-200">
              {speedAdvisory?.legal_speed_limit || 50} <span className="text-xs font-normal text-slate-400">km/h</span>
            </p>
          </div>
          <span className="w-7 h-7 rounded-full border-2 border-red-500 flex items-center justify-center font-bold text-xs text-red-400">
            {speedAdvisory?.legal_speed_limit || 50}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">AI Advisory Speed</p>
            <p className="text-2xl font-black font-mono text-emerald-400">
              {speedAdvisory?.ai_advisory_speed || 40} <span className="text-xs font-normal text-slate-400">km/h</span>
            </p>
          </div>
          <ShieldAlert className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Driving Simulation</p>
            <button
              onClick={toggleSimulation}
              className={`mt-1 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                isSimulating ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isSimulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Stop Driving' : 'Drive Route'}</span>
            </button>
          </div>
          <Navigation className="w-6 h-6 text-indigo-400" />
        </div>
      </div>

      {/* Overspeed Warning Toast */}
      {speedAdvisory?.is_overspeed && (
        <div className="bg-red-600 text-white p-3 rounded-xl font-bold text-center text-sm animate-pulse shadow-lg">
          ⚠️ {speedAdvisory.warning}
        </div>
      )}

      {/* Leaflet Navigation Map Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl h-[480px]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Map Overlay Badge */}
        <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs space-y-1 shadow-lg">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Active Vehicle Position</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Advance Route Hazards ({activeHazards.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

