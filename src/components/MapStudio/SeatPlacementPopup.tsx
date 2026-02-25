import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Armchair, Square, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SeatType, FurnitureType, TableConfig, SEAT_COLORS, FURNITURE_LABELS, TableShape } from '@/types/mapStudio';

export interface SeatPlacementConfig {
  seatType: SeatType;
  furnitureType: FurnitureType;
  row: string;
  number: string;
  tableConfig?: TableConfig;
}

interface SeatPlacementPopupProps {
  position: { x: number; y: number }; // screen coords
  currentFurnitureType: FurnitureType;
  currentSeatType: SeatType;
  currentTableConfig: TableConfig;
  nextNumber: number;
  onConfirm: (config: SeatPlacementConfig) => void;
  onCancel: () => void;
}

const seatTypeOptions: { type: SeatType; label: string }[] = [
  { type: 'normal', label: 'Normal' },
  { type: 'pcd', label: 'PCD' },
  { type: 'companion', label: 'Acomp.' },
  { type: 'obeso', label: 'Obeso' },
  { type: 'vip', label: 'VIP' },
  { type: 'blocked', label: 'Bloqueado' },
];

const furnitureOptions: { type: FurnitureType; icon: React.ReactNode; label: string }[] = [
  { type: 'chair', icon: <Armchair className="h-4 w-4" />, label: 'Cadeira' },
  { type: 'table', icon: <Square className="h-4 w-4" />, label: 'Mesa' },
  { type: 'bistro', icon: <Circle className="h-4 w-4" />, label: 'Bistrô' },
];

export const SeatPlacementPopup: React.FC<SeatPlacementPopupProps> = ({
  position,
  currentFurnitureType,
  currentSeatType,
  currentTableConfig,
  nextNumber,
  onConfirm,
  onCancel,
}) => {
  const [seatType, setSeatType] = useState<SeatType>(currentSeatType);
  const [furnitureType, setFurnitureType] = useState<FurnitureType>(currentFurnitureType);
  const [row, setRow] = useState('');
  const [number, setNumber] = useState(String(nextNumber));
  const [tableConfig] = useState<TableConfig>(currentTableConfig);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') {
        onConfirm({
          seatType,
          furnitureType,
          row,
          number,
          tableConfig: furnitureType !== 'chair' ? tableConfig : undefined,
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, onConfirm, seatType, furnitureType, row, number, tableConfig]);

  // Click outside to cancel
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onCancel]);

  // Compute popup position (keep within viewport)
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x + 10, window.innerWidth - 280),
    top: Math.min(position.y - 10, window.innerHeight - 400),
    zIndex: 9999,
  };

  const handleConfirm = () => {
    onConfirm({
      seatType,
      furnitureType,
      row,
      number,
      tableConfig: furnitureType !== 'chair' ? tableConfig : undefined,
    });
  };

  return (
    <div
      ref={popupRef}
      style={popupStyle}
      className="w-64 bg-card border border-border rounded-xl shadow-2xl p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Inserir Assento</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Furniture Type */}
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1.5 block">Tipo de Mobília</Label>
        <div className="flex gap-1.5">
          {furnitureOptions.map(({ type, icon, label }) => (
            <button
              key={type}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border text-[10px] transition-all",
                furnitureType === type
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
              onClick={() => setFurnitureType(type)}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Seat Type */}
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1.5 block">Tipo do Assento</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {seatTypeOptions.map(({ type, label }) => (
            <button
              key={type}
              className={cn(
                "flex items-center gap-1 py-1 px-2 rounded-lg border text-[10px] transition-all",
                seatType === type
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setSeatType(type)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: SEAT_COLORS[type] }}
              />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Row & Number */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Fila</Label>
          <Input
            value={row}
            onChange={(e) => setRow(e.target.value)}
            placeholder="A"
            className="h-7 text-xs"
          />
        </div>
        <div className="flex-1">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Número</Label>
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="1"
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={handleConfirm}
        >
          <Check className="h-3 w-3 mr-1" />
          Inserir
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Enter para confirmar · Esc para cancelar
      </p>
    </div>
  );
};
