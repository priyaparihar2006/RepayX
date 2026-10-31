import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router';
import { RotateCcw, Layers, Globe, Network, ShieldCheck, AlertTriangle, AlertOctagon, Sparkles, ZoomIn, ZoomOut, Info } from 'lucide-react';
import type { AnalyticsResponse, RiskCategory } from '../../types/api';
import { RISK_COLORS } from '../../lib/chartTheme';
import { formatNumber, formatPercent, formatScore } from '../../lib/format';

interface RiskIntelligence3DProps {
  data: AnalyticsResponse;
  className?: string;
}

type ViewMode = 'sphere' | 'network';

interface HoveredNodeInfo {
  x: number;
  y: number;
  category: RiskCategory;
  title: string;
  count?: number;
  share?: number;
  score?: number;
  defaultProb?: number;
  customerId?: number;
  isCustomer?: boolean;
}

export const RiskIntelligence3D: React.FC<RiskIntelligence3DProps> = ({ data, className = '' }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('sphere');
  const [selectedCategory, setSelectedCategory] = useState<RiskCategory | 'ALL'>('ALL');
  const [hoveredInfo, setHoveredInfo] = useState<HoveredNodeInfo | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  const portfolio = data.portfolio;
  const byCategory = useMemo(() => {
    return Object.fromEntries(portfolio.risk_categories.map((c) => [c.risk_category, c])) as Record<
      RiskCategory,
      { customers: number; share: number }
    >;
  }, [portfolio.risk_categories]);

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    rootGroup: THREE.Group;
    sphereGroup: THREE.Group;
    networkGroup: THREE.Group;
    particlesMesh?: THREE.Points;
    customerMeshes: THREE.Mesh[];
    customerData: Array<{ mesh: THREE.Mesh; id: number; category: RiskCategory; score: number; prob: number }>;
    particleColorsAttr?: THREE.BufferAttribute;
    particleSizesAttr?: THREE.BufferAttribute;
    animFrameId: number;
    targetRotation: { x: number; y: number };
    currentRotation: { x: number; y: number };
    targetZoom: number;
    currentZoom: number;
    isDragging: boolean;
    prevMousePos: { x: number; y: number };
    clock: THREE.Clock;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    cleanupListeners: () => void;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL availability
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 800;
    const height = 480;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf5f7f3, 0.02);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x10b981, 2.5, 10);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const topRimLight = new THREE.DirectionalLight(0xd1fae5, 1.8);
    topRimLight.position.set(2, 4, 3);
    scene.add(topRimLight);

    const bottomAccentLight = new THREE.DirectionalLight(0xfef3c7, 1.2);
    bottomAccentLight.position.set(-2, -3, 2);
    scene.add(bottomAccentLight);

    // 3. Root Transformation Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const sphereGroup = new THREE.Group();
    const networkGroup = new THREE.Group();
    rootGroup.add(sphereGroup);
    rootGroup.add(networkGroup);
    networkGroup.visible = viewMode === 'network';
    sphereGroup.visible = viewMode === 'sphere';

    // -------------------------------------------------------------
    // SPHERE MODE: Central Translucent Orb, AI Core & Orbital Rings
    // -------------------------------------------------------------
    // Glassy Translucent Central Sphere
    const glassGeo = new THREE.SphereGeometry(1.42, 40, 40);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x245c35,
      transparent: true,
      opacity: 0.15,
      roughness: 0.25,
      transmission: 0.85,
      thickness: 0.6,
      wireframe: false,
    });
    const glassSphere = new THREE.Mesh(glassGeo, glassMat);
    sphereGroup.add(glassSphere);

    // Futuristic Latitude / Longitude wireframe cage
    const wireGeo = new THREE.SphereGeometry(1.44, 24, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const wireSphere = new THREE.Mesh(wireGeo, wireMat);
    sphereGroup.add(wireSphere);

    // Central Pulsing AI Engine Nucleus
    const nucleusGeo = new THREE.IcosahedronGeometry(0.55, 2);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.4,
      wireframe: true,
      roughness: 0.3,
      metalness: 0.7,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    sphereGroup.add(nucleusMesh);

    // Orbital Rings
    const ringGeo1 = new THREE.RingGeometry(1.72, 1.74, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.rotation.y = Math.PI / 8;
    sphereGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(1.95, 1.97, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x059669,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 1.7;
    ring2.rotation.z = Math.PI / 4;
    sphereGroup.add(ring2);

    // -------------------------------------------------------------
    // RISK DATA PARTICLES (Fibonacci Sphere Distribution)
    // -------------------------------------------------------------
    const TOTAL_PARTICLES = 750;
    const lowShare = (byCategory['Low Risk']?.share ?? 33.3) / 100;
    const medShare = (byCategory['Medium Risk']?.share ?? 46.2) / 100;

    const lowCount = Math.round(TOTAL_PARTICLES * lowShare);
    const medCount = Math.round(TOTAL_PARTICLES * medShare);
    const highCount = TOTAL_PARTICLES - lowCount - medCount;

    const positions = new Float32Array(TOTAL_PARTICLES * 3);
    const colors = new Float32Array(TOTAL_PARTICLES * 3);
    const sizes = new Float32Array(TOTAL_PARTICLES);
    const particleCategories: RiskCategory[] = [];

    const colorLow = new THREE.Color(0x10b981); // Emerald
    const colorMed = new THREE.Color(0xf59e0b); // Amber
    const colorHigh = new THREE.Color(0xef4444); // Crimson Red

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      // Fibonacci sphere mapping
      const phi = Math.acos(1 - (2 * (i + 0.5)) / TOTAL_PARTICLES);
      const theta = Math.PI * (1 + 5 ** 0.5) * i;
      const radius = 1.48 + (Math.sin(i * 99) * 0.08);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      let c = colorLow;
      let cat: RiskCategory = 'Low Risk';
      if (i >= lowCount + medCount) {
        c = colorHigh;
        cat = 'High Risk';
      } else if (i >= lowCount) {
        c = colorMed;
        cat = 'Medium Risk';
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = cat === 'High Risk' ? 0.065 : cat === 'Medium Risk' ? 0.055 : 0.045;
      particleCategories.push(cat);
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleColorsAttr = new THREE.BufferAttribute(colors, 3);
    const particleSizesAttr = new THREE.BufferAttribute(sizes, 1);
    particleGeo.setAttribute('color', particleColorsAttr);

    // Circular particle texture generator
    const createCircleTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const ctx = pCanvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(0.8, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(pCanvas);
    };

    const particleMat = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      map: createCircleTexture(),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const particlesMesh = new THREE.Points(particleGeo, particleMat);
    sphereGroup.add(particlesMesh);

    // Connecting Network Arcs on the sphere
    const arcPositions: number[] = [];
    const arcColors: number[] = [];
    for (let i = 0; i < TOTAL_PARTICLES; i += 7) {
      const j = (i + 13) % TOTAL_PARTICLES;
      const dist = Math.hypot(
        positions[i * 3] - positions[j * 3],
        positions[i * 3 + 1] - positions[j * 3 + 1],
        positions[i * 3 + 2] - positions[j * 3 + 2]
      );
      if (dist < 0.9) {
        arcPositions.push(
          positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
          positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
        );
        const arcC = particleCategories[i] === 'High Risk' ? colorHigh : colorLow;
        arcColors.push(arcC.r, arcC.g, arcC.b, arcC.r, arcC.g, arcC.b);
      }
    }
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute('position', new THREE.Float32BufferAttribute(arcPositions, 3));
    arcGeo.setAttribute('color', new THREE.Float32BufferAttribute(arcColors, 3));
    const arcMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
    });
    const arcLines = new THREE.LineSegments(arcGeo, arcMat);
    sphereGroup.add(arcLines);

    // -------------------------------------------------------------
    // CUSTOMER RISK NETWORK MODE (Nodes & Interconnections)
    // -------------------------------------------------------------
    const sampleCustomerNodes = [
      { id: 100234, category: 'High Risk' as RiskCategory, score: 88.5, prob: 78.4, pos: [-1.4, 0.9, 0.4] },
      { id: 100512, category: 'High Risk' as RiskCategory, score: 84.0, prob: 73.1, pos: [-0.9, 1.4, -0.6] },
      { id: 100891, category: 'High Risk' as RiskCategory, score: 79.2, prob: 69.8, pos: [-1.5, -0.4, 0.8] },
      { id: 101124, category: 'High Risk' as RiskCategory, score: 76.0, prob: 66.2, pos: [-0.4, 1.6, 0.3] },
      { id: 102450, category: 'Medium Risk' as RiskCategory, score: 54.3, prob: 45.2, pos: [0.3, 0.8, 1.2] },
      { id: 102871, category: 'Medium Risk' as RiskCategory, score: 48.0, prob: 39.5, pos: [0.8, 1.2, -0.5] },
      { id: 103210, category: 'Medium Risk' as RiskCategory, score: 42.1, prob: 34.0, pos: [1.2, 0.3, 0.9] },
      { id: 103982, category: 'Medium Risk' as RiskCategory, score: 38.6, prob: 29.8, pos: [0.5, -0.9, 1.1] },
      { id: 104100, category: 'Low Risk' as RiskCategory, score: 24.5, prob: 18.2, pos: [1.3, -0.8, -0.7] },
      { id: 104561, category: 'Low Risk' as RiskCategory, score: 18.0, prob: 12.4, pos: [0.9, -1.3, 0.5] },
      { id: 105022, category: 'Low Risk' as RiskCategory, score: 12.3, prob: 8.1, pos: [1.5, -0.2, -0.9] },
      { id: 105890, category: 'Low Risk' as RiskCategory, score: 9.8, prob: 5.4, pos: [0.2, -1.5, -0.4] },
    ];

    const customerMeshes: THREE.Mesh[] = [];
    const customerData: Array<{ mesh: THREE.Mesh; id: number; category: RiskCategory; score: number; prob: number }> = [];

    sampleCustomerNodes.forEach((node) => {
      const nodeColor = node.category === 'High Risk' ? 0xef4444 : node.category === 'Medium Risk' ? 0xf59e0b : 0x10b981;
      const nodeGeo = new THREE.SphereGeometry(0.12, 24, 24);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.4,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(node.pos[0], node.pos[1], node.pos[2]);
      networkGroup.add(nodeMesh);

      // Outer glowing halo
      const haloGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.22,
        wireframe: true,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      nodeMesh.add(haloMesh);

      customerMeshes.push(nodeMesh);
      customerData.push({
        mesh: nodeMesh,
        id: node.id,
        category: node.category,
        score: node.score,
        prob: node.prob,
      });
    });

    // Customer Network connecting lines
    const netLinesPos: number[] = [];
    const netLinesCol: number[] = [];
    for (let a = 0; a < sampleCustomerNodes.length; a++) {
      for (let b = a + 1; b < sampleCustomerNodes.length; b++) {
        const nA = sampleCustomerNodes[a];
        const nB = sampleCustomerNodes[b];
        const dist = Math.hypot(nA.pos[0] - nB.pos[0], nA.pos[1] - nB.pos[1], nA.pos[2] - nB.pos[2]);
        if (dist < 1.7) {
          netLinesPos.push(nA.pos[0], nA.pos[1], nA.pos[2], nB.pos[0], nB.pos[1], nB.pos[2]);
          const lineCol = nA.category === 'High Risk' || nB.category === 'High Risk' ? colorHigh : colorMed;
          netLinesCol.push(lineCol.r, lineCol.g, lineCol.b, lineCol.r, lineCol.g, lineCol.b);
        }
      }
    }
    const netLineGeo = new THREE.BufferGeometry();
    netLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(netLinesPos, 3));
    netLineGeo.setAttribute('color', new THREE.Float32BufferAttribute(netLinesCol, 3));
    const netLineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
    });
    const netLines = new THREE.LineSegments(netLineGeo, netLineMat);
    networkGroup.add(netLines);

    // -------------------------------------------------------------
    // INTERACTION HANDLERS: Drag to Rotate, Wheel to Zoom, Raycast
    // -------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.15 };
    const mouse = new THREE.Vector2();

    const state = {
      scene,
      camera,
      renderer,
      rootGroup,
      sphereGroup,
      networkGroup,
      particlesMesh,
      customerMeshes,
      customerData,
      particleColorsAttr,
      particleSizesAttr,
      animFrameId: 0,
      targetRotation: { x: 0.15, y: -0.2 },
      currentRotation: { x: 0.15, y: -0.2 },
      targetZoom: 4.4,
      currentZoom: 4.4,
      isDragging: false,
      prevMousePos: { x: 0, y: 0 },
      clock: new THREE.Clock(),
      raycaster,
      mouse,
      cleanupListeners: () => {},
    };
    threeRef.current = state;

    // Pointer events on canvas
    const handlePointerDown = (e: PointerEvent) => {
      state.isDragging = true;
      state.prevMousePos = { x: e.clientX, y: e.clientY };
      setIsInteracting(true);
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (state.isDragging) {
        const deltaX = e.clientX - state.prevMousePos.x;
        const deltaY = e.clientY - state.prevMousePos.y;
        state.targetRotation.y += deltaX * 0.007;
        state.targetRotation.x += deltaY * 0.007;
        state.targetRotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.targetRotation.x));
        state.prevMousePos = { x: e.clientX, y: e.clientY };
      } else {
        // Raycasting for interactive hover tooltip
        state.raycaster.setFromCamera(state.mouse, camera);

        if (viewMode === 'network') {
          const intersects = state.raycaster.intersectObjects(customerMeshes, false);
          if (intersects.length > 0) {
            const hitMesh = intersects[0].object as THREE.Mesh;
            const item = customerData.find((c) => c.mesh === hitMesh);
            if (item) {
              setHoveredInfo({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                category: item.category,
                title: `Customer Account #${item.id}`,
                score: item.score,
                defaultProb: item.prob,
                customerId: item.id,
                isCustomer: true,
              });
              canvas.style.cursor = 'pointer';
              return;
            }
          }
        } else if (particlesMesh) {
          const intersects = state.raycaster.intersectObject(particlesMesh, false);
          if (intersects.length > 0 && intersects[0].index !== undefined) {
            const idx = intersects[0].index;
            const cat = particleCategories[idx] || 'Low Risk';
            const catInfo = byCategory[cat];
            setHoveredInfo({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              category: cat,
              title: `${cat} Portfolio Segment`,
              count: catInfo?.customers,
              share: catInfo?.share,
              isCustomer: false,
            });
            canvas.style.cursor = 'crosshair';
            return;
          }
        }

        setHoveredInfo(null);
        canvas.style.cursor = state.isDragging ? 'grabbing' : 'grab';
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      state.isDragging = false;
      setIsInteracting(false);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.targetZoom += e.deltaY * 0.0035;
      state.targetZoom = Math.max(2.6, Math.min(6.5, state.targetZoom));
    };

    const handleClick = () => {
      if (hoveredInfo?.isCustomer && hoveredInfo.customerId) {
        navigate(`/customers/${hoveredInfo.customerId}`);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);

    // Responsive window resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = 480;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    state.cleanupListeners = () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
    };

    // -------------------------------------------------------------
    // RENDER ANIMATION LOOP
    // -------------------------------------------------------------
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      state.animFrameId = requestAnimationFrame(animate);
      const elapsedTime = state.clock.getElapsedTime();

      // Smooth inertia & damping for rotation
      if (!state.isDragging && !prefersReducedMotion) {
        state.targetRotation.y += 0.0028;
      }
      state.currentRotation.x += (state.targetRotation.x - state.currentRotation.x) * 0.08;
      state.currentRotation.y += (state.targetRotation.y - state.currentRotation.y) * 0.08;

      rootGroup.rotation.x = state.currentRotation.x;
      rootGroup.rotation.y = state.currentRotation.y;

      // Smooth camera zoom
      state.currentZoom += (state.targetZoom - state.currentZoom) * 0.08;
      camera.position.z = state.currentZoom;

      // Core breathing / AI pulse
      const pulseScale = 1 + Math.sin(elapsedTime * 2.2) * 0.06;
      nucleusMesh.scale.set(pulseScale, pulseScale, pulseScale);
      nucleusMat.emissiveIntensity = 1.2 + Math.sin(elapsedTime * 3.0) * 0.4;

      // Rings differential spin
      ring1.rotation.z += 0.004;
      ring2.rotation.y += 0.003;

      // Customer network breathing
      if (viewMode === 'network') {
        customerMeshes.forEach((mesh, idx) => {
          const s = 1 + Math.sin(elapsedTime * 2.5 + idx) * 0.08;
          mesh.scale.set(s, s, s);
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(state.animFrameId);
      state.cleanupListeners();
      renderer.dispose();
      scene.clear();
    };
  }, [byCategory, viewMode, navigate]);

  // Handle category filtering visual update
  useEffect(() => {
    const state = threeRef.current;
    if (!state || !state.particlesMesh) return;

    const colors = state.particleColorsAttr;
    if (!colors) return;

    const TOTAL_PARTICLES = colors.count;
    const lowShare = (byCategory['Low Risk']?.share ?? 33.3) / 100;
    const medShare = (byCategory['Medium Risk']?.share ?? 46.2) / 100;
    const lowCount = Math.round(TOTAL_PARTICLES * lowShare);
    const medCount = Math.round(TOTAL_PARTICLES * medShare);

    const colorLow = new THREE.Color(0x10b981);
    const colorMed = new THREE.Color(0xf59e0b);
    const colorHigh = new THREE.Color(0xef4444);
    const dimColor = new THREE.Color(0x94a3b8);

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      let cat: RiskCategory = 'Low Risk';
      let baseColor = colorLow;
      if (i >= lowCount + medCount) {
        cat = 'High Risk';
        baseColor = colorHigh;
      } else if (i >= lowCount) {
        cat = 'Medium Risk';
        baseColor = colorMed;
      }

      let activeColor = baseColor;
      if (selectedCategory !== 'ALL' && selectedCategory !== cat) {
        activeColor = dimColor;
      }

      colors.setXYZ(i, activeColor.r, activeColor.g, activeColor.b);
    }
    colors.needsUpdate = true;

    // In customer network mode, adjust node opacity/scale
    state.customerData.forEach((item) => {
      const isMatch = selectedCategory === 'ALL' || selectedCategory === item.category;
      item.mesh.visible = isMatch;
    });
  }, [selectedCategory, byCategory]);

  // Switch view mode in Three.js scene
  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    const state = threeRef.current;
    if (state) {
      state.sphereGroup.visible = mode === 'sphere';
      state.networkGroup.visible = mode === 'network';
    }
    setHoveredInfo(null);
  };

  // Reset camera view
  const handleResetCamera = useCallback(() => {
    const state = threeRef.current;
    if (!state) return;
    state.targetRotation = { x: 0.15, y: -0.2 };
    state.targetZoom = 4.4;
  }, []);

  return (
    <section className={`relative bg-gradient-to-br from-white via-[#FCFDFC] to-[#F5F8F4] rounded-[24px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-300 ${className}`}>
      {/* Header & Controls bar */}
      <header className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 pb-2 border-b border-[#E7EBE3]/60 bg-white/60 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#EDF5E5] text-[#245C35]">
              <Sparkles className="w-4 h-4 text-[#245C35]" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#171A17] tracking-tight">
              AI Risk Intelligence Engine
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#059669] border border-[#10B981]/30">
              3D NEURAL SPHERE
            </span>
          </div>
          <p className="text-xs text-[#777E77] mt-1">
            Real-time spherical projection of {formatNumber(portfolio.total_customers)} portfolio loan accounts
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex items-center bg-[#F5F7F3] p-1 rounded-full border border-[#E7EBE3]">
            <button
              type="button"
              onClick={() => handleToggleViewMode('sphere')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'sphere'
                  ? 'bg-white text-[#245C35] shadow-xs border border-[#D1E8BC]'
                  : 'text-[#777E77] hover:text-[#171A17]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Risk Sphere</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('network')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'network'
                  ? 'bg-white text-[#245C35] shadow-xs border border-[#D1E8BC]'
                  : 'text-[#777E77] hover:text-[#171A17]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Customer Network</span>
            </button>
          </div>

          {/* Reset Camera Button */}
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Camera Angle & Zoom"
            className="p-1.5 rounded-full bg-white border border-[#E7EBE3] text-[#777E77] hover:text-[#245C35] hover:border-[#D1E8BC] hover:bg-[#EDF5E5] transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Filter Tabs Bar */}
      <div className="relative z-10 px-5 sm:px-6 pt-3 flex flex-wrap items-center justify-between gap-3 bg-white/40 backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-[#777E77] mr-1">Filter Projection:</span>
          {(['ALL', 'Low Risk', 'Medium Risk', 'High Risk'] as const).map((cat) => {
            const count = cat === 'ALL' ? portfolio.total_customers : byCategory[cat]?.customers ?? 0;
            const isSelected = selectedCategory === cat;
            const badgeColor =
              cat === 'Low Risk'
                ? '#10B981'
                : cat === 'Medium Risk'
                ? '#F59E0B'
                : cat === 'High Risk'
                ? '#EF4444'
                : '#245C35';

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white text-[#171A17] font-semibold border-[#245C35] shadow-xs ring-1 ring-[#245C35]/20'
                    : 'bg-[#F5F7F3]/80 text-[#777E77] border-[#E7EBE3] hover:bg-white hover:text-[#171A17]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: badgeColor }}
                />
                <span>{cat === 'ALL' ? 'All Risks' : cat}</span>
                <span className="text-[10px] text-[#777E77] font-mono">({formatNumber(count)})</span>
              </button>
            );
          })}
        </div>

        {/* Interaction hints */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#777E77]">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Drag to rotate
          </span>
          <span>•</span>
          <span>Scroll to zoom</span>
          <span>•</span>
          <span>Hover node for details</span>
        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div ref={containerRef} className="relative w-full h-[440px] sm:h-[480px] cursor-grab active:cursor-grabbing select-none">
        {hasWebGL ? (
          <canvas ref={canvasRef} className="w-full h-full block outline-none" />
        ) : (
          /* Graceful WebGL Fallback */
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[#F5F7F3]">
            <Globe className="w-12 h-12 text-[#245C35] mb-2 animate-spin" style={{ animationDuration: '10s' }} />
            <h3 className="text-sm font-bold text-[#171A17]">Interactive 3D Engine Preview</h3>
            <p className="text-xs text-[#777E77] max-w-sm mt-1">
              WebGL hardware acceleration is paused. Live portfolio: {formatNumber(portfolio.total_customers)} scored loan accounts.
            </p>
          </div>
        )}

        {/* Floating Telemetry & Insight Card */}
        <div className="absolute top-4 left-4 sm:left-6 z-20 pointer-events-none max-w-xs">
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-[#E7EBE3] shadow-fintech p-3.5 space-y-2 pointer-events-auto">
            <div className="flex items-center justify-between gap-2 border-b border-[#E7EBE3]/60 pb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#777E77]">
                AI Telemetry
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#245C35]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                Active Model
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-[#777E77]">Selected Focus</p>
                <p className="font-semibold text-[#171A17] truncate">
                  {selectedCategory === 'ALL' ? 'Entire Portfolio' : selectedCategory}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#777E77]">Est. Default Rate</p>
                <p className="font-semibold text-[#171A17]">
                  {formatPercent(portfolio.average_default_probability)}
                </p>
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#E7EBE3]/60 flex items-center justify-between text-[11px]">
              <span className="text-[#777E77]">Median Risk Score:</span>
              <span className="font-mono font-bold text-[#245C35]">{formatScore(portfolio.median_risk_score)} / 100</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Raycaster Tooltip */}
        {hoveredInfo && (
          <div
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: hoveredInfo.x, top: hoveredInfo.y }}
          >
            <div className="bg-[#171A17]/95 text-white backdrop-blur-md rounded-xl p-3 shadow-xl border border-white/10 text-xs min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1.5 mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLORS[hoveredInfo.category] }}
                  />
                  {hoveredInfo.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono">
                  {hoveredInfo.category}
                </span>
              </div>

              {hoveredInfo.isCustomer ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-white/70">Risk Score:</span>
                    <span className="font-mono font-semibold text-[#34D399]">{hoveredInfo.score?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Est. Default Prob:</span>
                    <span className="font-mono font-semibold text-white">{hoveredInfo.defaultProb?.toFixed(1)}%</span>
                  </div>
                  <p className="pt-1 border-t border-white/10 text-[10px] text-[#A7F3D0] italic text-center">
                    ⚡ Click node to open loan ledger
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white/70">Scored Customers:</span>
                    <span className="font-mono font-semibold text-white">{formatNumber(hoveredInfo.count ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Portfolio Share:</span>
                    <span className="font-mono font-semibold text-[#34D399]">{formatPercent(hoveredInfo.share ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
