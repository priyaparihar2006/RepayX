import React, { useState, useEffect, useRef } from 'react';
import { Rotate3d, Sparkles } from 'lucide-react';

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
    color: '#245C35',
    depthColor: '#14351E',
    lightColor: '#B5F078',
  },
  {
    id: 'due_today',
    label: 'Due Today',
    count: 225,
    value: 18,
    amount: '₹15.0L',
    color: '#D97706',
    depthColor: '#B45309',
    lightColor: '#FDE68A',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    count: 150,
    value: 12,
    amount: '₹10.2L',
    color: '#DC2626',
    depthColor: '#991B1B',
    lightColor: '#FCA5A5',
  },
  {
    id: 'ptp',
    label: 'Promise to Pay',
    count: 100,
    value: 8,
    amount: '₹6.8L',
    color: '#16A34A',
    depthColor: '#15803D',
    lightColor: '#86EFAC',
  },
  {
    id: 'disputed',
    label: 'Disputed',
    count: 49,
    value: 4,
    amount: '₹3.4L',
    color: '#7C3AED',
    depthColor: '#5B21B6',
    lightColor: '#DDD6FE',
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

    requestAnimationFrame(animate);
  }, []);

  // Optional auto-rotation loop
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Geometry computation for 3D Elliptical Pie
  const centerX = 160;
  const centerY = 115;
  const radiusX = 110;
  const radiusY = radiusX * tiltFactor;
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
    const normStart = ((startAngle % 360) + 360) % 360;
    const normEnd = ((endAngle % 360) + 360) % 360;

    const p1 = getPoint(startAngle, rX, rY, 0, popout);
    const p2 = getPoint(endAngle, rX, rY, 0, popout);
    const p3 = getPoint(endAngle, rX, rY, thickness, popout);
    const p4 = getPoint(startAngle, rX, rY, thickness, popout);

    const span = endAngle - startAngle;
    const largeArcFlag = span > 180 ? 1 : 0;

    let path = `M ${p1.x} ${p1.y} A ${rX} ${rY} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rX} ${rY} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y} Z`;

    const isStartVisible = normStart >= 0 && normStart <= 180;
    const isEndVisible = normEnd >= 0 && normEnd <= 180;

    if (isStartVisible) {
      const pCenterTop = {
        x: centerX + Math.cos(((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)) * popout,
        y: centerY + Math.sin(((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)) * (popout * tiltFactor),
      };
      const pCenterBottom = {
        x: pCenterTop.x,
        y: pCenterTop.y + thickness,
      };
      path += ` M ${pCenterTop.x} ${pCenterTop.y} L ${p1.x} ${p1.y} L ${p4.x} ${p4.y} L ${pCenterBottom.x} ${pCenterBottom.y} Z`;
    }

    if (isEndVisible) {
      const pCenterTop = {
        x: centerX + Math.cos(((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)) * popout,
        y: centerY + Math.sin(((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)) * (popout * tiltFactor),
      };
      const pCenterBottom = {
        x: pCenterTop.x,
        y: pCenterTop.y + thickness,
      };
      path += ` M ${pCenterTop.x} ${pCenterTop.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${pCenterBottom.x} ${pCenterBottom.y} Z`;
    }

    return path;
  };

  // Determine current active slice
  const activeSliceData =
    data.find((s) => s.id === (hoveredSlice || selectedSlice)) || data[0];

  return (
    <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E7EBE3] shadow-fintech-card flex flex-col justify-between relative overflow-hidden group/card transition-all duration-200">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#B5F078]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Title and 3D Controls */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <h3 className="text-sm font-bold text-[#171A17] font-heading truncate">
          {title}
        </h3>

        {/* 3D View Controls */}
        <div className="flex items-center gap-1 bg-[#F5F7F3] p-1 rounded-full border border-[#E7EBE3] text-xs font-medium shrink-0">
          <button
            onClick={() => setRotationAngle((prev) => (prev + 30) % 360)}
            className="p-1 rounded-full text-[#777E77] hover:text-[#171A17] hover:bg-white transition-all cursor-pointer"
            title="Rotate 3D angle"
          >
            <Rotate3d className="w-3.5 h-3.5 text-[#245C35]" />
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              isAutoRotating
                ? 'bg-[#245C35] text-white shadow-2xs'
                : 'text-[#777E77] hover:text-[#171A17] hover:bg-white'
            }`}
            title="Auto 3D rotation"
          >
            <Sparkles className="w-3 h-3 text-[#B5F078]" />
            <span>Spin</span>
          </button>

          <button
            onClick={() => {
              setTiltFactor((prev) => (prev === 0.55 ? 0.7 : prev === 0.7 ? 0.45 : 0.55));
            }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[#777E77] hover:text-[#171A17] hover:bg-white transition-all cursor-pointer"
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
                floodColor="#171A17"
                floodOpacity="0.18"
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
                  <stop offset="100%" stopColor="#171A17" stopOpacity="0.85" />
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
            fill="#171A17"
            opacity="0.10"
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
                  opacity={hoveredSlice && !isHovered ? 0.6 : 1}
                  className="transition-all duration-300"
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
              stroke="#E7EBE3"
              strokeWidth="1.5"
              className="drop-shadow-sm"
            />
            <text
              x={centerX}
              y={centerY - 2}
              textAnchor="middle"
              className="text-[12px] font-extrabold fill-[#171A17] font-heading"
            >
              {activeSliceData.value}%
            </text>
            <text
              x={centerX}
              y={centerY + 8}
              textAnchor="middle"
              className="text-[8px] font-semibold fill-[#777E77] uppercase tracking-wider"
            >
              {activeSliceData.id === 'paid' ? 'Collected' : 'Portion'}
            </text>
          </g>
        </svg>

        {/* Minimal Hover / Active Badge */}
        <div className="absolute top-2 right-2 bg-[#171A17]/90 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none flex items-center gap-1.5 shadow-sm max-w-[180px] z-10 border border-white/10">
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: activeSliceData.color }}
          />
          <span className="truncate">{activeSliceData.label}</span>
          <span className="font-bold text-[#B5F078] ml-0.5 shrink-0">{activeSliceData.value}%</span>
        </div>
      </div>

      {/* Clean, Non-overflowing Legend */}
      <div className="pt-2.5 border-t border-[#E7EBE3] space-y-1">
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
              className={`py-1.5 px-3 rounded-full transition-all cursor-pointer flex items-center justify-between text-xs ${
                isSelected || isHovered
                  ? 'bg-[#EDF5E5] text-[#245C35] font-semibold'
                  : 'text-[#777E77] hover:bg-[#F5F7F3] hover:text-[#171A17]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                <span className="text-[11px] text-[#777E77] font-medium">
                  {item.amount}
                </span>
                <span className="text-xs font-bold text-[#171A17] font-heading w-8 text-right">
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
