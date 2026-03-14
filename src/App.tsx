import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, User, Briefcase, Layers, MapPin, Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  
  const keyWRef = useRef<HTMLDivElement>(null);
  const keyARef = useRef<HTMLDivElement>(null);
  const keySRef = useRef<HTMLDivElement>(null);
  const keyDRef = useRef<HTMLDivElement>(null);

  const labelAboutRef = useRef<HTMLDivElement>(null);
  const labelExperienceRef = useRef<HTMLDivElement>(null);
  const labelPortfolioRef = useRef<HTMLDivElement>(null);

  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<string | null>(null);

  const stateRef = useRef({
    speed: 0,
    angle: Math.PI,
    keys: { w: false, a: false, s: false, d: false },
    activeZone: null as string | null,
    modalOpen: false
  });

  // Sync modalOpen state with ref for the game loop
  useEffect(() => {
    stateRef.current.modalOpen = modalOpen !== null;
  }, [modalOpen]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- THREE.JS SETUP ---
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color('#87CEEB'); // Daytime sky blue
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, 20, 120);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x87CEEB, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);

    // --- CITY GENERATION ---
    const colliders: THREE.Box3[] = []; // Array to store collision boxes

    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x9ca3af, // Light asphalt
        roughness: 0.8,
        metalness: 0.1
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    const cityGroup = new THREE.Group();
    scene.add(cityGroup);

    const zoneLocs = [
        { x: 0, z: 0, r: 15 }, // Spawn
        { x: -30, z: -30, r: 10 }, // About
        { x: 30, z: -30, r: 10 }, // Experience
        { x: 0, z: 40, r: 10 }  // Portfolio
    ];

    function isSafeZone(x: number, z: number) {
        return zoneLocs.some(zone => {
            const dist = Math.hypot(x - zone.x, z - zone.z);
            return dist < zone.r;
        });
    }

    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.5 }); // Light buildings
    
    for (let i = 0; i < 200; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;

        if (isSafeZone(x, z)) continue;

        const gridX = Math.round(x / 8) * 8;
        const gridZ = Math.round(z / 8) * 8;
        
        const h = Math.random() * 8 + 2;
        const w = Math.random() * 2 + 2;
        const d = Math.random() * 2 + 2;

        const mesh = new THREE.Mesh(buildingGeo, buildingMat);
        mesh.position.set(gridX, h/2, gridZ);
        mesh.scale.set(w, h, d);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        cityGroup.add(mesh);

        mesh.updateMatrixWorld();
        colliders.push(new THREE.Box3().setFromObject(mesh));

        if (Math.random() > 0.5) {
            const win = new THREE.Mesh(buildingGeo, new THREE.MeshBasicMaterial({ 
                color: 0x3f3f46, // Dark windows for daytime
                transparent: true, 
                opacity: 0.8 
            }));
            win.position.set(gridX, h - 1, gridZ + (d/2 + 0.05));
            win.scale.set(w * 0.6, 0.5, 0.1);
            cityGroup.add(win);
        }
    }

    const treeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }); // Brighter green
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f }); // Brown trunk
    const treeGeo = new THREE.ConeGeometry(1, 4, 8);
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 1);

    for(let i=0; i<60; i++) {
        const x = (Math.random() - 0.5) * 140;
        const z = (Math.random() - 0.5) * 140;
        if (isSafeZone(x, z)) continue;
        
        const gridX = Math.round(x / 8) * 8 + 3; 
        const gridZ = Math.round(z / 8) * 8 + 3;

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(gridX, 0.5, gridZ);
        trunk.castShadow = true;
        cityGroup.add(trunk);

        trunk.updateMatrixWorld();
        colliders.push(new THREE.Box3().setFromObject(trunk));

        const leaves = new THREE.Mesh(treeGeo, treeMat);
        leaves.position.set(gridX, 2.5, gridZ);
        leaves.castShadow = true;
        cityGroup.add(leaves);
    }

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 4);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x52525b });
    const bulbGeo = new THREE.SphereGeometry(0.2);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Off white

    for(let i=0; i<20; i++) {
         const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        if (isSafeZone(x, z)) continue;

         const gridX = Math.round(x / 16) * 16 - 4; 
         const gridZ = Math.round(z / 16) * 16 - 4;

         const pole = new THREE.Mesh(poleGeo, poleMat);
         pole.position.set(gridX, 2, gridZ);
         cityGroup.add(pole);

         const bulb = new THREE.Mesh(bulbGeo, bulbMat);
         bulb.position.set(gridX, 4, gridZ);
         cityGroup.add(bulb);
         
         // Removed point lights for daytime
    }

    // --- CAR SETUP ---
    const carGroup = new THREE.Group();

    const chassisGeo = new THREE.BoxGeometry(1.6, 0.6, 3.2);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2, metalness: 0.7 });
    const carChassis = new THREE.Mesh(chassisGeo, chassisMat);
    carChassis.position.y = 0.6;
    carChassis.castShadow = true;
    carGroup.add(carChassis);

    const cabinGeo = new THREE.BoxGeometry(1.4, 0.5, 1.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.1, -0.2);
    carGroup.add(cabin);

    const stripGeo = new THREE.BoxGeometry(1.4, 0.05, 0.05);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const rearStrip = new THREE.Mesh(stripGeo, stripMat);
    rearStrip.position.set(0, 0.7, 1.61);
    carGroup.add(rearStrip);
    
    const hlGeo = new THREE.BoxGeometry(0.4, 0.1, 0.05);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White headlights (not glowing)
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.position.set(-0.5, 0.6, -1.61);
    const hlRight = new THREE.Mesh(hlGeo, hlMat);
    hlRight.position.set(0.5, 0.6, -1.61);
    carGroup.add(hlLeft);
    carGroup.add(hlRight);
    
    // Removed spotlights for daytime

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
    wheelGeo.rotateZ(Math.PI / 2);

    const w1 = new THREE.Mesh(wheelGeo, wheelMat); w1.position.set(0.8, 0.35, 1);
    const w2 = new THREE.Mesh(wheelGeo, wheelMat); w2.position.set(-0.8, 0.35, 1);
    const w3 = new THREE.Mesh(wheelGeo, wheelMat); w3.position.set(0.8, 0.35, -1);
    const w4 = new THREE.Mesh(wheelGeo, wheelMat); w4.position.set(-0.8, 0.35, -1);
    carGroup.add(w1, w2, w3, w4);

    scene.add(carGroup);

    // --- ZONES ---
    const zones = [
        { id: 'about', x: -30, z: -30, color: 0xa855f7 },
        { id: 'experience', x: 30, z: -30, color: 0x3b82f6 },
        { id: 'portfolio', x: 0, z: 40, color: 0x10b981 }
    ];

    zones.forEach(zone => {
        const geo = new THREE.RingGeometry(3, 3.2, 32);
        const mat = new THREE.MeshBasicMaterial({ color: zone.color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(zone.x, 0.1, zone.z);
        scene.add(ring);

        const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 20, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.2 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(zone.x, 10, zone.z);
        scene.add(beacon);

        const pLight = new THREE.PointLight(zone.color, 1, 10);
        pLight.position.set(zone.x, 2, zone.z);
        scene.add(pLight);
    });

    // --- GAME LOGIC ---
    const ACCELERATION = 0.02;
    const FRICTION = 0.96;
    const MAX_SPEED = 0.6;
    const ROTATION_SPEED = 0.05;

    // --- PARTICLES (SMOKE) ---
    const particles: { mesh: THREE.Mesh, life: number }[] = [];
    const smokeGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 });

    const keyRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
        w: keyWRef,
        a: keyARef,
        s: keySRef,
        d: keyDRef
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (stateRef.current.modalOpen) {
            if(e.key === 'Escape') setModalOpen(null);
            return;
        }
        const k = e.key.toLowerCase();
        if (stateRef.current.keys.hasOwnProperty(k)) {
            stateRef.current.keys[k as keyof typeof stateRef.current.keys] = true;
            if (keyRefs[k]?.current) {
                keyRefs[k].current!.style.transform = 'translateY(4px)';
                keyRefs[k].current!.style.boxShadow = '0 0 0 #27272a';
            }
        }

        if (e.key === 'Enter' && stateRef.current.activeZone) {
            setModalOpen(stateRef.current.activeZone);
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        if (stateRef.current.keys.hasOwnProperty(k)) {
            stateRef.current.keys[k as keyof typeof stateRef.current.keys] = false;
            if (keyRefs[k]?.current) {
                keyRefs[k].current!.style.transform = '';
                keyRefs[k].current!.style.boxShadow = '';
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const labelRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
        about: labelAboutRef,
        experience: labelExperienceRef,
        portfolio: labelPortfolioRef
    };

    function updateLabels() {
        zones.forEach(zone => {
            const el = labelRefs[zone.id]?.current;
            if (!el) return;

            const pos = new THREE.Vector3(zone.x, 3.5, zone.z);
            pos.project(camera);

            const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;

            const dist = carGroup.position.distanceTo(new THREE.Vector3(zone.x, 0, zone.z));
            const maxDist = 40;

            if (pos.z < 1 && dist < maxDist) {
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
                el.style.opacity = '1';
                const scale = Math.max(0.7, 1 - dist/maxDist);
                el.style.transform = `translate(-50%, -50%) scale(${scale})`;
            } else {
                el.style.opacity = '0';
            }
        });
    }

    let animationFrameId: number;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        if (!stateRef.current.modalOpen) {
            if (stateRef.current.keys.w) stateRef.current.speed += ACCELERATION;
            if (stateRef.current.keys.s) stateRef.current.speed -= ACCELERATION;
            
            stateRef.current.speed *= FRICTION;
            stateRef.current.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, stateRef.current.speed));

            if (Math.abs(stateRef.current.speed) > 0.01) {
                const direction = stateRef.current.speed > 0 ? 1 : -1;
                if (stateRef.current.keys.a) stateRef.current.angle += ROTATION_SPEED * direction;
                if (stateRef.current.keys.d) stateRef.current.angle -= ROTATION_SPEED * direction;
            }

            carGroup.rotation.y = stateRef.current.angle;
            
            // Calculate next position
            const nextX = carGroup.position.x - Math.sin(stateRef.current.angle) * stateRef.current.speed;
            const nextZ = carGroup.position.z - Math.cos(stateRef.current.angle) * stateRef.current.speed;

            // Collision Detection
            const carBox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(nextX, 0.6, nextZ),
                new THREE.Vector3(1.4, 1.0, 3.0) // Slightly smaller than car to be forgiving
            );

            let collision = false;
            for (let i = 0; i < colliders.length; i++) {
                if (carBox.intersectsBox(colliders[i])) {
                    collision = true;
                    break;
                }
            }

            if (collision) {
                stateRef.current.speed *= -0.5; // Bounce back
            } else {
                carGroup.position.x = nextX;
                carGroup.position.z = nextZ;
            }

            // Smoke Effect
            if (Math.abs(stateRef.current.speed) > 0.1 && Math.random() > 0.3) {
                const smoke = new THREE.Mesh(smokeGeo, smokeMat.clone());
                const backOffset = new THREE.Vector3(0, 0.2, 1.6);
                backOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.angle);
                smoke.position.copy(carGroup.position).add(backOffset);
                // Randomize slightly
                smoke.position.x += (Math.random() - 0.5) * 0.4;
                smoke.position.z += (Math.random() - 0.5) * 0.4;
                scene.add(smoke);
                particles.push({ mesh: smoke, life: 1.0 });
            }

            // Update Smoke
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life -= 0.03;
                p.mesh.position.y += 0.05;
                p.mesh.scale.addScalar(0.05);
                (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 0.5;
                
                if (p.life <= 0) {
                    scene.remove(p.mesh);
                    particles.splice(i, 1);
                }
            }

            // --- DYNAMIC CAMERA LOGIC ---
            const speedRatio = Math.abs(stateRef.current.speed) / MAX_SPEED;
            
            // 1. Dynamic Offset (Pull back and lower when fast)
            const dynamicY = 5 - (speedRatio * 1.5); 
            const dynamicZ = 10 + (speedRatio * 6);  
            const idealOffset = new THREE.Vector3(0, dynamicY, dynamicZ);
            idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.angle);
            idealOffset.add(carGroup.position);

            camera.position.lerp(idealOffset, 0.1);
            
            // 2. Dynamic FOV (Wider angle at high speed for "warp" effect)
            const targetFOV = 50 + (speedRatio * 25); 
            camera.fov += (targetFOV - camera.fov) * 0.1;
            camera.updateProjectionMatrix();

            // 3. Camera Shake (Rumble effect at top speed)
            let shakeX = 0;
            let shakeY = 0;
            if (speedRatio > 0.85) {
                shakeX = (Math.random() - 0.5) * 0.15;
                shakeY = (Math.random() - 0.5) * 0.15;
            }

            const lookAtPos = new THREE.Vector3(shakeX, shakeY, -10);
            lookAtPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.angle);
            lookAtPos.add(carGroup.position);
            camera.lookAt(lookAtPos);
        }

        let nearbyZone: string | null = null;
        zones.forEach(zone => {
            const dist = Math.hypot(carGroup.position.x - zone.x, carGroup.position.z - zone.z);
            if (dist < 5) nearbyZone = zone.id;
        });

        if (nearbyZone !== stateRef.current.activeZone) {
            stateRef.current.activeZone = nearbyZone;
            setActiveZone(nearbyZone);
        }

        if (coordsRef.current) {
            coordsRef.current.innerText = `POS: ${Math.round(carGroup.position.x)}, ${Math.round(carGroup.position.z)}`;
        }
        
        updateLabels();

        renderer.render(scene, camera);
    }

    animate();

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };
  }, []);

  const handleMobileBtnPress = (key: 'w' | 'a' | 's' | 'd') => (e: React.SyntheticEvent) => {
      e.preventDefault();
      stateRef.current.keys[key] = true;
  };

  const handleMobileBtnRelease = (key: 'w' | 'a' | 's' | 'd') => (e: React.SyntheticEvent) => {
      e.preventDefault();
      stateRef.current.keys[key] = false;
  };

  return (
    <div className="bg-zinc-950 text-zinc-300 antialiased h-screen w-screen overflow-hidden relative">
        {/* UI LAYER */}
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-6 sm:p-8">
            
            {/* Header */}
            <div className="flex justify-between items-start w-full">
                <div className="flex flex-col gap-1 pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <h1 className="text-xs font-semibold tracking-tight text-white uppercase">Faiz_Build [City_Build]</h1>
                    </div>
                    <div className="text-[10px] text-zinc-500 tracking-wide font-mono" ref={coordsRef}>POS: 0, 0</div>
                </div>

                {/* Hint */}
                <div className="bg-zinc-900/90 backdrop-blur border border-white/5 rounded-lg p-3 max-w-[200px] text-right pointer-events-auto hidden md:block shadow-lg">
                    <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-2 font-medium">Drive Control</p>
                    <div className="flex justify-end gap-1 mb-1">
                        <div ref={keyWRef} className="w-7 h-7 rounded bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-300 shadow-[0_4px_0_#27272a] transition-all duration-100">W</div>
                    </div>
                    <div className="flex justify-end gap-1">
                        <div ref={keyARef} className="w-7 h-7 rounded bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-300 shadow-[0_4px_0_#27272a] transition-all duration-100">A</div>
                        <div ref={keySRef} className="w-7 h-7 rounded bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-300 shadow-[0_4px_0_#27272a] transition-all duration-100">S</div>
                        <div ref={keyDRef} className="w-7 h-7 rounded bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-300 shadow-[0_4px_0_#27272a] transition-all duration-100">D</div>
                    </div>
                </div>
            </div>

            {/* Proximity Action */}
            <div 
                ref={alertRef} 
                className={`absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 transform pointer-events-none flex flex-col items-center ${activeZone ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}`}
            >
                <div className="bg-white text-black px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                    Press ENTER to Open
                </div>
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden flex justify-between items-end w-full pb-4 pointer-events-auto">
                <div className="flex gap-3">
                    <button 
                        onPointerDown={handleMobileBtnPress('a')} onPointerUp={handleMobileBtnRelease('a')} onPointerLeave={handleMobileBtnRelease('a')}
                        className="w-16 h-16 rounded-full bg-zinc-900/80 border border-white/10 active:bg-white/10 backdrop-blur flex items-center justify-center select-none touch-none">
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <button 
                        onPointerDown={handleMobileBtnPress('d')} onPointerUp={handleMobileBtnRelease('d')} onPointerLeave={handleMobileBtnRelease('d')}
                        className="w-16 h-16 rounded-full bg-zinc-900/80 border border-white/10 active:bg-white/10 backdrop-blur flex items-center justify-center select-none touch-none">
                        <ArrowRight className="w-6 h-6 text-white" />
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                     <button 
                        onPointerDown={handleMobileBtnPress('w')} onPointerUp={handleMobileBtnRelease('w')} onPointerLeave={handleMobileBtnRelease('w')}
                        className="w-16 h-16 rounded-full bg-zinc-900/80 border border-white/10 active:bg-white/10 backdrop-blur flex items-center justify-center select-none touch-none">
                        <ArrowUp className="w-6 h-6 text-white" />
                    </button>
                    <button 
                        onPointerDown={handleMobileBtnPress('s')} onPointerUp={handleMobileBtnRelease('s')} onPointerLeave={handleMobileBtnRelease('s')}
                        className="w-16 h-16 rounded-full bg-zinc-900/80 border border-white/10 active:bg-white/10 backdrop-blur flex items-center justify-center select-none touch-none">
                        <ArrowDown className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>
        </div>

        {/* 3D CANVAS */}
        <div ref={containerRef} className="absolute inset-0 z-0 w-full h-full" />

        {/* LABELS */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            <div ref={labelAboutRef} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 opacity-0 transition-opacity duration-300">
                <div className="relative group">
                    <div className="absolute -inset-2 bg-purple-500/30 rounded-full blur-md animate-pulse"></div>
                    <div className="w-12 h-12 bg-zinc-900 border border-purple-500/50 rounded-full flex items-center justify-center relative z-10">
                        <User className="w-5 h-5 text-purple-400" />
                    </div>
                </div>
                <div className="text-center">
                    <div className="bg-zinc-900/80 backdrop-blur px-2 py-1 rounded border border-white/10">
                        <div className="text-[10px] font-bold text-white tracking-widest uppercase">About HQ</div>
                    </div>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-purple-500 to-transparent mx-auto mt-1"></div>
                </div>
            </div>
            
            <div ref={labelExperienceRef} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 opacity-0 transition-opacity duration-300">
                 <div className="relative group">
                    <div className="absolute -inset-2 bg-blue-500/30 rounded-full blur-md animate-pulse"></div>
                    <div className="w-12 h-12 bg-zinc-900 border border-blue-500/50 rounded-full flex items-center justify-center relative z-10">
                        <Briefcase className="w-5 h-5 text-blue-400" />
                    </div>
                </div>
                <div className="text-center">
                    <div className="bg-zinc-900/80 backdrop-blur px-2 py-1 rounded border border-white/10">
                        <div className="text-[10px] font-bold text-white tracking-widest uppercase">Experience</div>
                    </div>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-blue-500 to-transparent mx-auto mt-1"></div>
                </div>
            </div>

            <div ref={labelPortfolioRef} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 opacity-0 transition-opacity duration-300">
                 <div className="relative group">
                    <div className="absolute -inset-2 bg-emerald-500/30 rounded-full blur-md animate-pulse"></div>
                    <div className="w-12 h-12 bg-zinc-900 border border-emerald-500/50 rounded-full flex items-center justify-center relative z-10">
                        <Layers className="w-5 h-5 text-emerald-400" />
                    </div>
                </div>
                <div className="text-center">
                    <div className="bg-zinc-900/80 backdrop-blur px-2 py-1 rounded border border-white/10">
                        <div className="text-[10px] font-bold text-white tracking-widest uppercase">Projects</div>
                    </div>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500 to-transparent mx-auto mt-1"></div>
                </div>
            </div>
        </div>

        {/* MODALS */}
        <AnimatePresence>
        {modalOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            >
                
                {modalOpen === 'about' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500"></div>
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-white tracking-tight">Faiz_Build</h2>
                                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Profile &amp; Bio</p>
                                </div>
                                <button onClick={() => setModalOpen(null)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                                    <p>I build digital products that feel like magic. With a background in 3D interactions and clean typography, I bridge the gap between design and engineering.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="bg-zinc-900 p-3 rounded border border-white/5 flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-zinc-300">San Francisco, CA</span>
                                    </div>
                                    <div className="bg-zinc-900 p-3 rounded border border-white/5 flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-zinc-300">hello@faiz.build</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {modalOpen === 'experience' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-semibold text-white tracking-tight">Career Log</h2>
                                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Experience</p>
                                </div>
                                <button onClick={() => setModalOpen(null)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-8">
                                <div className="relative pl-6 border-l border-zinc-800">
                                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-zinc-950"></div>
                                    <h3 className="text-sm font-semibold text-white">Senior Product Designer</h3>
                                    <p className="text-[10px] text-blue-400 mb-1 uppercase tracking-wider font-mono">Stripe • 2021 - Present</p>
                                    <p className="text-xs text-zinc-400 mt-2">Leading the design system team and crafting payment interfaces.</p>
                                </div>
                                <div className="relative pl-6 border-l border-zinc-800">
                                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-zinc-700 ring-4 ring-zinc-950"></div>
                                    <h3 className="text-sm font-semibold text-white">Frontend Developer</h3>
                                    <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider font-mono">Vercel • 2019 - 2021</p>
                                    <p className="text-xs text-zinc-400 mt-2">Built dashboard components and deployment visualizations.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {modalOpen === 'portfolio' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-3xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500"></div>
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-semibold text-white tracking-tight">Project Showroom</h2>
                                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Works</p>
                                </div>
                                <button onClick={() => setModalOpen(null)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="group relative aspect-[4/3] bg-zinc-900 rounded border border-white/5 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-colors">
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent flex flex-col justify-end p-5 z-10">
                                        <h4 className="text-sm font-medium text-white">Lumina Finance</h4>
                                        <p className="text-xs text-zinc-500">Web3 Dashboard</p>
                                    </div>
                                    <div className="absolute inset-0 bg-zinc-800 group-hover:scale-105 transition-transform duration-700"></div>
                                </div>
                                <div className="group relative aspect-[4/3] bg-zinc-900 rounded border border-white/5 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-colors">
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent flex flex-col justify-end p-5 z-10">
                                        <h4 className="text-sm font-medium text-white">Orbit UI</h4>
                                        <p className="text-xs text-zinc-500">Design System</p>
                                    </div>
                                    <div className="absolute inset-0 bg-zinc-800 group-hover:scale-105 transition-transform duration-700"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
}
