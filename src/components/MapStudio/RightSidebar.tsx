import React from 'react';
import { Settings, Palette, Type, Move, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sector, Seat, SeatType, SEAT_COLORS, SECTOR_COLORS } from '@/types/mapStudio';

interface RightSidebarProps {
  selectedSector: Sector | null;
  selectedSeats: Seat[];
  onUpdateSector: (id: string, updates: Partial<Sector>) => void;
  onUpdateSeats: (ids: string[], updates: Partial<Seat>) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedSector,
  selectedSeats,
  onUpdateSector,
  onUpdateSeats,
}) => {
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

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <RotateCw className="h-3 w-3" />
                  Rotação
                </Label>
                <Input
                  type="number"
                  value={selectedSector.rotation}
                  onChange={(e) => onUpdateSector(selectedSector.id, { rotation: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm"
                  min={0}
                  max={360}
                />
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>{selectedSector.seats.length}</strong> assentos neste setor
                </p>
              </div>
            </>
          )}

          {/* Propriedades dos Assentos */}
          {selectedSeats.length > 0 && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Tipo do Assento</Label>
                <Select
                  value={selectedSeats[0]?.type || 'normal'}
                  onValueChange={(value: SeatType) => {
                    onUpdateSeats(selectedSeats.map(s => s.id), { type: value });
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEAT_COLORS.normal }} />
                        Normal
                      </div>
                    </SelectItem>
                    <SelectItem value="pcd">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEAT_COLORS.pcd }} />
                        PCD
                      </div>
                    </SelectItem>
                    <SelectItem value="companion">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEAT_COLORS.companion }} />
                        Acompanhante
                      </div>
                    </SelectItem>
                    <SelectItem value="obeso">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEAT_COLORS.obeso }} />
                        Obeso
                      </div>
                    </SelectItem>
                    <SelectItem value="vip">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEAT_COLORS.vip }} />
                        VIP
                      </div>
                    </SelectItem>
                    <SelectItem value="blocked">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEAT_COLORS.blocked }} />
                        Bloqueado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onUpdateSeats(selectedSeats.map(s => s.id), { type: 'blocked' })}
                >
                  Bloquear Selecionados
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
