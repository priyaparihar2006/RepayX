import React, { useState, useEffect, useRef } from 'react';
import { Layers, Rotate3d, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';

export interface PieSliceData {
  id: string;
  label: string;
  count: number;
  value: number; // percentage
  amount: string;
  color: string;
  depthColor: string;
  lightColor: string;
}

interface ThreeDPieChartProps {
  data?: PieSliceData[];
  title?: string;
  subtitle?: string;
  onSliceClick?: (slice: PieSliceData) => void;
}

const DEFAULT_SLICES: PieSliceData[] = [
  {
    id: 'paid',
    label: 'Paid',
    count: 724,
    value: 58,
    amount: '₹48.2L',
    color: '#10B981',       // emerald-500
    depthColor: '#047857',  // emerald-700
    lightColor: '#6EE7B7',  // emerald-300
  },
  {
    id: 'due_today',
    label: 'Due Today',
    count: 225,
    value: 18,
    amount: '₹15.0L',
    color: '#F59E0B',       // amber-500
    depthColor: '#B45309',  // amber-700
    lightColor: '#FDE68A',  // amber-200
  },
  {
    id: 'overdue',
    label: 'Overdue',
    count: 150,
    value: 12,
    amount: '₹10.2L',
    color: '#EF4444',       // rose-500
    depthColor: '#B91C1C',  // rose-700
    lightColor: '#FCA5A5',  // rose-300
  },
  {
    id: 'ptp',
    label: 'Promise to Pay',
    count: 100,
    value: 8,
    amount: '₹6.8L',
    color: '#516072',       // signature slate steel
    depthColor: '#354352',  // slate steel dark
    lightColor: '#8899AC',  // slate steel light
  },
  {
    id: 'disputed',
    label: 'Disputed',
    count: 49,
    value: 4,
    amount: '₹3.4L',
    color: '#8B5CF6',       // violet-500
    depthColor: '#6D28D9',  // violet-700
    lightColor: '#C4B5FD',  // violet-300
  },
];

export const ThreeDPieChart: React.FC<ThreeDPieChartProps> = ({
  data = DEFAULT_SLICES,
  title = 'Payment Status Distribution',
  subtitle = '3D isometric portfolio breakdown by collection state',
  onSliceClick,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>('paid');
  const [rotationAngle, setRotationAngle] = useState(25);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [depthHeight, setDepthHeight] = useState(24);
  const [tiltFactor, setTiltFactor] = useState(0.55); // vertical ellipse aspect ratio (tilt)
  const [animationProgress, setAnimationProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth entry animation for the 3D pie slices
  useEffect(() => {
    let start: number | null = null;
    const duration = 1100;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Optional auto-rotation animation loop
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.8) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Geometry computation for 3D Elliptical Pie
  const centerX = 160;
  const centerY = 115;
  const radiusX = 110;
  const radiusY = radiusX * tiltFactor; // e.g. 110 * 0.55 = 60.5
  const thickness = depthHeight;

  // Convert slices into start and end angles (degrees)
  let cumulativeValue = 0;
  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

  const calculatedSlices = data.map((slice) => {
    const startVal = cumulativeValue;
    const endVal = cumulativeValue + slice.value;
    cumulativeValue = endVal;

    // Apply animationProgress to sweep angles
    const startAngle = (startVal / totalValue) * 360 * animationProgress + rotationAngle;
    const endAngle = (endVal / totalValue) * 360 * animationProgress + rotationAngle;
    const midAngle = (startAngle + endAngle) / 2;

    return {
      ...slice,
      startAngle,
      endAngle,
      midAngle,
    };
  });

  // Helper to convert polar angle to 3D projected coordinates
  const getPoint = (angleDeg: number, rX: number, rY: number, offsetY = 0, popout = 0) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const popRad = rad;
    const px = centerX + Math.cos(rad) * rX + Math.cos(popRad) * popout;
    const py = centerY + Math.sin(rad) * rY + Math.sin(popRad) * (popout * tiltFactor) + offsetY;
    return { x: px, y: py };
  };

  // Generate top face SVG path
  const makeTopFacePath = (
    startAngle: number,
    endAngle: number,
    rX: number,
    rY: number,
    offsetY = 0,
    popout = 0
  ) => {
    const span = endAngle - startAngle;
    if (span <= 0) return '';

    const pStart = getPoint(startAngle, rX, rY, offsetY, popout);
    const pEnd = getPoint(endAngle, rX, rY, offsetY, popout);
    const pCenter = {
      x: centerX + Math.cos(((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)) * popout,
      y: centerY + offsetY + Math.sin(((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)) * (popout * tiltFactor),
    };

    const largeArcFlag = span > 180 ? 1 : 0;

    return `M ${pCenter.x} ${pCenter.y} L ${pStart.x} ${pStart.y} A ${rX} ${rY} 0 ${largeArcFlag} 1 ${pEnd.x} ${pEnd.y} Z`;
  };

  // Generate 3D side wall / extrusion path
  const makeSideWallPath = (
    startAngle: number,
    endAngle: number,
    rX: number,
    rY: number,
    popout = 0
  ) => {
    // Slices that cross the front hemisphere (0 to 180 degrees in display coordinates)
    // Angles relative to screen: 0 is 3 o'clock (90 deg polar), 180 is 9 o'clock (270 deg polar).
    // Front half where y is lower (visual bottom) is from 0 to 180 deg in standard polar where sin(rad) > 0.
    // In our coordinate system: rad = (angle - 90)*PI/180.
    // Front arc is between angle = 90 and angle = 270 (normalized).
    
    // Subdivide arc into steps to create clean 3D curtain geometry
    const steps = 16;
    const stepAngle = (endAngle - startAngle) / steps;
    const topPoints = [];
    const bottomPoints = [];

    for (let i = 0; i <= steps; i++) {
      const a = startAngle + i * stepAngle;
      topPoints.push(getPoint(a, rX, rY, 0, popout));
      bottomPoints.push(getPoint(a, rX, rY, thickness, popout));
    }

    let path = `M ${topPoints[0].x} ${topPoints[0].y}`;
    for (let i = 1; i <= steps; i++) {
      path += ` L ${topPoints[i].x} ${topPoints[i].y}`;
    }
    path += ` L ${bottomPoints[steps].x} ${bottomPoints[steps].y}`;
    for (let i = steps - 1; i >= 0; i--) {
      path += ` L ${bottomPoints[i].x} ${bottomPoints[i].y}`;
    }
    path += ' Z';

    return path;
  };

  // Determine current active slice
  const activeSliceData =
    data.find((s) => s.id === (hoveredSlice || selectedSlice)) || data[0];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden group/card">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#516072]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Title and 3D Controls */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <h3 className="text-sm font-bold text-slate-900 font-heading truncate">
          {title}
        </h3>

        {/* 3D View Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium shrink-0">
          <button
            onClick={() => setRotationAngle((prev) => (prev + 30) % 360)}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            title="Rotate 3D angle"
          >
            <Rotate3d className="w-3.5 h-3.5 text-[#516072]" />
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              isAutoRotating
                ? 'bg-[#516072] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Auto 3D rotation"
          >
            <Sparkles className="w-3 h-3" />
            <span>Spin</span>
          </button>

          <button
            onClick={() => {
              setTiltFactor((prev) => (prev === 0.55 ? 0.7 : prev === 0.7 ? 0.45 : 0.55));
            }}
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            title="Toggle tilt"
          >
            Tilt
          </button>
        </div>
      </div>

      {/* 3D Canvas / Stage */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center my-2 sm:my-3 select-none"
      >
        <svg
          viewBox="0 0 320 220"
          className="w-full max-w-[340px] sm:max-w-[380px] h-[200px] sm:h-[225px] overflow-visible drop-shadow-xl"
        >
          <defs>
            {/* Ambient drop shadow for base of 3D pie */}
            <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow
                dx="0"
                dy="14"
                stdDeviation="12"
                floodColor="#1e293b"
                floodOpacity="0.22"
              />
            </filter>

            {/* Depth shading gradients for each slice */}
            {data.map((slice) => (
              <React.Fragment key={slice.id}>
                {/* Top face radial/linear gradient */}
                <linearGradient id={`grad-top-${slice.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={slice.lightColor} />
                  <stop offset="100%" stopColor={slice.color} />
                </linearGradient>

                {/* 3D Side cylinder wall depth gradient */}
                <linearGradient id={`grad-side-${slice.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={slice.color} />
                  <stop offset="50%" stopColor={slice.depthColor} />
                  <stop offset="100%" stopColor="#1E252D" stopOpacity="0.85" />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>

          {/* Isometric Cast Ground Shadow */}
          <ellipse
            cx={centerX}
            cy={centerY + thickness + 12}
            rx={radiusX * 1.02}
            ry={radiusY * 1.02}
            fill="#0F172A"
            opacity="0.12"
            filter="blur(8px)"
          />

          {/* Group containing 3D Slices */}
          <g filter="url(#shadow3d)">
            {/* 1. FIRST PASS: Render 3D Extrusion Side Walls (Depth) */}
            {calculatedSlices.map((slice) => {
              const isHovered = hoveredSlice === slice.id;
              const isSelected = selectedSlice === slice.id;
              const popout = isHovered ? 14 : isSelected ? 8 : 0;
              const sidePath = makeSideWallPath(
                slice.startAngle,
                slice.endAngle,
                radiusX,
                radiusY,
                popout
              );

              return (
                <path
                  key={`side-${slice.id}`}
                  d={sidePath}
                  fill={`url(#grad-side-${slice.id})`}
                  opacity={hoveredSlice && !isHovered ? 0.65 : 1}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice(slice.id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => {
                    setSelectedSlice(slice.id);
                    if (onSliceClick) onSliceClick(slice);
                  }}
                />
              );
            })}

            {/* 2. SECOND PASS: Render Top Faces of Slices */}
            {calculatedSlices.map((slice) => {
              const isHovered = hoveredSlice === slice.id;
              const isSelected = selectedSlice === slice.id;
              const popout = isHovered ? 14 : isSelected ? 8 : 0;
              const topPath = makeTopFacePath(
                slice.startAngle,
                slice.endAngle,
                radiusX,
                radiusY,
                0,
                popout
              );

              return (
                <g
                  key={`top-${slice.id}`}
                  className="cursor-pointer group/slice"
                  onMouseEnter={() => setHoveredSlice(slice.id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => {
                    setSelectedSlice(slice.id);
                    if (onSliceClick) onSliceClick(slice);
                  }}
                >
                  <path
                    d={topPath}
                    fill={`url(#grad-top-${slice.id})`}
                    stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={isHovered ? 2 : 0.8}
                    opacity={hoveredSlice && !isHovered ? 0.75 : 1}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </g>

          {/* Floating Center 3D Hub Label */}
          <g pointerEvents="none">
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={32}
              ry={32 * tiltFactor}
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="1.5"
              className="drop-shadow-sm"
            />
            <text
              x={centerX}
              y={centerY - 2}
              textAnchor="middle"
              className="text-[12px] font-extrabold fill-slate-900 font-heading"
            >
              {activeSliceData.value}%
            </text>
            <text
              x={centerX}
              y={centerY + 8}
              textAnchor="middle"
              className="text-[8px] font-semibold fill-slate-500 uppercase tracking-wider"
            >
              {activeSliceData.id === 'paid' ? 'Collected' : 'Portion'}
            </text>
          </g>
        </svg>

        {/* Minimal Hover / Active Badge */}
        <div className="absolute top-2 right-2 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-xs font-medium pointer-events-none flex items-center gap-1.5 shadow-sm max-w-[180px] z-10">
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: activeSliceData.color }}
          />
          <span className="truncate">{activeSliceData.label}</span>
          <span className="font-bold text-emerald-400 ml-0.5 shrink-0">{activeSliceData.value}%</span>
        </div>
      </div>

      {/* Clean, Non-overflowing Legend */}
      <div className="pt-2.5 border-t border-slate-100 space-y-1">
        {data.map((item) => {
          const isHovered = hoveredSlice === item.id;
          const isSelected = selectedSlice === item.id;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredSlice(item.id)}
              onMouseLeave={() => setHoveredSlice(null)}
              onClick={() => {
                setSelectedSlice(item.id);
                if (onSliceClick) onSliceClick(item);
              }}
              className={`py-1.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs ${
                isSelected || isHovered
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                <span className="text-[11px] text-slate-400 font-medium">
                  {item.amount}
                </span>
                <span className="text-xs font-bold text-slate-900 font-heading w-8 text-right">
                  {item.value}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
