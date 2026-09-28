import { useState } from 'react';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  innerRadiusRatio?: number; // 0 for full pie, ~0.65 for donut
  centerTitle?: string;
  centerSubtitle?: string;
  unit?: string;
  emptyLabel?: string;
  className?: string;
  onSliceClick?: (slice: DonutSlice) => void;
}

export function DonutChart({
  data,
  size = 220,
  innerRadiusRatio = 0.64,
  centerTitle,
  centerSubtitle,
  unit = '',
  emptyLabel = 'No data available',
  className = '',
  onSliceClick,
}: DonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = data.reduce((acc, item) => acc + item.value, 0);
  const center = size / 2;
  const outerRadius = (size / 2) - 10;
  const innerRadius = outerRadius * innerRadiusRatio;

  // Filter out 0 value slices for drawing
  const activeSlices = data.filter(s => s.value > 0);

  // If no data or total is 0
  if (total === 0 || activeSlices.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={(outerRadius + innerRadius) / 2}
            fill="none"
            stroke="#EAECF0"
            strokeWidth={outerRadius - innerRadius}
            strokeDasharray="4 4"
          />
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-[#98A2B3] font-medium"
          >
            {emptyLabel}
          </text>
        </svg>
      </div>
    );
  }

  // Pre-calculate angles for slices
  let cumulativeAngle = -Math.PI / 2; // start from top (12 o'clock)
  const renderedSlices = activeSlices.map(slice => {
    const fraction = slice.value / total;
    const sweepAngle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    cumulativeAngle = endAngle;

    return {
      slice,
      fraction,
      startAngle,
      endAngle,
      midAngle,
      isHovered: hoveredId === slice.id,
    };
  });

  const activeHovered = renderedSlices.find(s => s.slice.id === hoveredId);

  // Helper for generating SVG path
  function createArcPath(
    startAngle: number,
    endAngle: number,
    rOuter: number,
    rInner: number,
    isHovered: boolean,
    midAngle: number
  ) {
    // If only 1 slice takes 100% of pie
    if (activeSlices.length === 1) {
      // Draw full circle donut using two 180-deg arcs
      const mid = startAngle + Math.PI;
      const x1 = center + rOuter * Math.cos(startAngle);
      const y1 = center + rOuter * Math.sin(startAngle);
      const x2 = center + rOuter * Math.cos(mid);
      const y2 = center + rOuter * Math.sin(mid);
      const ix1 = center + rInner * Math.cos(startAngle);
      const iy1 = center + rInner * Math.sin(startAngle);
      const ix2 = center + rInner * Math.cos(mid);
      const iy2 = center + rInner * Math.sin(mid);

      return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} ` +
             `M ${ix1} ${iy1} A ${rInner} ${rInner} 0 0 0 ${ix2} ${iy2} A ${rInner} ${rInner} 0 0 0 ${ix1} ${iy1} Z`;
    }

    // Offset slightly outward if hovered
    const offsetDist = isHovered ? 4 : 0;
    const ox = offsetDist * Math.cos(midAngle);
    const oy = offsetDist * Math.sin(midAngle);

    const x1 = center + ox + rOuter * Math.cos(startAngle);
    const y1 = center + oy + rOuter * Math.sin(startAngle);
    const x2 = center + ox + rOuter * Math.cos(endAngle);
    const y2 = center + oy + rOuter * Math.sin(endAngle);

    const x3 = center + ox + rInner * Math.cos(endAngle);
    const y3 = center + oy + rInner * Math.sin(endAngle);
    const x4 = center + ox + rInner * Math.cos(startAngle);
    const y4 = center + oy + rInner * Math.sin(startAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${x1} ${y1} ` +
           `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} ` +
           `L ${x3} ${y3} ` +
           `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} ` +
           `Z`;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-6 ${className}`}>
      {/* SVG Donut */}
      <div className="relative flex-shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {renderedSlices.map(({ slice, startAngle, endAngle, midAngle, isHovered }) => {
            const path = createArcPath(startAngle, endAngle, outerRadius, innerRadius, isHovered, midAngle);
            return (
              <path
                key={slice.id}
                d={path}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth={2}
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                  opacity: hoveredId && !isHovered ? 0.7 : 1,
                }}
                onMouseEnter={() => setHoveredId(slice.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSliceClick?.(slice)}
              />
            );
          })}
        </svg>

        {/* Center Text inside Donut */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
          style={{
            width: innerRadius * 2,
            height: innerRadius * 2,
            top: center - innerRadius,
            left: center - innerRadius,
          }}
        >
          {activeHovered ? (
            <>
              <span className="text-xl font-bold text-[#101828] leading-tight">
                {activeHovered.slice.value}{unit}
              </span>
              <span className="text-[11px] font-semibold text-[#0B6E6E] truncate max-w-[100px] mt-0.5">
                {Math.round(activeHovered.fraction * 100)}%
              </span>
              <span className="text-[10px] text-[#667085] truncate max-w-[110px]">
                {activeHovered.slice.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-[#101828] tracking-tight leading-none">
                {total}{unit}
              </span>
              <span className="text-[11px] font-medium text-[#667085] mt-1 leading-tight">
                {centerTitle ?? 'Total'}
              </span>
              {centerSubtitle && (
                <span className="text-[10px] text-[#98A2B3] mt-0.5 leading-tight">
                  {centerSubtitle}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend & Details */}
      <div className="flex-1 w-full flex flex-col gap-2 min-w-0">
        {data.map(item => {
          const isItemHovered = hoveredId === item.id;
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                isItemHovered ? 'bg-[#F2F4F7]' : 'hover:bg-[#F9FAFB]'
              }`}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSliceClick?.(item)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-150"
                  style={{
                    backgroundColor: item.color,
                    transform: isItemHovered ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
                <span className="text-xs font-medium text-[#344054] truncate">
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {item.secondaryValue !== undefined && (
                  <span className="text-[11px] text-[#667085] font-mono tabular-nums">
                    {item.secondaryValue} {item.secondaryLabel ?? 'days'}
                  </span>
                )}
                <span className="text-xs font-semibold text-[#101828] font-mono tabular-nums">
                  {item.value}
                </span>
                <span className="text-[11px] font-medium text-[#475467] bg-[#F2F4F7] px-1.5 py-0.5 rounded tabular-nums min-w-[34px] text-right">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
