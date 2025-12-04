import React, { useState, useEffect } from 'react';
import { Settings, Palette, Type, Move, RotateCw, Minus, Plus, RefreshCw, Grid3X3, CircleDot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sector, Seat, SeatType, SEAT_COLORS, SECTOR_COLORS } from '@/types/mapStudio';

interface RightSidebarProps {
  selectedSector: Sector | null;
  selectedSeats: Seat[];
  onUpdateSector: (id: string, updates: Partial<Sector>) => void;
  onUpdateSeats: (ids: string[], updates: Partial<Seat>) => void;
  onRegenerateSeats?: (sectorId: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedSector,
  selectedSeats,
  onUpdateSector,
  onUpdateSeats,
  onRegenerateSeats,
}) => {
  // Local state para edição em tempo real
  const [localRotation, setLocalRotation] = useState(0);
  const [localCurvature, setLocalCurvature] = useState(0);

  useEffect(() => {
    if (selectedSector) {
      setLocalRotation(selectedSector.rotation);
      setLocalCurvature(selectedSector.curvature || 0);
    }
  }, [selectedSector?.id, selectedSector?.rotation, selectedSector?.curvature]);

  const handleRotationChange = (value: number) => {
    setLocalRotation(value);
    if (selectedSector) {
      onUpdateSector(selectedSector.id, { rotation: value });
    }
  };

  const handleCurvatureChange = (value: number) => {
    setLocalCurvature(value);
    if (selectedSector) {
      onUpdateSector(selectedSector.id, { curvature: value });
    }
  };

  if (!selectedSector && selectedSeats.length === 0) {
    return (
      <div className="absolute right-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Propriedades</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div className="text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione um setor ou assentos para editar suas propriedades</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm">
          {selectedSeats.length > 0 
            ? `${selectedSeats.length} Assento(s) Selecionado(s)`
            : 'Propriedades do Setor'
          }
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Propriedades do Setor */}
          {selectedSector && selectedSeats.length === 0 && (
            <>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Type className="h-3 w-3" />
                  Nome do Setor
                </Label>
                <Input
                  value={selectedSector.name}
                  onChange={(e) => onUpdateSector(selectedSector.id, { name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  Cor do Setor
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SECTOR_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-full aspect-square rounded border-2 transition-all ${
                        selectedSector.color === color 
                          ? 'border-primary scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateSector(selectedSector.id, { color })}
                    />
                  ))}
                </div>
              </div>

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

              <div className="space-y-2">
                <Label className="text-xs">Dimensões</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Largura</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedSector.bounds.width)}
                      onChange={(e) => onUpdateSector(selectedSector.id, {
                        bounds: { ...selectedSector.bounds, width: parseInt(e.target.value) || 100 }
                      })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Altura</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedSector.bounds.height)}
                      onChange={(e) => onUpdateSector(selectedSector.id, {
                        bounds: { ...selectedSector.bounds, height: parseInt(e.target.value) || 100 }
                      })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Rotação com slider para feedback em tempo real */}
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
                      className="h-7 text-xs text-center"
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
                    <span className="text-xs text-muted-foreground">°</span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Reto</span>
                    <span className="text-xs font-medium">{localCurvature}%</span>
                    <span className="text-[10px] text-muted-foreground">Curvo</span>
                  </div>
                </div>
              </div>

              {/* Info e ações do setor */}
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs text-muted-foreground">
                  <strong>{selectedSector.seats.length}</strong> assentos neste setor
                </p>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Grid3X3 className="h-3 w-3" />
                    Dica: Arraste os vértices para remodelar o setor
                  </p>
                  
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
                    <Button
                      key={type}
                      variant={selectedSeats[0]?.type === type ? "default" : "outline"}
                      size="sm"
                      className="h-9 text-xs justify-start gap-2"
                      onClick={() => onUpdateSeats(selectedSeats.map(s => s.id), { type })}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: SEAT_COLORS[type] }} 
                      />
                      {type === 'normal' && 'Normal'}
                      {type === 'pcd' && 'PCD'}
                      {type === 'companion' && 'Acomp.'}
                      {type === 'obeso' && 'Obeso'}
                      {type === 'vip' && 'VIP'}
                      {type === 'blocked' && 'Bloq.'}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedSeats.length === 1 && (
                <>
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
                </>
              )}

              {selectedSeats.length > 1 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>{selectedSeats.length}</strong> assentos selecionados.
                    Alterações serão aplicadas a todos.
                  </p>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onUpdateSeats(selectedSeats.map(s => s.id), { type: 'blocked' })}
                >
                  Bloquear Selecionados
                </Button>
                <Button
                  variant="outline"
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
  );
};
