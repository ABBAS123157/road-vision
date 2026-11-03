import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Car, ShieldAlert, Hammer, RotateCcw, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { api } from '../services/api';

type TwinMode = 'inspection' | 'traffic' | 'safety' | 'construction';

export const DigitalTwin: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeMode, setActiveMode] = useState<TwinMode>('inspection');
  const [telemetry, setTelemetry] = useState({
    activeVehicles: 0,
    inspectedPotholes: 0,
    pedestriansAtRisk: 0,
    constructionProgress: '100% Verified'
  });

  useEffect(() => {
    api.getDashboardStats()
      .then(stats => {
        setTelemetry({
          activeVehicles: stats.vehicles_detected || 0,
          inspectedPotholes: stats.potholes_detected || 0,
          pedestriansAtRisk: stats.persons_detected || 0,
          constructionProgress: stats.potholes_detected > 0 ? 'Action Required' : 'Optimal Surface'
        });
      })
      .catch(() => {});
  }, []);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 5. Road Corridor Surface
    const roadGeo = new THREE.PlaneGeometry(16, 120);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f242e, roughness: 0.85 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    scene.add(roadMesh);

    // Sidewalks
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const sidewalkLeft = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 120), sidewalkMat);
    sidewalkLeft.position.set(-9.5, 0.2, 0);
    scene.add(sidewalkLeft);

    const sidewalkRight = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 120), sidewalkMat);
    sidewalkRight.position.set(9.5, 0.2, 0);
    scene.add(sidewalkRight);

    // Road Markings: Dashed center line
    const dashGroup = new THREE.Group();
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -55; z <= 55; z += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      dashGroup.add(dash);
    }
    scene.add(dashGroup);

    // Zebra Crosswalk
    const zebraGroup = new THREE.Group();
    for (let x = -7; x <= 7; x += 1.4) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 4), dashMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.02, 10);
      zebraGroup.add(stripe);
    }
    scene.add(zebraGroup);

    // 6. Buildings along Roadside
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const h = 10 + Math.random() * 15;
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(8, h, 10), buildingMat);
      b1.position.set(-16, h / 2, -45 + i * 15);
      scene.add(b1);

      const b2 = new THREE.Mesh(new THREE.BoxGeometry(8, h * 0.9, 10), buildingMat);
      b2.position.set(16, (h * 0.9) / 2, -45 + i * 15);
      scene.add(b2);
    }

    // 7. Potholes & Damage Models
    const damageGroup = new THREE.Group();
    // Pothole 1 (Sunken dark oval cavity)
    const potholeGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.35, 16);
    const potholeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 });
    const pothole1 = new THREE.Mesh(potholeGeo, potholeMat);
    pothole1.position.set(2.5, -0.05, 5);
    damageGroup.add(pothole1);

    // Pothole 2
    const pothole2 = new THREE.Mesh(potholeGeo, potholeMat);
    pothole2.position.set(-3.2, -0.05, -20);
    damageGroup.add(pothole2);

    // Waterlogging Puddle (Shiny reflective pool)
    const puddleGeo = new THREE.CircleGeometry(2.2, 24);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x1e40af,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75
    });
    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(-2, 0.03, -5);
    damageGroup.add(puddle);

    scene.add(damageGroup);

    // 8. Construction Zone Cones & Barriers
    const constructionGroup = new THREE.Group();
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    for (let i = 0; i < 5; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 16), coneMat);
      cone.position.set(-4.5, 0.5, 18 + i * 2.5);
      constructionGroup.add(cone);
    }
    // Work Barrier
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    barrier.position.set(-4.5, 0.6, 16);
    constructionGroup.add(barrier);
    scene.add(constructionGroup);

    // 9. Vehicles Group (Moving dynamically)
    const vehicles: { mesh: THREE.Group; speed: number; laneX: number; isEmergency?: boolean }[] = [];

    const createCar = (color: number, laneX: number, startZ: number, speed: number, isAmbulance = false) => {
      const carGroup = new THREE.Group();

      // Body
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 4.2), bodyMat);
      body.position.y = 0.7;
      carGroup.add(body);

      // Cabin / Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.2), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      cabin.position.set(0, 1.4, -0.3);
      carGroup.add(cabin);

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
      [[-1.0, 1.2], [1.0, 1.2], [-1.0, -1.2], [1.0, -1.2]].forEach(([wx, wz]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.35, wz);
        carGroup.add(w);
      });

      // Flashing beacon for emergency ambulance
      if (isAmbulance) {
        const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.set(0, 1.85, -0.3);
        carGroup.add(beacon);
      }

      carGroup.position.set(laneX, 0, startZ);
      scene.add(carGroup);
      vehicles.push({ mesh: carGroup, speed, laneX, isEmergency: isAmbulance });
    };

    createCar(0x3b82f6, 3.5, -35, 0.25);
    createCar(0x10b981, 3.5, 10, 0.22);
    createCar(0xe2e8f0, -3.5, 25, -0.28);
    createCar(0xf59e0b, -3.5, -15, -0.26);
    // Emergency Ambulance
    createCar(0xffffff, 3.5, -50, 0.35, true);

    // 10. Pedestrians on Crosswalk
    const pedMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const ped1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6), pedMat);
    ped1.position.set(2, 0.8, 10);
    scene.add(ped1);

    // Animation Loop
    let reqId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Move vehicles along corridor
      vehicles.forEach(v => {
        v.mesh.position.z += v.speed;
        if (v.mesh.position.z > 60) v.mesh.position.z = -60;
        if (v.mesh.position.z < -60) v.mesh.position.z = 60;
      });

      // Gently rotate camera around corridor
      const time = clock.getElapsedTime() * 0.15;
      camera.position.x = Math.sin(time) * 12;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight || 500;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Twin Header & Mode Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            3D Digital Twin – Road Infrastructure & Corridor Simulation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time synchronized 3D twin showing road defects, traffic flow, emergency routes, and construction.
          </p>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveMode('inspection')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              activeMode === 'inspection' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspection</span>
          </button>

          <button
            onClick={() => setActiveMode('traffic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              activeMode === 'traffic' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Traffic</span>
          </button>

          <button
            onClick={() => setActiveMode('safety')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              activeMode === 'safety' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Safety</span>
          </button>

          <button
            onClick={() => setActiveMode('construction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              activeMode === 'construction' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Construction</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl h-[480px]">
        <div ref={mountRef} className="w-full h-full" />

        {/* Overlay Telemetry HUD */}
        <div className="absolute top-4 left-4 z-20 space-y-2 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Simulation View:</span>
              <strong className="text-blue-400 uppercase font-mono">{activeMode} Mode</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Potholes in Twin:</span>
              <strong className="text-red-400">{telemetry.inspectedPotholes} Active</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Traffic Stream:</span>
              <strong className="text-emerald-400">{telemetry.activeVehicles} Vehicles</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Crosswalk Risk:</span>
              <strong className="text-amber-400">1 Pedestrian Warning</strong>
            </div>
          </div>
        </div>

        {/* Mode Explanations Bottom Pill */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl max-w-lg text-center">
            {activeMode === 'inspection' && 'Inspection Mode: Highlighting asphalt cavities, sunken potholes, and waterlogged pools.'}
            {activeMode === 'traffic' && 'Traffic Mode: Simulating bidirectional vehicle velocities, queue dynamics, and ambulance clearance.'}
            {activeMode === 'safety' && 'Safety Mode: Monitoring pedestrian crosswalk proximity and high-risk conflict zones.'}
            {activeMode === 'construction' && 'Construction Mode: Visualizing active repair zones, traffic diversion cones, and work crews.'}
          </div>
        </div>
      </div>
    </div>
  );
};

