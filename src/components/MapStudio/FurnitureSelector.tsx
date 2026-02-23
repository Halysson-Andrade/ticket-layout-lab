import React, { useState } from 'react';
import { Armchair, Square, Circle, RectangleHorizontal, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
                  onClick={() => onTableConfigChange({ ...tableConfig, shape })}
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
              onValueChange={([value]) => onTableConfigChange({ ...tableConfig, chairCount: value })}
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
                max={120}
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
                max={120}
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
              onValueChange={([value]) => onTableConfigChange({ ...tableConfig, chairStartAngle: value })}
              min={0}
              max={360}
              step={5}
              className="w-full"
            />
          </div>

          {/* Preview da mesa */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
            <div className="flex justify-center">
              <TablePreview config={tableConfig} type={selectedType} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Componente de preview da mesa
const TablePreview: React.FC<{ config: TableConfig; type: FurnitureType }> = ({ config, type }) => {
  const { shape, chairCount, tableWidth, tableHeight } = config;
  const scale = 0.8;
  const chairSize = (config.chairRadius || 6) * 1.6;
  const chairOffset = chairSize * 0.8 + 2;
  
  const renderChairs = () => {
    const chairs: React.ReactNode[] = [];
    const tw = tableWidth * scale;
    const th = tableHeight * scale;
    const startAngle = ((config.chairStartAngle || 0) * Math.PI) / 180;
    
    if (shape === 'round') {
      // Cadeiras em círculo ao redor da mesa
      for (let i = 0; i < chairCount; i++) {
        const angle = startAngle + (i * 2 * Math.PI / chairCount) - Math.PI / 2;
        const radius = Math.max(tw, th) / 2 + chairOffset;
        const cx = tw / 2 + radius * Math.cos(angle);
        const cy = th / 2 + radius * Math.sin(angle);
        chairs.push(
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={chairSize / 2}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="1"
          />
        );
      }
    } else {
      // Para mesas quadradas/retangulares, também distribui em círculo para suportar rotação
      for (let i = 0; i < chairCount; i++) {
        const angle = startAngle + (i * 2 * Math.PI / chairCount) - Math.PI / 2;
        const radiusX = tw / 2 + chairOffset;
        const radiusY = th / 2 + chairOffset;
        const cx = tw / 2 + radiusX * Math.cos(angle);
        const cy = th / 2 + radiusY * Math.sin(angle);
        chairs.push(
          <circle key={`s${i}`} cx={cx} cy={cy} r={chairSize / 2} fill="hsl(var(--primary))" />
        );
      }
    }
    return chairs;
  };

  const tw = tableWidth * scale;
  const th = tableHeight * scale;
  const viewBox = `-20 -20 ${tw + 40} ${th + 40}`;

  return (
    <svg viewBox={viewBox} width={tw + 40} height={th + 40} className="max-w-full">
      {/* Mesa */}
      {shape === 'round' ? (
        <ellipse
          cx={tw / 2}
          cy={th / 2}
          rx={tw / 2}
          ry={th / 2}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
      ) : (
        <rect
          x={0}
          y={0}
          width={tw}
          height={th}
          rx={shape === 'square' ? 4 : 2}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
      )}
      {/* Cadeiras */}
      {renderChairs()}
    </svg>
  );
};
