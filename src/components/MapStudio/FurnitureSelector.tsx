import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Armchair, Square, Circle, RectangleHorizontal, RotateCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { FurnitureType, TableShape, TableConfig, FURNITURE_LABELS } from '@/types/mapStudio';

interface FurnitureSelectorProps {
  selectedType: FurnitureType;
  tableConfig: TableConfig;
  onTypeChange: (type: FurnitureType) => void;
  onTableConfigChange: (config: TableConfig) => void;
}

const furnitureOptions: { type: FurnitureType; icon: React.ReactNode }[] = [
  { type: 'chair', icon: <Armchair className="h-5 w-5" /> },
  { type: 'table', icon: <Square className="h-5 w-5" /> },
  { type: 'bistro', icon: <Circle className="h-5 w-5" /> },
];

const tableShapeOptions: { shape: TableShape; icon: React.ReactNode; label: string }[] = [
  { shape: 'round', icon: <Circle className="h-4 w-4" />, label: 'Redonda' },
  { shape: 'square', icon: <Square className="h-4 w-4" />, label: 'Quadrada' },
  { shape: 'rectangular', icon: <RectangleHorizontal className="h-4 w-4" />, label: 'Retangular' },
];

export const FurnitureSelector: React.FC<FurnitureSelectorProps> = ({
  selectedType,
  tableConfig,
  onTypeChange,
  onTableConfigChange,
}) => {
  const showTableConfig = selectedType === 'table' || selectedType === 'bistro';

  const handleResetPositions = () => {
    onTableConfigChange({ ...tableConfig, chairAngles: undefined });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Tipo de Mobília</Label>
        <div className="flex gap-2">
          {furnitureOptions.map(({ type, icon }) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 flex flex-col gap-1 h-auto py-2",
                selectedType === type && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              onClick={() => onTypeChange(type)}
            >
              {icon}
              <span className="text-[10px]">{FURNITURE_LABELS[type]}</span>
            </Button>
          ))}
        </div>
      </div>

      {showTableConfig && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Formato da Mesa</Label>
            <div className="flex gap-2">
              {tableShapeOptions.map(({ shape, icon, label }) => (
                <Button
                  key={shape}
                  variant={tableConfig.shape === shape ? "default" : "outline"}
                  size="sm"
                  className="flex-1 flex flex-col gap-1 h-auto py-2"
                  onClick={() => onTableConfigChange({ ...tableConfig, shape, chairAngles: undefined })}
                >
                  {icon}
                  <span className="text-[10px]">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Cadeiras por Mesa: {tableConfig.chairCount}
            </Label>
            <Slider
              value={[tableConfig.chairCount]}
              onValueChange={([value]) => onTableConfigChange({ ...tableConfig, chairCount: value, chairAngles: undefined })}
              min={2}
              max={12}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Largura: {tableConfig.tableWidth}px
              </Label>
              <Slider
                value={[tableConfig.tableWidth]}
                onValueChange={([value]) => onTableConfigChange({ ...tableConfig, tableWidth: value })}
                min={30}
                max={300}
                step={5}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Altura: {tableConfig.tableHeight}px
              </Label>
              <Slider
                value={[tableConfig.tableHeight]}
                onValueChange={([value]) => onTableConfigChange({ ...tableConfig, tableHeight: value })}
                min={30}
                max={300}
                step={5}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
              <RotateCw className="h-3 w-3" />
              Direção das Cadeiras: {tableConfig.chairStartAngle || 0}°
            </Label>
            <Slider
              value={[tableConfig.chairStartAngle || 0]}
              onValueChange={([value]) => onTableConfigChange({ ...tableConfig, chairStartAngle: value, chairAngles: undefined })}
              min={0}
              max={360}
              step={5}
              className="w-full"
            />
          </div>

          {/* Preview interativo da mesa */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Preview (arraste as cadeiras)</Label>
              {tableConfig.chairAngles && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleResetPositions}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Resetar
                </Button>
              )}
            </div>
            <div className="flex justify-center">
              <InteractiveTablePreview config={tableConfig} type={selectedType} onConfigChange={onTableConfigChange} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper: compute chair position from angle
function getChairPosition(
  angle: number, // radians
  shape: TableShape,
  tw: number,
  th: number,
  chairSize: number
): { cx: number; cy: number } {
  const halfW = tw / 2;
  const halfH = th / 2;

  if (shape === 'round') {
    const tableRadius = Math.min(tw, th) / 2;
    const dist = tableRadius + chairSize / 2 + 2;
    return {
      cx: halfW + dist * Math.cos(angle),
      cy: halfH + dist * Math.sin(angle),
    };
  } else {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const scaleX = cos !== 0 ? Math.abs(halfW / cos) : Infinity;
    const scaleY = sin !== 0 ? Math.abs(halfH / sin) : Infinity;
    const s = Math.min(scaleX, scaleY);
    return {
      cx: halfW + cos * (s + chairSize / 2 + 2),
      cy: halfH + sin * (s + chairSize / 2 + 2),
    };
  }
}

// Interactive preview with draggable chairs
const InteractiveTablePreview: React.FC<{
  config: TableConfig;
  type: FurnitureType;
  onConfigChange: (config: TableConfig) => void;
}> = ({ config, type, onConfigChange }) => {
  const { shape, chairCount, tableWidth, tableHeight } = config;
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const scale = 0.8;
  const chairSize = (config.chairRadius || 6) * 1.6;
  const tw = tableWidth * scale;
  const th = tableHeight * scale;
  const padding = chairSize + 10;

  // Compute angles for each chair
  const getAngles = useCallback((): number[] => {
    if (config.chairAngles && config.chairAngles.length === chairCount) {
      return config.chairAngles;
    }
    // Default: evenly distributed
    const startDeg = config.chairStartAngle || 0;
    return Array.from({ length: chairCount }, (_, i) =>
      startDeg + (i * 360) / chairCount - 90
    );
  }, [config.chairAngles, config.chairStartAngle, chairCount]);

  const angles = getAngles();

  const chairs = angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return getChairPosition(rad, shape, tw, th, chairSize);
  });

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
  };

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      // Convert screen to SVG coordinates
      const svgX = ((e.clientX - rect.left) / rect.width) * (tw + padding * 2) - padding;
      const svgY = ((e.clientY - rect.top) / rect.height) * (th + padding * 2) - padding;

      // Angle from center
      const angleDeg = (Math.atan2(svgY - th / 2, svgX - tw / 2) * 180) / Math.PI;
      const snapped = Math.round(angleDeg / 5) * 5;

      const newAngles = [...getAngles()];
      newAngles[draggingIndex] = snapped;
      onConfigChange({ ...config, chairAngles: newAngles });
    };

    const handleMouseUp = () => setDraggingIndex(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, config, getAngles, onConfigChange, tw, th, padding]);

  const viewBox = `${-padding} ${-padding} ${tw + padding * 2} ${th + padding * 2}`;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      width={tw + padding * 2}
      height={th + padding * 2}
      className="max-w-full cursor-default"
    >
      {/* Mesa */}
      {shape === 'round' ? (
        <ellipse
          cx={tw / 2} cy={th / 2}
          rx={tw / 2} ry={th / 2}
          fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2"
        />
      ) : (
        <rect
          x={0} y={0} width={tw} height={th}
          rx={shape === 'square' ? 4 : 2}
          fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2"
        />
      )}
      {/* Cadeiras draggable */}
      {chairs.map(({ cx, cy }, i) => (
        <g key={i} style={{ cursor: 'grab' }} onMouseDown={(e) => handleMouseDown(i, e)}>
          <circle
            cx={cx} cy={cy} r={chairSize / 2 + 4}
            fill="transparent"
          />
          <circle
            cx={cx} cy={cy} r={chairSize / 2}
            fill={draggingIndex === i ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--primary))'}
            stroke={draggingIndex === i ? 'hsl(var(--primary-foreground))' : 'none'}
            strokeWidth="2"
          />
          <text
            x={cx} y={cy}
            textAnchor="middle" dominantBaseline="central"
            fill="hsl(var(--primary-foreground))"
            fontSize={chairSize * 0.55}
            fontWeight="bold"
            pointerEvents="none"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
};
