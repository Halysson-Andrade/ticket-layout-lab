import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, ArrowLeft, ArrowRight } from 'lucide-react';
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
import { 
  Sector,
  Seat,
  RowNumberingType,
  SeatNumberDirection,
  RowNumberingConfig
} from '@/types/mapStudio';
import { getSeatLabel } from '@/lib/mapUtils';

interface RowEditorModalProps {
  open: boolean;
  onClose: () => void;
  sector: Sector;
  rowLabel: string;
  onUpdateRow: (sectorId: string, rowLabel: string, config: RowNumberingConfig, newRowLabel?: string) => void;
}

export const RowEditorModal: React.FC<RowEditorModalProps> = ({
  open,
  onClose,
  sector,
  rowLabel,
  onUpdateRow,
}) => {
  const rowSeats = useMemo(() => {
    return sector.seats
      .filter(s => s.row === rowLabel)
      .sort((a, b) => a.x - b.x);
  }, [sector.seats, rowLabel]);

  // Obtém configuração existente ou cria padrão
  const existingConfig = sector.customPerRowNumbers?.[rowLabel];
  
  const [config, setConfig] = useState<{
    type: RowNumberingType;
    startNumber: number;
    customNumbers: string;
    direction: SeatNumberDirection;
    newRowLabel: string;
  }>({
    type: existingConfig?.type || 'numeric',
    startNumber: existingConfig?.startNumber || 1,
    customNumbers: existingConfig?.numbers?.join(', ') || '',
    direction: existingConfig?.direction || 'ltr',
    newRowLabel: rowLabel,
  });

  // Reset config quando modal abre
  useEffect(() => {
    if (open) {
      const existing = sector.customPerRowNumbers?.[rowLabel];
      setConfig({
        type: existing?.type || 'numeric',
        startNumber: existing?.startNumber || 1,
        customNumbers: existing?.numbers?.join(', ') || '',
        direction: existing?.direction || 'ltr',
        newRowLabel: rowLabel,
      });
    }
  }, [open, sector.customPerRowNumbers, rowLabel]);

  // Preview dos números gerados
  const previewNumbers = useMemo(() => {
    const total = rowSeats.length;
    const numbers: string[] = [];
    
    const parsedCustomNumbers = config.type === 'custom' && config.customNumbers
      ? config.customNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
      : undefined;
    
    const rowConfig: RowNumberingConfig = {
      rowLabel,
      type: config.type,
      startNumber: config.startNumber,
      numbers: parsedCustomNumbers,
      direction: config.direction,
    };
    
    for (let i = 0; i < Math.min(total, 20); i++) {
      const label = getSeatLabel(
        i, 
        total, 
        'custom-per-row', 
        config.startNumber, 
        i < total / 2, 
        undefined, 
        rowConfig,
        config.direction
      );
      numbers.push(label);
    }
    
    if (total > 20) {
      numbers.push('...');
    }
    
    return numbers;
  }, [rowSeats.length, config, rowLabel]);

  const handleSave = () => {
    const parsedNumbers = config.type === 'custom' && config.customNumbers
      ? config.customNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
      : undefined;
    
    const newRowLabelToUse = config.newRowLabel && config.newRowLabel !== rowLabel 
      ? config.newRowLabel 
      : rowLabel;
    
    // Passa o novo rowLabel na config para manter a referência correta
    onUpdateRow(sector.id, rowLabel, {
      rowLabel: newRowLabelToUse,
      type: config.type,
      startNumber: config.startNumber,
      numbers: parsedNumbers,
      direction: config.direction,
    }, newRowLabelToUse !== rowLabel ? newRowLabelToUse : undefined);
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Editar Fileira {rowLabel}
          </DialogTitle>
          <DialogDescription>
            Configure a numeração dos {rowSeats.length} assentos desta fileira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome da fileira */}
          <div className="space-y-2">
            <Label>Nome da Fileira</Label>
            <Input
              value={config.newRowLabel}
              onChange={(e) => setConfig(prev => ({ ...prev, newRowLabel: e.target.value }))}
              placeholder={rowLabel}
            />
            <p className="text-xs text-muted-foreground">
              Altere o rótulo desta fileira (ex: A, B, 1, 2, VIP)
            </p>
          </div>

          {/* Tipo de numeração */}
          <div className="space-y-2">
            <Label>Tipo de Numeração</Label>
            <Select 
              value={config.type} 
              onValueChange={(v: RowNumberingType) => setConfig(prev => ({ ...prev, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Sequencial (1, 2, 3...)</SelectItem>
                <SelectItem value="odd">Somente Ímpares (1, 3, 5...)</SelectItem>
                <SelectItem value="even">Somente Pares (2, 4, 6...)</SelectItem>
                <SelectItem value="custom">Customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Número inicial (para numeric, odd, even) */}
          {config.type !== 'custom' && (
            <div className="space-y-2">
              <Label>Número Inicial</Label>
              <Input
                type="number"
                min={1}
                value={config.startNumber}
                onChange={(e) => setConfig(prev => ({ ...prev, startNumber: parseInt(e.target.value) || 1 }))}
              />
            </div>
          )}

          {/* Números customizados */}
          {config.type === 'custom' && (
            <div className="space-y-2">
              <Label>Números (separados por vírgula)</Label>
              <Input
                value={config.customNumbers}
                onChange={(e) => setConfig(prev => ({ ...prev, customNumbers: e.target.value }))}
                placeholder="1, 2, 3, 5, 7, 9..."
              />
              <p className="text-xs text-muted-foreground">
                Informe os números na ordem que devem aparecer
              </p>
            </div>
          )}

          {/* Direção */}
          <div className="space-y-2">
            <Label>Direção da Numeração</Label>
            <Select 
              value={config.direction} 
              onValueChange={(v: SeatNumberDirection) => setConfig(prev => ({ ...prev, direction: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ltr">
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Esquerda → Direita
                  </span>
                </SelectItem>
                <SelectItem value="rtl">
                  <span className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Direita → Esquerda
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Prévia da Numeração</Label>
            <div className="flex flex-wrap gap-1 p-3 bg-muted rounded-lg max-h-20 overflow-y-auto">
              {previewNumbers.map((num, i) => (
                <span 
                  key={i} 
                  className="px-2 py-0.5 bg-primary/20 text-primary text-sm rounded"
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
