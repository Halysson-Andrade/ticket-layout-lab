import React, { useState } from 'react';
import { Grid3X3, RotateCw } from 'lucide-react';
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
import { GridGeneratorParams, RowLabelType, SeatLabelType } from '@/types/mapStudio';

interface GridGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (params: GridGeneratorParams) => void;
  sectorId: string;
}

export const GridGeneratorModal: React.FC<GridGeneratorModalProps> = ({
  open,
  onClose,
  onGenerate,
  sectorId,
}) => {
  const [params, setParams] = useState<GridGeneratorParams>({
    rows: 10,
    cols: 20,
    rowSpacing: 4,
    colSpacing: 2,
    seatSize: 16,
    rowLabelType: 'alpha',
    seatLabelType: 'numeric',
    rowLabelStart: 'A',
    seatLabelStart: 1,
    rotation: 0,
    sectorId,
    prefix: '',
  });

  const totalSeats = params.rows * params.cols;

  const handleGenerate = () => {
    onGenerate({ ...params, sectorId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Gerador de Grade de Assentos
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros para gerar assentos em grade. Total: <strong>{totalSeats.toLocaleString()}</strong> assentos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Dimensões */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Filas (Linhas)</Label>
              <Input
                type="number"
                value={params.rows}
                onChange={(e) => setParams({ ...params, rows: Math.max(1, parseInt(e.target.value) || 1) })}
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Assentos por Fila</Label>
              <Input
                type="number"
                value={params.cols}
                onChange={(e) => setParams({ ...params, cols: Math.max(1, parseInt(e.target.value) || 1) })}
                min={1}
                max={200}
              />
            </div>
          </div>

          {/* Espaçamento */}
          <div className="space-y-2">
            <Label className="text-xs">Espaçamento entre Filas: {params.rowSpacing}px</Label>
            <Slider
              value={[params.rowSpacing]}
              onValueChange={([v]) => setParams({ ...params, rowSpacing: v })}
              min={0}
              max={20}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Espaçamento entre Assentos: {params.colSpacing}px</Label>
            <Slider
              value={[params.colSpacing]}
              onValueChange={([v]) => setParams({ ...params, colSpacing: v })}
              min={0}
              max={20}
              step={1}
            />
          </div>

          {/* Tamanho */}
          <div className="space-y-2">
            <Label className="text-xs">Tamanho do Assento: {params.seatSize}px</Label>
            <Slider
              value={[params.seatSize]}
              onValueChange={([v]) => setParams({ ...params, seatSize: v })}
              min={8}
              max={32}
              step={2}
            />
          </div>

          {/* Rotulagem */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Fila</Label>
              <Select
                value={params.rowLabelType}
                onValueChange={(v: RowLabelType) => setParams({ ...params, rowLabelType: v })}
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
                value={params.rowLabelStart}
                onChange={(e) => setParams({ ...params, rowLabelStart: e.target.value })}
                placeholder={params.rowLabelType === 'alpha' ? 'A' : '1'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Numeração do Assento</Label>
              <Select
                value={params.seatLabelType}
                onValueChange={(v: SeatLabelType) => setParams({ ...params, seatLabelType: v })}
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
                value={params.seatLabelStart}
                onChange={(e) => setParams({ ...params, seatLabelStart: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
          </div>

          {/* Rotação */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <RotateCw className="h-3 w-3" />
              Rotação: {params.rotation}°
            </Label>
            <Slider
              value={[params.rotation]}
              onValueChange={([v]) => setParams({ ...params, rotation: v })}
              min={0}
              max={360}
              step={5}
            />
          </div>

          {/* Prefixo */}
          <div className="space-y-2">
            <Label className="text-xs">Prefixo (opcional)</Label>
            <Input
              value={params.prefix}
              onChange={(e) => setParams({ ...params, prefix: e.target.value })}
              placeholder="Ex: A-, SETOR1-"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate}>
            Gerar {totalSeats.toLocaleString()} Assentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
