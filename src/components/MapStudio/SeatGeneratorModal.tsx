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

interface SeatGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (params: GridGeneratorParams) => void;
  sectorId: string;
  sector?: Sector | null; // Setor selecionado para usar geometria
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
  const [step, setStep] = useState<'type' | 'config' | 'preview'>('type');
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
  });

  // Calcula totais
  const totalItems = config.rows * config.cols;
  const isTable = config.furnitureType === 'table' || config.furnitureType === 'bistro';
  const totalSeats = isTable ? totalItems * config.chairsPerTable : totalItems;

  // Preview dimensions - usa geometria do setor se disponível
  const previewDimensions = useMemo(() => {
    // Se temos o setor, usa suas dimensões reais
    const sectorWidth = sector?.bounds.width || 450;
    const sectorHeight = sector?.bounds.height || 280;
    
    // Escala para caber no preview mantendo proporção
    const maxPreviewWidth = 500;
    const maxPreviewHeight = 300;
    const scale = Math.min(maxPreviewWidth / sectorWidth, maxPreviewHeight / sectorHeight, 1);
    
    const width = sectorWidth * scale;
    const height = sectorHeight * scale;
    
    // Calcula tamanho do item baseado no espaço disponível
    const isTable = config.furnitureType === 'table' || config.furnitureType === 'bistro';
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
  }, [config, sector]);

  // Gera preview dos assentos/mesas
  const previewSeats = useMemo(() => {
    const seats: { x: number; y: number; row: number; col: number }[] = [];
    const { width, height, seatSize, rowSpacing, colSpacing, scale } = previewDimensions;
    
    const isTable = config.furnitureType === 'table' || config.furnitureType === 'bistro';
    const itemSize = isTable ? seatSize * 2 : seatSize;
    const spacing = isTable ? colSpacing * 2 : colSpacing;
    const rSpacing = isTable ? rowSpacing * 2 : rowSpacing;
    
    const gridWidth = config.cols * (itemSize + spacing);
    const gridHeight = config.rows * (itemSize + rSpacing);
    const offsetX = (width - gridWidth) / 2 + itemSize / 2;
    const offsetY = (height - gridHeight) / 2 + itemSize / 2;
    
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        seats.push({
          x: offsetX + c * (itemSize + spacing),
          y: offsetY + r * (itemSize + rSpacing),
          row: r,
          col: c,
        });
      }
    }
    return seats;
  }, [config.rows, config.cols, config.furnitureType, previewDimensions]);

  // Gera vértices do polígono para preview (escalados)
  const previewVertices = useMemo(() => {
    if (!sector?.vertices) return null;
    const { scale, sectorWidth, sectorHeight, width, height } = previewDimensions;
    const minX = Math.min(...sector.vertices.map(v => v.x));
    const minY = Math.min(...sector.vertices.map(v => v.y));
    
    return sector.vertices.map(v => ({
      x: (v.x - minX) * scale,
      y: (v.y - minY) * scale,
    }));
  }, [sector?.vertices, previewDimensions]);

  const handleGenerate = () => {
    const tableConf = (config.furnitureType === 'table' || config.furnitureType === 'bistro') ? {
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Gerador de Assentos
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Selecione o tipo de mobília para o setor'}
            {step === 'config' && 'Configure os parâmetros de geração'}
            {step === 'preview' && `Preview: ${totalItems} ${isTable ? 'mesas' : 'assentos'} (${totalSeats} lugares)`}
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {['type', 'config', 'preview'].map((s, i) => (
            <React.Fragment key={s}>
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s ? "bg-primary text-primary-foreground" : 
                  ['type', 'config', 'preview'].indexOf(step) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-muted" />}
            </React.Fragment>
          ))}
        </div>

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
              {(config.furnitureType === 'table' || config.furnitureType === 'bistro') && (
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

          {/* Step 2: Configuration */}
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número Inicial</Label>
                  <Input
                    type="number"
                    value={config.seatLabelStart}
                    onChange={(e) => setConfig(prev => ({ ...prev, seatLabelStart: parseInt(e.target.value) || 1 }))}
                    min={1}
                  />
                </div>
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

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4 py-4">
              {/* Preview canvas */}
              <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
                <svg 
                  width={Math.min(previewDimensions.width, 500)} 
                  height={Math.min(previewDimensions.height, 300)}
                  viewBox={`0 0 ${previewDimensions.width} ${previewDimensions.height}`}
                  className="border rounded bg-background"
                >
                  {/* Polígono do setor se disponível */}
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
                  
                  {/* Seats/Tables */}
                  {previewSeats.map((seat, i) => (
                    <React.Fragment key={i}>
                      {isTable ? (
                        <g>
                          {/* Mesa */}
                          {config.tableShape === 'round' ? (
                            <circle
                              cx={seat.x}
                              cy={seat.y}
                              r={previewDimensions.seatSize}
                              fill="hsl(var(--muted))"
                              stroke="hsl(var(--border))"
                              strokeWidth="1"
                            />
                          ) : config.tableShape === 'rectangular' ? (
                            <rect
                              x={seat.x - previewDimensions.seatSize * 1.2}
                              y={seat.y - previewDimensions.seatSize * 0.7}
                              width={previewDimensions.seatSize * 2.4}
                              height={previewDimensions.seatSize * 1.4}
                              fill="hsl(var(--muted))"
                              stroke="hsl(var(--border))"
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
                              stroke="hsl(var(--border))"
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
                          stroke="hsl(var(--background))"
                          strokeWidth="0.5"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </svg>
              </div>

              {/* Info do setor */}
              {sector && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-primary">
                    <strong>Setor:</strong> {sector.name} ({Math.round(sector.bounds.width)}x{Math.round(sector.bounds.height)}px)
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="ml-2 font-medium">{FURNITURE_LABELS[config.furnitureType]}</span>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-medium">{totalItems} {isTable ? 'mesas' : 'assentos'}</span>
                </div>
                {isTable && (
                  <>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Cadeiras/mesa:</span>
                      <span className="ml-2 font-medium">{config.chairsPerTable}</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Total lugares:</span>
                      <span className="ml-2 font-medium">{totalSeats}</span>
                    </div>
                  </>
                )}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Filas:</span>
                  <span className="ml-2 font-medium">{config.rows}</span>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Por fila:</span>
                  <span className="ml-2 font-medium">{config.cols}</span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== 'type' && (
            <Button variant="outline" onClick={() => setStep(step === 'preview' ? 'config' : 'type')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          {step === 'type' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          {step !== 'preview' ? (
            <Button onClick={() => setStep(step === 'type' ? 'config' : 'preview')}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate}>
              Gerar {totalItems} {isTable ? 'Mesas' : 'Assentos'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
