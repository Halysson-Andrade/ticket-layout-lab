import React from 'react';
import { Sector } from '@/types/mapStudio';

interface MinimapProps {
  width: number;
  height: number;
  sectors: Sector[];
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  width,
  height,
  sectors,
  zoom,
  pan,
  viewportWidth,
  viewportHeight,
}) => {
  const minimapWidth = 160;
  const minimapHeight = (height / width) * minimapWidth;
  const scale = minimapWidth / width;

  // Viewport no minimapa
  const vpX = (-pan.x / zoom) * scale;
  const vpY = (-pan.y / zoom) * scale;
  const vpW = (viewportWidth / zoom) * scale;
  const vpH = (viewportHeight / zoom) * scale;

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg overflow-hidden shadow-lg">
      <svg
        width={minimapWidth}
        height={minimapHeight}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        {/* Background */}
        <rect x={0} y={0} width={width} height={height} fill="#1e2330" />

        {/* Setores */}
        {sectors.map(sector => (
          <g key={sector.id}>
            <rect
              x={sector.bounds.x}
              y={sector.bounds.y}
              width={sector.bounds.width}
              height={sector.bounds.height}
              fill={sector.color}
              fillOpacity={0.5}
              stroke={sector.color}
              strokeWidth={2}
            />
          </g>
        ))}

        {/* Viewport indicator */}
        <rect
          x={vpX / scale}
          y={vpY / scale}
          width={vpW / scale}
          height={vpH / scale}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={4}
        />
      </svg>
    </div>
  );
};
