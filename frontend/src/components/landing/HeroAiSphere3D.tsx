import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface HeroAiSphere3DProps {
  className?: string;
}

export const HeroAiSphere3D: React.FC<HeroAiSphere3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check for WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      if (!testCanvas || typeof testCanvas.getContext !== 'function') {
        setWebGlSupported(false);
        return;
      }
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    let animationFrameId: number;
    let isVisible = true;

    // Scene, Camera, Renderer
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group to hold all rotating elements
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    // 1. Core Sphere (Glowing deep emerald icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.8, 3);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x168653,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    sphereGroup.add(coreMesh);

    // 2. Inner pulsating core
    const innerGeo = new THREE.SphereGeometry(1.2, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x103d2b,
      transparent: true,
      opacity: 0.6,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    sphereGroup.add(innerMesh);

    // 3. Floating Neural Nodes (Particles)
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color('#5DE5A1'); // Neon Green
    const color2 = new THREE.Color('#168653'); // Emerald
    const color3 = new THREE.Color('#EAF6EF'); // Mint

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const radius = 2.1 + (Math.random() - 0.5) * 0.4;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const mixedColor = i % 3 === 0 ? color1 : i % 3 === 1 ? color2 : color3;
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    sphereGroup.add(particlePoints);

    // Connected neural network line segments between nearby particles
    const linePositions: number[] = [];
    const maxDistance = 0.95;
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxDistance) {
          linePositions.push(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2]
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5de5a1,
      transparent: true,
      opacity: 0.22,
    });
    const neuralLines = new THREE.LineSegments(lineGeo, lineMat);
    sphereGroup.add(neuralLines);

    // 4. Orbital Neural Rings
    const createRing = (radius: number, tiltX: number, tiltY: number, colorHex: number) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = tiltX;
      ring.rotation.y = tiltY;
      return ring;
    };

    const ring1 = createRing(2.6, Math.PI / 3, Math.PI / 6, 0x5de5a1);
    const ring2 = createRing(3.0, -Math.PI / 4, Math.PI / 4, 0x168653);
    sphereGroup.add(ring1);
    sphereGroup.add(ring2);

    // 5. Ambient and Point Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x5de5a1, 2, 20);
    pointLight.position.set(4, 4, 4);
    scene.add(pointLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      mouseX = (x / rect.width) * 2;
      mouseY = -(y / rect.height) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // IntersectionObserver to pause rendering when out of viewport (Performance optimization)
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(container);
    }

    // Animation Loop
    let clock = new THREE.Clock();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Base auto rotation
        sphereGroup.rotation.y += 0.004;
        sphereGroup.rotation.x += 0.002;

        // Mouse Parallax smooth lerp
        targetRotationX = mouseY * 0.4;
        targetRotationY = mouseX * 0.4;

        sphereGroup.rotation.x += (targetRotationX - sphereGroup.rotation.x) * 0.03;
        sphereGroup.rotation.y += (targetRotationY - sphereGroup.rotation.y) * 0.03;

        // Pulse inner core
        const scale = 1 + Math.sin(elapsedTime * 2) * 0.05;
        innerMesh.scale.set(scale, scale, scale);

        // Rings counter-rotation
        ring1.rotation.z += 0.008;
        ring2.rotation.z -= 0.006;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      ring1.geometry.dispose();
      (ring1.material as THREE.Material).dispose();
      ring2.geometry.dispose();
      (ring2.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-[420px] sm:h-[480px] lg:h-[560px] flex items-center justify-center pointer-events-none select-none ${className}`}
      aria-label="Interactive 3D AI Neural Sphere"
    >
      {!webGlSupported && (
        <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-[#168653] to-[#5DE5A1] opacity-70 blur-2xl animate-pulse" />
      )}
    </div>
  );
};
