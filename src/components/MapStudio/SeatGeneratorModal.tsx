import React, { useState, useMemo } from 'react';
import { Grid3X3, RotateCw, Square, Circle, Armchair, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GridGeneratorParams, 
  RowLabelType, 
  SeatLabelType, 
  FurnitureType, 
  TableShape,
  FURNITURE_LABELS,
  SEAT_COLORS,
  SeatType,
  Sector,
  Vertex
} from '@/types/mapStudio';
import { cn } from '@/lib/utils';
import { isPointInPolygon, getBoundsFromVertices } from '@/lib/mapUtils';

interface SeatGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (params: GridGeneratorParams) => void;
  sectorId: string;
  sector?: Sector | null;
}

interface GeneratorConfig {
  rows: number;
  cols: number;
  rowSpacing: number;
  colSpacing: number;
  seatSize: number;
  rowLabelType: RowLabelType;
  seatLabelType: SeatLabelType;
  rowLabelStart: string;
  seatLabelStart: number;
  rotation: number;
  prefix: string;
  furnitureType: FurnitureType;
  tableShape: TableShape;
  chairsPerTable: number;
  seatType: SeatType;
  customNumbers: string; // String de números separados por vírgula
  seatsPerRowEnabled: boolean; // Habilita configuração de assentos por fileira
  seatsPerRowConfig: string; // String de números separados por vírgula para cada fileira
}

const seatTypeOptions: { type: SeatType; label: string }[] = [
  { type: 'normal', label: 'Normal' },
  { type: 'vip', label: 'VIP' },
  { type: 'pcd', label: 'PCD' },
  { type: 'obeso', label: 'Obeso' },
];

export const SeatGeneratorModal: React.FC<SeatGeneratorModalProps> = ({
  open,
  onClose,
  onGenerate,
  sectorId,
  sector,
}) => {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [config, setConfig] = useState<GeneratorConfig>({
    rows: 10,
    cols: 20,
    rowSpacing: 4,
    colSpacing: 2,
    seatSize: 14,
    rowLabelType: 'alpha',
    seatLabelType: 'numeric',
    rowLabelStart: 'A',
    seatLabelStart: 1,
    rotation: 0,
    prefix: '',
    furnitureType: 'chair',
    tableShape: 'round',
    chairsPerTable: 6,
    seatType: 'normal',
    customNumbers: '',
    seatsPerRowEnabled: false,
    seatsPerRowConfig: '',
  });

  const isTable = config.furnitureType === 'table' || config.furnitureType === 'bistro';

  // Parse custom numbers
  const parsedCustomNumbers = useMemo(() => {
    if (config.seatLabelType !== 'custom' || !config.customNumbers.trim()) return null;
    return config.customNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
  }, [config.seatLabelType, config.customNumbers]);

  // Parse seats per row
  const parsedSeatsPerRow = useMemo(() => {
    if (!config.seatsPerRowEnabled || !config.seatsPerRowConfig.trim()) return undefined;
    return config.seatsPerRowConfig.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0);
  }, [config.seatsPerRowEnabled, config.seatsPerRowConfig]);

  // Preview dimensions - usa geometria do setor se disponível
  const previewDimensions = useMemo(() => {
    const sectorWidth = sector?.bounds.width || 450;
    const sectorHeight = sector?.bounds.height || 280;
    
    const maxPreviewWidth = 320;
    const maxPreviewHeight = 200;
    const scale = Math.min(maxPreviewWidth / sectorWidth, maxPreviewHeight / sectorHeight, 1);
    
    const width = sectorWidth * scale;
    const height = sectorHeight * scale;
    
    const baseSize = isTable ? 24 : 8;
    const scaledSeatSize = baseSize * scale;
    const scaledRowSpacing = Math.max(2, config.rowSpacing * scale / 2);
    const scaledColSpacing = Math.max(2, config.colSpacing * scale / 2);
    
    return { 
      width, 
      height, 
      seatSize: scaledSeatSize, 
      rowSpacing: scaledRowSpacing, 
      colSpacing: scaledColSpacing,
      scale,
      sectorWidth,
      sectorHeight
    };
  }, [config, sector, isTable]);

  // Gera vértices do polígono para preview (escalados)
  const previewVertices = useMemo(() => {
    if (!sector?.vertices) return null;
    const { scale } = previewDimensions;
    const minX = Math.min(...sector.vertices.map(v => v.x));
    const minY = Math.min(...sector.vertices.map(v => v.y));
    
    return sector.vertices.map(v => ({
      x: (v.x - minX) * scale,
      y: (v.y - minY) * scale,
    }));
  }, [sector?.vertices, previewDimensions]);

  // Gera preview dos assentos/mesas com verificação de polígono e rotação
  const previewData = useMemo(() => {
    const seats: { x: number; y: number; row: number; col: number; isInside: boolean }[] = [];
    const { width, height, seatSize, rowSpacing, colSpacing, scale } = previewDimensions;
    
    const itemSize = isTable ? seatSize * 2 : seatSize;
    const spacing = isTable ? colSpacing * 2 : colSpacing;
    const rSpacing = isTable ? rowSpacing * 2 : rowSpacing;
    
    const gridWidth = config.cols * (itemSize + spacing);
    const gridHeight = config.rows * (itemSize + rSpacing);
    const offsetX = (width - gridWidth) / 2 + itemSize / 2;
    const offsetY = (height - gridHeight) / 2 + itemSize / 2;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const rad = (config.rotation * Math.PI) / 180;
    
    let insideCount = 0;
    let outsideCount = 0;
    
    for (let r = 0; r < config.rows; r++) {
      // Quantidade de assentos nesta fileira
      const colsInRow = parsedSeatsPerRow && parsedSeatsPerRow[r] !== undefined ? parsedSeatsPerRow[r] : config.cols;
      const rowGridWidth = colsInRow * (itemSize + spacing);
      const rowOffsetX = (width - rowGridWidth) / 2 + itemSize / 2;
      
      for (let c = 0; c < colsInRow; c++) {
        let x = rowOffsetX + c * (itemSize + spacing);
        let y = offsetY + r * (itemSize + rSpacing);
        
        // Aplica rotação
        if (config.rotation !== 0) {
          const dx = x - centerX;
          const dy = y - centerY;
          x = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
          y = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
        }
        
        // Verifica se está dentro do polígono
        let isInside = true;
        if (previewVertices) {
          isInside = isPointInPolygon({ x, y }, previewVertices);
        }
        
        if (isInside) insideCount++;
        else outsideCount++;
        
        seats.push({ x, y, row: r, col: c, isInside });
      }
    }
    
    return { 
      seats, 
      insideCount, 
      outsideCount,
      totalItems: config.rows * config.cols,
      totalSeats: isTable ? insideCount * config.chairsPerTable : insideCount
    };
  }, [config.rows, config.cols, config.rotation, config.furnitureType, config.chairsPerTable, previewDimensions, previewVertices, isTable, parsedSeatsPerRow]);

  const handleGenerate = () => {
    const tableConf = isTable ? {
      shape: config.tableShape,
      chairCount: config.chairsPerTable,
      tableWidth: 60,
      tableHeight: 60,
    } : undefined;
    
    onGenerate({
      rows: config.rows,
      cols: config.cols,
      rowSpacing: config.rowSpacing,
      colSpacing: config.colSpacing,
      seatSize: config.seatSize,
      rowLabelType: config.rowLabelType,
      seatLabelType: config.seatLabelType,
      rowLabelStart: config.rowLabelStart,
      seatLabelStart: config.seatLabelStart,
      rotation: config.rotation,
      sectorId,
      prefix: config.prefix,
      furnitureType: config.furnitureType,
      tableConfig: tableConf,
      customNumbers: parsedCustomNumbers || undefined,
      seatsPerRow: parsedSeatsPerRow,
    });
    onClose();
    setStep('type');
  };

  const handleClose = () => {
    onClose();
    setStep('type');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Gerador de Assentos
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Selecione o tipo de mobília para o setor'}
            {step === 'config' && `Configuração - ${previewData.insideCount} ${isTable ? 'mesas' : 'assentos'} dentro do setor (${previewData.totalSeats} lugares)`}
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {['type', 'config'].map((s, i) => (
            <React.Fragment key={s}>
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s ? "bg-primary text-primary-foreground" : 
                  ['type', 'config'].indexOf(step) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < 1 && <div className="w-8 h-0.5 bg-muted" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left side - Configuration */}
          <ScrollArea className="flex-1 pr-4">
            {/* Step 1: Type Selection */}
            {step === 'type' && (
              <div className="space-y-4 py-4">
                <Label className="text-sm font-medium">Tipo de Mobília</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['chair', 'table', 'bistro'] as FurnitureType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setConfig(prev => ({ ...prev, furnitureType: type }))}
                      className={cn(
                        "p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all hover:border-primary/50",
                        config.furnitureType === type ? "border-primary bg-primary/10" : "border-border"
                      )}
                    >
                      {type === 'chair' && <Armchair className="h-8 w-8" />}
                      {type === 'table' && <Square className="h-8 w-8" />}
                      {type === 'bistro' && <Circle className="h-8 w-8" />}
                      <span className="text-sm font-medium">{FURNITURE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>

                {/* Table config */}
                {isTable && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">Forma da Mesa</Label>
                      <div className="flex gap-2">
                        {(['round', 'square', 'rectangular'] as TableShape[]).map(shape => (
                          <button
                            key={shape}
                            onClick={() => setConfig(prev => ({ ...prev, tableShape: shape }))}
                            className={cn(
                              "flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all",
                              config.tableShape === shape ? "border-primary bg-primary/10" : "border-border"
                            )}
                          >
                            {shape === 'round' && <Circle className="h-5 w-5" />}
                            {shape === 'square' && <Square className="h-5 w-5" />}
                            {shape === 'rectangular' && <div className="w-6 h-4 border-2 rounded" />}
                            <span className="text-xs capitalize">{shape === 'round' ? 'Redonda' : shape === 'square' ? 'Quadrada' : 'Retangular'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Cadeiras por Mesa: {config.chairsPerTable}</Label>
                      <Slider
                        value={[config.chairsPerTable]}
                        onValueChange={([v]) => setConfig(prev => ({ ...prev, chairsPerTable: v }))}
                        min={2}
                        max={12}
                        step={1}
                      />
                    </div>
                  </div>
                )}

                {/* Seat type */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-xs">Tipo de Assento</Label>
                  <div className="flex gap-2 flex-wrap">
                    {seatTypeOptions.map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => setConfig(prev => ({ ...prev, seatType: opt.type }))}
                        className={cn(
                          "px-3 py-2 rounded-lg border-2 flex items-center gap-2 transition-all",
                          config.seatType === opt.type ? "border-primary bg-primary/10" : "border-border"
                        )}
                      >
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: SEAT_COLORS[opt.type] }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Configuration with real-time preview */}
            {step === 'config' && (
              <div className="space-y-4 py-4">
                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Filas (Linhas)</Label>
                    <Input
                      type="number"
                      value={config.rows}
                      onChange={(e) => setConfig(prev => ({ ...prev, rows: Math.max(1, parseInt(e.target.value) || 1) }))}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{isTable ? 'Mesas por Fila' : 'Assentos por Fila'}</Label>
                    <Input
                      type="number"
                      value={config.cols}
                      onChange={(e) => setConfig(prev => ({ ...prev, cols: Math.max(1, parseInt(e.target.value) || 1) }))}
                      min={1}
                      max={200}
                    />
                  </div>
                </div>

                {/* Spacing */}
                <div className="space-y-2">
                  <Label className="text-xs">Espaçamento entre Filas: {config.rowSpacing}px</Label>
                  <Slider
                    value={[config.rowSpacing]}
                    onValueChange={([v]) => setConfig(prev => ({ ...prev, rowSpacing: v }))}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Espaçamento entre {isTable ? 'Mesas' : 'Assentos'}: {config.colSpacing}px</Label>
                  <Slider
                    value={[config.colSpacing]}
                    onValueChange={([v]) => setConfig(prev => ({ ...prev, colSpacing: v }))}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label className="text-xs">Tamanho do {isTable ? 'Item' : 'Assento'}: {config.seatSize}px</Label>
                  <Slider
                    value={[config.seatSize]}
                    onValueChange={([v]) => setConfig(prev => ({ ...prev, seatSize: v }))}
                    min={8}
                    max={40}
                    step={2}
                  />
                </div>

                {/* Labeling */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Fila</Label>
                    <Select
                      value={config.rowLabelType}
                      onValueChange={(v: RowLabelType) => setConfig(prev => ({ ...prev, rowLabelType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alpha">Letras (A, B, C...)</SelectItem>
                        <SelectItem value="numeric">Números (1, 2, 3...)</SelectItem>
                        <SelectItem value="roman">Romano (I, II, III...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Início da Fila</Label>
                    <Input
                      value={config.rowLabelStart}
                      onChange={(e) => setConfig(prev => ({ ...prev, rowLabelStart: e.target.value }))}
                      placeholder={config.rowLabelType === 'alpha' ? 'A' : '1'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Numeração do Assento</Label>
                    <Select
                      value={config.seatLabelType}
                      onValueChange={(v: SeatLabelType) => setConfig(prev => ({ ...prev, seatLabelType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numeric">Sequencial (1, 2, 3...)</SelectItem>
                        <SelectItem value="reverse">Reverso (N...3, 2, 1)</SelectItem>
                        <SelectItem value="odd-left">Ímpares à Esquerda</SelectItem>
                        <SelectItem value="even-left">Pares à Esquerda</SelectItem>
                        <SelectItem value="custom">Customizada (2, 7, 10...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {config.seatLabelType === 'custom' ? 'Números (ex: 2, 4, 6, 8)' : 'Número Inicial'}
                    </Label>
                    {config.seatLabelType === 'custom' ? (
                      <Input
                        value={config.customNumbers}
                        onChange={(e) => setConfig(prev => ({ ...prev, customNumbers: e.target.value }))}
                        placeholder="2, 4, 6, 8, 10"
                      />
                    ) : (
                      <Input
                        type="number"
                        value={config.seatLabelStart}
                        onChange={(e) => setConfig(prev => ({ ...prev, seatLabelStart: parseInt(e.target.value) || 1 }))}
                        min={1}
                      />
                    )}
                  </div>
                </div>

                {/* Seats per row config */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="seatsPerRowEnabled"
                      checked={config.seatsPerRowEnabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, seatsPerRowEnabled: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="seatsPerRowEnabled" className="text-xs">Quantidade de assentos por fileira (customizada)</Label>
                  </div>
                  {config.seatsPerRowEnabled && (
                    <div className="space-y-1">
                      <Input
                        value={config.seatsPerRowConfig}
                        onChange={(e) => setConfig(prev => ({ ...prev, seatsPerRowConfig: e.target.value }))}
                        placeholder="Ex: 10, 12, 14, 16 (um valor por fileira)"
                      />
                      <p className="text-xs text-muted-foreground">Informe a quantidade de assentos separados por vírgula. Ex: primeira fileira com 10, segunda com 12...</p>
                    </div>
                  )}
                </div>

                {/* Rotation & Prefix */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <RotateCw className="h-3 w-3" />
                      Rotação: {config.rotation}°
                    </Label>
                    <Slider
                      value={[config.rotation]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, rotation: v }))}
                      min={0}
                      max={360}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Prefixo (opcional)</Label>
                    <Input
                      value={config.prefix}
                      onChange={(e) => setConfig(prev => ({ ...prev, prefix: e.target.value }))}
                      placeholder="Ex: A-, SETOR1-"
                    />
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Right side - Real-time Preview (Melhoria 3, 5, 7) */}
          {step === 'config' && (
            <div className="w-[340px] flex flex-col gap-3 border-l pl-4">
              <div className="text-sm font-medium">Preview em Tempo Real</div>
              
              {/* Preview canvas */}
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-center flex-1">
                <svg 
                  width={previewDimensions.width} 
                  height={previewDimensions.height}
                  viewBox={`0 0 ${previewDimensions.width} ${previewDimensions.height}`}
                  className="border rounded bg-background"
                >
                  {/* Polígono do setor se disponível (Melhoria 7) */}
                  {previewVertices ? (
                    <polygon
                      points={previewVertices.map(v => `${v.x},${v.y}`).join(' ')}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      opacity="0.5"
                    />
                  ) : (
                    <rect 
                      x="10" y="10" 
                      width={previewDimensions.width - 20} 
                      height={previewDimensions.height - 20} 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="1" 
                      strokeDasharray="4 2"
                      opacity="0.3"
                    />
                  )}
                  
                  {/* Seats/Tables com indicação de dentro/fora */}
                  {previewData.seats.map((seat, i) => (
                    <React.Fragment key={i}>
                      {isTable ? (
                        <g opacity={seat.isInside ? 1 : 0.2}>
                          {/* Mesa */}
                          {config.tableShape === 'round' ? (
                            <circle
                              cx={seat.x}
                              cy={seat.y}
                              r={previewDimensions.seatSize}
                              fill="hsl(var(--muted))"
                              stroke={seat.isInside ? "hsl(var(--border))" : "hsl(var(--destructive))"}
                              strokeWidth="1"
                            />
                          ) : config.tableShape === 'rectangular' ? (
                            <rect
                              x={seat.x - previewDimensions.seatSize * 1.2}
                              y={seat.y - previewDimensions.seatSize * 0.7}
                              width={previewDimensions.seatSize * 2.4}
                              height={previewDimensions.seatSize * 1.4}
                              fill="hsl(var(--muted))"
                              stroke={seat.isInside ? "hsl(var(--border))" : "hsl(var(--destructive))"}
                              strokeWidth="1"
                              rx="2"
                            />
                          ) : (
                            <rect
                              x={seat.x - previewDimensions.seatSize}
                              y={seat.y - previewDimensions.seatSize}
                              width={previewDimensions.seatSize * 2}
                              height={previewDimensions.seatSize * 2}
                              fill="hsl(var(--muted))"
                              stroke={seat.isInside ? "hsl(var(--border))" : "hsl(var(--destructive))"}
                              strokeWidth="1"
                              rx="2"
                            />
                          )}
                          {/* Cadeiras ao redor da mesa */}
                          {Array.from({ length: config.chairsPerTable }).map((_, ci) => {
                            const angle = (ci / config.chairsPerTable) * Math.PI * 2 - Math.PI / 2;
                            const chairR = config.tableShape === 'rectangular' 
                              ? previewDimensions.seatSize * 1.8
                              : previewDimensions.seatSize * 1.5;
                            const cx = seat.x + Math.cos(angle) * chairR;
                            const cy = seat.y + Math.sin(angle) * chairR;
                            return (
                              <circle
                                key={ci}
                                cx={cx}
                                cy={cy}
                                r={previewDimensions.seatSize * 0.35}
                                fill={SEAT_COLORS[config.seatType]}
                                stroke="hsl(var(--background))"
                                strokeWidth="0.5"
                              />
                            );
                          })}
                        </g>
                      ) : (
                        <circle
                          cx={seat.x}
                          cy={seat.y}
                          r={previewDimensions.seatSize / 2}
                          fill={SEAT_COLORS[config.seatType]}
                          stroke={seat.isInside ? "hsl(var(--background))" : "hsl(var(--destructive))"}
                          strokeWidth="0.5"
                          opacity={seat.isInside ? 1 : 0.2}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </svg>
              </div>

              {/* Warning for seats outside polygon */}
              {previewData.outsideCount > 0 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-amber-600">
                    {previewData.outsideCount} {isTable ? 'mesas' : 'assentos'} fora do setor (não serão gerados)
                  </p>
                </div>
              )}

              {/* Info do setor */}
              {sector && (
                <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-primary">
                    <strong>Setor:</strong> {sector.name} ({Math.round(sector.bounds.width)}x{Math.round(sector.bounds.height)}px)
                  </p>
                </div>
              )}

              {/* Summary - Melhoria 5 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="ml-1 font-medium">{FURNITURE_LABELS[config.furnitureType]}</span>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Grid:</span>
                  <span className="ml-1 font-medium">{config.rows}x{config.cols}</span>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-primary">Dentro:</span>
                  <span className="ml-1 font-medium text-primary">{previewData.insideCount}</span>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-primary">Lugares:</span>
                  <span className="ml-1 font-medium text-primary">{previewData.totalSeats}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== 'type' && (
            <Button variant="outline" onClick={() => setStep('type')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          {step === 'type' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          {step === 'type' ? (
            <Button onClick={() => setStep('config')}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate}>
              Gerar {previewData.insideCount} {isTable ? 'Mesas' : 'Assentos'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
