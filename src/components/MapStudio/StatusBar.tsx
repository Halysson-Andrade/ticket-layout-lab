import React from 'react';
import { Sector } from '@/types/mapStudio';

interface StatusBarProps {
  sectors: Sector[];
  selectedSeatCount: number;
  zoom: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  sectors,
  selectedSeatCount,
  zoom,
}) => {
  const totalSeats = sectors.reduce((sum, s) => sum + s.seats.length, 0);

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
      <span>
        <strong>{sectors.length}</strong> setores
      </span>
      <span className="w-px h-4 bg-border" />
      <span>
        <strong>{totalSeats.toLocaleString()}</strong> assentos
      </span>
      {selectedSeatCount > 0 && (
        <>
          <span className="w-px h-4 bg-border" />
          <span className="text-primary">
            <strong>{selectedSeatCount}</strong> selecionados
          </span>
        </>
      )}
      <span className="w-px h-4 bg-border" />
      <span>
        Zoom: <strong>{Math.round(zoom * 100)}%</strong>
      </span>
    </div>
  );
};
