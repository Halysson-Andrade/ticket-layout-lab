import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Palette, Type, Move, RotateCw, Minus, Plus, RefreshCw, Grid3X3, CircleDot, Maximize2, Info, Link, ArrowLeftRight, ArrowUpDown, Circle, AlignCenter, FlipHorizontal, FlipVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Sector, Seat, SeatType, SEAT_COLORS, SECTOR_COLORS, SHAPE_NAMES, GeometricShape, PREDEFINED_SECTORS } from '@/types/mapStudio';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface RightSidebarProps {
  selectedSector: Sector | null;
  selectedSeats: Seat[];
  selectedShape?: GeometricShape | null;
  sectors?: Sector[];
  selectedSectorIds?: string[];
  onUpdateSector: (id: string, updates: Partial<Sector>) => void;
  onUpdateSeats: (ids: string[], updates: Partial<Seat>) => void;
  onRegenerateSeats?: (sectorId: string) => void;
  onResizeSector?: (sectorId: string, width: number, height: number) => void;
  onLinkShapeToSector?: (shapeId: string, sectorCategory: string) => void;
  onGroupSectors?: (sectorIds: string[], targetCategory: string) => void;
  onUpdateSpacing?: (sectorId: string, rowSpacing: number, colSpacing: number, seatSize: number) => void;
  onCenterSeats?: (sectorId: string) => void;
  onFlipSector?: (sectorId: string, direction: 'horizontal' | 'vertical') => void;
}

const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  normal: 'Normal',
  pcd: 'PCD',
  companion: 'Acompanhante',
  obeso: 'Obeso',
  vip: 'VIP',
  blocked: 'Bloqueado',
};

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedSector,
  selectedSeats,
  selectedShape,
  sectors = [],
  selectedSectorIds = [],
  onUpdateSector,
  onUpdateSeats,
  onRegenerateSeats,
  onResizeSector,
  onLinkShapeToSector,
  onGroupSectors,
  onUpdateSpacing,
  onCenterSeats,
  onFlipSector,
}) => {
  // Local state para edição em tempo real com debounce
  const [localRotation, setLocalRotation] = useState(0);
  const [localCurvature, setLocalCurvature] = useState(0);
  const [localWidth, setLocalWidth] = useState(450);
  const [localHeight, setLocalHeight] = useState(280);
  const [localOpacity, setLocalOpacity] = useState(60);
  const [localRowSpacing, setLocalRowSpacing] = useState(4);
  const [localColSpacing, setLocalColSpacing] = useState(2);
  const [localSeatSize, setLocalSeatSize] = useState(14);
  
  const debounceRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Sincroniza com setor selecionado
  useEffect(() => {
    if (selectedSector) {
      setLocalRotation(selectedSector.rotation);
      setLocalCurvature(selectedSector.curvature || 0);
      setLocalWidth(selectedSector.bounds.width);
      setLocalHeight(selectedSector.bounds.height);
      setLocalOpacity(selectedSector.opacity ?? 60);
      setLocalRowSpacing(selectedSector.rowSpacing ?? 4);
      setLocalColSpacing(selectedSector.colSpacing ?? 2);
      setLocalSeatSize(selectedSector.seatSize ?? 14);
    }
  }, [selectedSector?.id, selectedSector?.rotation, selectedSector?.curvature, selectedSector?.bounds.width, selectedSector?.bounds.height, selectedSector?.opacity, selectedSector?.rowSpacing, selectedSector?.colSpacing, selectedSector?.seatSize]);

  // Debounced update helper
  const debouncedUpdate = useCallback((key: string, fn: () => void, delay: number = 150) => {
    if (debounceRef.current[key]) {
      clearTimeout(debounceRef.current[key]);
    }
    debounceRef.current[key] = setTimeout(fn, delay);
  }, []);

  const handleRotationChange = useCallback((value: number) => {
    setLocalRotation(value);
    if (selectedSector) {
      debouncedUpdate('rotation', () => onUpdateSector(selectedSector.id, { rotation: value }));
    }
  }, [selectedSector, onUpdateSector, debouncedUpdate]);

  const handleCurvatureChange = useCallback((value: number) => {
    setLocalCurvature(value);
    if (selectedSector) {
      debouncedUpdate('curvature', () => onUpdateSector(selectedSector.id, { curvature: value }), 200);
    }
  }, [selectedSector, onUpdateSector, debouncedUpdate]);

  const handleWidthChange = useCallback((value: number) => {
    setLocalWidth(value);
    if (selectedSector && onResizeSector) {
      debouncedUpdate('width', () => onResizeSector(selectedSector.id, value, localHeight), 100);
    }
  }, [selectedSector, onResizeSector, localHeight, debouncedUpdate]);

  const handleHeightChange = useCallback((value: number) => {
    setLocalHeight(value);
    if (selectedSector && onResizeSector) {
      debouncedUpdate('height', () => onResizeSector(selectedSector.id, localWidth, value), 100);
    }
  }, [selectedSector, onResizeSector, localWidth, debouncedUpdate]);

  const handleOpacityChange = useCallback((value: number) => {
    setLocalOpacity(value);
    if (selectedSector) {
      debouncedUpdate('opacity', () => onUpdateSector(selectedSector.id, { opacity: value }), 100);
    }
  }, [selectedSector, onUpdateSector, debouncedUpdate]);

  const handleRowSpacingChange = useCallback((value: number) => {
    setLocalRowSpacing(value);
    if (selectedSector && onUpdateSpacing) {
      debouncedUpdate('rowSpacing', () => onUpdateSpacing(selectedSector.id, value, localColSpacing, localSeatSize), 200);
    }
  }, [selectedSector, onUpdateSpacing, localColSpacing, localSeatSize, debouncedUpdate]);

  const handleColSpacingChange = useCallback((value: number) => {
    setLocalColSpacing(value);
    if (selectedSector && onUpdateSpacing) {
      debouncedUpdate('colSpacing', () => onUpdateSpacing(selectedSector.id, localRowSpacing, value, localSeatSize), 200);
    }
  }, [selectedSector, onUpdateSpacing, localRowSpacing, localSeatSize, debouncedUpdate]);

  const handleSeatSizeChange = useCallback((value: number) => {
    setLocalSeatSize(value);
    if (selectedSector && onUpdateSpacing) {
      debouncedUpdate('seatSize', () => onUpdateSpacing(selectedSector.id, localRowSpacing, localColSpacing, value), 200);
    }
  }, [selectedSector, onUpdateSpacing, localRowSpacing, localColSpacing, debouncedUpdate]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  if (!selectedSector && selectedSeats.length === 0 && !selectedShape) {
    return (
      <div className="absolute right-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Propriedades
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div className="text-muted-foreground space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Settings className="h-8 w-8 opacity-30" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhuma seleção</p>
              <p className="text-xs mt-1">Clique em um setor ou assento para editar suas propriedades</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Propriedades de forma geométrica (não vinculada a setor)
  if (selectedShape) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="absolute right-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: selectedShape.color }}
              />
              {selectedShape.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {SHAPE_NAMES[selectedShape.shape]} • Forma geométrica
            </p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Info */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Esta forma não está vinculada a um setor. Vincule para adicionar assentos.
                </p>
              </div>

              {/* Vincular a setor */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Link className="h-3 w-3" />
                  Vincular a Setor
                </Label>
                <Select
                  onValueChange={(categoryId) => onLinkShapeToSector?.(selectedShape.id, categoryId)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Selecione um setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_SECTORS.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-border" 
                            style={{ backgroundColor: sector.color }}
                          />
                          {sector.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Selecione o setor para vincular esta forma. Após vincular, você poderá adicionar assentos.
                </p>
              </div>

              {/* Dimensões */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Maximize2 className="h-3 w-3" />
                  Dimensões
                </Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Largura:</span>
                    <span className="ml-1 font-medium">{Math.round(selectedShape.bounds.width)}px</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Altura:</span>
                    <span className="ml-1 font-medium">{Math.round(selectedShape.bounds.height)}px</span>
                  </div>
                </div>
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  Cor
                </Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {SECTOR_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-110 ${
                        selectedShape.color === color 
                          ? 'border-primary ring-2 ring-primary/30 scale-105' 
                          : 'border-transparent hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }

  // Múltiplos setores selecionados - opção de agrupar
  if (selectedSectorIds.length > 1) {
    const selectedSectors = sectors.filter(s => selectedSectorIds.includes(s.id));
    
    return (
      <TooltipProvider delayDuration={300}>
        <div className="absolute right-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {selectedSectorIds.length} Setores Selecionados
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use Shift+Clique para selecionar múltiplos setores
            </p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Lista de setores selecionados */}
              <div className="space-y-2">
                <Label className="text-xs">Setores selecionados:</Label>
                <div className="space-y-1">
                  {selectedSectors.map(sector => (
                    <div key={sector.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: sector.color }}
                      />
                      <span className="flex-1">{sector.name}</span>
                      <span className="text-muted-foreground">{sector.seats.length} assentos</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opção de agrupar */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs flex items-center gap-2">
                  <Link className="h-3 w-3" />
                  Agrupar em Setor
                </Label>
                <Select
                  onValueChange={(categoryId) => onGroupSectors?.(selectedSectorIds, categoryId)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Selecione um setor para agrupar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_SECTORS.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-border" 
                            style={{ backgroundColor: sector.color }}
                          />
                          {sector.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Ao agrupar, todos os {selectedSectorIds.length} setores serão vinculados à mesma categoria.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute right-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            {selectedSeats.length > 0 ? (
              <>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {selectedSeats.length} Assento(s)
              </>
            ) : selectedSector ? (
              <>
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: selectedSector.color }}
                />
                {selectedSector.name}
              </>
            ) : 'Propriedades'}
          </h2>
          {selectedSector && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {SHAPE_NAMES[selectedSector.shape]} • {selectedSector.seats.length} assentos
            </p>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Propriedades do Setor */}
            {selectedSector && selectedSeats.length === 0 && (
              <>
                {/* Setor (somente seleção, não editável) */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-2">
                    <Type className="h-3 w-3" />
                    Setor
                  </Label>
                  <Select
                    value={PREDEFINED_SECTORS.find(s => s.name === selectedSector.name)?.id || ''}
                    onValueChange={(categoryId) => {
                      const category = PREDEFINED_SECTORS.find(s => s.id === categoryId);
                      if (category) {
                        onUpdateSector(selectedSector.id, { 
                          name: category.name, 
                          color: category.color 
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={selectedSector.name} />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_SECTORS.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full border border-border" 
                              style={{ backgroundColor: sector.color }}
                            />
                            {sector.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cor - paleta expandida */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-2">
                    <Palette className="h-3 w-3" />
                    Cor do Setor
                  </Label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[...SECTOR_COLORS, 
                      'hsl(0, 75%, 50%)', 'hsl(15, 80%, 50%)', 'hsl(30, 85%, 50%)', 
                      'hsl(60, 70%, 45%)', 'hsl(90, 60%, 45%)', 'hsl(120, 55%, 45%)',
                      'hsl(150, 60%, 45%)', 'hsl(180, 65%, 45%)', 'hsl(210, 70%, 50%)',
                      'hsl(240, 65%, 55%)', 'hsl(270, 60%, 55%)', 'hsl(300, 55%, 50%)',
                      'hsl(0, 0%, 30%)', 'hsl(0, 0%, 50%)', 'hsl(0, 0%, 70%)', 'hsl(0, 0%, 85%)'
                    ].map((color, idx) => (
                      <Tooltip key={`${color}-${idx}`}>
                        <TooltipTrigger asChild>
                          <button
                            className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-110 ${
                              selectedSector.color === color 
                                ? 'border-primary ring-2 ring-primary/30 scale-105' 
                                : 'border-transparent hover:border-primary/50'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdateSector(selectedSector.id, { color })}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Selecionar cor
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {/* Posição */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-2">
                    <Move className="h-3 w-3" />
                    Posição
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">X</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedSector.bounds.x)}
                        onChange={(e) => onUpdateSector(selectedSector.id, {
                          bounds: { ...selectedSector.bounds, x: parseInt(e.target.value) || 0 }
                        })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Y</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedSector.bounds.y)}
                        onChange={(e) => onUpdateSector(selectedSector.id, {
                          bounds: { ...selectedSector.bounds, y: parseInt(e.target.value) || 0 }
                        })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <Label className="text-xs flex items-center gap-2">
                    <Maximize2 className="h-3 w-3" />
                    Dimensões
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px] text-xs">
                        Ajuste a largura e altura do setor. Os assentos não são regenerados automaticamente.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground">Largura</Label>
                        <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{localWidth}px</span>
                      </div>
                      <Slider
                        value={[localWidth]}
                        onValueChange={([value]) => handleWidthChange(value)}
                        min={100}
                        max={2000}
                        step={10}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground">Altura</Label>
                        <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{localHeight}px</span>
                      </div>
                      <Slider
                        value={[localHeight]}
                        onValueChange={([value]) => handleHeightChange(value)}
                        min={100}
                        max={1500}
                        step={10}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Centralizar e Inverter */}
                {selectedSector.seats.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Transformações</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {onCenterSeats && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => onCenterSeats(selectedSector.id)}
                          title="Centralizar Assentos"
                        >
                          <AlignCenter className="h-3 w-3" />
                        </Button>
                      )}
                      {onFlipSector && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => onFlipSector(selectedSector.id, 'horizontal')}
                            title="Inverter Horizontal"
                          >
                            <FlipHorizontal className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => onFlipSector(selectedSector.id, 'vertical')}
                            title="Inverter Vertical"
                          >
                            <FlipVertical className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Centraliza ou inverte o setor mantendo a numeração.
                    </p>
                  </div>
                )}

                {/* Espaçamento entre assentos */}
                {selectedSector.seats.length > 0 && onUpdateSpacing && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs flex items-center gap-2">
                      <Grid3X3 className="h-3 w-3" />
                      Espaçamento
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[200px] text-xs">
                          Ajuste o espaçamento entre assentos. A forma se ajusta automaticamente.
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ArrowUpDown className="h-2.5 w-2.5" />
                            Entre Filas
                          </Label>
                          <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{localRowSpacing}px</span>
                        </div>
                        <Slider
                          value={[localRowSpacing]}
                          onValueChange={([value]) => handleRowSpacingChange(value)}
                          min={0}
                          max={40}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ArrowLeftRight className="h-2.5 w-2.5" />
                            Entre Assentos
                          </Label>
                          <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{localColSpacing}px</span>
                        </div>
                        <Slider
                          value={[localColSpacing]}
                          onValueChange={([value]) => handleColSpacingChange(value)}
                          min={0}
                          max={40}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Circle className="h-2.5 w-2.5" />
                            Tamanho do Assento
                          </Label>
                          <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{localSeatSize}px</span>
                        </div>
                        <Slider
                          value={[localSeatSize]}
                          onValueChange={([value]) => handleSeatSizeChange(value)}
                          min={8}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-2">
                    <RotateCw className="h-3 w-3" />
                    Rotação
                  </Label>
                  <div className="space-y-2">
                    <Slider
                      value={[localRotation]}
                      onValueChange={([value]) => handleRotationChange(value)}
                      min={0}
                      max={360}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRotationChange(Math.max(0, localRotation - 15))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={localRotation}
                        onChange={(e) => handleRotationChange(parseInt(e.target.value) || 0)}
                        className="h-7 text-xs text-center flex-1"
                        min={0}
                        max={360}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRotationChange(Math.min(360, localRotation + 15))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground w-4">°</span>
                    </div>
                    {/* Atalhos de rotação */}
                    <div className="flex gap-1">
                      {[0, 45, 90, 180, 270].map(deg => (
                        <Button
                          key={deg}
                          variant={localRotation === deg ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-6 text-[10px] px-1"
                          onClick={() => handleRotationChange(deg)}
                        >
                          {deg}°
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Curvatura */}
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-2">
                    <CircleDot className="h-3 w-3" />
                    Curvatura
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px] text-xs">
                        Transforma a forma em arco. Valores acima de 80 criam arcos completos.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="space-y-2">
                    <Slider
                      value={[localCurvature]}
                      onValueChange={([value]) => handleCurvatureChange(value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Reto</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded">{localCurvature}%</span>
                      <span className="text-muted-foreground">Curvo</span>
                </div>

                {/* Opacidade */}
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-2">
                    <Palette className="h-3 w-3" />
                    Opacidade do Preenchimento
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px] text-xs">
                        Ajuste a transparência para visualizar mapas de fundo importados.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="space-y-2">
                    <Slider
                      value={[localOpacity]}
                      onValueChange={([value]) => handleOpacityChange(value)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Transparente</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded">{localOpacity}%</span>
                      <span className="text-muted-foreground">Sólido</span>
                    </div>
                  </div>
                </div>
                  </div>
                </div>

                {/* Ações do setor */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Grid3X3 className="h-3 w-3 flex-shrink-0" />
                    <span>Arraste os vértices para remodelar</span>
                  </div>
                  
                  {onRegenerateSeats && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onRegenerateSeats(selectedSector.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Regenerar Assentos
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Propriedades dos Assentos */}
            {selectedSeats.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Tipo do Assento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['normal', 'pcd', 'companion', 'obeso', 'vip', 'blocked'] as SeatType[]).map(type => (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={selectedSeats[0]?.type === type ? "default" : "outline"}
                            size="sm"
                            className="h-9 text-xs justify-start gap-2"
                            onClick={() => onUpdateSeats(selectedSeats.map(s => s.id), { type })}
                          >
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: SEAT_COLORS[type] }} 
                            />
                            <span className="truncate">{SEAT_TYPE_LABELS[type]}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          Aplicar tipo {SEAT_TYPE_LABELS[type]}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {selectedSeats.length === 1 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Identificação</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Fila</Label>
                        <Input
                          value={selectedSeats[0].row}
                          onChange={(e) => onUpdateSeats([selectedSeats[0].id], { row: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Número</Label>
                        <Input
                          value={selectedSeats[0].number}
                          onChange={(e) => onUpdateSeats([selectedSeats[0].id], { number: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedSeats.length > 1 && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-xs text-primary">
                      <strong>{selectedSeats.length}</strong> assentos selecionados.
                      Alterações serão aplicadas a todos.
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-border space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onUpdateSeats(selectedSeats.map(s => s.id), { type: 'blocked' })}
                  >
                    Bloquear Selecionados
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onUpdateSeats(selectedSeats.map(s => s.id), { type: 'normal' })}
                  >
                    Restaurar para Normal
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};
