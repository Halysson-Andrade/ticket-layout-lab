import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Sector, VenueElement, TextElement } from '@/types/mapStudio';

interface MapPreviewSVGProps {
  sectors: Sector[];
  elements?: VenueElement[];
  textElements?: TextElement[];
  width: number;
  height: number;
  backgroundImage?: string | null;
  bgConfig?: { url: string; opacity: number; scale: number; x: number; y: number } | null;
  hoveredSectorId?: string | null;
  selectedSectorId?: string | null;
  onHoverSector?: (id: string | null) => void;
  onClickSector?: (id: string) => void;
  className?: string;
  focusBounds?: { x: number; y: number; w: number; h: number } | null;
}

const verticesToPath = (vertices: { x: number; y: number }[]) => {
  if (!vertices.length) return '';
  const [first, ...rest] = vertices;
  return `M ${first.x} ${first.y} ${rest.map((v) => `L ${v.x} ${v.y}`).join(' ')} Z`;
};

export const MapPreviewSVG: React.FC<MapPreviewSVGProps> = ({
  sectors,
  elements = [],
  textElements = [],
  width,
  height,
  backgroundImage,
  bgConfig,
  hoveredSectorId,
  selectedSectorId,
  onHoverSector,
  onClickSector,
  className,
  focusBounds,
}) => {
  // Compute fit bounds from visible content
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    sectors.forEach((s) => {
      if (s.visible === false) return;
      s.vertices.forEach((v) => {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      });
    });
    if (!isFinite(minX)) {
      return { x: 0, y: 0, w: width, h: height };
    }
    const pad = 60;
    return {
      x: minX - pad,
      y: minY - pad,
      w: Math.max(100, maxX - minX + pad * 2),
      h: Math.max(100, maxY - minY + pad * 2),
    };
  }, [sectors, width, height]);

  const finalBounds = focusBounds
    ? { x: focusBounds.x, y: focusBounds.y, w: focusBounds.w, h: focusBounds.h }
    : bounds;

  return (
    <svg
      className={cn('w-full h-full block', className)}
      viewBox={`${finalBounds.x} ${finalBounds.y} ${finalBounds.w} ${finalBounds.h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ transition: 'all 400ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
    >
      {backgroundImage && bgConfig && (
        <image
          href={backgroundImage}
          x={bgConfig.x}
          y={bgConfig.y}
          width={width * bgConfig.scale}
          height={height * bgConfig.scale}
          opacity={bgConfig.opacity / 100}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {/* Elements (palco, decoração) */}
      {elements.map((el) => (
        <g key={el.id} transform={`rotate(${el.rotation || 0} ${el.bounds.x + el.bounds.width / 2} ${el.bounds.y + el.bounds.height / 2})`}>
          <rect
            x={el.bounds.x}
            y={el.bounds.y}
            width={el.bounds.width}
            height={el.bounds.height}
            fill={el.color || '#475569'}
            opacity={0.85}
            rx={6}
          />
          {el.label && (
            <text
              x={el.bounds.x + el.bounds.width / 2}
              y={el.bounds.y + el.bounds.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={Math.min(el.bounds.width, el.bounds.height) * 0.25}
              fontWeight="bold"
            >
              {el.label}
            </text>
          )}
        </g>
      ))}

      {/* Sectors */}
      {sectors.map((s) => {
        if (s.visible === false) return null;
        const isHover = hoveredSectorId === s.id;
        const isSelected = selectedSectorId === s.id;
        const cx = s.bounds.x + s.bounds.width / 2;
        const cy = s.bounds.y + s.bounds.height / 2;
        return (
          <g
            key={s.id}
            transform={`rotate(${s.rotation || 0} ${cx} ${cy})`}
            className="cursor-pointer"
            onMouseEnter={() => onHoverSector?.(s.id)}
            onMouseLeave={() => onHoverSector?.(null)}
            onClick={() => onClickSector?.(s.id)}
          >
            <path
              d={verticesToPath(s.vertices)}
              fill={s.color}
              fillOpacity={(isHover || isSelected ? 0.95 : (s.opacity ?? 60) / 100)}
              stroke={isSelected ? '#0f172a' : isHover ? '#1e293b' : 'rgba(0,0,0,0.25)'}
              strokeWidth={isSelected ? 3 : 1.5}
              style={{ transition: 'fill-opacity 120ms, stroke 120ms' }}
            />
            {/* Seats as tiny dots */}
            {s.seats.slice(0, 600).map((seat) => (
              <circle
                key={seat.id}
                cx={seat.x}
                cy={seat.y}
                r={Math.max(2, (s.seatSize ?? 14) * 0.35)}
                fill="rgba(255,255,255,0.85)"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={0.5}
              />
            ))}
            {/* Sector label */}
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#0f172a"
              fontSize={Math.max(14, Math.min(s.bounds.width, s.bounds.height) * 0.12)}
              fontWeight="bold"
              style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.9)', strokeWidth: 3 }}
              pointerEvents="none"
            >
              {s.sectorLabel || s.name}
            </text>
          </g>
        );
      })}

      {/* Text overlays */}
      {textElements.map((t) => (
        <text
          key={t.id}
          x={t.x}
          y={t.y}
          fill={t.color}
          fontFamily={t.fontFamily}
          fontSize={t.fontSize}
          fontWeight={t.fontWeight}
          fontStyle={t.fontStyle}
          textAnchor={t.textAlign === 'center' ? 'middle' : t.textAlign === 'right' ? 'end' : 'start'}
          transform={`rotate(${t.rotation || 0} ${t.x} ${t.y})`}
        >
          {t.text}
        </text>
      ))}
    </svg>
  );
};
