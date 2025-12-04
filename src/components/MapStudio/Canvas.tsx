import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Sector, Seat, VenueElement, ToolType, SeatType, SEAT_COLORS, ELEMENT_ICONS, Vertex } from '@/types/mapStudio';
import { isPointInBounds, isPointInPolygon, getBoundsFromVertices } from '@/lib/mapUtils';

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
  onUpdateSectorVertices: (id: string, vertices: Vertex[]) => void;
  onApplySeatType: (ids: string[], type: SeatType) => void;
}

const HANDLE_SIZE = 10;

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
  onUpdateSectorVertices,
  onApplySeatType,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const [activeVertexIndex, setActiveVertexIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [boxSelectStart, setBoxSelectStart] = useState({ x: 0, y: 0 });
  const [boxSelectCurrent, setBoxSelectCurrent] = useState({ x: 0, y: 0 });
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

  // Verifica se o ponto está próximo de um vértice
  const getVertexAtPoint = useCallback((pos: { x: number; y: number }, sector: Sector): number | null => {
    const handleRadius = HANDLE_SIZE / zoom;
    for (let i = 0; i < sector.vertices.length; i++) {
      const v = sector.vertices[i];
      const dist = Math.sqrt(Math.pow(pos.x - v.x, 2) + Math.pow(pos.y - v.y, 2));
      if (dist <= handleRadius) {
        return i;
      }
    }
    return null;
  }, [zoom]);

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

      ctx.save();
      
      const isSelected = selectedSectorIds.includes(sector.id);
      
      // Desenha polígono do setor
      if (sector.vertices && sector.vertices.length > 2) {
        ctx.beginPath();
        ctx.moveTo(sector.vertices[0].x, sector.vertices[0].y);
        for (let i = 1; i < sector.vertices.length; i++) {
          ctx.lineTo(sector.vertices[i].x, sector.vertices[i].y);
        }
        ctx.closePath();
        
        // Fill com cor do setor
        ctx.fillStyle = sector.color + '20';
        ctx.fill();
        
        // Stroke
        ctx.strokeStyle = isSelected ? '#3b82f6' : sector.color;
        ctx.lineWidth = isSelected ? 2 / zoom : 1 / zoom;
        ctx.stroke();

        // Desenha handles dos vértices se selecionado
        if (isSelected && activeTool === 'select') {
          sector.vertices.forEach((vertex, i) => {
            const handleSize = HANDLE_SIZE / zoom;
            
            // Handle background
            ctx.fillStyle = '#1e2330';
            ctx.fillRect(vertex.x - handleSize / 2, vertex.y - handleSize / 2, handleSize, handleSize);
            
            // Handle border
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2 / zoom;
            ctx.strokeRect(vertex.x - handleSize / 2, vertex.y - handleSize / 2, handleSize, handleSize);
            
            // Número do vértice
            if (zoom > 0.6) {
              ctx.fillStyle = '#3b82f6';
              ctx.font = `${10 / zoom}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(i + 1), vertex.x, vertex.y);
            }
          });
        }
      }

      // Nome do setor
      const bounds = getBoundsFromVertices(sector.vertices);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sector.name, bounds.x + 4, bounds.y + 4);

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

      ctx.restore();
    });

    // Retângulo de seleção/criação de setor
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

    // Box selection para assentos
    if (isBoxSelecting) {
      const x = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const y = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const w = Math.abs(boxSelectCurrent.x - boxSelectStart.x);
      const h = Math.abs(boxSelectCurrent.y - boxSelectStart.y);
      
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
  }, [sectors, elements, selectedSectorIds, selectedSeatIds, zoom, pan, width, height, isDrawing, drawStart, drawCurrent, activeTool, isBoxSelecting, boxSelectStart, boxSelectCurrent]);

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
      // Verifica click em vértice de setor selecionado
      for (const sectorId of selectedSectorIds) {
        const sector = sectors.find(s => s.id === sectorId);
        if (sector && sector.vertices) {
          const vertexIndex = getVertexAtPoint(pos, sector);
          if (vertexIndex !== null) {
            setIsDraggingVertex(true);
            setActiveVertexIndex(vertexIndex);
            setDragStart(pos);
            return;
          }
        }
      }

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

      // Verifica click em setor (usando polígono)
      for (const sector of sectors) {
        if (!sector.visible || sector.locked) continue;
        if (sector.vertices && sector.vertices.length > 2) {
          if (isPointInPolygon(pos, sector.vertices)) {
            onSelectSector(sector.id, e.shiftKey);
            setIsDragging(true);
            setDragStart(pos);
            return;
          }
        } else if (isPointInBounds(pos, sector.bounds)) {
          onSelectSector(sector.id, e.shiftKey);
          setIsDragging(true);
          setDragStart(pos);
          return;
        }
      }

      // Click no vazio - inicia box selection
      setIsBoxSelecting(true);
      setBoxSelectStart(pos);
      setBoxSelectCurrent(pos);
    }
  }, [activeTool, screenToCanvas, pan, sectors, selectedSectorIds, onSelectSeats, onSelectSector, onApplySeatType, activeSeatType, getVertexAtPoint]);

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

    if (isDraggingVertex && activeVertexIndex !== null && selectedSectorIds.length === 1) {
      const sector = sectors.find(s => s.id === selectedSectorIds[0]);
      if (sector && sector.vertices) {
        const newVertices = [...sector.vertices];
        newVertices[activeVertexIndex] = { x: pos.x, y: pos.y };
        onUpdateSectorVertices(sector.id, newVertices);
      }
      return;
    }

    if (isDragging && selectedSectorIds.length > 0) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      selectedSectorIds.forEach(id => onMoveSector(id, dx, dy));
      setDragStart(pos);
    }

    if (isBoxSelecting) {
      setBoxSelectCurrent(pos);
    }
  }, [isPanning, isDrawing, isDragging, isDraggingVertex, activeVertexIndex, isBoxSelecting, activeTool, dragStart, screenToCanvas, selectedSectorIds, sectors, onPanChange, onMoveSector, onUpdateSectorVertices]);

  // Mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDrawing && activeTool === 'sector') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      
      if (w > 20 && h > 20) {
        onCreateSector({ x, y, width: w, height: h });
      }
    }

    // Box selection finalizada
    if (isBoxSelecting) {
      const minX = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const maxX = Math.max(boxSelectStart.x, boxSelectCurrent.x);
      const minY = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const maxY = Math.max(boxSelectStart.y, boxSelectCurrent.y);
      
      // Só seleciona se a box tiver tamanho mínimo
      if (maxX - minX > 5 && maxY - minY > 5) {
        const selectedIds: string[] = [];
        sectors.forEach(sector => {
          if (!sector.visible) return;
          sector.seats.forEach(seat => {
            const seatCenterX = seat.x + 7;
            const seatCenterY = seat.y + 7;
            if (seatCenterX >= minX && seatCenterX <= maxX && 
                seatCenterY >= minY && seatCenterY <= maxY) {
              selectedIds.push(seat.id);
            }
          });
        });
        if (selectedIds.length > 0) {
          onSelectSeats(selectedIds, e.shiftKey);
          
          // Aplica tipo se não for normal
          if (activeSeatType !== 'normal') {
            onApplySeatType(selectedIds, activeSeatType);
          }
        }
      } else {
        // Click simples no vazio - limpa seleção
        if (!e.shiftKey) {
          onSelectSeats([], false);
        }
      }
    }

    setIsPanning(false);
    setIsDrawing(false);
    setIsDragging(false);
    setIsBoxSelecting(false);
    setIsDraggingVertex(false);
    setActiveVertexIndex(null);
  }, [isDrawing, activeTool, drawStart, drawCurrent, onCreateSector, isBoxSelecting, boxSelectStart, boxSelectCurrent, sectors, onSelectSeats, activeSeatType, onApplySeatType]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-canvas-bg cursor-crosshair"
      style={{ cursor: activeTool === 'pan' ? 'grab' : isPanning ? 'grabbing' : isDraggingVertex ? 'move' : isBoxSelecting ? 'crosshair' : 'default' }}
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
      
      {/* Hint overlay */}
      {selectedSeatIds.length === 0 && sectors.length > 0 && !isBoxSelecting && !selectedSectorIds.length && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-muted-foreground pointer-events-none">
          Arraste para selecionar múltiplos assentos • Shift+click para adicionar à seleção
        </div>
      )}
      
      {/* Vertex editing hint */}
      {selectedSectorIds.length === 1 && activeTool === 'select' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-primary-foreground pointer-events-none">
          Arraste os quadrados azuis para ajustar a forma do setor
        </div>
      )}
      
      {/* Selection count */}
      {selectedSeatIds.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          {selectedSeatIds.length} assento{selectedSeatIds.length > 1 ? 's' : ''} selecionado{selectedSeatIds.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};
