import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Sector, Seat, VenueElement, ToolType, SeatType, SEAT_COLORS, ELEMENT_ICONS } from '@/types/mapStudio';
import { isPointInBounds } from '@/lib/mapUtils';

interface CanvasProps {
  width: number;
  height: number;
  sectors: Sector[];
  elements: VenueElement[];
  selectedSectorIds: string[];
  selectedSeatIds: string[];
  activeTool: ToolType;
  activeSeatType: SeatType;
  zoom: number;
  pan: { x: number; y: number };
  backgroundImage: string | null;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onSelectSector: (id: string, additive: boolean) => void;
  onSelectSeats: (ids: string[], additive: boolean) => void;
  onCreateSector: (bounds: { x: number; y: number; width: number; height: number }) => void;
  onMoveSector: (id: string, dx: number, dy: number) => void;
  onApplySeatType: (ids: string[], type: SeatType) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  sectors,
  elements,
  selectedSectorIds,
  selectedSeatIds,
  activeTool,
  activeSeatType,
  zoom,
  pan,
  backgroundImage,
  onZoomChange,
  onPanChange,
  onSelectSector,
  onSelectSeats,
  onCreateSector,
  onMoveSector,
  onApplySeatType,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Carrega imagem de fundo
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => {
        bgImageRef.current = img;
      };
    } else {
      bgImageRef.current = null;
    }
  }, [backgroundImage]);

  // Converte coordenadas do mouse para coordenadas do canvas
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Renderização do canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Limpa
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fundo
    ctx.fillStyle = '#1e2330';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid
    ctx.strokeStyle = '#2a3142';
    ctx.lineWidth = 0.5 / zoom;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Imagem de fundo
    if (bgImageRef.current) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(bgImageRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // Elementos (palco, bar, etc)
    elements.forEach(el => {
      ctx.fillStyle = el.color || '#4a5568';
      ctx.fillRect(el.bounds.x, el.bounds.y, el.bounds.width, el.bounds.height);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(el.bounds.width, el.bounds.height) * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        ELEMENT_ICONS[el.type] || '📦',
        el.bounds.x + el.bounds.width / 2,
        el.bounds.y + el.bounds.height / 2
      );
      ctx.font = '10px sans-serif';
      ctx.fillText(
        el.label,
        el.bounds.x + el.bounds.width / 2,
        el.bounds.y + el.bounds.height + 12
      );
    });

    // Setores e Assentos
    sectors.forEach(sector => {
      if (!sector.visible) return;

      // Borda do setor
      const isSelected = selectedSectorIds.includes(sector.id);
      ctx.strokeStyle = isSelected ? '#3b82f6' : sector.color;
      ctx.lineWidth = isSelected ? 2 / zoom : 1 / zoom;
      ctx.setLineDash(isSelected ? [] : [4, 4]);
      ctx.strokeRect(sector.bounds.x, sector.bounds.y, sector.bounds.width, sector.bounds.height);
      ctx.setLineDash([]);

      // Nome do setor
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sector.name, sector.bounds.x + 4, sector.bounds.y + 4);

      // Assentos
      sector.seats.forEach(seat => {
        const isSeatSelected = selectedSeatIds.includes(seat.id);
        const seatSize = 14;
        
        // Cor do assento
        ctx.fillStyle = isSeatSelected ? '#3b82f6' : SEAT_COLORS[seat.type];
        
        // Desenha assento
        ctx.beginPath();
        ctx.arc(seat.x + seatSize / 2, seat.y + seatSize / 2, seatSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Borda se selecionado
        if (isSeatSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        }

        // Label do assento (apenas em zoom alto)
        if (zoom > 0.8) {
          ctx.fillStyle = '#fff';
          ctx.font = `${8}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(seat.number, seat.x + seatSize / 2, seat.y + seatSize / 2);
        }
      });
    });

    // Retângulo de seleção/criação
    if (isDrawing && activeTool === 'sector') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(x, y, w, h);
    }

    // Lasso selection
    if (lassoPoints.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      lassoPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fill();
    }

    ctx.restore();
  }, [sectors, elements, selectedSectorIds, selectedSeatIds, zoom, pan, width, height, isDrawing, drawStart, drawCurrent, lassoPoints, activeTool]);

  // Atualiza canvas
  useEffect(() => {
    requestAnimationFrame(render);
  }, [render]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.2, zoom * delta));
    
    // Zoom em direção ao cursor
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      onPanChange({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      });
    }
    
    onZoomChange(newZoom);
  }, [zoom, pan, onZoomChange, onPanChange]);

  // Mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'sector') {
      setIsDrawing(true);
      setDrawStart(pos);
      setDrawCurrent(pos);
      return;
    }

    if (activeTool === 'select' || activeTool === 'lasso') {
      // Verifica click em assento
      for (const sector of sectors) {
        if (!sector.visible) continue;
        for (const seat of sector.seats) {
          const seatBounds = { x: seat.x, y: seat.y, width: 14, height: 14 };
          if (isPointInBounds(pos, seatBounds)) {
            onSelectSeats([seat.id], e.shiftKey);
            if (!e.shiftKey && activeSeatType !== 'normal') {
              onApplySeatType([seat.id], activeSeatType);
            }
            return;
          }
        }
      }

      // Verifica click em setor
      for (const sector of sectors) {
        if (!sector.visible || sector.locked) continue;
        if (isPointInBounds(pos, sector.bounds)) {
          onSelectSector(sector.id, e.shiftKey);
          setIsDragging(true);
          setDragStart(pos);
          return;
        }
      }

      // Click no vazio - inicia lasso ou limpa seleção
      if (activeTool === 'lasso') {
        setLassoPoints([pos]);
      } else {
        onSelectSeats([], false);
      }
    }
  }, [activeTool, screenToCanvas, pan, sectors, onSelectSeats, onSelectSector, onApplySeatType, activeSeatType]);

  // Mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      onPanChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

    if (isDrawing && activeTool === 'sector') {
      setDrawCurrent(pos);
    }

    if (isDragging && selectedSectorIds.length > 0) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      selectedSectorIds.forEach(id => onMoveSector(id, dx, dy));
      setDragStart(pos);
    }

    if (lassoPoints.length > 0) {
      setLassoPoints([...lassoPoints, pos]);
    }
  }, [isPanning, isDrawing, isDragging, activeTool, dragStart, screenToCanvas, selectedSectorIds, onPanChange, onMoveSector, lassoPoints]);

  // Mouse up
  const handleMouseUp = useCallback(() => {
    if (isDrawing && activeTool === 'sector') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      
      if (w > 20 && h > 20) {
        onCreateSector({ x, y, width: w, height: h });
      }
    }

    if (lassoPoints.length > 2) {
      // Seleciona assentos dentro do lasso
      const selectedIds: string[] = [];
      sectors.forEach(sector => {
        if (!sector.visible) return;
        sector.seats.forEach(seat => {
          if (isPointInPolygon({ x: seat.x + 7, y: seat.y + 7 }, lassoPoints)) {
            selectedIds.push(seat.id);
          }
        });
      });
      if (selectedIds.length > 0) {
        onSelectSeats(selectedIds, false);
      }
    }

    setIsPanning(false);
    setIsDrawing(false);
    setIsDragging(false);
    setLassoPoints([]);
  }, [isDrawing, activeTool, drawStart, drawCurrent, onCreateSector, lassoPoints, sectors, onSelectSeats]);

  // Point in polygon test (raycasting)
  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-canvas-bg cursor-crosshair"
      style={{ cursor: activeTool === 'pan' ? 'grab' : isPanning ? 'grabbing' : 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        width={containerRef.current?.clientWidth || 1200}
        height={containerRef.current?.clientHeight || 800}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
