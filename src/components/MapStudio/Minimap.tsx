import React, { useCallback, useState } from 'react';
import { Sector } from '@/types/mapStudio';
import { ChevronDown, ChevronUp, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MinimapProps {
  width: number;
  height: number;
  sectors: Sector[];
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  onPanChange?: (pan: { x: number; y: number }) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  width,
  height,
  sectors,
  zoom,
  pan,
  viewportWidth,
  viewportHeight,
  onPanChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const minimapWidth = 160;
  const minimapHeight = (height / width) * minimapWidth;
  const scale = minimapWidth / width;

  // Viewport no minimapa
  const vpX = (-pan.x / zoom) * scale;
  const vpY = (-pan.y / zoom) * scale;
  const vpW = (viewportWidth / zoom) * scale;
  const vpH = (viewportHeight / zoom) * scale;

  // Clique no minimap para navegar
  const handleMinimapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPanChange) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;
    
    // Centraliza o viewport no ponto clicado
    const newPanX = -(clickX - viewportWidth / zoom / 2) * zoom;
    const newPanY = -(clickY - viewportHeight / zoom / 2) * zoom;
    
    onPanChange({ x: newPanX, y: newPanY });
  }, [scale, zoom, viewportWidth, viewportHeight, onPanChange]);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm border border-border rounded-lg overflow-hidden shadow-lg transition-all duration-200",
        isCollapsed && "opacity-80 hover:opacity-100"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5">
            <Map className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Minimapa</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        {/* Minimap SVG */}
        {!isCollapsed && (
          <svg
            width={minimapWidth}
            height={minimapHeight}
            viewBox={`0 0 ${width} ${height}`}
            className="block cursor-pointer"
            onClick={handleMinimapClick}
          >
            {/* Background */}
            <rect x={0} y={0} width={width} height={height} fill="hsl(220, 16%, 14%)" />

            {/* Grid simplificado */}
            <defs>
              <pattern id="minimap-grid" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="hsl(220, 16%, 20%)" strokeWidth="2" />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#minimap-grid)" />

            {/* Setores - usando polígonos reais */}
            {sectors.map(sector => {
              if (!sector.visible) return null;
              
              const pointsStr = sector.vertices
                .map(v => `${v.x},${v.y}`)
                .join(' ');
              
              return (
                <g key={sector.id}>
                  <polygon
                    points={pointsStr}
                    fill={sector.color}
                    fillOpacity={0.6}
                    stroke={sector.color}
                    strokeWidth={3}
                  />
                  {/* Indicador de quantidade de assentos */}
                  <text
                    x={sector.bounds.x + sector.bounds.width / 2}
                    y={sector.bounds.y + sector.bounds.height / 2}
                    fill="white"
                    fontSize={Math.min(sector.bounds.width, sector.bounds.height) * 0.3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontWeight="bold"
                  >
                    {sector.seats.length}
                  </text>
                </g>
              );
            })}

            {/* Viewport indicator */}
            <rect
              x={vpX / scale}
              y={vpY / scale}
              width={vpW / scale}
              height={vpH / scale}
              fill="hsla(217, 91%, 60%, 0.1)"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={5}
              rx={4}
            />
          </svg>
        )}
        
        {/* Info */}
        {!isCollapsed && (
          <div className="px-2 py-1 border-t border-border bg-muted/20">
            <span className="text-[9px] text-muted-foreground">
              Zoom: {Math.round(zoom * 100)}% • {sectors.length} setor(es)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
